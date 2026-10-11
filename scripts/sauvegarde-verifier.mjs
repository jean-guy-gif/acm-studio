// Mission 93 — `npm run sauvegarde:verifier` : une sauvegarde qu'on n'a jamais restaurée n'est
// pas une sauvegarde. Ce script restaure la DERNIÈRE dans une base locale À PART (créée puis
// supprimée — la base locale de travail n'est pas touchée) et compare les nombres de lignes,
// table par table, avec ceux relevés au moment de la sauvegarde. Il compte aussi les fichiers
// du stockage. Rien n'est écrit sur la base partagée.
//
// Prérequis : la base Supabase locale lancée (`supabase start`).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { COUNT_SQL, FILES, latestBackup, run, table } from './sauvegarde-commun.mjs';

const CONTAINER = process.env.ACM_DB_CONTAINER ?? 'supabase_db_acm-studio';
const SCRATCH = 'acm_sauvegarde_verif';

const psql = (database, args, input) =>
  run('docker', ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', database, ...args], {
    input,
  });

// Charge un fichier SQL sans s'arrêter à la première erreur : le verdict, ce sont les comptes.
function load(database, sql) {
  try {
    psql(database, ['-q', '-v', 'ON_ERROR_STOP=0'], sql);
  } catch {
    // Une erreur de chargement se verra dans les comptes.
  }
}

function countFiles(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).reduce(
    (sum, entry) => sum + (entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1),
    0,
  );
}

// La base locale peut être en retard d'une version sur les schémas auth et storage : toute
// colonne que la sauvegarde connaît et que la base locale ignore est ajoutée (en texte) avant le
// chargement, pour que rien ne soit écarté.
function missingColumnsSql(dataSql) {
  const statements = [];
  for (const match of dataSql.matchAll(/^COPY "?(\w+)"?\."?(\w+)"? \(([^)]*)\) FROM stdin;$/gm)) {
    const [, schema, name, columns] = match;
    for (const column of columns.split(',').map((c) => c.trim().replace(/"/g, ''))) {
      statements.push(
        `alter table if exists "${schema}"."${name}" add column if not exists "${column}" text;`,
      );
    }
  }
  return statements.join('\n');
}

let failed = false;
try {
  const dir = latestBackup();
  if (!dir) {
    throw new Error('Aucune sauvegarde trouvée : lancez d’abord « npm run sauvegarde ».');
  }
  const expected = JSON.parse(readFileSync(join(dir, FILES.counts), 'utf8'));
  console.log(`Sauvegarde vérifiée : ${dir}`);

  console.log('1/3 Base locale à part…');
  psql('postgres', ['-q', '-c', `drop database if exists ${SCRATCH} with (force)`]);
  psql('postgres', ['-q', '-c', `create database ${SCRATCH} template template0`]);
  // La structure que Supabase gère (auth, storage, extensions) vient de la base locale ; le
  // schéma `public`, lui, vient de la sauvegarde.
  const base = run('docker', [
    'exec',
    CONTAINER,
    'pg_dump',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '--schema-only',
    '--no-owner',
    '-N',
    'public',
  ]);
  load(SCRATCH, base);

  console.log('2/3 Restauration (structure, données, comptes, index du stockage)…');
  load(SCRATCH, readFileSync(join(dir, FILES.schema), 'utf8'));
  const authStorage = readFileSync(join(dir, FILES.authStorageData), 'utf8');
  load(SCRATCH, missingColumnsSql(authStorage));
  load(SCRATCH, authStorage);
  load(SCRATCH, readFileSync(join(dir, FILES.publicData), 'utf8'));

  console.log('3/3 Comparaison, table par table…\n');
  const restored = Object.fromEntries(
    psql(SCRATCH, ['-At', '-F', '\t', '-c', COUNT_SQL])
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [name, n] = line.split('\t');
        return [name, Number(n)];
      }),
  );
  const rows = Object.entries(expected.tables).map(([name, n]) => {
    const got = restored[name];
    const ok = got === n;
    if (!ok) failed = true;
    return [name, n, got ?? 'absente', ok ? 'ok' : 'DIFFÉRENT'];
  });
  console.log(table(rows, ['Table', 'Sauvegardé', 'Restauré', '']));

  const storageRows = Object.entries(expected.stockage).map(([bucket, n]) => {
    const got = countFiles(join(dir, FILES.storage, bucket));
    const ok = got === n;
    if (!ok) failed = true;
    return [bucket, n, got, ok ? 'ok' : 'DIFFÉRENT'];
  });
  console.log(`\n${table(storageRows, ['Stockage', 'Objets', 'Fichiers', ''])}`);

  const total = rows.reduce((sum, row) => sum + row[1], 0);
  console.log(
    failed
      ? '\nVÉRIFICATION ÉCHOUÉE : la sauvegarde ne se restaure pas à l’identique.'
      : `\nVérification réussie : ${rows.length} tables, ${total} lignes, ${storageRows.reduce((s, r) => s + r[1], 0)} fichiers — identiques.`,
  );
} catch (error) {
  failed = true;
  console.error(`\nVérification ÉCHOUÉE : ${error instanceof Error ? error.message : error}`);
} finally {
  try {
    psql('postgres', ['-q', '-c', `drop database if exists ${SCRATCH} with (force)`]);
  } catch {
    // La base locale est arrêtée : rien à nettoyer.
  }
}
process.exit(failed ? 1 : 0);
