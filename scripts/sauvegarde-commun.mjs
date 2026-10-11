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

// `supabase db query --linked` rend un objet JSON (suivi d'éventuels avis de la CLI).
export function queryLinked(sql) {
  const out = run('supabase', ['db', 'query', '--linked', sql]);
  const json = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
  return Object.fromEntries(json.rows.map((row) => [row.t, Number(row.n)]));
}

export function table(rows, headers) {
  const widths = headers.map((header, i) =>
    Math.max(header.length, ...rows.map((row) => String(row[i]).length)),
  );
  const line = (cells) => cells.map((cell, i) => String(cell).padEnd(widths[i])).join('  ');
  return [line(headers), line(widths.map((w) => '-'.repeat(w))), ...rows.map(line)].join('\n');
}
