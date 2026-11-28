// Mission 93 — ce que partagent `npm run sauvegarde` et `npm run sauvegarde:verifier`.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';

// Les sauvegardes vivent HORS du dépôt (elles contiennent des données personnelles et des jetons
// de session) : jamais commitées. `ACM_SAUVEGARDES` permet de choisir un autre dossier.
export const BACKUP_ROOT = resolve(
  process.env.ACM_SAUVEGARDES ?? join(homedir(), 'acm-studio-sauvegardes'),
);
export const REPO_ROOT = resolve(import.meta.dirname, '..');
export const FILES = {
  schema: 'schema.sql',
  publicData: 'data-public.sql',
  authStorageData: 'data-auth-storage.sql',
  counts: 'comptes.json',
  storage: 'stockage',
};
const STAMP = /^\d{4}-\d{2}-\d{2}_\d{4}$/;

export function assertOutsideRepo() {
  if (BACKUP_ROOT === REPO_ROOT || BACKUP_ROOT.startsWith(REPO_ROOT + sep)) {
    throw new Error(
      `Le dossier des sauvegardes (${BACKUP_ROOT}) est dans le dépôt : choisissez-en un autre.`,
    );
  }
}

export function latestBackup() {
  if (!existsSync(BACKUP_ROOT)) {
    return null;
  }
  const stamps = readdirSync(BACKUP_ROOT)
    .filter((name) => STAMP.test(name) && existsSync(join(BACKUP_ROOT, name, FILES.counts)))
    .sort();
  return stamps.length > 0 ? join(BACKUP_ROOT, stamps[stamps.length - 1]) : null;
}

// Les tables comparées, une par une. Les tables de session d'`auth` bougent à chaque connexion :
// elles sont sauvegardées, mais pas comparées.
export const COUNT_SQL = `
select table_schema || '.' || table_name as t,
       (xpath('/row/c/text()', query_to_xml(
          format('select count(*) as c from %I.%I', table_schema, table_name),
          false, true, '')))[1]::text::bigint as n
from information_schema.tables
where table_type = 'BASE TABLE'
  and (table_schema = 'public'
       or (table_schema = 'auth' and table_name in ('users', 'identities'))
       or (table_schema = 'storage' and table_name in ('buckets', 'objects')))
order by 1`;

export const BUCKET_SQL = `
select b.id as t, (select count(*) from storage.objects o where o.bucket_id = b.id) as n
from storage.buckets b order by 1`;

// Lance une commande sans jamais afficher sa sortie (elle peut contenir des données).
export function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
    ...options,
  });
}

// La CLI Supabase de la sauvegarde est épinglée (05/11 : la CLI 3.0.0 a remplacé `--linked` par
// `--remote` et rend un tableau dessiné hors du mode agent ; le comptage ne lisait plus rien).
// Une montée de version se décide ici, et se vérifie par « npm run sauvegarde ».
export const SUPABASE_CLI = ['--yes', 'supabase@3.0.0'];

export function supabase(args, options = {}) {
  return run('npx', [...SUPABASE_CLI, ...args], options);
}

// Une requête en lecture seule sur le projet lié ; rend ses lignes. `--agent no` fixe la forme de
// la sortie : un tableau JSON ; en mode agent, la CLI l'enveloppe dans un objet `{ rows }` — on
// lit les deux.
export function queryRemoteRows(sql, what = 'au comptage') {
  const out = supabase([
    'db',
    'query',
    '--remote',
    '--read-only',
    '--output-format',
    'json',
    '--agent',
    'no',
    sql,
  ]);
  const start = out.search(/[[{]/);
  if (start < 0) {
    throw new Error(`La CLI Supabase n’a rendu aucun résultat JSON ${what}.`);
  }
  const json = JSON.parse(
    out.slice(start, Math.max(out.lastIndexOf(']'), out.lastIndexOf('}')) + 1),
  );
  return Array.isArray(json) ? json : json.rows;
}

// Un comptage en lecture seule : `{ nom: nombre }`.
export function queryRemote(sql) {
  return Object.fromEntries(queryRemoteRows(sql).map((row) => [row.t, Number(row.n)]));
}

export function table(rows, headers) {
  const widths = headers.map((header, i) =>
    Math.max(header.length, ...rows.map((row) => String(row[i]).length)),
  );
  const line = (cells) => cells.map((cell, i) => String(cell).padEnd(widths[i])).join('  ');
  return [line(headers), line(widths.map((w) => '-'.repeat(w))), ...rows.map(line)].join('\n');
}
