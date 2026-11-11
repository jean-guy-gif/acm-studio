// Mission 152 — générateur des maquettes « Prouver et voir » (demande de Jean-Guy, 11/11).
// `node missions/maquettes/M152-generateur.mjs --png` écrit M152-1 à M152-5, en HTML et en PNG
// (Chromium du dépôt). Ordinateur, tablette et téléphone, notes avant / après à droite.
// Tout est inventé : biens, prix, textes d'annonce, dates ; les photos sont celles de la démo (CC0).
//
// AVANT = `main` au 11/11 (3b45ea9) : la révélation et la durée du Live (M148 B, planches M148-3 et
// M148-4), « Avant le rendez-vous » (M146 A, planche M146-A4), les biens idéaux (M118, M151-4).

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fonts = pathToFileURL(join(here, '../../src/features/branding/fonts')).href;
const photo = (f) => pathToFileURL(join(here, '../../public/demo/photos', f)).href;

const C = {
  deep: '#00527a',
  soft: '#eaf5ff',
  ink: '#18181b',
  z700: '#3f3f46',
  z600: '#52525b',
  z500: '#71717a',
  z200: '#e4e4e7',
  z100: '#f4f4f5',
  page: '#f7f8fb',
  green: '#12875a',
  greenSoft: '#e7f6ee',
  orange: '#c2410c',
  orangeSoft: '#fff1e6',
  red: '#b91c1c',
  redSoft: '#fdecec',
  note: '#fef6c7',
  noteLine: '#e8cf5a',
  stage1: '#0d2a4d',
  stage2: '#1c4f86',
  panel: 'rgba(255,255,255,.08)',
  panelLine: 'rgba(255,255,255,.18)',
  dim: 'rgba(255,255,255,.72)',
  yellow: '#f5c84c',
};

const PHOTOS = ['maison-03.jpg', 'maison-02.jpg', 'maison-06.jpg', 'maison-05.jpg', 'maison-07.jpg', 'maison-08.jpg', 'maison-01.jpg', 'maison-04.jpg', 'villa-02.jpg', 'villa-05.jpg', 'villa-06.jpg'];

// --- le Live -------------------------------------------------------------------------------------

const liveHead = (step, count) =>
  `<div class="lh"><b>AGENCE HORIZON CÔTE D’AZUR</b><span class="lstep">${step}</span><span class="lcount">${count}</span><span class="lmenu">Réglages · Clair · Plein écran · Quitter</span></div><div class="lprog"><i style="width:${(parseInt(count, 10) / 25) * 100}%"></i></div>`;

const proofBtn = '<button class="proof">Voir l’annonce</button>';

const reveal = (device) => `
  <div class="stage ${device}">
    ${liveHead('CONCURRENT 2 SUR 5 · ÉTAPE 3 SUR 4', '9/25')}
    <div class="lbody">
      <h1 class="lt">Ce prix vous paraît-il cohérent ?</h1>
      <p class="ls">Voici le prix réellement affiché, face au prix que vous imaginiez.</p>
      <div class="lgrid">
        <div class="lphoto"><div class="pic"><img src="${photo(PHOTOS[0])}"><div class="thumbs"><img src="${photo(PHOTOS[1])}"><img src="${photo(PHOTOS[2])}"></div></div><b>Maison · 5 pièces · 135 m² · Saint-Paul-de-Vence</b></div>
        <div class="lpanel">
          <div class="pcard">
            <span class="k">PRIX AFFICHÉ SUR LE MARCHÉ</span>
            <span class="big">740 000 €</span>
            <div class="guess"><span class="k">VOTRE RÉPONSE</span><b>700 000 €</b><small><i class="dot"></i>Prix affiché 5,7 % au-dessus de votre réponse</small></div>
            <div class="pmeta"><span><span class="k">PRIX AU M²</span>5 481 €/m²</span><span><span class="k">POSITION (PRIX/M²)</span>1 / 2</span></div>
            ${proofBtn}
          </div>
          <div class="choices"><span class="k2">Selon vous, ce prix est…</span><div class="ch"><b class="on">Oui, cohérent</b><b>Trop élevé</b><b>Trop bas</b><b>Je ne sais pas</b></div><a>+ Ajouter un commentaire</a></div>
        </div>
      </div>
    </div>
    <div class="lbar"><button class="lprev">← Précédent</button><button class="lnext">Valider et continuer →</button></div>
  </div>`;

const delay = (device) => `
  <div class="stage ${device}">
    ${liveHead('CONCURRENT 2 SUR 5 · ÉTAPE 4 SUR 4', '10/25')}
    <div class="lbody">
      <h1 class="lt">Pourquoi est-il toujours en vente ?</h1>
      <p class="ls">Depuis combien de temps est-il en vente, selon vous ?</p>
      <div class="lgrid">
        <div class="lphoto"><div class="pic"><img src="${photo(PHOTOS[0])}"></div><b>Maison · 5 pièces · 135 m² · Saint-Paul-de-Vence</b></div>
        <div class="lpanel">
          <div class="pcard">
            <span class="k">EN VENTE DEPUIS</span><span class="big">126 jours</span>
            <div class="guess"><span class="k">VOTRE RÉPONSE</span><b>60 jours</b></div>
            <div class="pmeta"><span><span class="k">PRIX AFFICHÉ</span>740 000 €</span><span><span class="k">BAISSE CONNUE</span>−20 000 € le 02/10</span></div>
            ${proofBtn}
            <small class="pnote">Preuve du prix seulement : la durée n’a pas de copie à montrer.</small>
          </div>
          <div class="choices"><span class="k2">Selon vous, pourquoi ?</span><div class="ch"><b>Trop cher</b><b class="on">Défauts</b><b>Mal présenté</b><b>Je ne sais pas</b></div></div>
        </div>
      </div>
    </div>
    <div class="lbar"><button class="lprev">← Précédent</button><button class="lnext">Valider et continuer →</button></div>
  </div>`;

