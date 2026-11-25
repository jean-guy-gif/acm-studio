// « Personne n'est connecté » (`missions/BASE_JEUDI_MATIN.md`, avant le geste 1) : avant de changer
// la taille de la base de la production, qui s'en sert ? En LECTURE SEULE, sur le projet lié au
// dépôt (la production) : par agence, la dernière activité de session des vrais comptes.
//
//   npm run base:qui
//
// Les deux comptes de test (`.env.e2e.local`) sont écartés. Ni nom ni adresse e-mail n'est affiché.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { readTestEnv } from './base-des-tests.mjs';
import { sessionsQuery, whoIsConnected } from './base-qui-regle.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const testEmails = ['E2E_EMAIL', 'E2E_DEMO_EMAIL'].map((name) => readTestEnv(name));
if (testEmails.some((email) => !email)) {
  console.error('\n✖ E2E_EMAIL ou E2E_DEMO_EMAIL manque dans .env.e2e.local.\n');
  process.exit(1);
}

const out = execFileSync(
  'npx',
  [
    '--yes',
    'supabase@3.0.0',
    'db',
    'query',
    '--remote',
    '--read-only',
    '--output-format',
    'json',
    '--agent',
    'no',
    sessionsQuery(testEmails),
  ],
  { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
);
const start = out.search(/[[{]/);
const json = JSON.parse(out.slice(start, Math.max(out.lastIndexOf(']'), out.lastIndexOf('}')) + 1));
const rows = Array.isArray(json) ? json : (json.rows ?? []);

const hour = new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour12: false });
console.log(`\nQui est connecté à la production, à ${hour} (les comptes de test écartés) :\n`);
for (const row of rows) {
  console.log(
    `  ${String(row.agence).padEnd(34)} ${String(row.sessions).padStart(2)} session(s)${
      row.minutes == null ? '' : ` · dernière activité il y a ${row.minutes} min`
    }`,
  );
}
console.log(`\n${whoIsConnected(rows).lines.join('\n')}\n`);
