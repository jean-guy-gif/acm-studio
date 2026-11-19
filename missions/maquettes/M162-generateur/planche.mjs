// Mission 162 — une planche des pages d'un document, pour les voir d'un coup :
//   node missions/maquettes/M162-generateur/planche.mjs <dossier> <etude|synthese> <sortie.png> [colonnes]
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
const [dir, prefix, out, cols = '4'] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.startsWith(prefix + '-p') && !f.includes('gris') && f.endsWith('.png')).sort();
const imgs = files.map((f) => `<figure><img src="data:image/png;base64,${readFileSync(path.join(dir, f)).toString('base64')}"><figcaption>${f}</figcaption></figure>`).join('');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 800 } });
await page.setContent(`<style>body{margin:8px;font:14px sans-serif;background:#ccc}main{display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px}img{width:100%;border:1px solid #888;background:#fff}figure{margin:0}</style><main>${imgs}</main>`);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