const LISTING_TEXT = `Au calme, à quelques minutes à pied du village, maison provençale de 135 m² sur un terrain plat de 1 100 m². Séjour lumineux avec cheminée ouvrant sur une terrasse exposée sud, cuisine équipée, quatre chambres dont une suite de plain-pied. Garage, piscine 10 × 5, arrosage automatique. Double vitrage, climatisation réversible. Taxe foncière 2 150 €. Honoraires à la charge du vendeur.`;

const proofView = (device, { gone = false } = {}) => `
  <div class="stage ${device} pv">
    ${liveHead('CONCURRENT 2 SUR 5 · ÉTAPE 3 SUR 4', '9/25')}
    <div class="pvbody">
      <div class="pvh"><div><span class="k">L’ANNONCE TELLE QU’ACM L’A ENREGISTRÉE</span><h1 class="lt sm">Maison · 5 pièces · 135 m² · Saint-Paul-de-Vence</h1></div><button class="close">Fermer ✕</button></div>
      <div class="pvgrid">
        <div class="pvphotos"><img class="hero" src="${photo(PHOTOS[0])}"><div class="strip">${PHOTOS.slice(1, 7).map((p) => `<img src="${photo(p)}">`).join('')}<span>+4</span></div></div>
        <div class="pvside">
          <div class="pcard dated">
            <span class="k">PRIX AFFICHÉ</span><span class="big">740 000 €</span>
            <ul class="dates"><li><b>Relevé sur SeLoger le 21/10/2026</b> à l’import</li><li>Revérifié le 10/11/2026 : <b>740 000 €</b>, inchangé</li><li>Une baisse connue : 760 000 € → 740 000 € le 02/10</li></ul>
          </div>
          <div class="facts"><span>135 m²</span><span>5 pièces</span><span>4 chambres</span><span>Terrain 1 100 m²</span><span>DPE C</span><span>Piscine</span><span>Garage</span></div>
          ${gone ? '<div class="gone">L’annonce n’est plus en ligne depuis le 08/11 : il reste la copie enregistrée ci-dessus.</div>' : '<button class="online">Ouvrir l’annonce en ligne ↗</button><small class="dimn">Nouvel onglet · telle que le portail la montre aujourd’hui</small>'}
        </div>
      </div>
    </div>
  </div>`;

// --- l'application (conseiller) -------------------------------------------------------------------

const logo = `<span class="logo"><svg width="30" height="20" viewBox="6 20 52 34"><path d="M18 34a14 14 0 0 1 28 0z" fill="#e8a33d"/><path d="M8 36h48" stroke="${C.deep}" stroke-width="3.2" stroke-linecap="round"/><path d="M12 43c4-2.6 8-2.6 12 0s8 2.6 12 0 8-2.6 12 0" fill="none" stroke="${C.deep}" stroke-width="2.6" stroke-linecap="round"/></svg><span><b>HORIZON</b><i>CÔTE D’AZUR</i></span></span>`;
const GROUPS = [
  [null, [['Aujourd’hui', 'Ce qu’il y a à faire', '3']]],
  ['Vendeurs', [['Préparation', 'Dossiers vendeurs', null, 'v'], ['Live', 'Rendez-vous vendeur'], ['Suivi', 'Après le rendez-vous']]],
  ['Acquéreurs', [['Acquéreurs', 'Ce que chacun cherche', null, 'a'], ['Visites', 'À planifier, faites, retours']]],
  ['Les deux', [['Prospection', 'Courriers et passages']]],
];
const side = (active) => `<aside class="side">${logo}<nav>${GROUPS.map(([label, items], i) => `<div class="grp${i ? ' sep' : ''}">${label ? `<span class="gt">${label}</span>` : ''}${items.map(([l, h, b, a]) => `<a class="it${a === active ? ' on' : ''}"><span class="il">${l}${b ? `<span class="pb">${b}</span>` : ''}</span><span class="ih">${h}</span></a>`).join('')}</div>`).join('')}</nav></aside>`;
const app = (device, active, body, bar = '') =>
  device === 'phone'
    ? `<div class="frame phone"><div class="topbar">${logo}<span class="pb">3</span><span class="burger">☰</span></div><div class="main">${body}</div>${bar}</div>`
    : `<div class="frame ${device}">${side(active)}<div class="main">${body}</div>${bar}</div>`;

const steps = `<div class="tabs"><span>Vue d’ensemble</span><span>Bien vendeur</span><span>Concurrents</span><span class="on">Avant le rendez-vous</span><span>Live</span></div>`;

