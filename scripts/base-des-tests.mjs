// La base que visent les tests e2e et le nettoyage de l'agence de test.
//
// Jusqu'au 25/11, la production, l'essai et les tests écrivaient dans la même base : le projet
// Supabase lié au dépôt (`supabase/.temp/project-ref`). Sous la charge des tests, cette base se
// figeait pour tout le monde (`missions/LIVRAISON.md`). Décision de Jean-Guy du 25/11 : une base
// d'essai séparée. Sa référence se pose dans `.env.e2e.local` (`E2E_SUPABASE_REF=…`, les vingt
// lettres et chiffres de son adresse) ; dès lors les tests et le nettoyage ne visent plus qu'elle.
// Le projet lié reste la production : la sauvegarde et les migrations ne changent pas.
//
// Ce module est lu par Node (les scripts) ET par Playwright (les specs), qui le compile en
// CommonJS : pas d'`import.meta` ici, ni d'attente au premier niveau — avec l'un ou l'autre,
// Playwright ne chargerait plus aucune spec (relecture du 25/11, gardé par un test). Les fichiers
// du poste se lisent depuis le dossier courant : les specs comme les scripts se lancent de la
// racine du dépôt.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_REF = /^[a-z0-9]{20}$/;
// L'essai : la seule adresse où se jouent les specs une fois la base séparée. Sa branche (`essai`)
// est la seule dont le déploiement lit la base d'essai ; la prévisualisation d'une autre branche
// lit encore la base de la production.
export const ESSAI_HOST = 'acm-studio-essai.vercel.app';

// Une fois la base d'essai vérifiée, la référence devient obligatoire : sans elle, les tests
// s'arrêtent au lieu de retomber, en silence, sur la base de la production.
export const TESTS_ON_SEPARATE_BASE = false;

export const MISSING_REF =
  'E2E_SUPABASE_REF manque dans .env.e2e.local : les tests ne visent que la base d’essai, jamais celle de la production.';
export const MALFORMED_REF =
  'E2E_SUPABASE_REF n’a pas la forme d’une référence de projet Supabase (vingt lettres minuscules et chiffres).';
export const PRODUCTION_REF =
  'E2E_SUPABASE_REF désigne la base de production (le projet lié au dépôt) : les tests ne la visent jamais.';
export const NOT_ESSAI_URL = `E2E_BASE_URL ne désigne pas l’essai (${ESSAI_HOST}) : la prévisualisation d’une autre branche lit la base de la production, aucune spec ne s’y joue.`;

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

// Pur. Une fois la base séparée, les specs ne se jouent que sur l'essai : par l'application, une
// spec jouée ailleurs écrirait dans la base de la production pendant que ses aides (le nettoyage,
// les lectures en base) viseraient la base d'essai. Rend l'adresse, inchangée.
export function testsBaseUrl(baseUrl, { separateRequired = TESTS_ON_SEPARATE_BASE } = {}) {
  if (!separateRequired) return baseUrl;
  let host = null;
  try {
    host = new URL(String(baseUrl)).host;
  } catch {
    host = null;
  }
  if (host !== ESSAI_HOST) throw new Error(NOT_ESSAI_URL);
  return baseUrl;
}

// Une variable des tests : l'environnement d'abord, sinon `.env.e2e.local`.
export function readTestEnv(name, file = resolve(process.cwd(), '.env.e2e.local')) {
  if (process.env[name]) return process.env[name];
  if (!existsSync(file)) return null;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`).exec(raw);
    if (match) return match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return null;
}

// La référence du projet lié au dépôt (la production), ou rien hors d'un poste lié (la CI).
export function linkedProjectRef(
  file = resolve(process.cwd(), 'supabase', '.temp', 'project-ref'),
) {
  return existsSync(file) ? readFileSync(file, 'utf8').trim() || null : null;
}

// L'argument `--remote…` de la CLI pour la base des tests, lu sur ce poste.
export function testDatabaseArg() {
  return testDatabaseTarget({
    ref: readTestEnv('E2E_SUPABASE_REF'),
    linkedRef: linkedProjectRef(),
  }).arg;
}
