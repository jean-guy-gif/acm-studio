// Mission 10 bis (demande de Jean-Guy du 25/11) — maquette : la fiche acquéreur, repliée.
// Avant / après sur la fiche de M. et Mme MERCIER, à la taille d'un écran de portable.
// `node missions/maquettes/M10bis-generateur.mjs` écrit M10bis-fiche-acquereur-repliee.html et .png.
// Les trois captures « avant » (M10bis-avant-1.jpg, -2, -3) sont prises sur la fiche réelle, le menu
// de gauche déjà rogné dans les fichiers.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const FONTS = pathToFileURL(join(here, '../../src/features/branding/fonts')).href;
const NB = '\u00a0';

const shot = (n) => {
  const file = join(here, `M10bis-avant-${n}.jpg`);
  return existsSync(file) ? `data:image/jpeg;base64,${readFileSync(file).toString('base64')}` : '';
};

const STAR =
  '<svg class="star" viewBox="0 0 24 24"><path d="M12 2.6l2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5L2.6 9.5l6.5-.9z"/></svg>';

// ---- Les trois blocs de l'ouverture -------------------------------------------------------------

const who = (open = false) => `
<section class="card who">
  <div class="line1">
    <h1>M. et Mme MERCIER</h1>
    <span class="badge soft">En recherche</span>
    <span class="badge ok">Prêt à visiter</span>
  </div>
  <p class="words">«${NB}Une maison de 6 pièces à Mougins ou Mouans-Sartoux, avec une piscine, jusqu’à 1${NB}700${NB}000${NB}€.${NB}»</p>
  <p class="contact"><span class="btn ghost">☎ 06 39 98 41 52</span><span class="muted">dernier échange il y a 12 j</span></p>
  <div class="fold ${open ? 'open' : ''}">
    <div class="sum"><i>${open ? '▾' : '▸'}</i><b>Ses critères et ce qui compte pour eux</b><span class="muted">8 critères, dont 1 indispensable · 5 souhaits</span></div>
    ${
      open
        ? `<div class="body">
      <p class="chips"><span class="chip must">${STAR}Piscine</span><span class="chip">Maison</span><span class="chip">Mougins, Mouans-Sartoux</span><span class="chip">Budget ≤ 1${NB}700${NB}000${NB}€</span><span class="chip">6 pièces et plus</span><span class="chip">4 chambres et plus</span><span class="chip">200 m² et plus</span><span class="chip">Extérieur</span></p>
      <p class="soft"><b>Ce qui compte pour eux</b> · Au calme <i>«${NB}AU CALME${NB}»</i> · Sans vis-à-vis <i>«${NB}pas de vis-à-vis${NB}»</i> · Une vue <i>«${NB}vue dégagée${NB}»</i> · Lumineux <i>«${NB}séjour lumineux${NB}»</i> · Prêt à vivre, sans travaux <i>«${NB}pas de gros travaux${NB}»</i></p>
      <p class="links"><a>Modifier sa recherche</a><a>Compléter depuis mes notes</a></p>
    </div>`
        : ''
    }
  </div>
</section>`;

const next = `
<section class="card next">
  <div class="kicker">Prochaine étape</div>
  <h2>Lui proposer d’autres biens</h2>
  <p>Ses visites sont faites : une nouvelle sélection relance la recherche.</p>
  <span class="btn full">Trouver d’autres biens</span>
</section>`;

const visit = `
<div class="visit">
  <div class="vhead"><b>Maison · 6 pièces · 283 m² · Mougins</b><span>1${NB}696${NB}000${NB}€</span><span class="pill">Concurrent à prospecter</span><span class="badge soft">Offre envisagée</span></div>
  <p class="muted small">Envoyé le 13/11, par le lien · Veut le visiter, le 13/11 pendant la présentation · visitée le 13/11</p>
  <p>Coup de cœur · a aimé : le quartier, la surface, le parking, le calme, la piscine · gêné : le bruit · Offre envisagée</p>
  <p class="steps"><span class="done">✓ Confirmer la visite</span>→<span class="done">✓ Bon de visite</span>→<span class="done">✓ Visite faite</span></p>
  <p class="links"><a>Offre d’achat</a><a>Bon de visite signé le 13/11</a><a>Messages prêts</a><a>Changer la suite</a><a>Voir la fiche du bien</a></p>
</div>`;