const beforeMeeting = `
  <a class="back">← Dossiers</a>
  <div class="ph"><h1 class="h1">M. et Mme Bernard · Vence</h1><button class="btn fill">Lancer le Live</button></div>
  ${steps}
  <section class="card alert">
    <div class="ah"><h2 class="h2">Depuis la préparation</h2><span class="muted sm">Annonces revérifiées aujourd’hui à 14 h 05 · 5 sur 5 lues</span></div>
    <ul class="changes">
      <li class="down"><span class="tag o">Prix baissé</span><b>Maison · 5 pièces · 128 m² · Vence</b><span>745 000 € → <b>715 000 €</b> (−4 %), constaté aujourd’hui · au rendez-vous, le vendeur verra 715 000 €</span><div class="acts"><a>Voir la fiche</a></div></li>
      <li class="gn"><span class="tag r">Annonce retirée</span><b>Maison · 4 pièces · 120 m² · Saint-Paul-de-Vence</b><span>plus en ligne depuis le 09/11 (la page renvoie ailleurs) · elle serait montrée comme un bien en vente</span><div class="acts"><a class="btnl">Écarter</a><a>La garder</a></div></li>
    </ul>
    <p class="decision">Votre décision de prix est à actualiser : le prix des concurrents passe de 731 000 € à 724 000 €. <a>Revoir ma décision</a></p>
    <div class="ah2"><button class="btn ghost">Vérifier à nouveau</button><span class="muted sm">Gratuit, par l’extension ACM · 3 annonces inchangées</span></div>
  </section>
  <section class="card"><h2 class="h2">Ce que verra le vendeur</h2><div class="stub w80"></div><div class="stub w60"></div></section>`;

const beforeMeetingNoCheck = `
  <section class="card alert soft">
    <div class="ah"><h2 class="h2">Depuis la préparation</h2><span class="muted sm">Annonces vérifiées il y a 6 jours</span></div>
    <p class="sm">Un prix a pu changer, une annonce a pu disparaître depuis. Vérifiez-les avant le rendez-vous.</p>
    <div class="ah2"><button class="btn ghost">Vérifier les annonces</button><span class="muted sm">Gratuit, par l’extension ACM, environ 1 minute</span></div>
  </section>`;

// --- la fiche complète d'un bien ----------------------------------------------------------------

const fullCard = (device) => `
  <div class="sheet ${device}">
    <div class="sh"><button class="close2">← Leurs biens idéaux</button><span class="tagm">Marché · SeLoger</span></div>
    <div class="carousel"><img src="${photo(PHOTOS[3])}"><span class="cnt">1 / 20</span><span class="arr l">‹</span><span class="arr r">›</span></div>
    <div class="cstrip">${PHOTOS.slice(4, 10).map((p) => `<img src="${photo(p)}">`).join('')}</div>
    <div class="sbody">
      <div class="stitle"><div><h1 class="h1 s">Maison · 5 pièces · 150 m² · Vence</h1><span class="muted sm">Affichée 735 000 € le 10/11 · sur le marché depuis le 14/09 · 1 baisse connue</span></div><div class="sprice"><b>735 000 €</b><small class="g">15 000 € sous le budget</small></div></div>
      <div class="why1"><b>1<sup>er</sup> de Correspondance forte</b> · 8 critères sur 8 · Au calme : « calme absolu, aucun passage »</div>
      <h2 class="h3">Caractéristiques</h2>
      <div class="cgrid"><span><i>Surface</i>150 m²</span><span><i>Terrain</i>1 300 m²</span><span><i>Pièces</i>5</span><span><i>Chambres</i>4</span><span><i>Salles d’eau</i>2</span><span><i>DPE · GES</i>C · B</span><span><i>Extérieur</i>Terrasse, jardin</span><span><i>Stationnement</i>Garage</span><span><i>Piscine</i>Oui</span><span><i>Étage</i>Plain-pied</span><span><i>Chauffage</i>Pompe à chaleur</span><span><i>Construction</i>1978</span></div>
      <h2 class="h3">Le texte de l’annonce</h2>
      <p class="ftext">${LISTING_TEXT} Le bien est vendu meublé en partie ; visites le samedi sur rendez-vous.</p>
      <a class="ext">Voir l’annonce en ligne ↗</a>
    </div>
    <div class="sbar"><span class="sm"><b>Pour M. et Mme Arnaud</b> · 2 biens retenus sur 3</span><button class="btn fill">Retenir ce bien</button></div>
  </div>`;

const idealBehind = `<a class="back">← M. et Mme Arnaud</a><h1 class="h1">Leurs biens idéaux</h1><div class="cardlist">${[3, 6, 2].map((i, k) => `<div class="mini"><img src="${photo(PHOTOS[i])}"><span><b>Maison · ${[5, 4, 4][k]} pièces · ${[150, 128, 135][k]} m²</b><small>${['735 000 €', '710 000 €', '745 000 €'][k]}</small></span></div>`).join('')}</div>`;

// --- CSS --------------------------------------------------------------------------------------

