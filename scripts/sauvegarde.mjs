// Mission 93 — `npm run sauvegarde` : une sauvegarde datée de la base partagée, rangée hors du
// dépôt. Méthode du 10/10/2026 : la structure, les données, les comptes et l'index du stockage
// (schémas auth et storage), puis les fichiers du stockage. LECTURE SEULE sur la base.
//
// Prérequis : la CLI Supabase reliée au projet (`supabase link`) et Docker lancé (la CLI s'en
// sert pour `pg_dump`). Rien n'est affiché du contenu : seulement où c'est, et combien.
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

import {
  assertOutsideRepo,
  BACKUP_ROOT,
  BUCKET_SQL,
  COUNT_SQL,
  FILES,
  queryRemote,
  queryRemoteRows,
  supabase,
  table,
} from './sauvegarde-commun.mjs';
import { copyBucket, STORAGE_OBJECTS_SQL, STORAGE_RETRIES } from './sauvegarde-stockage.mjs';

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;

function countFiles(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).reduce(
    (sum, entry) => sum + (entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1),
    0,
  );
}

// La taille d'un fichier copié, ou null s'il n'existe pas.
function fileSize(path) {
  return existsSync(path) ? statSync(path).size : null;
}

// Une pause entre deux reprises (la CLI se lance de façon synchrone : rien n'attend en parallèle).
function pause(seconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, seconds * 1000);
}

const filesLabel = (n) => `${n} fichier${n > 1 ? 's' : ''}`;

// Une copie par la CLI, chacune à sa place sous `stockage/<bucket>/` : le bucket entier (la copie
// d'avant le 28/11), un dossier dont tous les fichiers manquent, ou un seul fichier.
function copyStep(bucket, step, storageDir) {
  if (step.kind === 'bucket') {
    supabase(['storage', 'cp', '-r', '--experimental', '--remote', `ss:///${bucket}`, storageDir]);
    return;
  }
  const source = `ss:///${bucket}/${step.path}`;
  const target = join(storageDir, bucket, step.path);
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  if (step.kind === 'dir') {
    // La CLI pose le dossier copié sous la destination, sous son propre nom.
    supabase(['storage', 'cp', '-r', '--experimental', '--remote', source, dirname(target)]);
  } else {
    supabase(['storage', 'cp', '--experimental', '--remote', source, target]);
  }
}

function lockDown(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      chmodSync(path, 0o700);
      lockDown(path);
    } else {
      chmodSync(path, 0o600);
    }
  }
}

try {
  assertOutsideRepo();
  const dir = join(BACKUP_ROOT, stamp);
  if (existsSync(dir)) {
    throw new Error(`${dir} existe déjà : attendez une minute et relancez.`);
  }
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(BACKUP_ROOT, 0o700);

  console.log('1/4 Comptage des lignes…');
  const before = queryRemote(COUNT_SQL);

  console.log('2/4 Structure et données (base, comptes, index du stockage)…');
  supabase(['db', 'dump', '--remote', '-f', join(dir, FILES.schema)]);
  supabase([
    'db',
    'dump',
    '--remote',
    '--data-only',
    '--use-copy',
    '-f',
    join(dir, FILES.publicData),
  ]);
  supabase([
    'db',
    'dump',
    '--remote',
    '--data-only',
    '--use-copy',
    '--schema',
    'auth,storage',
    '-f',
    join(dir, FILES.authStorageData),
  ]);

  // Une écriture pendant la sauvegarde la rendrait invérifiable : on le dit plutôt que de garder
  // des comptes faux.
  const after = queryRemote(COUNT_SQL);
  const moved = Object.keys(after).filter((name) => after[name] !== before[name]);
  if (moved.length > 0) {
    throw new Error(
      `La base a changé pendant la sauvegarde (${moved.join(', ')}) : relancez « npm run sauvegarde ».`,
    );
  }

  console.log('3/4 Fichiers du stockage…');
  const buckets = queryRemote(BUCKET_SQL);
  const listed = {};
  for (const row of queryRemoteRows(STORAGE_OBJECTS_SQL, 'à la lecture du stockage')) {
    (listed[row.b] ??= []).push({ name: row.n, size: row.s === null ? null : Number(row.s) });
  }
  const storageDir = join(dir, FILES.storage);
  mkdirSync(storageDir, { mode: 0o700 });
  // Une copie coupée par une erreur passagère se reprend, jusqu'à trois fois, sur les seuls
  // fichiers manquants (Jean-Guy, 28/11).
  const stillMissing = [];
  for (const [bucket, count] of Object.entries(buckets)) {
    if (count === 0) {
      mkdirSync(join(storageDir, bucket), { mode: 0o700 });
      continue;
    }
    const { missing } = copyBucket({
      objects: listed[bucket] ?? [],
      copy: (step) => copyStep(bucket, step, storageDir),
      sizeOf: (name) => fileSize(join(storageDir, bucket, name)),
      // Une copie coupée, dans le dossier de CETTE sauvegarde, et elle seule.
      discard: (name) => unlinkSync(join(storageDir, bucket, name)),
      onRetry: (retry, lost) => {
        console.log(
          `    ${bucket} : ${filesLabel(lost.length)} à reprendre, reprise ${retry} sur ${STORAGE_RETRIES}…`,
        );
        pause(5 * retry);
      },
    });
    stillMissing.push(...missing.map((object) => `${bucket}/${object.name}`));
  }
  if (stillMissing.length > 0) {
    const list = join(dir, 'fichiers-manquants.txt');
    writeFileSync(list, `${stillMissing.join('\n')}\n`, { mode: 0o600 });
    const shown = stillMissing.slice(0, 20).map((path) => `\n  ${path}`);
    const more = stillMissing.length > 20 ? [`\n  … et ${stillMissing.length - 20} autres`] : [];
    throw new Error(
      `${filesLabel(stillMissing.length)} du stockage manquant(s) ou incomplet(s) après ${STORAGE_RETRIES} reprises :` +
        `${[...shown, ...more].join('')}\nLa liste complète : ${list}`,
    );
  }

  console.log('4/4 Comptes enregistrés, accès restreint…');
  const files = Object.fromEntries(
    Object.keys(buckets).map((bucket) => [bucket, countFiles(join(storageDir, bucket))]),
  );
  writeFileSync(
    join(dir, FILES.counts),
    `${JSON.stringify({ date: now.toISOString(), tables: after, stockage: buckets, fichiers: files }, null, 2)}\n`,
  );
  lockDown(dir);

  const missing = Object.keys(buckets).filter((bucket) => files[bucket] !== buckets[bucket]);
  console.log(`\nSauvegarde : ${dir}`);
  console.log(
    table(
      [FILES.schema, FILES.publicData, FILES.authStorageData].map((name) => [
        name,
        `${Math.round(statSync(join(dir, name)).size / 1024)} Ko`,
      ]),
      ['Fichier', 'Taille'],
    ),
  );
  console.log(
    `\n${Object.keys(after).length} tables, ${Object.values(after).reduce((a, b) => a + b, 0)} lignes ; ` +
      `${Object.values(files).reduce((a, b) => a + b, 0)} fichiers du stockage.`,
  );
  if (missing.length > 0) {
    throw new Error(
      `Fichiers du stockage incomplets pour : ${missing.join(', ')} (voir ${FILES.counts}).`,
    );
  }
  console.log('Vérifiez-la : npm run sauvegarde:verifier');
} catch (error) {
  console.error(`\nSauvegarde ÉCHOUÉE : ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
