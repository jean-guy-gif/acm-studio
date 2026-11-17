// M159 — générateur des planches « dessinées » (refus du 17/11 : « beaucoup plus visuelles »).
// `node missions/maquettes/M159-dessins-generateur.mjs --png` écrit six planches, HTML et PNG :
//   M159-2a urbanisme (deux variantes) et permis ; M159-2b risques (deux variantes) ;
//   M159-2c ventes (deux variantes) ; M159-2d population et copropriété ;
//   M159-3 la synthèse et l'Étude de marché en A4, en couleur et en noir et blanc.
// Seulement ce que renvoie la vue « bien-client » de l'API d'essai (dossier de démonstration, 17/11) ;
// les échelles officielles que l'API ne donne pas sont nommées dans les notes.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FONTS = pathToFileURL(join(here, '../../src/features/branding/fonts')).href;
const NB = ' '; // espace insécable : « 40 m » ne se coupe jamais
const m = (n) => `${n}${NB}m`;
const euro = (n) => `${n.toLocaleString('fr-FR').replace(/[  ]/g, NB)}${NB}€`;

// La vue « bien-client » : les 11 ventes (mois, rue, surface, prix, distance arrondie).
const SALES = [
  ['2025-11', 'Boulevard Maréchal Juin', 118, 876800, 100],
  ['2024-04', 'Chemin du Val Fleuri', 119, 945575, 150],
  ['2023-07', 'Boulevard Maréchal Juin', 134, 783266, 250],
  ['2023-03', 'Boulevard Maréchal Juin', 114, 615551, 100],
  ['2023-03', 'Avenue de Nice', 121, 663830, 250],
  ['2022-10', 'Rue des Oliviers', 133, 847604, 50],
  ['2022-04', 'Avenue de Nice', 125, 640615, 100],
  ['2022-01', 'Chemin des Collettes', 132, 754667, 150],
  ['2021-12', 'Rue des Oliviers', 123, 879320, 250],
  ['2021-08', 'Chemin du Val Fleuri', 136, 628193, 150],
  ['2021-02', 'Boulevard Maréchal Juin', 117, 669325, 150],
];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const monthLabel = (ym) => `${MONTHS[Number(ym.slice(5)) - 1]}${NB}${ym.slice(0, 4)}`;
const shortPrice = (n) => `${Math.round(n / 1000)}${NB}k€`;

// ---------- Les dessins (SVG), en traits et aplats : lisibles en noir et blanc ----------

// Anneaux de distance : un schéma, pas une carte — aucun point placé, les comptes dans les anneaux.
function ringsSvg({ size = 440, bands, center = 'Votre bien', ink = '#fff', faint = 'rgba(255,255,255,.14)', strong = 'rgba(124,196,255,.35)', paper = false }) {
  // Dessiné sur 440 unités, affiché à la taille voulue : les textes suivent.
  const V = 440;
  const c = V / 2;
  const r0 = 104;
  const r1 = 214;
  const home = ink === '#fff' ? '#0f3a66' : '#fff';
  const [count1, ...label1] = String(bands[1].count).split(' ');
  // À l'impression, chaque texte posé sur les hachures reçoit un fond blanc (noir et blanc lisible).
  const bg = (y, text, size) => {
    if (!paper || !text) return '';
    const w = String(text).length * size * 0.58 + 14;
    return `<rect x="${c - w / 2}" y="${y - size}" width="${w}" height="${size + 8}" rx="5" fill="#fff"/>`;
  };
  return `<svg viewBox="0 0 ${V} ${V}" width="${size}" height="${size}" class="draw">
    <circle cx="${c}" cy="${c}" r="${r1}" fill="${bands[1].hit ? strong : faint}" stroke="${ink}" stroke-opacity=".6" stroke-width="2" ${bands[1].hit ? '' : 'stroke-dasharray="6 6"'}/>
    <circle cx="${c}" cy="${c}" r="${r0}" fill="${bands[0].hit ? strong : faint}" stroke="${ink}" stroke-opacity=".75" stroke-width="2" ${bands[0].hit ? '' : 'stroke-dasharray="6 6"'}/>
    <circle cx="${c}" cy="${c + 18}" r="26" fill="${ink}"/>
    <path d="M${c - 13} ${c + 22} l13 -11 13 11 v12 h-26z" fill="none" stroke="${home}" stroke-width="2.4" stroke-linejoin="round"/>
    <text x="${c}" y="${c + 66}" text-anchor="middle" class="t-center" fill="${ink}">${center}</text>
    <text x="${c}" y="${c - r0 + 30}" text-anchor="middle" class="t-band" fill="${ink}">${bands[0].range}</text>
    <text x="${c}" y="${c - r0 + 54}" text-anchor="middle" class="t-count" fill="${ink}">${bands[0].count}</text>
    ${bg(c - r1 + 30, bands[1].range, 16)}${bg(c - r1 + 76, count1, 52)}${bg(c - r1 + 100, label1.join(' '), 15)}${bg(c + r1 - 34, bands[1].sub, 15)}
    <text x="${c}" y="${c - r1 + 30}" text-anchor="middle" class="t-band" fill="${ink}">${bands[1].range}</text>
    <text x="${c}" y="${c - r1 + 76}" text-anchor="middle" class="t-count huge" fill="${ink}">${count1}</text>
    <text x="${c}" y="${c - r1 + 100}" text-anchor="middle" class="t-sub" fill="${ink}">${label1.join(' ')}</text>
    <text x="${c}" y="${c + r1 - 34}" text-anchor="middle" class="t-sub" fill="${ink}">${bands[1].sub ?? ''}</text>
  </svg>`;
}

