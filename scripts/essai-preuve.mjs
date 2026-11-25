// La base d'essai séparée (décision de Jean-Guy du 25/11, `missions/BASE_JEUDI_MATIN.md`) : la
// PREUVE, avant toute spec, que l'essai parle bien à la base d'essai et plus à celle de la
// production. Ordre de Jean-Guy : « si la variable de branche ne l'emporte pas sur l'entrée
// commune, tu t'arrêtes et tu me le dis, sans rien toucher à la production ».
//
//   npm run essai:preuve
//
// Le compte de démonstration des tests se connecte sur l'essai, dans un vrai navigateur ; puis sa
// session neuve se cherche dans les deux bases, en LECTURE SEULE. Elle doit être dans la base
// d'essai, et pas dans celle de la production. Rien n'est écrit, sauf cette connexion.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

import { chromium } from '@playwright/test';

import {
  ESSAI_HOST,
  linkedProjectRef,
  readTestEnv,
  testDatabaseTarget,
  testsBaseUrl,
} from './base-des-tests.mjs';
import { essaiVerdict } from './essai-preuve-regle.mjs';

const REPO_ROOT = resolve(import.meta.dirname, '..');

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const need = (name) => readTestEnv(name) ?? fail(`${name} manque dans .env.e2e.local.`);
const baseUrl = need('E2E_BASE_URL');
try {
  // La preuve ne se joue que sur l'essai, jamais sur la prévisualisation d'une autre branche.
  testsBaseUrl(baseUrl, { separateRequired: true });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
const email = need('E2E_DEMO_EMAIL');
const password = need('E2E_DEMO_PASSWORD');

// La base d'essai, si sa référence est déjà posée ; sans elle, seule la production est lue.
let essai = null;
try {
  const target = testDatabaseTarget({
    ref: readTestEnv('E2E_SUPABASE_REF'),
    linkedRef: linkedProjectRef(),
    separateRequired: false,
  });
  essai = target.separate ? target.arg : null;
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
function sessionsSince(target, since) {
  const out = execFileSync(
    'npx',
    [
      '--yes',
      'supabase@3.0.0',
      'db',
      'query',
      target,
      '--read-only',
      '--output-format',
      'json',
      '--agent',
      'no',
      `select count(*) as n from auth.sessions s join auth.users u on u.id = s.user_id
        where lower(u.email) = lower(${quote(email)}) and s.created_at >= ${quote(since)}::timestamptz`,
    ],
    { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const start = out.search(/[[{]/);
  const json = JSON.parse(
    out.slice(start, Math.max(out.lastIndexOf(']'), out.lastIndexOf('}')) + 1),
  );
  const rows = Array.isArray(json) ? json : (json.rows ?? []);
  return Number(rows[0]?.n ?? 0);
}

// Dix secondes de marge : l'horloge du poste et celle de la base ne sont pas la même.
const since = new Date(Date.now() - 10_000).toISOString();
console.log(`\nL'essai : https://${ESSAI_HOST}. Connexion du compte de démonstration des tests…`);

const browser = await chromium.launch();
let dossiers = null;
try {
  const bypass = readTestEnv('E2E_VERCEL_BYPASS');
  const context = await browser.newContext({
    baseURL: baseUrl,
    locale: 'fr-FR',
    extraHTTPHeaders: bypass ? { 'x-vercel-protection-bypass': bypass } : {},
  });
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(/\/(aujourdhui|bienvenue)$/, { timeout: 45_000 });
  // « Ma démo » : dans la production, cette agence a ses douze dossiers ; dans une base d'essai
  // neuve, aucun.
  await page.goto('/ma-demo');
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  dossiers = await page.getByTestId('demo-dossier').count();
} catch (error) {
  await browser.close();
  fail(
    `La connexion sur l'essai n'a pas abouti : ${error instanceof Error ? error.message.split('\n')[0] : error}`,
  );
}
await browser.close();

const inProduction = sessionsSince('--remote', since);
const inEssai = essai ? sessionsSince(essai, since) : null;
console.log(`  « Ma démo » sur l'essai : ${dossiers} dossier(s).`);
console.log(`  Session neuve de ce compte dans la base de la production : ${inProduction}.`);
console.log(
  `  Session neuve de ce compte dans la base d'essai : ${inEssai ?? 'référence pas encore posée'}.`,
);

const verdict = essaiVerdict({ inProduction, inEssai });
console.log(`\n${verdict.ok ? '✔' : '✖'} ${verdict.message}\n`);
process.exitCode = verdict.ok ? 0 : 1;