const css = `
@font-face{font-family:Inter;src:url('${fonts}/inter/inter-latin.woff2') format('woff2');font-weight:100 900}
@font-face{font-family:Montserrat;src:url('${fonts}/montserrat/montserrat-latin.woff2') format('woff2');font-weight:100 900}
@font-face{font-family:Rajdhani;src:url('${fonts}/rajdhani/rajdhani-latin-600.woff2') format('woff2');font-weight:600}
@font-face{font-family:Rajdhani;src:url('${fonts}/rajdhani/rajdhani-latin-700.woff2') format('woff2');font-weight:700}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,Arial,sans-serif;color:${C.ink};background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:18px;align-items:flex-start}
h1.sheet{font-size:22px;color:#27272a}.sheet-sub{font-size:13px;color:#3f3f46;max-width:1720px;line-height:1.5}
.layout{display:flex;gap:26px;align-items:flex-start}.rows{display:flex;flex-direction:column;gap:26px}.row{display:flex;gap:22px;align-items:flex-start}
.col{display:flex;flex-direction:column}.ftitle{font-size:13px;font-weight:700;color:#3f3f46;margin-bottom:6px;display:flex;gap:8px;align-items:center}
.st{font-size:11px;font-weight:800;letter-spacing:.1em;border-radius:6px;padding:2px 7px;color:#fff;background:${C.green}}
.notes{width:400px;display:flex;flex-direction:column;gap:12px}.note{background:${C.note};border:1px solid ${C.noteLine};border-radius:10px;padding:12px 14px;font-size:13px;line-height:1.5;color:#3d3200}.note b.t{color:#5b4a00}
code{font-size:12px;background:rgba(0,0,0,.06);padding:0 3px;border-radius:3px}
/* Live */
.stage{color:#fff;background:linear-gradient(160deg,${C.stage1},${C.stage2});border:1px solid #a1a1aa;display:flex;flex-direction:column;font-family:Montserrat,Inter,sans-serif;container-type:inline-size;position:relative;overflow:hidden}
.stage.desk{width:1280px;height:800px}.stage.tab{width:820px;height:1110px}.stage.phone{width:390px;min-height:844px}
.lh{display:flex;align-items:center;gap:14px;padding:12px 22px;font-size:12px}.lh b{letter-spacing:.06em}.lstep{color:#8cc6ff;font-weight:700;letter-spacing:.08em}.lcount{color:${C.dim}}.lmenu{margin-left:auto;color:${C.dim}}
.lprog{height:3px;background:rgba(255,255,255,.12)}.lprog i{display:block;height:100%;background:#8cc6ff}
.lbody{flex:1;padding:18px 24px;display:flex;flex-direction:column;gap:8px;min-height:0}
.lt{font-family:Rajdhani,Montserrat;font-size:36px;font-weight:700;line-height:1.05}.lt.sm{font-size:24px}.ls{color:${C.dim};font-size:14px}
.lgrid{display:grid;grid-template-columns:1.25fr 1fr;gap:20px;margin-top:8px;flex:1;min-height:0}
.lphoto{display:flex;flex-direction:column;gap:8px}.pic{position:relative}.pic>img{width:100%;height:440px;object-fit:cover;border-radius:12px;display:block}
.thumbs{position:absolute;left:10px;bottom:10px;display:flex;gap:6px}.thumbs img{width:46px;height:34px;object-fit:cover;border-radius:5px;border:2px solid #fff}
.lphoto b{font-size:14px}
.lpanel{display:flex;flex-direction:column;gap:12px}
.pcard{background:${C.panel};border:1px solid ${C.panelLine};border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:10px}
.k{font-size:10.5px;font-weight:700;letter-spacing:.12em;color:${C.dim}}.k2{font-size:12.5px;color:${C.dim}}
.big{font-family:Rajdhani,Montserrat;font-size:44px;font-weight:700;line-height:1}
.guess{border-left:3px solid ${C.yellow};padding-left:10px;display:flex;flex-direction:column;gap:2px}.guess b{font-size:22px;color:${C.yellow}}.guess small{font-size:12px;color:${C.yellow}}
.dot{display:inline-block;width:8px;height:8px;border-radius:9px;background:${C.yellow};margin-right:6px}
.pmeta{display:flex;gap:24px;font-size:13px}.pmeta span{display:flex;flex-direction:column;gap:2px}
.proof{align-self:flex-start;font-family:inherit;font-size:14px;font-weight:700;color:#fff;background:transparent;border:1.5px solid rgba(255,255,255,.75);border-radius:10px;padding:9px 14px}
.proof::before{content:'⧉ ';opacity:.85}
.pnote{font-size:11.5px;color:${C.dim}}
.choices{background:${C.panel};border:1px solid ${C.panelLine};border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.ch{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ch b{font-size:13px;text-align:center;border:1px solid rgba(255,255,255,.4);border-radius:9px;padding:8px}.ch b.on{background:#fff;color:${C.deep}}
.choices a{font-size:12px;color:${C.dim}}
.lbar{height:72px;display:flex;justify-content:space-between;align-items:center;padding:0 22px;border-top:1px solid rgba(255,255,255,.12)}
.lprev{font-family:inherit;background:transparent;color:#fff;border:1px solid rgba(255,255,255,.5);border-radius:10px;padding:10px 16px;font-weight:600}
.lnext{font-family:inherit;background:#fff;color:${C.deep};border:0;border-radius:10px;padding:12px 20px;font-weight:800}
@container (max-width:900px){.lgrid{grid-template-columns:1fr}.pic>img{height:330px}.lt{font-size:30px}}
@container (max-width:500px){.lmenu,.lcount{display:none}.lh{padding:10px 14px}.lt{font-size:24px}.lbody{padding:12px 14px}.pic>img{height:190px}.big{font-size:34px}.ch b{font-size:12px}.lbar{padding:0 14px}}
/* la copie enregistrée */
.pvbody{flex:1;padding:16px 24px 20px;display:flex;flex-direction:column;gap:12px;min-height:0;background:rgba(5,15,30,.35)}
.pvh{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.close{font-family:inherit;background:#fff;color:${C.deep};border:0;border-radius:10px;padding:10px 16px;font-weight:800;white-space:nowrap}
.pvgrid{display:grid;grid-template-columns:1.3fr 1fr;gap:20px;flex:1;min-height:0}
.pvphotos{display:flex;flex-direction:column;gap:8px}.pvphotos .hero{width:100%;height:470px;object-fit:cover;border-radius:12px;display:block}
.strip{display:flex;gap:6px;align-items:center}.strip img{width:70px;height:50px;object-fit:cover;border-radius:6px}.strip span{font-size:13px;color:${C.dim};padding-left:4px}
.pvside{display:flex;flex-direction:column;gap:12px;overflow:hidden}
.dates{list-style:none;font-size:12.5px;line-height:1.5;color:${C.dim};display:flex;flex-direction:column;gap:3px}.dates b{color:#fff}
.facts{display:flex;flex-wrap:wrap;gap:6px}.facts span{font-size:12px;border:1px solid ${C.panelLine};border-radius:999px;padding:4px 10px}
.ptext p{font-size:13px;line-height:1.55;color:#e6eef8;margin-top:6px}
.online{align-self:flex-start;font-family:inherit;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.75);border-radius:10px;padding:9px 14px;font-weight:700}.dimn{font-size:11.5px;color:${C.dim}}
.gone{font-size:13px;background:rgba(255,255,255,.1);border-left:3px solid #ffb4a8;border-radius:8px;padding:10px 12px}
@container (max-width:900px){.pvgrid{grid-template-columns:1fr}.pvphotos .hero{height:380px}}
@container (max-width:500px){.pvbody{padding:12px 14px}.pvphotos .hero{max-height:220px}.strip img{width:52px;height:38px}.pvphotos .hero{height:210px}.close{padding:8px 12px}}
/* application */
.frame{background:${C.page};border:1px solid #a1a1aa;overflow:hidden;position:relative;display:flex}
.frame.desk{width:1280px;min-height:800px}.frame.tab{width:820px;min-height:1110px}.frame.phone{width:390px;min-height:844px;flex-direction:column}
.side{width:248px;flex:none;background:#fff;border-right:1px solid ${C.z200};padding:22px 16px;display:flex;flex-direction:column;gap:24px}.tab .side{width:212px}
.logo{display:flex;align-items:center;gap:6px;color:${C.deep}}.logo span{display:flex;flex-direction:column;line-height:1}
.logo b{font-family:Montserrat;font-size:15px;font-weight:800;letter-spacing:.08em}.logo i{font-style:normal;font-family:Montserrat;font-size:7px;font-weight:600;letter-spacing:.2em;margin-top:2px}
nav{display:flex;flex-direction:column;gap:4px}.grp{display:flex;flex-direction:column;gap:2px}.grp.sep{border-top:1px solid ${C.z200};margin-top:10px;padding-top:12px}
.gt{font-family:Montserrat;font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.deep};padding:0 12px 4px}
.it{display:flex;flex-direction:column;border-radius:12px;padding:7px 12px}.il{display:flex;justify-content:space-between;font-family:Rajdhani,Montserrat;font-size:16px;font-weight:600;color:${C.z600}}.ih{font-size:11.5px;color:${C.z500}}
.it.on{background:${C.soft}}.it.on .il{color:${C.deep}}
.pb{border-radius:999px;background:#ea580c;color:#fff;font-family:Inter;font-size:11px;font-weight:700;padding:1px 7px;align-self:center}
.topbar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid ${C.z200};background:#fff}.topbar .logo{flex:1}
.burger{width:38px;height:38px;border:1px solid ${C.z200};border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px}
.main{flex:1;min-width:0;padding:28px 34px 40px;display:flex;flex-direction:column;gap:14px;container-type:inline-size;overflow:hidden;position:relative}
.tab .main{padding:22px 22px 40px}.phone .main{padding:14px 14px 40px;gap:12px}
.back{font-size:13px;color:${C.z500}}.ph{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.h1{font-family:Rajdhani,Montserrat;font-weight:700;font-size:32px;line-height:1.05;color:${C.deep}}.phone .h1{font-size:25px}.h1.s{font-size:26px}
.h2{font-family:Rajdhani,Montserrat;font-weight:700;font-size:22px;color:${C.deep}}.h3{font-size:12.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.z600};margin-top:6px}
.card{background:#fff;border:1px solid ${C.z200};border-radius:16px;padding:18px 20px;display:flex;flex-direction:column;gap:12px}.phone .card{padding:14px}
.muted{color:${C.z500}}.sm{font-size:12.5px;line-height:1.45}
.btn{font-family:inherit;font-size:14px;font-weight:700;border-radius:12px;padding:10px 16px;border:1.5px solid ${C.deep};background:#fff;color:${C.deep};white-space:nowrap}.btn.fill{background:${C.deep};color:#fff}
.tabs{display:flex;gap:4px;flex-wrap:wrap;background:#fff;border:1px solid ${C.z200};border-radius:12px;padding:4px}.tabs span{font-size:13px;padding:7px 11px;border-radius:9px;color:${C.z600}}.tabs span.on{background:${C.soft};color:${C.deep};font-weight:700}
.alert{border-left:5px solid ${C.orange}}.alert.soft{border-left-color:${C.deep}}
.ah{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}.ah2{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.changes{list-style:none;display:flex;flex-direction:column}.changes li{display:grid;grid-template-columns:120px 1fr auto;gap:4px 12px;align-items:baseline;padding:10px 0;border-top:1px solid ${C.z100};font-size:13.5px}
.acts{grid-column:3;grid-row:1;display:flex;gap:10px;align-items:center}
.changes li b{grid-column:2}.changes li>span:not(.tag){grid-column:2;color:${C.z600};font-size:13px}.changes li a{font-weight:700;color:${C.deep};font-size:13px;white-space:nowrap}
.changes .btnl{border:1.5px solid ${C.deep};border-radius:9px;padding:5px 10px}
.tag{font-size:11.5px;font-weight:700;border-radius:999px;padding:3px 9px;grid-row:1 / span 2;align-self:start}.tag.o{background:${C.orangeSoft};color:${C.orange}}.tag.r{background:${C.redSoft};color:${C.red}}
@container (max-width:560px){.changes li{grid-template-columns:1fr}.changes li .tag{grid-row:auto;justify-self:start}.changes li b,.changes li>span:not(.tag){grid-column:1}.acts{grid-column:1;grid-row:auto}}
.decision{font-size:13.5px;background:${C.orangeSoft};border-radius:10px;padding:10px 12px;color:#7a2e0b}.decision a{font-weight:700;color:${C.deep}}
.stub{height:10px;border-radius:5px;background:#e4e4e7}.w60{width:60%}.w80{width:80%}
/* fiche complète */
.overlay{position:absolute;inset:0;background:rgba(15,23,42,.45);display:flex;justify-content:flex-end}
.sheet{background:#fff;display:flex;flex-direction:column;overflow:hidden;box-shadow:-10px 0 30px rgba(0,0,0,.2)}
.sheet.desk{width:640px;height:100%}.sheet.tab{width:100%;height:100%}.sheet.phone{width:100%;min-height:844px}
.sh{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid ${C.z200}}.close2{font-family:inherit;border:0;background:none;color:${C.deep};font-weight:700;font-size:14px}
.tagm{font-size:12px;font-weight:700;background:${C.soft};color:${C.deep};border-radius:999px;padding:3px 10px}
.carousel{position:relative}.carousel img{width:100%;height:330px;object-fit:cover;display:block}.phone .carousel img{height:240px}
.cnt{position:absolute;right:12px;bottom:12px;background:rgba(0,0,0,.6);color:#fff;font-size:12px;border-radius:999px;padding:3px 9px}
.arr{position:absolute;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:99px;background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;font-size:22px;color:${C.deep}}.arr.l{left:10px}.arr.r{right:10px}
.cstrip{display:flex;gap:6px;padding:8px 16px;overflow:hidden}.cstrip img{width:72px;height:52px;object-fit:cover;border-radius:7px;flex:none}
.sbody{padding:4px 18px 90px;display:flex;flex-direction:column;gap:10px;overflow:hidden;flex:1}
.stitle{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.sprice{display:flex;flex-direction:column;align-items:flex-end}.sprice b{font-size:20px}.sprice small{font-size:12px}.g{color:${C.green}}
.why1{font-size:13px;background:#f8fafc;border:1px solid ${C.z200};border-radius:10px;padding:8px 10px;color:${C.z700}}
.cgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.cgrid span{display:flex;flex-direction:column;font-size:13.5px;font-weight:600;background:${C.z100};border-radius:10px;padding:8px 10px}.cgrid i{font-style:normal;font-size:11px;font-weight:600;color:${C.z500}}
.ftext{font-size:14px;line-height:1.6;color:${C.z700}}.ext{font-weight:700;color:${C.deep};font-size:14px}
.sbar{position:absolute;left:0;right:0;bottom:0;background:#fff;border-top:1px solid ${C.z200};display:flex;align-items:center;gap:12px;padding:12px 16px}
.sbar .btn{margin-left:auto}.cbx{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600}.cbx i{width:20px;height:20px;border:2px solid ${C.deep};border-radius:5px}
.sheet{position:relative;container-type:inline-size}
@container (max-width:560px){.cgrid{grid-template-columns:1fr 1fr}.stitle{flex-direction:column}.sprice{align-items:flex-start;flex-direction:row;gap:10px;align-items:baseline}}
.cardlist{display:flex;flex-direction:column;gap:10px}.mini{display:flex;gap:12px;background:#fff;border:1px solid ${C.z200};border-radius:14px;padding:10px}.mini img{width:110px;height:72px;object-fit:cover;border-radius:9px}.mini span{display:flex;flex-direction:column;gap:4px;font-size:14px}.mini small{color:${C.z500}}
`;

