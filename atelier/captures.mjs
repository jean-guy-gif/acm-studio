#!/usr/bin/env node
// Mission 126 — les rendus de la page sur les trois journaux d'exemple (fiche, point 9) :
//   node atelier/captures.mjs [dossier de sortie]
// Playwright (déjà installé pour les e2e) ouvre chaque exemple sur un serveur éphémère et capture
// la page en 1280 × 800, hors du dépôt (`~/acm-studio-rendus/126/` par défaut).
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

import { creerAtelier, lireOptions } from './serveur.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const SORTIE = resolve(process.argv[2] ?? join(homedir(), 'acm-studio-rendus', '126'));
const EXEMPLES = ['mission-en-cours', 'migration-en-attente', 'deux-missions'];

mkdirSync(SORTIE, { recursive: true });
const navigateur = await chromium.launch();
try {
  for (const nom of EXEMPLES) {
    const atelier = creerAtelier(
      lireOptions(['--port', '0', '--exemple', join(ICI, 'exemples', nom)]),
    );
    const port = await atelier.ecouter();
    try {
      const page = await navigateur.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(`http://127.0.0.1:${port}/`);
      await page.waitForSelector('.entete, .vide');
      await page.waitForTimeout(300);
      const chemin = join(SORTIE, `atelier-${nom}-1280x800.png`);
      await page.screenshot({ path: chemin, fullPage: true });
      console.log(chemin);
      await page.close();
    } finally {
      atelier.fermer();
    }
  }
} finally {
  await navigateur.close();
}