const follow = (open = false) => `
<section class="card follow">
  <div class="fhead"><h2>Son suivi</h2><span class="muted">3 biens envoyés · 1 visité</span></div>
  <div class="row ${open ? 'open' : ''}"><i>${open ? '▾' : '▸'}</i><b>Visités</b><span class="count">1</span><span class="gist">le 13/11 · offre envisagée</span></div>
  ${open ? visit : ''}
  <div class="row"><i>▸</i><b>Envoyés, en attente</b><span class="count">2</span><span class="gist">2 sans réponse</span></div>
  <div class="row none"><i>▸</i><b>Refusés</b><span class="count">0</span><span class="gist">aucun</span></div>
</section>`;

const all = (open = false) => `
<section class="card all ${open ? 'open' : ''}">
  <div class="sum"><i>${open ? '▾' : '▸'}</i><b>Tout le dossier</b><span class="muted">les cinq étapes · autres actions · bons de visite · prêt à visiter ? · ce qui s’est passé · statut</span></div>
  ${
    open
      ? `<div class="body">
    <div class="sub"><h3>Où il en est</h3>
      <p class="five"><span class="done">1 · Sélection ✓<small>3 biens</small></span><span class="done">2 · Présentée ✓<small>le 13/11</small></span><span class="done">3 · Visite ✓<small>le 13/11 · bon signé</small></span><span>4 · Offre<small>quand il en formule une</small></span><span>5 · Compromis<small>après l’offre acceptée</small></span></p></div>
    <div class="sub"><h3>Autres actions</h3>
      <p class="links"><a>Changer la sélection</a><a>Revoir la présentation</a><a>Dossier acquéreur et lien</a><a>Rapprocher · 1 correspondance</a><a>Bon de visite</a><a>Offre d’achat</a></p></div>
    <div class="sub"><h3>Ses bons de visite</h3><p class="links"><a>Signé le 13/11/2026 · Maison · 6 pièces · 283 m² · Mougins</a></p></div>
    <div class="sub fold2"><i>▸</i><b>Prêt à visiter ?</b><span class="muted">financement validé · dernier échange il y a 12 j · veille : dernière recherche le 21/11, prochaine le 28/11</span></div>
    <div class="sub fold2"><i>▸</i><b>Ce qui s’est passé</b><span class="muted">6 événements, le dernier le 13/11</span></div>
    <div class="sub"><h3>Son statut</h3>
      <p class="status"><span class="badge soft">En recherche</span><span class="muted">depuis le 13/11</span><span class="btn ghost sm">En visite</span><span class="btn ghost sm">Abandonné</span><a class="danger">Archiver</a></p></div>
  </div>`
      : ''
  }
</section>`;

const menu = `
<aside class="menu">
  <div class="logo"></div>
  <div class="mi"><b>Aujourd’hui</b><small>Ce qu’il y a à faire</small></div>
  <div class="mg">Vendeurs</div>
  <div class="mi"><b>Préparation</b><small>Dossiers vendeurs</small></div>
  <div class="mi"><b>Live</b><small>Rendez-vous vendeur</small></div>
  <div class="mi"><b>Suivi</b><small>Après le rendez-vous</small></div>
  <div class="mg">Acquéreurs</div>
  <div class="mi on"><b>Acquéreurs</b><small>Ce que chacun cherche</small></div>
  <div class="mi"><b>Visites</b><small>À planifier, faites, retours</small></div>
  <div class="mg">Les deux</div>
  <div class="mi"><b>Prospection</b><small>Courriers et passages</small></div>
</aside>`;