// Une jauge en cases : l'échelle officielle, la case du bien pleine, les autres vides.
function segGauge({ steps, value, labels, ink = '#fff', w = 360 }) {
  const cell = (w - (steps - 1) * 6) / steps;
  return `<svg viewBox="-16 0 ${w + 32} 88" width="${w + 32}" height="88" class="draw">${Array.from({ length: steps }, (_, i) => {
    const on = i + 1 <= value;
    return `<rect x="${i * (cell + 6)}" y="4" width="${cell}" height="28" rx="6" fill="${on ? ink : 'none'}" fill-opacity="${on ? (i + 1 === value ? 1 : 0.45) : 0}" stroke="${ink}" stroke-opacity=".7" stroke-width="2"/>
      ${String(labels[i]).split(/ · |, /).map((part, k) => `<text x="${i * (cell + 6) + cell / 2}" y="${50 + k * 15}" text-anchor="middle" class="t-tick${i + 1 === value ? ' on' : ''}" fill="${ink}">${part}</text>`).join('')}`;
  }).join('')}</svg>`;
}

// Les prix écrits à côté des points : à droite, sinon à gauche, sinon au-dessus, jamais l'un sur l'autre.
function placeLabels(points) {
  const boxes = [];
  const w = 54;
  const clash = (b) => boxes.some((o) => b.x0 < o.x1 && o.x0 < b.x1 && b.y0 < o.y1 && o.y0 < b.y1) || points.some((p) => p.x > b.x0 - 8 && p.x < b.x1 + 8 && p.y > b.y0 - 8 && p.y < b.y1 + 8 && !(b.own === p));
  return points.map((p) => {
    const tries = [
      { x: p.x + 12, y: p.y + 6, anchor: 'start', x0: p.x + 12, x1: p.x + 12 + w, y0: p.y - 8, y1: p.y + 8 },
      { x: p.x - 12, y: p.y + 6, anchor: 'end', x0: p.x - 12 - w, x1: p.x - 12, y0: p.y - 8, y1: p.y + 8 },
      { x: p.x, y: p.y - 14, anchor: 'middle', x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y - 28, y1: p.y - 12 },
      { x: p.x, y: p.y + 26, anchor: 'middle', x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y + 12, y1: p.y + 28 },
    ].map((t) => ({ ...t, own: p }));
    const pick = tries.find((t) => !clash(t)) ?? tries[0];
    boxes.push(pick);
    return { ...pick, text: p.text };
  });
}

