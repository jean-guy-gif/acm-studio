import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

// Mission 66 — le parcours complet, rejoué dans un vrai navigateur sur l'URL d'essai.
// Lancé à la main (`npm run e2e`), jamais dans la CI : il lui faut l'URL d'essai et le
// compte de test, dont les identifiants vivent dans `.env.e2e.local` (ignoré par git).
// Une variable déjà présente dans l'environnement l'emporte (ex. E2E_BASE_URL=localhost).
function loadE2eEnv(): void {
  const file = path.resolve('.env.e2e.local');
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadE2eEnv();

if (!process.env.E2E_BASE_URL) {
  throw new Error('E2E_BASE_URL manquant : renseignez-le dans .env.e2e.local (ignoré par git).');
}

export default defineConfig({
  testDir: 'tests/e2e',
  // Un seul dossier, un seul parcours : aucun parallélisme, aucune relance automatique
  // (une relance masquerait une régression intermittente).
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 6 * 60_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL,
    locale: 'fr-FR',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    // Pas de trace : elle enregistrerait le mot de passe saisi. La capture d'écran en
    // cas d'échec suffit à lire où le parcours a cassé.
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