const col = (label, html, sub = '') => `<div class="col"><div class="ftitle"><span class="st">APRÈS</span>${label}${sub}</div>${html}</div>`;
const sheetHtml = ({ title, sub, rows, notes }) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>
<h1 class="sheet">${title}</h1><p class="sheet-sub">${sub}</p>
<div class="layout"><div class="rows">${rows.map((r) => `<div class="row">${r.join('')}</div>`).join('')}</div>
<div class="notes">${notes.map(([t, b]) => `<div class="note"><b class="t">${t} :</b> ${b}</div>`).join('')}</div></div></body></html>`;

const withSheet = (device) => app(device, 'a', idealBehind + `<div class="overlay">${fullCard(device)}</div>`);

const SHEETS = {
  'M152-1-le-prix-revele.html': {
    title: 'M152 · 1 — Live : « Voir l’annonce » sur la révélation du prix',
    sub: '« Ce prix vous paraît-il cohérent ? » (M148 B), une fois le prix révélé. Le bouton est dans le bloc du prix, en contour : le seul plein reste « Valider et continuer ».',
    rows: [[col('Ordinateur · 1280 × 800', reveal('desk'))], [col('Tablette portrait · 820 × 1110', reveal('tab')), col('Téléphone · 390', reveal('phone'))]],
    notes: [
      ['Avant', 'Le prix révélé, la réponse du vendeur en couleur, l’écart écrit (M148 B). Si le vendeur doute du prix, le conseiller n’a rien à lui montrer : il ouvre son téléphone, cherche l’annonce, le Live attend.'],
      ['Après', '« Voir l’annonce », en contour blanc, dans le bloc du prix, sous l’écart : il n’apparaît qu’<b>après</b> la révélation (la garde de donnée de la M51 : rien de l’annonce n’arrive au navigateur avant). Il ouvre la copie enregistrée (planche 3), sans quitter l’écran ni écrire quoi que ce soit, comme « Revoir » (M113).'],
      ['Où', 'Ici (écran 3 sur 4), sur l’écran de la durée (planche 2), sur l’écran 2 du rythme accéléré (prix et durée ensemble), sur l’écran d’un bien en présentation directe, et dans « Revoir » pour un concurrent dont le prix a été révélé. Jamais avant la révélation, jamais pour un « Non ».'],
      ['Téléphone', 'Le bouton passe sous l’écart ; la barre du bas ne change pas.'],
    ],
  },
  'M152-2-la-duree.html': {
    title: 'M152 · 2 — Live : « Voir l’annonce » sur l’écran suivant, la durée',
    sub: '« Pourquoi est-il toujours en vente ? », une fois la durée révélée. Le vendeur peut douter du prix un écran plus tard : le même bouton, la même preuve, celle du prix. La durée n’a pas de preuve.',
    rows: [[col('Ordinateur · 1280 × 800', delay('desk'))], [col('Tablette portrait · 820 × 1110', delay('tab')), col('Téléphone · 390', delay('phone'))]],
    notes: [
      ['Avant', 'Sur l’écran de la durée, le prix n’est plus rappelé ; rien ne permet de revenir à l’annonce.'],
      ['Après', 'Le bloc rappelle le prix affiché et la baisse connue (déjà livrés au navigateur), et porte le même « Voir l’annonce ». La copie ouverte est celle du prix (planche 3) : aucune preuve de la durée, comme demandé (Jean-Guy, 11/11).'],
      ['La petite ligne', '« Preuve du prix seulement : la durée n’a pas de copie à montrer. » est une note pour la maquette, pas un texte d’écran : devant le vendeur, rien ne parle de ce qu’on ne montre pas.'],
    ],
  },
  'M152-3-l-annonce-enregistree.html': {
    title: 'M152 · 3 — Live : l’annonce telle qu’ACM l’a enregistrée, puis en ligne',
    sub: 'Ce qu’ouvre « Voir l’annonce » : une couche plein écran par-dessus le Live, pour confirmer le prix — photos, prix et ses dates, caractéristiques, pas le texte —, puis, si le conseiller veut tout montrer, l’annonce en ligne dans un nouvel onglet. Dates inventées pour la maquette.',
    rows: [[col('Ordinateur · 1280 × 800', proofView('desk'))], [col('Tablette portrait · 820 × 1110', proofView('tab')), col('Téléphone · 390 · annonce retirée', proofView('phone', { gone: true }))]],
    notes: [
      ['Ce qui est montré', 'Seulement de quoi confirmer le prix (Jean-Guy, 11/11) : les photos telles que le portail les publie (M58), le prix affiché <b>et ses dates</b> — le relevé à l’import (la copie écrite une seule fois), la dernière relecture, la baisse connue (`listing_observations`, M47) —, les caractéristiques. <b>Jamais</b> le titre du portail ni son adresse (M107) : le libellé neutre reste.'],
      ['Pas le texte', 'Le texte de l’annonce n’est pas dans la couche : mesuré sur 73 annonces, 32 nomment l’agence ou un de ses agents, 19 disent « exclusivité », 6 portent un numéro et une rue (M83, M107). La copie le garde pour le conseiller (fiche complète, planche 5) ; il n’arrive jamais au navigateur du Live.'],
      ['En ligne', '« Ouvrir l’annonce en ligne ↗ », en contour, nouvel onglet, si le conseiller veut tout montrer : l’adresse de l’annonce n’arrive au navigateur qu’à ce toucher (une action qui revérifie la révélation). Annonce retirée (M103) : la ligne le dit, la copie enregistrée reste.'],
      ['Photos', 'Les photos restent sur les serveurs des portails : 228 sur 230 s’affichaient encore le 11/11 (jusqu’à plus de 30 jours après l’import). Une photo morte laisse le cadre gris (M87).'],
      ['Fermer', '« Fermer » rend l’écran du Live inchangé ; la couche n’écrit rien, ne change pas l’adresse et suspend les flèches du clavier, comme « Revoir » (M113).'],
    ],
  },
  'M152-4-avant-le-rendez-vous.html': {
    title: 'M152 · 4 — Avant le rendez-vous : ce qui a changé depuis la préparation',
    sub: '« Avant le rendez-vous » (M146 A) gagne un bloc en tête : les annonces des concurrents retenus revérifiées par l’extension, gratuitement, et ce qui a changé.',
    rows: [
      [col('Ordinateur · 1280', app('desk', 'v', beforeMeeting))],
      [col('Tablette · 820', app('tab', 'v', beforeMeeting)), col('Téléphone · 390 · pas encore vérifié', app('phone', 'v', `<a class="back">← Dossiers</a><h1 class="h1">M. et Mme Bernard · Vence</h1>${steps}${beforeMeetingNoCheck}<section class="card"><h2 class="h2">Ce que verra le vendeur</h2><div class="stub w80"></div></section>`))],
    ],
    notes: [
      ['Avant', 'Rien ne dit qu’un concurrent a baissé son prix ou retiré son annonce depuis la préparation : le vendeur l’apprend parfois avant le conseiller. La relecture des prix (M105) n’existe qu’après la conclusion (`status = meeting_completed`).'],
      ['Après', '« Vérifier les annonces » relit, par l’extension et sans appel payant, les annonces des concurrents retenus (la relecture de la M105, ouverte aux dossiers en préparation et prêts). Résultat : <b>Prix baissé</b> ou <b>monté</b> (ancien → nouveau, l’écart), <b>Annonce retirée</b> sur preuve (M103), et le compte des inchangées et des illisibles.'],
      ['Ce que ça change', 'Un prix changé met à jour le concurrent, comme au Suivi : au Live, le vendeur verra le prix du jour (et le prix révélé se fige à sa devinette, M96). La décision de prix devient « à actualiser » (M108), avec son lien. Une annonce retirée propose « Écarter » ou « La garder » (l’avertissement de la M103).'],
      ['Quand', 'Sans vérification depuis plus de 24 h (téléphone) : le bloc le dit et propose « Vérifier les annonces » ; « Lancer le Live » le rappelle sans bloquer (M52). Question 6.'],
      ['Un seul plein', '« Lancer le Live » reste le seul plein (M146 A) ; « Vérifier à nouveau » en contour.'],
    ],
  },
  'M152-5-la-fiche-complete.html': {
    title: 'M152 · 5 — La fiche complète d’un bien, avec « Retenir »',
    sub: 'Pour le conseiller seul, pour qu’il soit sûr des biens qu’il propose (Jean-Guy, 11/11). Un toucher sur une carte des biens idéaux (ou de la sélection d’un acquéreur, de « Proposer ce bien », d’un mandat de l’agence) ouvre la fiche entière : toutes les photos en défilement, toutes les caractéristiques, le texte complet, le lien vers l’annonce, et « Retenir » sur la même fiche. Panneau à droite sur ordinateur, plein écran sur tablette et téléphone.',
    rows: [[col('Ordinateur · 1280 · panneau à droite', withSheet('desk'))], [col('Tablette · 820 · plein écran', app('tab', 'a', `<div class="overlay" style="background:none">${fullCard('tab')}</div>`)), col('Téléphone · 390 · plein écran', `<div class="frame phone" style="display:block">${fullCard('phone')}</div>`)]],
    notes: [
      ['Avant', 'La carte d’un bien idéal dit le libellé, le prix, les critères et une photo ; pour en voir plus, le conseiller ouvre le portail dans un autre onglet et perd sa sélection de vue.'],
      ['Après', 'Le carrousel (glisser au doigt, flèches au clavier, « 1 / 20 »), les vignettes, puis le prix et ses dates, la raison du rang (M151, si elle existe), toutes les caractéristiques connues (une absente n’a pas de case, jamais « — »), le texte complet, « Voir l’annonce en ligne ↗ » ; en bas, fixée, la barre « Retenir ce bien » (le seul plein), qui l’ajoute à la sélection de la fiche acquéreur et compte « 2 biens retenus sur 3 » ; retenu, il devient « Retenu ✓ · Retirer » en contour.'],
      ['Ce que chaque source apporte (mesuré)', 'Concurrent importé : 10 à 11 photos en médiane (jusqu’à 20), le texte complet, la date de publication. Annonce Stream Estate : 5 photos copiées chez Stream Estate (86 biens sur 105), jusqu’à 20 photos d’origine (`picturesRemote`) et le texte complet dans la même réponse, aujourd’hui jetés (question 8). Mandat de l’agence : 13 photos en médiane dans notre stockage, sa description. Bien démarché : ses faits et ses photos, jamais son texte (M120 A).'],
      ['390 px', 'Plein écran, le carrousel à 240 px de haut, les caractéristiques sur deux colonnes, la barre « Retenir ce bien » fixée sous le pouce ; la croix est « ← Leurs biens idéaux ».'],
    ],
  },
};

for (const [name, def] of Object.entries(SHEETS)) writeFileSync(join(here, name), sheetHtml(def));

if (process.argv.includes('--png')) {
  const { chromium } = await import(pathToFileURL(join(here, '../../node_modules/playwright/index.mjs')).href);
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  for (const name of Object.keys(SHEETS)) {
    await tab.goto(pathToFileURL(join(here, name)).href);
    await tab.evaluate(() => document.fonts.ready);
    await tab.waitForTimeout(300);
    await tab.screenshot({ path: join(here, name.replace('.html', '.png')), fullPage: true });
  }
  await browser.close();
}
console.log(`${Object.keys(SHEETS).length} planches écrites`);