const screen = ({ whoOpen = false, followOpen = false, allOpen = false, clip = true }) => `
<div class="screen ${clip ? 'clip' : ''}">
  ${menu}
  <main>
    <div class="back">← Acquéreurs</div>
    <div class="top">${who(whoOpen)}${next}</div>
    ${follow(followOpen)}
    ${all(allOpen)}
  </main>
</div>`;

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Mission 10 bis — la fiche acquéreur, repliée</title>
<style>
@font-face{font-family:'Nunito Sans';src:url('${FONTS}/nunito-sans/nunito-sans-latin.woff2') format('woff2');font-weight:200 1000;font-style:normal}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Nunito Sans',Arial,sans-serif;background:#d4d4d8;color:#18181b;padding:28px;width:max-content;display:flex;flex-direction:column;gap:22px}
.title{font-size:26px;font-weight:800;color:#18181b}
.lead{font-size:16px;color:#3f3f46;max-width:1500px;line-height:1.45}
.tag{display:inline-block;font-size:15px;font-weight:800;color:#3d3200;background:#fef6c7;border:1px solid #e8cf5a;border-radius:8px;padding:6px 12px}
.tag.after{color:#064e3b;background:#d1fae5;border-color:#6ee7b7}
.rowx{display:flex;gap:18px;align-items:flex-start}
.before{display:flex;flex-direction:column;gap:8px}
.before .frame{width:486px;border:1px solid #a1a1aa;border-radius:8px;overflow:hidden;background:#fff}
.before img{display:block;width:486px}
.cap{font-size:14px;color:#3f3f46;font-weight:700}
.notes{background:#fff;border-radius:12px;padding:18px 22px;max-width:1512px;font-size:15.5px;line-height:1.5;display:grid;grid-template-columns:1fr 1fr;gap:6px 36px}
.notes h4{font-size:16px;font-weight:800;color:#1e2f7a;margin-bottom:2px;grid-column:1/-1;margin-top:6px}
.notes h4:first-child{margin-top:0}
.notes p{padding-left:14px;text-indent:-14px}
.notes .q{grid-column:1/-1}

/* L'écran de portable : 1512 × 771, le menu à gauche */
.screen{width:1512px;background:#f4f5f9;display:flex;border:1px solid #a1a1aa;border-radius:10px;overflow:hidden}
.screen.clip{height:771px}
.menu{width:250px;flex:none;background:#fff;border-right:1px solid #e4e4e7;padding:22px 20px;display:flex;flex-direction:column;gap:13px}
.menu .logo{width:36px;height:36px;border-radius:8px;background:#1e2f7a;margin-bottom:8px}
.menu .mg{font-size:13px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#1e2f7a;border-top:1px solid #e4e4e7;padding-top:14px;margin-top:4px}
.menu .mi{display:flex;flex-direction:column;padding:6px 14px;margin:0 -14px;border-radius:10px}
.menu .mi.on{background:#e3e8fb}
.menu .mi b{font-size:16px;font-weight:600;color:#27272a}
.menu .mi.on b{color:#1e2f7a}
.menu .mi small{font-size:12px;color:#71717a}
main{flex:1;padding:26px 92px 26px 92px;display:flex;flex-direction:column;gap:14px;min-width:0}
.back{font-size:14px;color:#52525b}
.top{display:grid;grid-template-columns:1fr 340px;gap:16px;align-items:stretch}
.card{background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:18px 20px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
h1{font-size:28px;font-weight:800;color:#1e2f7a;line-height:1.1}
h2{font-size:20px;font-weight:800;color:#1e2f7a}
h3{font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1e2f7a;margin-bottom:4px}
.line1{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.badge{font-size:12.5px;font-weight:700;border-radius:999px;padding:3px 10px}
.badge.soft{background:#e3e8fb;color:#1e2f7a;border:1px solid #c7d0f5}
.badge.ok{background:#059669;color:#fff}
.words{font-size:18px;line-height:1.4;margin-top:8px;color:#18181b}
.contact{display:flex;align-items:center;gap:12px;margin-top:10px}
.muted{color:#71717a;font-size:13.5px}
.small{font-size:13px}
.btn{display:inline-flex;align-items:center;justify-content:center;border-radius:12px;font-weight:700;font-size:15px;padding:8px 14px}
.btn.ghost{border:1px solid #d4d4d8;background:#fff;color:#27272a}
.btn.ghost.sm{font-size:13.5px;padding:5px 11px;font-weight:600}
.btn.full{background:#fff;color:#1e2f7a;width:100%;padding:11px 14px;font-size:16px}
.fold{margin-top:12px;border-top:1px solid #e4e4e7;padding-top:10px}
.sum{display:flex;align-items:baseline;gap:8px}
.sum i,.row i,.fold2 i{font-style:normal;color:#1e2f7a;font-size:13px;width:12px;flex:none}
.sum b{font-size:15.5px;color:#1e2f7a;font-weight:700}
.fold .body{margin-top:10px;display:flex;flex-direction:column;gap:9px}
.chips{display:flex;flex-wrap:wrap;gap:7px}
.chip{background:#f4f4f5;border-radius:8px;padding:4px 10px;font-size:14px;color:#3f3f46}
.chip.must{background:#fef6c7;color:#3d3200;font-weight:700;display:inline-flex;align-items:center;gap:4px}
.star{width:13px;height:13px;fill:#b8892b}
.soft{font-size:14px;line-height:1.5;color:#3f3f46}
.soft b{color:#1e2f7a}
.soft i{color:#1e2f7a}
.links{display:flex;flex-wrap:wrap;gap:6px 18px}
a{color:#1e2f7a;text-decoration:underline;text-underline-offset:3px;font-size:14.5px;font-weight:600}
a.danger{color:#dc2626;text-decoration:none;font-weight:600;margin-left:8px}
.next{background:#1e2f7a;border-color:#1e2f7a;color:#fff;display:flex;flex-direction:column;gap:8px}
.next .kicker{font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#c7d0f5}
.next h2{color:#fff;font-size:21px}
.next p{font-size:14.5px;line-height:1.4;color:#e3e8fb;flex:1}
.follow{padding-bottom:8px}
.fhead{display:flex;align-items:baseline;gap:12px;margin-bottom:6px}
.row{display:flex;align-items:center;gap:10px;padding:11px 4px;border-top:1px solid #eeeef0}
.row b{font-size:16px;font-weight:700;color:#18181b;width:210px}
.row .count{min-width:28px;text-align:center;font-weight:800;font-size:14px;color:#1e2f7a;background:#e3e8fb;border-radius:999px;padding:1px 9px}
.row .gist{color:#52525b;font-size:14.5px}
.row.none b,.row.none .gist{color:#a1a1aa}
.row.none .count{background:#f4f4f5;color:#a1a1aa}
.visit{margin:0 0 10px 26px;border:1px solid #e4e4e7;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:7px;font-size:14.5px;line-height:1.4}
.vhead{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.vhead b{font-size:16px}
.pill{border:1px solid #d4d4d8;border-radius:999px;padding:1px 9px;font-size:12.5px;color:#52525b}
.steps{display:flex;gap:8px;align-items:center;color:#71717a;font-size:13px}
.steps .done{background:#d1fae5;color:#065f46;border-radius:999px;padding:2px 9px;font-weight:600}
.all{padding:14px 20px}
.all .body{margin-top:12px;display:flex;flex-direction:column;gap:12px;border-top:1px solid #e4e4e7;padding-top:12px}
.five{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.five span{font-weight:700;font-size:14.5px;color:#3f3f46;display:flex;flex-direction:column;border-top:3px solid #e4e4e7;padding-top:6px}
.five span.done{color:#047857;border-top-color:#059669}
.five small{font-weight:400;color:#71717a;font-size:12.5px}
.fold2{display:flex;align-items:baseline;gap:8px}
.fold2 b{font-size:15px;color:#1e2f7a}
.status{display:flex;align-items:center;gap:10px}
.measure{font-size:14px;font-weight:700;color:#064e3b}
</style></head><body>
<div class="title">Mission 10 bis — la fiche acquéreur, repliée · M. et Mme MERCIER</div>
<div class="lead">Affichage seulement : aucune fonction retirée, aucune règle changée, aucune migration. Modèle : la carte du Suivi vendeur. Écran de portable : 1512 × 771 (la fenêtre de Chrome de Jean-Guy).</div>

<span class="tag">AVANT — la fiche d’aujourd’hui, en production : 2 026 px de haut, deux écrans et demi · à l’ouverture, 9 boutons et 10 liens</span>
<div class="rowx">
  <div class="before"><div class="frame"><img src="${shot(1)}"></div><span class="cap">Écran 1 — l’ouverture</span></div>
  <div class="before"><div class="frame"><img src="${shot(2)}"></div><span class="cap">Écran 2 — en défilant</span></div>
  <div class="before"><div class="frame"><img src="${shot(3)}"></div><span class="cap">Écran 3 — la fin</span></div>
</div>

<span class="tag after">APRÈS — à l’ouverture : trois blocs, tout tient dans l’écran · 2 boutons (le téléphone, la prochaine étape)</span>
${screen({})}

<span class="tag after">APRÈS — un toucher sur « Visités » : le détail de la visite n’apparaît qu’alors</span>
${screen({ followOpen: true, clip: false })}

<span class="tag after">APRÈS — « Ses critères et ce qui compte pour eux » et « Tout le dossier » dépliés : tout y est, « Modifier sa recherche » une seule fois</span>
${screen({ whoOpen: true, allOpen: true, clip: false })}

<div class="notes">
  <h4>Ce qui bouge</h4>
  <p>• Bloc 1, qui il est : le nom, le statut (un badge, plus un bouton), la phrase de sa recherche, son téléphone. Les critères et « Ce qui compte pour eux » sont repliés sur une ligne.</p>
  <p>• Bloc 2, « Prochaine étape » : inchangé, le seul bouton plein.</p>
  <p>• Bloc 3, « Son suivi » : trois lignes avec leur nombre, fermées. Une ligne s’ouvre d’un toucher ; le détail d’une visite n’apparaît qu’alors.</p>
  <p>• « Tout le dossier », replié : les cinq étapes, les autres actions, ses bons de visite, « Prêt à visiter ? », « Ce qui s’est passé », son statut et « Archiver ».</p>
  <p>• « Modifier sa recherche » n’apparaît plus qu’une fois, sous ses critères (aujourd’hui : trois fois).</p>
  <p>• À l’ouverture : 2 boutons au lieu de 9, un écran au lieu de deux et demi.</p>
  <h4>Ce qui ne change pas</h4>
  <p>• Aucune fonction ne part : chaque lien et chaque bouton d’aujourd’hui se retrouve sous un pli.</p>
  <p>• Les règles : la prochaine étape, « Prêt à visiter », la veille, le suivi, l’offre, le bon de visite.</p>
  <p>• Un pli s’ouvre seul quand il faut agir dedans : « Prêt à visiter ? » quand il manque quelque chose (comme aujourd’hui), la ligne du suivi où mène la prochaine étape.</p>
  <p>• Pendant une vente (offre acceptée), « La vente » et « Avant le compromis » restent visibles sous la prochaine étape.</p>
  <h4>Mes choix par défaut, à corriger si besoin</h4>
  <p class="q">1. « Visites à organiser » : une quatrième ligne du suivi, seulement quand il y en a une (les Mercier n’en ont pas) ; elle s’ouvre seule, c’est là qu’on confirme la visite.</p>
  <p class="q">2. « Écartés pour lui, sans lui en parler » passe dans « Tout le dossier ».</p>
  <p class="q">3. « Changer la sélection », « Revoir la présentation » et « Dossier acquéreur et lien » passent dans « Tout le dossier », avec les autres actions.</p>
  <p class="q">4. Le statut devient un simple badge en tête ; on le change dans « Tout le dossier ».</p>
</div>
</body></html>`;

const out = join(here, 'M10bis-fiche-acquereur-repliee.html');
writeFileSync(out, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(out).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
// Le critère mesurable : à l'ouverture, les trois blocs et « Tout le dossier » tiennent dans 771 px.
const fit = await page.evaluate(() => {
  const first = document.querySelector('.screen.clip');
  const main = first.querySelector('main');
  const last = main.lastElementChild.getBoundingClientRect().bottom;
  const top = first.getBoundingClientRect().top;
  return {
    hauteurUtilisee: Math.round(last - top),
    ecran: 771,
    boutons: first.querySelectorAll('main .btn').length,
  };
});
console.log(JSON.stringify(fit));
await page.screenshot({ path: join(here, 'M10bis-fiche-acquereur-repliee.png'), fullPage: true });
await browser.close();
