// Lancement, mission 3 (suite, demande de Jean-Guy du 25/11) — maquette : les biens idéaux d'un
// acquéreur qui a déjà reçu une sélection. « Déjà vus avec lui », à part, sans case « Retenir » ;
// rien de coché en arrivant (0/3) ; sous le compteur de la recherche, les biens retirés.
// `node missions/maquettes/L3b-generateur.mjs --png` écrit L3b-deja-vus-avec-lui.html et .png.
// Avant / après, sur ordinateur et téléphone ; M. et Mme Rossi, de la démo, des biens inventés.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FONTS = pathToFileURL(join(here, '../../src/features/branding/fonts')).href;
const NB = ' ';

const box = (checked) => `<span class="check"><i class="${checked ? 'on' : ''}"></i>Retenir</span>`;
const hit = (label, price, facts, checked = false) => `
<li class="item"><span class="what"><span class="label">${label}</span><span class="fact">${price} · ${facts}</span></span>${box(checked)}</li>`;
const seen = (label, price, origin, mention, tone) => `
<li class="item"><span class="what"><span class="label">${label}</span><span class="fact">${price} · ${origin}</span></span><span class="pill ${tone}">${mention}</span></li>`;

const title = `<div class="head"><span class="back">← M. et Mme Rossi</span><h2>Les biens idéaux de M. et Mme Rossi</h2></div>`;
const agency = `
<div class="card"><h3>Ce que l’agence a déjà</h3>
  <ul>${hit('Maison · 5 pièces · 135 m² · Vence', `713${NB}000${NB}€`, 'Mandat signé · 6 critères sur 6')}</ul>
</div>`;
const categories = (withSeenHouse) => `
  <div class="gtitle">Correspondance forte <span class="count">${withSeenHouse ? 3 : 2}</span></div>
  <ul>
    ${withSeenHouse ? hit('Maison · 6 pièces · 257 m² · Mouans-Sartoux', `1${NB}698${NB}000${NB}€`, `affiché aujourd’hui · 7 critères sur 7`) : ''}
    ${hit('Maison · 6 pièces · 240 m² · Mougins', `1${NB}650${NB}000${NB}€`, `affiché aujourd’hui · 7 critères sur 7`)}
    ${hit('Maison · 7 pièces · 228 m² · Valbonne', `1${NB}590${NB}000${NB}€`, `affiché aujourd’hui · 7 critères sur 7`)}
  </ul>
  <div class="gtitle">Bon compromis <span class="count">1</span></div>
  <ul>${hit('Maison · 5 pièces · 210 m² · Mougins', `1${NB}480${NB}000${NB}€`, `affiché aujourd’hui · Pas de piscine`)}</ul>`;

const before = (width) => `
<div class="page" style="width:${width}px">
  ${title}
  <div class="card"><h3>Sélection actuelle : A, B, C</h3>
    <ul>
      <li class="item"><span class="what"><span class="label">A · Maison · 6 pièces · 283 m² · Mougins</span><span class="fact">1${NB}696${NB}000${NB}€ · Dans l’agence</span><span class="warn">Déjà visité.</span></span>${box(true)}</li>
      <li class="item"><span class="what"><span class="label">B · Maison · 6 pièces · 257 m² · Mouans-Sartoux</span><span class="fact">1${NB}698${NB}000${NB}€ · Annonce du marché</span></span>${box(true)}</li>
      <li class="item"><span class="what"><span class="label">C · Maison · 8 pièces · 200 m² · Mougins</span><span class="fact">1${NB}590${NB}000${NB}€ · Annonce du marché</span></span>${box(true)}</li>
    </ul>
  </div>
  ${agency}
  <div class="card"><h3>Le marché</h3>
    <p class="sum">37 biens reçus sur Mougins, Mouans-Sartoux, Valbonne · 37 annonces comptées</p>
    ${categories(true)}
  </div>
  <div class="foot"><span class="cta off">Retenir la sélection (3/3)</span><span class="muted">Trois biens au plus.</span></div>
</div>`;

