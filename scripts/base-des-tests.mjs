// La base que visent les tests e2e et le nettoyage de l'agence de test.
//
// Jusqu'au 25/11, la production, l'essai et les tests écrivaient dans la même base : le projet
// Supabase lié au dépôt (`supabase/.temp/project-ref`). Sous la charge des tests, cette base se
// figeait pour tout le monde (`missions/LIVRAISON.md`). Décision de Jean-Guy du 25/11 : une base
// d'essai séparée. Sa référence se pose dans `.env.e2e.local` (`E2E_SUPABASE_REF=…`, les vingt
// lettres et chiffres de son adresse) ; dès lors les tests et le nettoyage ne visent plus qu'elle.
// Le projet lié reste la production : la sauvegarde et les migrations ne changent pas.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_REF = /^[a-z0-9]{20}$/;

// Une fois la base d'essai vérifiée, la référence devient obligatoire : sans elle, les tests
// s'arrêtent au lieu de retomber, en silence, sur la base de la production.
export const TESTS_ON_SEPARATE_BASE = false;

export const MISSING_REF =
  'E2E_SUPABASE_REF manque dans .env.e2e.local : les tests ne visent que la base d’essai, jamais celle de la production.';
export const MALFORMED_REF =
  'E2E_SUPABASE_REF n’a pas la forme d’une référence de projet Supabase (vingt lettres minuscules et chiffres).';
export const PRODUCTION_REF =
  'E2E_SUPABASE_REF désigne la base de production (le projet lié au dépôt) : les tests ne la visent jamais.';

// Pur. `ref` : la référence posée pour les tests, ou rien ; `linkedRef` : celle du projet lié.
// Rend l'argument de la CLI Supabase (`--remote` = le projet lié, `--remote=<ref>` = la base
// d'essai) et dit si la base des tests est bien à part.
export function testDatabaseTarget({ ref, linkedRef, separateRequired = TESTS_ON_SEPARATE_BASE }) {
  const value = typeof ref === 'string' ? ref.trim() : '';
  if (value === '') {
    if (separateRequired) throw new Error(MISSING_REF);
    return { arg: '--remote', separate: false };
  }
  if (!PROJECT_REF.test(value)) throw new Error(MALFORMED_REF);
  if (typeof linkedRef === 'string' && linkedRef.trim() === value) throw new Error(PRODUCTION_REF);
  return { arg: `--remote=${value}`, separate: true };
}

// Une variable des tests : l'environnement d'abord, sinon `.env.e2e.local`.
export function readTestEnv(name, file = resolve(ROOT, '.env.e2e.local')) {
  if (process.env[name]) return process.env[name];
  if (!existsSync(file)) return null;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`).exec(raw);
    if (match) return match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return null;
}

// La référence du projet lié au dépôt (la production), ou rien hors d'un poste lié (la CI).
export function linkedProjectRef(file = resolve(ROOT, 'supabase', '.temp', 'project-ref')) {
  return existsSync(file) ? readFileSync(file, 'utf8').trim() || null : null;
}

// L'argument `--remote…` de la CLI pour la base des tests, lu sur ce poste.
export function testDatabaseArg() {
  return testDatabaseTarget({
    ref: readTestEnv('E2E_SUPABASE_REF'),
    linkedRef: linkedProjectRef(),
  }).arg;
}
