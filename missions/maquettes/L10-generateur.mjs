// Lancement, mission 10 — maquette : la fiche acquéreur simplifiée (liste de Jean-Guy, 23/11 :
// « une seule prochaine étape, comme côté vendeur »).
// `node missions/maquettes/L10-generateur.mjs --png` écrit L10-fiche-acquereur-simplifiee.html et
// .png. Avant / après, sur ordinateur, tablette et téléphone, d'après la fiche réelle
// (`acquereurs/[buyerId]`) : M. et Mme Rossi, de la démo, avec des biens inventés.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FONTS = pathToFileURL(join(here, '../../src/features/branding/fonts')).href;
const NB = ' ';

const header = `
<div class="card head">
  <div class="hrow"><h2>M. et Mme Rossi</h2><span class="pill now">En visite ▾</span><span class="pill ready">Prêt à visiter</span>
    <span class="grow"></span><span class="btn">☎ 06 39 98 63 04</span><span class="btn">✉ E-mail</span></div>
  <p class="words">«${NB}Un 3 pièces à Antibes ou Juan-les-Pins, avec un extérieur, jusqu’à 400${NB}000${NB}€.${NB}»</p>
  <div class="chips"><span class="chip star">★ Budget ≤ 400${NB}000${NB}€</span><span class="chip star">★ Extérieur</span><span class="chip">Appartement</span><span class="chip">Antibes, Juan-les-Pins</span><span class="chip">3 pièces et plus</span><span class="chip link">Modifier</span></div>
</div>`;

const steps = `
<div class="steps">
  <div class="step done"><b>1 · Sélection ✓</b><span>3 biens</span></div>
  <div class="step done"><b>2 · Présentée ✓</b><span>le 14/11</span></div>
  <div class="step done"><b>3 · Visite ✓</b><span>2 faites</span></div>
  <div class="step"><b>4 · Offre</b><span>quand il en formule une</span></div>
  <div class="step"><b>5 · Compromis</b><span>après l’offre acceptée</span></div>
</div>`;

const next = `
<div class="next">
  <span class="over">Prochaine étape</span>
  <h3>Lui proposer d’autres biens</h3>
  <p>Ses visites sont faites : une nouvelle sélection relance la recherche.</p>
  <span class="cta">Trouver d’autres biens</span>
</div>`;

const others = `
<p class="others"><span class="muted">Autres actions :</span> <span class="l">Rapprocher · 8 correspondances</span> · <span class="l">Bon de visite</span> · <span class="l">Offre d’achat</span> · <span class="l">Modifier sa recherche</span> · <span class="l red">Archiver…</span></p>`;

const item = (label, sub, facts, pill, tone) => `
  <li class="item"><div class="what"><span class="label">${label}</span><span class="muted">${sub}</span>${facts
    .map((fact) => `<span class="fact">${fact}</span>`)
    .join('')}</div><span class="pill ${tone}">${pill}</span></li>`;

const suivi = `
<div class="card">
  <div class="hrow"><h3>Son suivi</h3><span class="grow"></span><span class="l">Changer la sélection</span><span class="l">Dossier acquéreur et lien</span></div>
  <span class="muted">3 biens envoyés · 1 visité · 1 refusé</span>
  <div class="gtitle">Visités <span class="count">1</span></div>
  <ul>${item(`Appartement · 3 pièces · 65${NB}m² · Antibes`, `395${NB}000${NB}€ · Dans l’agence`, ['Envoyé le 14/11, en présentation · Veut le visiter', 'Visité le 22/11 : coup de cœur · gêné : le bruit', 'Visité aujourd’hui : intéressé · on continue à chercher'], 'Visité, à suivre', 'now')}</ul>
  <div class="gtitle">Envoyés, en attente <span class="count">1</span></div>
  <ul>${item(`Appartement · 3 pièces · 64${NB}m² · Antibes`, `372${NB}000${NB}€ · Annonce du marché`, ['Envoyé le 14/11, en présentation'], 'Peut-être', 'wait')}</ul>
  <div class="gtitle">Refusés <span class="count">1</span></div>
  <ul>${item(`Appartement · 3 pièces · 67${NB}m² · Antibes`, `388${NB}000${NB}€ · Annonce du marché`, ['Pas pour lui : Le quartier · le 14/11'], 'Refusé', 'no')}</ul>
</div>`;