// La frise des ventes : une date par point, plus haut quand le prix est plus élevé, le prix écrit.
// Aucune moyenne, aucune courbe, aucune fourchette.
function timelineSvg({ width = 940, height = 260, sales = SALES, ink = '#fff', labels = true }) {
  const t0 = Date.UTC(2021, 0, 1);
  const t1 = Date.UTC(2026, 10, 17);
  const prices = sales.map((s) => s[3]);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const x = (ym) => 40 + ((width - 90) * (Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5)) - 1, 15) - t0)) / (t1 - t0);
  const y = (p) => height - 46 - ((height - 96) * (p - lo)) / (hi - lo);
  const years = [2021, 2022, 2023, 2024, 2025, 2026];
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="draw">
    <line x1="40" x2="${width - 50}" y1="${height - 30}" y2="${height - 30}" stroke="${ink}" stroke-opacity=".6" stroke-width="2"/>
    ${years.map((yr) => { const xx = x(`${yr}-01`); return `<line x1="${xx}" x2="${xx}" y1="${height - 36}" y2="${height - 24}" stroke="${ink}" stroke-opacity=".6"/><text x="${xx}" y="${height - 6}" text-anchor="middle" class="t-tick" fill="${ink}">${yr}</text>`; }).join('')}
    ${sales.map(([ym, , , p]) => `<line x1="${x(ym)}" x2="${x(ym)}" y1="${y(p) + 8}" y2="${height - 30}" stroke="${ink}" stroke-opacity=".25"/><circle cx="${x(ym)}" cy="${y(p)}" r="8" fill="${ink}"/>`).join('')}
    ${labels ? placeLabels(sales.map(([ym, , , p]) => ({ x: x(ym), y: y(p), text: shortPrice(p) }))).map((l) => `<text x="${l.x}" y="${l.y}" text-anchor="${l.anchor}" class="t-price" fill="${ink}">${l.text}</text>`).join('') : ''}
  </svg>`;
}

const ICON = {
  person: (c) => `<svg viewBox="0 0 24 24" class="pic"><circle cx="12" cy="7" r="4" fill="${c}"/><path d="M4 22c0-4.4 3.6-8 8-8s8 3.6 8 8z" fill="${c}"/></svg>`,
  home: (c) => `<svg viewBox="0 0 24 24" class="pic"><path d="M2 11l10-8 10 8v11H2z" fill="${c}"/></svg>`,
  door: (c) => `<svg viewBox="0 0 24 24" class="pic"><rect x="3" y="2" width="18" height="20" rx="2" fill="none" stroke="${c}" stroke-width="2.2"/><rect x="7" y="6" width="4" height="4" fill="${c}"/><rect x="13" y="6" width="4" height="4" fill="${c}"/><rect x="7" y="12" width="4" height="4" fill="${c}"/><rect x="13" y="12" width="4" height="4" fill="${c}"/></svg>`,
};

// ---------- Les écrans du Live ----------

const live = (step, n, inner, tab = true) => `
  <div class="live ${tab ? 'tab' : 'phone'}">
    <div class="top"><b>AGENCE HORIZON CÔTE D’AZUR</b><span class="step">${step}</span><span class="n">${n}/27</span></div>
    <div class="lbody">${inner}</div>
    <div class="bar"><span>← Précédent</span><b>Valider et continuer →</b></div>
  </div>`;
const head = (kicker, title, scale) =>
  `<div class="lhead"><p class="kick">${kicker}</p><h2 class="big">${title}</h2>${scale ? `<p class="scale">${scale}</p>` : ''}</div>`;
const lsrc = (t) => `<p class="lsrc">${t}</p>`;

const URBAN_BANDS = [
  { range: `0 à ${m(40)}`, count: 'rien de relevé', hit: false },
  { range: `40 à ${m(300)}`, count: '3 emplacements réservés', sub: `le plus proche à ${m(153)}`, hit: true },
];
const urbanA = (tab = true) => live('VOTRE QUARTIER', 4, `
  ${head('L’urbanisme', `Rien de relevé sur votre parcelle, ni à moins de ${m(40)}.`, `Autour du bien, à moins de ${m(300)}`)}
  <div class="split">${ringsSvg({ size: tab ? 470 : 340, bands: URBAN_BANDS })}
    <div class="legend"><p><b>Votre parcelle</b> rien de relevé</p><p><b>0 à ${m(40)}</b> rien de relevé</p><p><b>40 à ${m(300)}</b> 3 emplacements réservés pour une voie, le plus proche à ${m(153)}</p><p class="muted2">Schéma des distances, pas une carte : les directions ne sont pas connues.</p></div></div>
  ${lsrc('Source : Géoportail de l’urbanisme (IGN), données du 7 octobre 2026')}`, tab);
const permisA = live('VOTRE QUARTIER', 8, `
  ${head('Les permis de construire', `2 permis de construire à moins de ${m(300)}, depuis 2022.`, `Autour du bien, à moins de ${m(300)}`)}
  <div class="split">${ringsSvg({ size: 470, bands: [{ range: `0 à ${m(40)}`, count: 'aucun', hit: false }, { range: `40 à ${m(300)}`, count: '2 permis', sub: `à ${m(128)} et à ${m(234)}`, hit: true }] })}
    <div class="legend"><p><b>Rue des Oliviers</b> 1 logement, ${m(62)}², autorisé en mars 2024 · à ${m(128)}</p><p><b>Chemin du Val Fleuri</b> 2 logements, ${m(124)}², terminé · à ${m(234)}</p></div></div>
  ${lsrc('Source : Sitadel (SDES), données du 7 octobre 2026')}`);

const scaleTag = (t) => `<span class="where">${t}</span>`;
const riskA = (tab = true) => live('VOTRE QUARTIER', 5, `
  ${head('Les risques', 'Séisme et argiles : un niveau moyen.', null)}
  <div class="gauges">
    <div class="g"><div class="gt"><b>Séisme</b>${scaleTag('la commune')}</div>${segGauge({ steps: 5, value: 4, labels: ['1 · très faible', '2 · faible', '3 · modérée', '4 · moyenne', '5 · forte'], w: tab ? 400 : 320 })}<p>zone 4 sur 5 : « moyenne »</p></div>
    <div class="g"><div class="gt"><b>Argiles</b>${scaleTag('l’adresse du bien')}</div>${segGauge({ steps: 3, value: 2, labels: ['faible', 'moyen', 'fort'], w: tab ? 400 : 320 })}<p>exposition moyenne, sur 3 niveaux</p></div>
    <div class="g"><div class="gt"><b>Radon</b>${scaleTag('la commune')}</div>${segGauge({ steps: 3, value: 1, labels: ['1 · faible', '2 · faible, transfert facilité', '3 · significatif'], w: tab ? 400 : 320 })}<p>catégorie 1 sur 3 : potentiel « faible »</p></div>
    <div class="g cat"><div class="gt"><b>Catastrophes naturelles</b>${scaleTag('la commune')}</div><p class="huge">2</p><p>reconnues, la dernière le 31${NB}mars${NB}2023</p></div>
    <div class="g wide"><div class="gt"><b>Commune classée</b>${scaleTag('la commune')}</div><p>territoire à risque important d’inondation : Nice, Cannes, Mandelieu</p></div>
  </div>
  ${lsrc('Source : Géorisques (ministère de la Transition écologique), données du 7 octobre 2026')}`, tab);
const saleCard = ([ym, street, surface, price, dist]) =>
  `<div class="sale"><b>${euro(price)}</b><span class="when">${monthLabel(ym)}</span><span>${street}</span><span class="facts">${surface}${NB}m² · à environ ${m(dist)}</span></div>`;
const salesHead = head('Les ventes réelles', `11 maisons de 5 pièces vendues autour de chez vous depuis 2021`, `À moins de ${m(250)} de votre bien`);
const salesA = (tab = true) => live('VOS VOISINS ONT VENDU', 24, `
  ${salesHead}
  <div class="center">${timelineSvg({ width: tab ? 950 : 350, height: tab ? 220 : 200, labels: tab })}</div>
  <div class="sales ${tab ? '' : 'one'}">${SALES.slice(0, tab ? 6 : 3).map(saleCard).join('')}</div>
  ${lsrc('Chaque point : une vente, à sa date, plus haut quand le prix est plus élevé. Prix de vente réels. Source : DVF (DGFiP), 7 octobre 2026')}`, tab);
const population = live('VOTRE QUARTIER', 6, `
  ${head('La population', `1${NB}120 habitants autour de votre bien.`, `À moins de ${m(300)}, valeurs arrondies`)}
  <div class="pop">
    <div><div class="pics">${Array.from({ length: 11 }, () => ICON.person('#fff')).join('')}</div><p><b>1${NB}120</b> habitants <small>(un pictogramme : 100 habitants)</small></p></div>
    <div><div class="pics">${Array.from({ length: 10 }, () => ICON.home('#fff')).join('')}</div><p><b>500</b> ménages <small>(un pictogramme : 50 ménages)</small></p></div>
    <div><div class="pics big">${ICON.person('#fff')}${ICON.person('#fff')}</div><p><b>2,2</b> personnes par ménage</p></div>
  </div>
  ${lsrc(`Source : Insee, revenus fiscaux localisés (Filosofi), carreaux de ${m(200)} · données du 7 octobre 2026`)}`);
const copro = live('VOTRE QUARTIER', 7, `
  ${head('La copropriété', `Une copropriété de 6 lots d’habitation, construite entre 1975 et 1993.`, 'À l’adresse du bien')}
  <div class="pics lots">${Array.from({ length: 6 }, () => ICON.door('#fff')).join('')}</div>
  <div class="center"><svg viewBox="0 0 900 120" width="900" height="120" class="draw">
    <line x1="30" x2="870" y1="60" y2="60" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>
    ${[1950, 1975, 1993, 2026].map((yr) => { const xx = 30 + (840 * (yr - 1950)) / 76; return `<line x1="${xx}" x2="${xx}" y1="52" y2="68" stroke="#fff"/><text x="${xx}" y="98" text-anchor="${yr === 2026 ? 'end' : 'middle'}" class="t-tick" fill="#fff">${yr === 2026 ? 'aujourd’hui' : yr}</text>`; }).join('')}
    <rect x="${30 + (840 * 25) / 76}" y="40" width="${(840 * 18) / 76}" height="40" rx="8" fill="#fff"/>
    <text x="${30 + (840 * 34) / 76}" y="66" text-anchor="middle" class="t-pill">construite</text>
  </svg></div>
  <div class="chips"><span class="chip"><b>6</b> lots d’habitation</span><span class="chip"><b>Mandat de syndic</b> terminé le 17${NB}janvier${NB}2026</span></div>
  ${lsrc('Source : Registre national des copropriétés (Anah), données du 7 octobre 2026')}`);

// ---------- Les documents A4 ----------

const docRings = ringsSvg({ size: 280, bands: URBAN_BANDS, ink: '#111', faint: '#fff', strong: 'url(#hatch)', paper: true }).replace('<svg ', '<svg ').replace('class="draw">', 'class="draw"><defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#dbe7f2"/><line x1="0" y1="0" x2="0" y2="8" stroke="#00527a" stroke-width="2"/></pattern></defs>');
const synthesis = `
  <div class="doc">
    <p class="kicker">4 · VOTRE QUARTIER</p>
    <div class="drow"><div>${docRings}</div><div><h4>L’urbanisme</h4><p class="dfact">Rien de relevé sur votre parcelle, ni à moins de ${m(40)}.</p><p>Entre 40 et ${m(300)} : 3 emplacements réservés pour une voie, le plus proche à ${m(153)}.</p><p class="dsrc">Géoportail de l’urbanisme (IGN) · données du 7 octobre 2026</p></div></div>
    <div class="dblock"><h4>Les risques</h4>
      <div class="dgauges">
        <div><b>Séisme</b> <span class="sc">la commune</span>${segGauge({ steps: 5, value: 4, labels: ['1 · très faible', '2 · faible', '3 · modérée', '4 · moyenne', '5 · forte'], ink: '#111', w: 260 })}<span>zone 4 sur 5</span></div>
        <div><b>Argiles</b> <span class="sc">l’adresse du bien</span>${segGauge({ steps: 3, value: 2, labels: ['faible', 'moyen', 'fort'], ink: '#111', w: 250 })}<span>exposition moyenne</span></div>
        <div><b>Radon</b> <span class="sc">la commune</span>${segGauge({ steps: 3, value: 1, labels: ['1 · faible', '2 · faible, transfert facilité', '3 · significatif'], ink: '#111', w: 260 })}<span>catégorie 1 sur 3</span></div>
        <div><b>Catastrophes naturelles</b> <span class="sc">la commune</span><p class="dhuge">2</p><span>la dernière le 31${NB}mars${NB}2023</span></div>
      </div>
      <p><b>Commune classée</b> · territoire à risque important d’inondation : Nice, Cannes, Mandelieu</p>
      <p class="dsrc">Géorisques · données du 7 octobre 2026</p></div>
    <p class="frozen">Informations publiques telles qu’au 17 novembre 2026, jour où ce document a été préparé.</p>
  </div>`;
const study = `
  <div class="doc">
    <p class="kicker">LES VENTES RÉELLES AUTOUR DE VOTRE BIEN</p>
    <p class="dlead"><b>11 maisons de 5 pièces vendues à moins de ${m(250)} depuis 2021.</b> Des prix de vente réels, pas des prix affichés.</p>
    ${timelineSvg({ width: 570, height: 210, ink: '#111' })}
    <div class="dsales">${SALES.slice(0, 6).map(([ym, st, su, p, d]) => `<div><b>${euro(p)}</b><span>${monthLabel(ym)}</span><span>${st}</span><span>${su}${NB}m² · à environ ${m(d)}</span></div>`).join('')}</div>
    <p class="dsrc">Chaque point : une vente, à sa date, plus haut quand le prix est plus élevé · DVF (DGFiP) · données du 7 octobre 2026</p>
    <p class="frozen">Informations publiques telles qu’au 17 novembre 2026, jour où ce document a été préparé.</p>
  </div>`;

const sheets = {
  'M159-2-planche-definitive': {
    title: 'M159 · 2 — Planche définitive : les écrans du Live (variante A partout)',
    sub: 'Choix de Jean-Guy (17/11) : les anneaux pour l’urbanisme et les permis, les jauges en cases pour les risques, la frise du temps pour les ventes. Tablette paysage, et le téléphone pour l’urbanisme, les risques et les ventes.',
    rows: [
      [['Urbanisme · tablette', urbanA()], ['Permis · tablette', permisA]],
      [['Risques · tablette', riskA()], ['Ventes · tablette', salesA()]],
      [['Population · tablette', population], ['Copropriété · tablette', copro]],
      [['Urbanisme · téléphone', urbanA(false)], ['Risques · téléphone', riskA(false)], ['Ventes · téléphone', salesA(false)]],
    ],
    notes: [
      ['Les quatre corrections', '1. Les anneaux prennent la hauteur disponible, la légende à droite. 2. Sous les cases du séisme, les mots officiels (très faible, faible, modérée, moyenne, forte) ; sous celles du radon, ses trois catégories (faible ; faible, transfert facilité ; significatif). 3. Des pictogrammes entiers seulement, le chiffre exact écrit dessous ; deux personnes entières et « 2,2 ». 4. À l’impression, un fond blanc sous chaque texte posé sur les hachures (M159-3).'],
      ['Échelles officielles', 'Écrites dans le code avec leur texte : séisme, décret n° 2010-1254 du 22 octobre 2010 (art. R563-4 du Code de l’environnement) ; argiles, carte d’exposition du BRGM, arrêté du 22 juillet 2020 ; radon, arrêté du 27 juin 2018.'],
      ['Argiles', '« à l’adresse du bien » : définitif, Laurent confirme que l’exposition est calculée au point de l’adresse (17/11).'],
      ['Rien d’inventé', 'Seulement ce que renvoie la vue « bien-client » : aucune position, aucune moyenne, aucune comparaison ; « Rien de relevé », jamais « rien de prévu » ; chaque fait dit son échelle.'],
    ],
  },
  'M159-3-synthese-et-etude': {
    title: 'M159 · 3 — Les mêmes dessins dans la synthèse et l’Étude de marché (A4)',
    sub: 'À gauche en couleur, à droite la même page imprimée en noir et blanc. Traits, hachures et fonds blancs sous les textes : jamais la couleur seule.',
    rows: [[['Synthèse · couleur', synthesis], ['Synthèse · noir et blanc', `<div class="bw">${synthesis}</div>`]], [['Étude de marché · couleur', study], ['Étude de marché · noir et blanc', `<div class="bw">${study}</div>`]]],
    notes: [
      ['Les mêmes dessins', 'Les anneaux, les jauges en cases avec leurs mots officiels, la frise des ventes, en encre sombre ; chaque texte posé sur les hachures a un fond blanc.'],
      ['Source et échelle', 'Chaque bloc dit sa source publique, la date de ses données et l’échelle de chaque fait ; jamais Academia.'],
      ['Figé', 'Le contenu du jour où le document est généré, gardé en base par la migration de la 159 (les seuls blocs cochés de la vue « bien-client », jamais la valeur indicative ni le DPE) ; le lien déjà envoyé ne change plus.'],
    ],
  },
};

const css = `
@font-face{font-family:Rajdhani;font-weight:700;src:url(${FONTS}/rajdhani/rajdhani-latin-700.woff2)}
@font-face{font-family:Montserrat;font-weight:100 900;src:url(${FONTS}/montserrat/montserrat-latin.woff2)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,Arial,sans-serif;color:#18181b;background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:16px;align-items:flex-start}
h1.sheet{font-size:22px}.sheet-sub{font-size:13px;color:#3f3f46;max-width:1600px}
.layout{display:flex;gap:24px;align-items:flex-start}.rows{display:flex;flex-direction:column;gap:22px}.row{display:flex;gap:20px;align-items:flex-start}
.col{display:flex;flex-direction:column;gap:6px}.ftitle{font-size:13px;font-weight:700;color:#3f3f46}
.notes{width:420px;display:flex;flex-direction:column;gap:10px}.note{background:#fef6c7;border:1px solid #e8cf5a;border-radius:10px;padding:11px 13px;font-size:12.5px;line-height:1.5;color:#3d3200}
.live{background:linear-gradient(160deg,#1f5f99,#0f3a66);color:#fff;display:flex;flex-direction:column}.live.tab{width:1024px;height:768px;padding:18px 28px 0}.live.phone{width:390px;height:844px;padding:14px 16px 0}
.top{display:flex;gap:14px;font-size:11px;letter-spacing:.06em;border-bottom:1px solid rgba(255,255,255,.2);padding-bottom:10px}.top .step{color:#7cc4ff;font-weight:700}.top .n{opacity:.7}
.lbody{flex:1;display:flex;flex-direction:column;gap:16px;margin-top:18px;min-height:0}.phone .lbody{overflow:hidden}
.kick{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#7cc4ff;font-weight:700}
h2.big{font-family:Rajdhani;font-size:40px;line-height:1.08;margin-top:2px}.phone h2.big{font-size:26px}
.scale{font-size:14px;opacity:.8;margin-top:4px}.phone .scale{font-size:12px}
.split{flex:1;display:flex;gap:34px;align-items:center;justify-content:flex-start}.tab .split{margin-top:-8px}.phone .split{flex-direction:column;gap:10px}
.legend{display:flex;flex-direction:column;gap:14px;font-size:19px;line-height:1.35}.legend b{display:block;font-family:Rajdhani;font-size:22px;color:#7cc4ff}.phone .legend{font-size:13px;gap:5px}.phone .legend .muted2{display:none}.phone .legend b{font-size:16px}
.muted2{font-size:14px;opacity:.7}.center{display:flex;justify-content:center}
.chips{display:flex;flex-wrap:wrap;gap:12px}.chip{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);border-radius:16px;padding:14px 18px;font-size:19px;flex:1 1 0}.chip b{display:block;font-family:Rajdhani;font-size:38px;line-height:1.05}.phone .chips{flex-direction:column;gap:8px}.phone .chip{font-size:13px;padding:9px 12px;flex:none}.phone .chip b{font-size:22px;display:inline;margin-right:6px}
.lsrc{font-size:12px;opacity:.7;margin-top:auto;margin-bottom:6px}
.draw text{font-family:Montserrat}.t-center{font-size:17px;font-weight:700}.t-band{font-size:16px;font-weight:700}.t-count{font-family:Rajdhani!important;font-size:22px;font-weight:700}.t-count.big{font-size:30px}.t-count.huge{font-size:52px}.t-sub{font-size:15px}.t-tick{font-size:13px;opacity:.85}.t-tick.on{font-weight:700;opacity:1}.t-price{font-family:Rajdhani!important;font-size:17px;font-weight:700}.t-pill{font-family:Rajdhani!important;font-size:17px;font-weight:700;fill:#0f3a66}
.gauges{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:16px 26px}.g{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:16px;padding:14px 18px;display:flex;flex-direction:column;gap:6px;font-size:16px}.g.wide{grid-column:1/3}
.gt{display:flex;justify-content:space-between;align-items:center;gap:8px}.gt b{font-family:Rajdhani;font-size:24px}.where{font-size:11.5px;background:rgba(124,196,255,.2);border-radius:999px;padding:2px 9px;white-space:nowrap}
.huge{font-family:Rajdhani;font-size:64px;line-height:.9;font-weight:700}
.phone .gauges{grid-template-columns:1fr;gap:8px}.phone .g{padding:9px 12px;font-size:13px}.phone .g.wide{grid-column:auto}.phone .gt b{font-size:18px}.phone .huge{font-size:40px}
.dials{display:flex;justify-content:space-around;gap:10px;flex:1;align-items:center}.dials>div{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:16px}.phone .dials{flex-direction:column;flex:none}.phone .dials>div{font-size:13px}
.sales{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.sales.one{grid-template-columns:1fr}
.sale{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:10px 14px;display:flex;flex-direction:column;gap:2px;font-size:14px}.sale b{font-family:Rajdhani;font-size:28px;line-height:1}.sale .when{font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;color:#7cc4ff;font-weight:700}.sale .facts{opacity:.85}
.pop{flex:1;display:grid;grid-template-columns:1.4fr 1fr;grid-template-rows:1fr 1fr;gap:18px 30px;align-items:center}.pop>div{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:18px 22px;height:100%;display:flex;flex-direction:column;justify-content:center;gap:12px}.pop>div:last-child{grid-column:2;grid-row:1/3}.pop p{font-size:20px}.pop b{font-family:Rajdhani;font-size:44px;display:block;line-height:1}.pop small{font-size:13px;opacity:.7}.pop .pic{width:48px;height:48px}.pop .pics{flex-wrap:wrap}.pop .pics.big .pic{width:84px;height:84px}.pop .pics.big .frac .pic{width:84px}.pop .frac{width:14px}.pop .frac.small{width:17px}
.pics{display:flex;gap:6px;align-items:flex-end}.pic{width:40px;height:40px}.pics.big .pic{width:58px;height:58px}.frac{display:inline-block;width:12px;overflow:hidden}.frac.small{width:12px}.frac .pic{width:40px}.pics.big .frac .pic{width:58px}
.pics.lots{justify-content:center;gap:16px}.pics.lots .pic{width:90px;height:90px}
.bar{margin:12px -28px 0;border-top:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.18);height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;font-size:14px;flex:none}.phone .bar{margin:10px -16px 0;padding:0 16px}
.bar b{background:#fff;color:#0f3a66;border-radius:10px;padding:10px 16px;font-family:Rajdhani;font-size:15px}
.doc{width:640px;background:#fff;border:1px solid #a1a1aa;padding:30px 34px;display:flex;flex-direction:column;gap:16px;color:#111}.kicker{font-family:Rajdhani;font-weight:700;color:#00527a;letter-spacing:.12em;font-size:15px}
.doc h4{font-family:Rajdhani;font-size:19px}.drow{display:flex;gap:18px;align-items:center;border-top:2px solid #00527a;padding-top:10px}.drow p{font-size:13px}.dfact{font-family:Rajdhani;font-size:20px!important;font-weight:700}
.dblock{border-top:2px solid #00527a;padding-top:10px;display:flex;flex-direction:column;gap:8px;font-size:13px}.dgauges{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px}.dgauges>div{display:flex;flex-direction:column;gap:2px;font-size:12px}.sc{font-size:10.5px;color:#52525b}.dhuge{font-family:Rajdhani;font-size:40px;font-weight:700;line-height:1}
.dsrc{font-size:10.5px;color:#52525b}.frozen{font-size:11px;color:#3f3f46;border-top:1px solid #d4d4d8;padding-top:8px}.dlead{font-size:13.5px}
.dsales{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.dsales div{border:1px solid #d4d4d8;border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:2px;font-size:11.5px}.dsales b{font-family:Rajdhani;font-size:20px}
.doc .t-price{font-size:13px}.doc .t-tick{font-size:10px}
.bw{filter:grayscale(1) contrast(1.1)}.doc .draw text{paint-order:stroke;stroke:#fff;stroke-width:5px;stroke-linejoin:round}
`;

for (const [name, sheet] of Object.entries(sheets)) {
  const rows = sheet.rows
    .map((row) => `<div class="row">${row.map(([label, html]) => `<div class="col"><div class="ftitle">${label}</div>${html}</div>`).join('')}</div>`)
    .join('');
  writeFileSync(
    join(here, `${name}.html`),
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${css}</style></head><body>
<h1 class="sheet">${sheet.title}</h1><p class="sheet-sub">${sheet.sub}</p>
<div class="layout"><div class="rows">${rows}</div><div class="notes">${sheet.notes.map(([t, b]) => `<div class="note"><b>${t} :</b> ${b}</div>`).join('')}</div></div></body></html>`,
  );
}

if (process.argv.includes('--png')) {
  const { chromium } = await import(pathToFileURL(join(here, '../../node_modules/playwright/index.mjs')).href);
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 2000, height: 1000 } });
  for (const name of Object.keys(sheets)) {
    await tab.goto(pathToFileURL(join(here, `${name}.html`)).href);
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: join(here, `${name}.png`), fullPage: true });
  }
  await browser.close();
}
console.log(`${Object.keys(sheets).length} planches écrites`);
