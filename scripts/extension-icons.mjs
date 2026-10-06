// Mission 73 — les icônes de l'extension (16, 32, 48 et 128 px), exigées par le Chrome Web Store.
// Monogramme « ACM » aux couleurs de l'app (--color-brand-deep, --color-brand de globals.css),
// tracé en chemins : aucune police, donc le même rendu sur toutes les machines. Le rendu passe
// par le Chromium de Playwright, déjà installé pour `npm run e2e`.
//
//   npm run extension:icons   → extension/icons/icon-<taille>.png (fichiers commités)
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { chromium } from '@playwright/test';

import { ICON_SIZES } from './extension-zip.mjs';

const BRAND_DEEP = '#00527a';
const BRAND = '#3ea9ff';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="26" fill="${BRAND_DEEP}"/>
  <g fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
    <path d="M15 84 L28.5 40 L42 84 M20.5 69 L36.5 69"/>
    <path d="M76 50 C68 37 50 42 50 62 C50 82 68 87 76 74"/>
    <path d="M86 84 L86 40 L99.5 64 L113 40 L113 84"/>
  </g>
  <rect x="15" y="100" width="98" height="7" rx="3.5" fill="${BRAND}"/>
</svg>`;

const target = join(process.cwd(), 'extension', 'icons');
await mkdir(target, { recursive: true });

const browser = await chromium.launch();
try {
  for (const size of ICON_SIZES) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    );
    await page.screenshot({ path: join(target, `icon-${size}.png`), omitBackground: true });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`Icônes de l'extension écrites dans ${target}`);