const folded = `
<div class="fold">▸ <b>Prêt à visiter</b> <span class="muted">· financement validé · dernier échange aujourd’hui · veille : prochaine recherche le 29/11</span></div>
<div class="fold">▸ <b>Ce qui s’est passé</b> <span class="muted">· 8 événements, le dernier aujourd’hui</span></div>`;

const after = (width) => {
  const wide = width >= 900;
  return `
<div class="page ${wide ? '' : 'narrow'}" style="width:${width}px">
  ${header}${steps}
  ${wide ? `<div class="cols"><div class="main">${suivi}${folded}</div><div class="aside">${next}${others}</div></div>` : `${next}${suivi}${folded}${others}`}
</div>`;
};

const beforeBlock = (title, size, cls = '') =>
  `<div class="bb ${cls}" style="height:${size}px"><span>${title}</span></div>`;
const before = (width) => `
<div class="page narrow before" style="width:${width}px">
  ${beforeBlock('En-tête : son nom, ses mots, ses critères', 70)}
  ${beforeBlock('Les cinq étapes', 34)}
  ${beforeBlock('Sa sélection · 3 biens', 110)}
  ${beforeBlock('Son suivi (les mêmes biens, encore)', 190)}
  ${beforeBlock('Ses bons de visite — « Aucun bon signé »', 40)}
  ${beforeBlock('Ce qui s’est passé · 8 lignes', 120)}
  ${beforeBlock('PROCHAINE ÉTAPE — tout en bas', 60, 'nextb')}
  ${beforeBlock('Prêt à visiter ?', 80)}
  ${beforeBlock('Rapprocher', 50)}
  ${beforeBlock('Statut · Archiver', 34)}
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
.card{background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.06);display:flex;flex-direction:column;gap:8px}
h2{font-family:Rajdhani;font-size:26px;color:#003a57}h3{font-family:Rajdhani;font-size:20px;color:#003a57}
.hrow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.grow{flex:1}
.words{font-size:14px;color:#27272a}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{font-size:11.5px;background:#f4f4f5;border-radius:8px;padding:3px 8px;color:#3f3f46}.chip.star{background:#fef9c3;font-weight:700}.chip.link{background:#e0f2fe;color:#075985;font-weight:700}
.btn{font-size:12px;border:1px solid #d4d4d8;border-radius:10px;padding:5px 10px;background:#fff;white-space:nowrap}
.pill{font-size:11.5px;font-weight:700;border-radius:999px;padding:3px 10px;background:#f4f4f5;color:#3f3f46;white-space:nowrap}
.pill.now{background:#e0f2fe;color:#075985}.pill.ready{background:#059669;color:#fff}.pill.no{background:#fff7ed;color:#9a3412}.pill.wait{background:#fafafa;color:#52525b;border:1px solid #e4e4e7}
.steps{display:grid;grid-template-columns:repeat(5,1fr);background:#fff;border:1px solid #e4e4e7;border-radius:14px;overflow:hidden}
.step{padding:8px 10px;display:flex;flex-direction:column;gap:2px;font-size:11.5px;color:#71717a;border-top:3px solid #e4e4e7}.step b{color:#18181b;font-size:12px}.step.done{border-top-color:#047857}.step.done b{color:#047857}
.narrow .steps{grid-template-columns:repeat(5,minmax(0,1fr))}.narrow .step{padding:6px 6px;font-size:10px}.narrow .step b{font-size:10.5px}
.cols{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:14px;align-items:start}.main,.aside{display:flex;flex-direction:column;gap:12px}
.next{background:#00527a;color:#fff;border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px}
.next .over{font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#ffffffb3}.next h3{color:#fff}.next p{font-size:12.5px;color:#ffffffd9}
.cta{background:#fff;color:#003a57;font-weight:700;font-size:14px;border-radius:12px;padding:10px;text-align:center}
.others{font-size:12.5px;line-height:1.9}.l{font-size:12.5px;font-weight:600;color:#00527a;text-decoration:underline;text-underline-offset:3px}.l.red{color:#b91c1c}
.muted{font-size:12.5px;color:#71717a}
.gtitle{font-size:11.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#00527a;display:flex;align-items:center;gap:8px;margin-top:4px}
.count{font-size:11px;background:#e0f2fe;color:#075985;border-radius:999px;padding:1px 8px;letter-spacing:0}
ul{list-style:none;display:flex;flex-direction:column;gap:8px}
.item{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border:1px solid #e4e4e7;border-radius:12px;padding:9px 12px}
.narrow .item{flex-direction:column}
.what{display:flex;flex-direction:column;gap:2px;min-width:0}.label{font-size:13.5px;font-weight:700;color:#003a57}.fact{font-size:12.5px;color:#3f3f46}
.fold{background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:10px 14px;font-size:13px;color:#003a57}
.before{gap:6px}.bb{background:#fff;border:1px solid #e4e4e7;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#52525b;text-align:center;padding:0 8px}
.bb.nextb{background:#00527a;color:#fff;font-weight:700;border-color:#00527a}
</style></head><body>
<h1>Lancement · 10 — La fiche acquéreur simplifiée : une seule prochaine étape, comme côté vendeur</h1>
<p class="sub">Avant / après. M. et Mme Rossi, de la démo, avec des biens inventés. Rien n’est retiré : ce qui ne sert pas à la prochaine étape se replie ou devient un lien.</p>
<div class="layout">
<div class="col"><div class="ftitle">Avant · tablette et téléphone : dix blocs, la prochaine étape en bas</div>${before(300)}</div>
<div class="col"><div class="ftitle">Après · ordinateur</div>${after(980)}</div>
<div class="col"><div class="ftitle">Après · tablette et téléphone</div>${after(390)}</div>
<div class="notes">
  <div class="note"><b>Avant :</b> sur tablette et téléphone, « Prochaine étape » vient après toute la fiche, 3${NB}000 pixels plus bas. <b>Après :</b> juste sous les étapes, à toutes les largeurs, comme sur la Vue d’ensemble d’un dossier vendeur.</div>
  <div class="note"><b>Avant :</b> le même bien écrit trois fois (« Sa sélection », puis deux lignes de « Son suivi »). <b>Après :</b> une fois sa sélection envoyée ou présentée, ses biens ne se lisent plus que dans « Son suivi » ; « Sa sélection » ne reste que tant qu’elle est à présenter.</div>
  <div class="note"><b>Avant :</b> « Rapprocher », « Ses bons de visite » vides, « Archiver » : chacun son bloc. <b>Après :</b> une ligne « Autres actions », en liens discrets. Les bons et les offres gardent leur bloc dès qu’il y en a un de signé.</div>
  <div class="note"><b>Replié</b>, une ligne chacun, qui dit l’essentiel : « Prêt à visiter » (financement, dernier échange, veille) et « Ce qui s’est passé ». « Prêt à visiter » s’ouvre seul quand il manque quelque chose (financement à confirmer, acquéreur à recontacter).</div>
  <div class="note">Un seul bouton plein : celui de la prochaine étape. Pendant une vente (offre acceptée), « La vente » et « Avant le compromis » restent tels qu’aujourd’hui.</div>
</div>
</div>
</body></html>`;

const out = join(here, 'L10-fiche-acquereur-simplifiee.html');
writeFileSync(out, html);
if (process.argv.includes('--png')) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 2200, height: 1200 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(out).href);
  await page.screenshot({ path: out.replace(/\.html$/, '.png'), fullPage: true });
  await browser.close();
}
console.log(out);