const after = (width) => `
<div class="page${width < 600 ? ' narrow' : ''}" style="width:${width}px">
  ${title}
  ${agency}
  <div class="card"><h3>Le marché</h3>
    <p class="sum">37 biens reçus sur Mougins, Mouans-Sartoux, Valbonne · 37 annonces comptées</p>
    <p class="removed">2 biens retirés, déjà vus avec lui : 1 présenté, 1 visité.</p>
    ${categories(false)}
  </div>
  <div class="card seen"><h3>Déjà vus avec lui <span class="count">3</span></h3>
    <p class="muted">Il les a reçus, visités ou refusés : ils ne lui sont plus proposés, et ne se retiennent plus.</p>
    <ul>
      ${seen('Maison · 6 pièces · 283 m² · Mougins', `1${NB}696${NB}000${NB}€`, 'Concurrent à prospecter', 'Visité le 13/11', 'ok')}
      ${seen('Maison · 6 pièces · 257 m² · Mouans-Sartoux', `1${NB}698${NB}000${NB}€`, 'Annonce du marché', 'Présenté le 13/11', 'wait')}
      ${seen('Maison · 8 pièces · 200 m² · Mougins', `1${NB}590${NB}000${NB}€`, 'Annonce du marché', 'Refusé : Le prix', 'no')}
    </ul>
  </div>
  <div class="foot"><span class="cta off">Retenir la sélection (0/3)</span></div>
</div>`;

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
@font-face{font-family:Rajdhani;font-weight:700;src:url(${FONTS}/rajdhani/rajdhani-latin-700.woff2)}
@font-face{font-family:Montserrat;font-weight:100 900;src:url(${FONTS}/montserrat/montserrat-latin.woff2)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,Arial,sans-serif;color:#18181b;background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:16px}
h1{font-size:22px}.sub{font-size:13px;color:#3f3f46;max-width:1700px}
.layout{display:flex;gap:24px;align-items:flex-start}
.col{display:flex;flex-direction:column;gap:6px}.ftitle{font-size:13px;font-weight:700;color:#3f3f46}
.notes{width:340px;display:flex;flex-direction:column;gap:10px}.note{background:#fef6c7;border:1px solid #e8cf5a;border-radius:10px;padding:11px 13px;font-size:12.5px;line-height:1.5;color:#3d3200}
.page{background:#f4f4f5;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:12px}
.head{display:flex;flex-direction:column;gap:4px}.back{font-size:12px;color:#00527a;font-weight:600}
.card{background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.06);display:flex;flex-direction:column;gap:8px}
.card.seen{border-color:#cbd5e1;background:#fafafa}
h2{font-family:Rajdhani;font-size:26px;color:#003a57}h3{font-family:Rajdhani;font-size:20px;color:#003a57;display:flex;align-items:center;gap:8px}
.sum{font-size:13px;color:#3f3f46}.removed{font-size:13px;font-weight:600;color:#3f3f46}
.muted{font-size:12.5px;color:#71717a}.warn{font-size:12.5px;font-weight:700;color:#b45309}
.gtitle{font-size:14px;font-weight:700;color:#18181b;display:flex;align-items:center;gap:8px;margin-top:4px}
.count{font-family:Montserrat;font-size:11px;background:#e0f2fe;color:#075985;border-radius:999px;padding:1px 8px}
ul{list-style:none;display:flex;flex-direction:column;gap:8px}
.item{display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid #e4e4e7;border-radius:12px;padding:9px 12px;background:#fff}
.narrow .item{flex-direction:column;align-items:flex-start}
.what{display:flex;flex-direction:column;gap:2px;min-width:0}.label{font-size:13.5px;font-weight:700;color:#003a57}.fact{font-size:12.5px;color:#3f3f46}
.check{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#3f3f46;white-space:nowrap}
.check i{width:15px;height:15px;border:1.5px solid #71717a;border-radius:3px;display:inline-block}.check i.on{background:#00527a;border-color:#00527a}
.pill{font-size:11.5px;font-weight:700;border-radius:999px;padding:3px 10px;white-space:nowrap}
.pill.ok{background:#ecfdf5;color:#047857}.pill.wait{background:#f4f4f5;color:#3f3f46;border:1px solid #e4e4e7}.pill.no{background:#fff7ed;color:#9a3412}
.foot{display:flex;align-items:center;gap:12px}.cta{font-weight:700;font-size:13.5px;border-radius:12px;padding:9px 14px;border:1px solid #d4d4d8;background:#fff;color:#71717a}
</style></head><body>
<h1>Lancement · 3 (suite) — Les biens idéaux : « Déjà vus avec lui »</h1>
<p class="sub">Avant / après, pour un acquéreur dont la sélection a été présentée le 13/11. M. et Mme Rossi, de la démo, avec des biens inventés.</p>
<div class="layout">
<div class="col"><div class="ftitle">Avant · ordinateur</div>${before(620)}</div>
<div class="col"><div class="ftitle">Après · ordinateur et tablette</div>${after(620)}</div>
<div class="col"><div class="ftitle">Après · téléphone</div>${after(360)}</div>
<div class="notes">
  <div class="note"><b>Avant :</b> la sélection déjà présentée revient cochée (3/3) : impossible de retenir un nouveau bien sans décocher. <b>Après :</b> rien n’est coché en arrivant, le compteur est à 0/3.</div>
  <div class="note"><b>Avant :</b> un bien déjà présenté ressort dans « Le marché » quand son annonce a changé d’adresse. <b>Après :</b> il est reconnu aussi par son identifiant chez le fournisseur de la recherche, et, à défaut, quand la commune, le prix, les pièces et la surface sont les mêmes.</div>
  <div class="note"><b>« Déjà vus avec lui »</b>, à part, sous le marché : chaque bien avec sa mention (« Présenté le 13/11 », « Visité le 13/11 », « Refusé : Le prix »), sans case « Retenir ».</div>
  <div class="note"><b>Sous le compteur de la recherche :</b> le nombre de biens retirés parce qu’il les a déjà vus.</div>
  <div class="note">« Sélection actuelle » ne reste que pour une sélection retenue qu’il n’a pas encore reçue : elle est encore à présenter.</div>
</div>
</div>
</body></html>`;

const out = join(here, 'L3b-deja-vus-avec-lui.html');
writeFileSync(out, html);
if (process.argv.includes('--png')) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 2100, height: 1100 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(out).href);
  await page.screenshot({ path: out.replace(/\.html$/, '.png'), fullPage: true });
  await browser.close();
}
console.log(out);
