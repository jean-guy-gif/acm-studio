// Mission 93 — `npm run sauvegarde` : une sauvegarde datée de la base partagée, rangée hors du
// dépôt. Méthode du 10/10/2026 : la structure, les données, les comptes et l'index du stockage
// (schémas auth et storage), puis les fichiers du stockage. LECTURE SEULE sur la base.
//
// Prérequis : la CLI Supabase reliée au projet (`supabase link`) et Docker lancé (la CLI s'en
// sert pour `pg_dump`). Rien n'est affiché du contenu : seulement où c'est, et combien.
import { chmodSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  assertOutsideRepo,
  BACKUP_ROOT,
  BUCKET_SQL,
  COUNT_SQL,
  FILES,
  queryLinked,
  run,
  table,
} from './sauvegarde-commun.mjs';

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
  const before = queryLinked(COUNT_SQL);

  console.log('2/4 Structure et données (base, comptes, index du stockage)…');
  run('supabase', ['db', 'dump', '--linked', '-f', join(dir, FILES.schema)]);
  run('supabase', [
    'db',
    'dump',
    '--linked',
    '--data-only',
    '--use-copy',
    '-f',
    join(dir, FILES.publicData),
  ]);
  run('supabase', [
    'db',
    'dump',
    '--linked',
    '--data-only',
    '--use-copy',
    '--schema',
    'auth,storage',
    '-f',
    join(dir, FILES.authStorageData),
  ]);

  // Une écriture pendant la sauvegarde la rendrait invérifiable : on le dit plutôt que de garder
  // des comptes faux.
  const after = queryLinked(COUNT_SQL);
  const moved = Object.keys(after).filter((name) => after[name] !== before[name]);
  if (moved.length > 0) {
    throw new Error(
      `La base a changé pendant la sauvegarde (${moved.join(', ')}) : relancez « npm run sauvegarde ».`,
    );
  }

  console.log('3/4 Fichiers du stockage…');
  const buckets = queryLinked(BUCKET_SQL);
  const storageDir = join(dir, FILES.storage);
  mkdirSync(storageDir, { mode: 0o700 });
  for (const [bucket, objects] of Object.entries(buckets)) {
    if (objects === 0) {
      mkdirSync(join(storageDir, bucket), { mode: 0o700 });
      continue;
    }
    run('supabase', [
      'storage',
      'cp',
      '-r',
      '--experimental',
      '--linked',
      `ss:///${bucket}`,
      storageDir,
    ]);
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
