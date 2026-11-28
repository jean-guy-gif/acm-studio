// Lot C, C0 (demande de Jean-Guy du 27/11) — maquette : la vie du mandat côté vendeur, dans le socle
// de la refonte, aux trois tailles. Trois écrans : la fiche du dossier (M. Lefebvre, de la démo,
// mandat de Mougins, offre acceptée des Keller), le Suivi, une tâche d'« Aujourd'hui ». L'« avant »
// est la capture réelle de l'essai (C0-avant-*.png, 28/11) ; l'« après » est dessiné ici, aux
// couleurs et aux polices de l'application. Les dates et les prix de l'« après » sont inventés,
// plausibles, pour montrer chaque état.
//
//   node missions/maquettes/lot-c/C0-generateur.mjs --png
//
// Écrit C0-vie-du-mandat.html et .png à côté de ce fichier.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FONTS = pathToFileURL(join(here, '../../../src/features/branding/fonts')).href;
const img = (name) => pathToFileURL(join(here, name)).href;

// --- les blocs du socle ------------------------------------------------------------------------

const check = '<span class="dot ok">✓</span>';
const now = '<span class="dot now"></span>';
const later = '<span class="dot later"></span>';

const stepCard = (state, title, sub) =>
  `<div class="stepc ${state}">${state === 'ok' ? check : state === 'now' ? now : later}<div><b>${title}</b><span>${sub}</span></div></div>`;

const header = (pill, pillClass, extra) => `
<div class="back">← Vendeurs</div>
<div class="hrow"><h2>M. Lefebvre</h2><span class="grow"></span><span class="pill ${pillClass}">${pill}</span></div>
<div class="muted big">Maison · 7 pièces · 210 m² · Mougins</div>
<div class="hrow small">${extra}</div>`;

const nextCard = (title, text, button, filled = true) => `
<div class="card next">
  <div class="nextt"><span class="kicker">Prochaine étape</span><h3>${title}</h3><p>${text}</p></div>
  ${button ? `<span class="${filled ? 'bfill' : 'bline'}">${button}</span>` : ''}
</div>`;

const tiles = `
<div class="tiles">
  <div class="card tile"><b>5</b><span>Concurrents retenus</span></div>
  <div class="card tile"><b>0</b><span>Prix ou surface à vérifier</span></div>
  <div class="card tile"><b>0</b><span>Acquéreur prêt à visiter</span></div>
</div>`;

const lifeSteps = (states) => `
<div class="life">${states.map(([s, t, sub]) => stepCard(s, t, sub)).join('')}</div>`;

const mandateCard = (rows, exits = true) => `
<div class="card mandate">
  ${rows
    .map(
      ([label, value, action, history]) =>
        `<div class="mrow"><span class="mlabel">${label}</span><span class="mvalue">${value}${history ? `<span class="hist">${history}</span>` : ''}</span>${action ? `<span class="l">${action}</span>` : '<span></span>'}</div>`,
    )
    .join('')}
  ${exits ? '<div class="exits"><span class="l">Vendu à un acquéreur venu d’ailleurs</span><span class="l">Mandat terminé sans vente</span></div>' : ''}
</div>`;

const dossierSteps = `
<div class="sectiont">Son dossier</div>
<div class="dsteps">
  ${stepCard('ok', 'Le bien', 'fiche saisie · 6 photos')}
  ${stepCard('ok', 'Les concurrents', '5 retenus')}
  ${stepCard('ok', 'Prix proposé au rendez-vous', '1 690 000 €')}
  ${stepCard('ok', 'Le rendez-vous', 'fait le 28/10')}
  ${stepCard('ok', 'Conclure', 'mandat signé le 28/10')}
</div>
<div class="card fold">Tout le dossier <span>›</span></div>`;

const MANDATE_ACCEPTED = [
  ['Fin du mandat', 'le 28/01/2027, 3 mois après la signature', 'Modifier'],
  [
    'Prix du mandat',
    '1 590 000 € depuis l’avenant du 14/11',
    'Ajouter un avenant de baisse',
    '1 639 500 € à la signature, le 28/10',
  ],
  ['Offre acceptée', '1 560 000 € · famille Keller · le 28/11', 'Voir l’offre'],
  ['Point marché', 'arrêté à l’offre acceptée, le 28/11 · il reprend si l’offre tombe', ''],
];

// La fiche du dossier, état « Offre acceptée ».
const dossier = (w) => `
<div class="page ${w}">
  ${header('Offre acceptée', 'now', '<span class="pill okl">Mandat exclusif signé le 28/10 · jusqu’au 28/01/2027</span><span class="muted">Créé le 20/10</span>')}
  ${nextCard(
    'Noter le compromis',
    'L’offre de la famille Keller est acceptée depuis le 28/11, à 1 560 000 €. Notez la date du compromis et la date prévue de l’acte : le dossier passera « Sous compromis ».',
    'Noter le compromis',
  )}
  ${tiles}
  <div class="sectiont">Son mandat</div>
  ${lifeSteps([
    ['ok', 'Mandat signé', 'le 28/10 · exclusif'],
    ['now', 'Offre acceptée', 'le 28/11 · famille Keller'],
    ['later', 'Sous compromis', 'à noter'],
    ['later', 'Vendu par l’agence', 'l’acte et son prix'],
  ])}
  ${mandateCard(MANDATE_ACCEPTED)}
  ${dossierSteps}
</div>`;

// Les autres états de « Son mandat », sur ordinateur.
const states = `
<div class="statesgrid">
  <div class="col"><div class="ftitle">« Sous compromis » · la prochaine étape attend le 31/12 (15 jours avant l’acte)</div>
    <div class="page desk">
      ${nextCard('Préparer l’acte · le 31/12', 'L’acte est prévu le 15/01 chez le notaire. Quinze jours avant, la préparation de l’acte arrive dans « Aujourd’hui ».', '')}
      <div class="sectiont">Son mandat</div>
      ${lifeSteps([
        ['ok', 'Mandat signé', 'le 28/10 · exclusif'],
        ['ok', 'Offre acceptée', 'le 28/11 · famille Keller'],
        ['now', 'Sous compromis', 'le 05/12 · acte prévu le 15/01'],
        ['later', 'Vendu par l’agence', 'l’acte et son prix'],
      ])}
      ${mandateCard([
        ['Fin du mandat', 'le 28/01/2027', 'Modifier'],
        ['Prix du mandat', '1 590 000 €', 'Ajouter un avenant de baisse'],
        ['Compromis', 'signé le 05/12 · acte prévu le 15/01 · famille Keller', 'Modifier'],
        ['Point marché', 'arrêté à l’offre acceptée, le 28/11', ''],
      ], false)}
    </div></div>
  <div class="col"><div class="ftitle">« Vendu par l’agence » · après « Noter la vente »</div>
    <div class="page desk">
      ${nextCard('Voir le Suivi', 'Vendu le 15/01 par l’agence : sa suite vit dans le Suivi, sous « Vendus par l’agence ».', 'Voir le Suivi', false)}
      <div class="sectiont">Son mandat</div>
      ${lifeSteps([
        ['ok', 'Mandat signé', 'le 28/10 · exclusif'],
        ['ok', 'Offre acceptée', 'le 28/11 · famille Keller'],
        ['ok', 'Sous compromis', 'le 05/12'],
        ['ok', 'Vendu par l’agence', 'le 15/01 · 1 560 000 €'],
      ])}
      ${mandateCard([
        ['Vente', '1 560 000 € · acte du 15/01 · famille Keller', 'Modifier'],
        ['Écart', '−1,9 % sur le prix du mandat (1 590 000 €)', ''],
        ['Du mandat au compromis', '38 jours', ''],
      ], false)}
    </div></div>
  <div class="col"><div class="ftitle">« Mandat terminé sans vente » · la sortie</div>
    <div class="page desk">
      ${nextCard('Voir le Suivi', 'Le mandat s’est terminé le 28/01/2027 sans vente : le dossier rejoint « Vendus ailleurs · retirés · terminés ».', 'Voir le Suivi', false)}
      <div class="sectiont">Son mandat</div>
      ${lifeSteps([
        ['ok', 'Mandat signé', 'le 28/10 · exclusif'],
        ['later', 'Offre acceptée', '—'],
        ['later', 'Sous compromis', '—'],
        ['later', 'Vendu par l’agence', '—'],
      ])}
      <div class="card mandate"><div class="mrow"><span class="mlabel">Fin</span><span class="mvalue"><span class="pill grey">Mandat terminé sans vente</span> le 28/01/2027</span><span class="l">Annuler</span></div></div>
    </div></div>
</div>`;

// Les saisies, ouvertes sur place (le seul bouton plein de l'écran, M146).
const field = (label, value, hint) =>
  `<label class="field"><span>${label}</span><span class="input">${value}</span>${hint ? `<span class="hint">${hint}</span>` : ''}</label>`;
const forms = `
<div class="formsgrid">
  <div class="card form"><h4>Noter le compromis</h4>
    ${field('Date du compromis', '05/12/2026')}
    ${field('Date prévue de l’acte', '15/01/2027')}
    ${field('L’acquéreur', 'Famille Keller · offre acceptée le 28/11', 'ou « Un acquéreur venu d’ailleurs »')}
    <div class="hrow"><span class="bfill sm">Enregistrer</span><span class="bline sm">Annuler</span></div></div>
  <div class="card form"><h4>Avenant de baisse</h4>
    ${field('Date de l’avenant', '14/11/2026')}
    ${field('Nouveau prix', '1 590 000 €')}
    <p class="hist">Gardés : 1 639 500 € le 28/10 → 1 590 000 € le 14/11.</p>
    <div class="hrow"><span class="bfill sm">Enregistrer</span><span class="bline sm">Annuler</span></div></div>
  <div class="card form"><h4>Fin du mandat</h4>
    ${field('Durée', '3 mois', 'ou une date')}
    ${field('Fin le', '28/01/2027', 'calculée depuis la signature, le 28/10')}
    <label class="checkrow"><span class="box"></span><span>Reconduction tacite<span class="hint">Cochée : 30 jours avant, « Faire le point avant la reconduction » au lieu de « Préparer le renouvellement ».</span></span></label>
    <div class="hrow"><span class="bfill sm">Enregistrer</span><span class="bline sm">Annuler</span></div></div>
  <div class="card form"><h4>Noter la vente</h4>
    ${field('Date de l’acte', '15/01/2027')}
    ${field('Prix de vente', '1 560 000 €', 'tel que signé chez le notaire')}
    <div class="hrow"><span class="bfill sm">Enregistrer</span><span class="bline sm">Annuler</span></div></div>
</div>`;

// --- le Suivi -----------------------------------------------------------------------------------

const seg = (state, text) => `<span class="seg ${state}">${text}</span>`;
const suiviCard = ({ bar, name, pill, pillClass, line, prices, segs, step, when, sentence, button, filled, links }) => `
<div class="card scard ${bar}">
  <div class="sleft">
    <div class="hrow"><b class="sname">${name}</b><span class="pill ${pillClass}">${pill}</span></div>
    <div class="muted">${line}</div>
    <div class="prices">${prices}</div>
    <div class="segs">${segs.join('')}</div>
  </div>
  <div class="sright">
    <span class="kicker">${when}</span>
    <b>${step}</b>
    <span class="muted">${sentence}</span>
    ${button ? `<span class="${filled ? 'bfill' : 'bline'} sm wide">${button}</span>` : ''}
    <div class="links">${links}</div>
  </div>
</div>`;
const price = (label, value, cls = '') => `<span class="pr"><span class="muted xs">${label}</span><b class="${cls}">${value}</b></span>`;
const arrow = '<span class="arrow">→</span>';

const suivi = (w) => `
<div class="page ${w}">
  <div class="tabs"><span>Préparation</span><span>Live</span><span class="on">Suivi</span></div>
  <span class="kicker">Après le rendez-vous</span>
  <h2>Suivi</h2>
  <div class="filters">
    <span class="fp">Tous · 11</span><span class="fp">Mandats signés · 6</span><span class="fp on">Sous offre · compromis · 2</span><span class="fp">Vendus par l’agence · 1</span><span class="fp">À relancer · 1</span><span class="fp">Vendus ailleurs · retirés · terminés · 1</span>
  </div>
  ${suiviCard({
    bar: 'green',
    name: 'M. Lefebvre',
    pill: 'Offre acceptée · famille Keller',
    pillClass: 'now',
    line: 'Maison · 7 pièces · 210 m² · Mougins · signé le 28/10, jusqu’au 28/01',
    prices: `${price('Prix signé', '1 639 500 €')}${arrow}${price('Avenant du 14/11', '1 590 000 €')}${arrow}${price('Offre acceptée', '1 560 000 €', 'blue')}`,
    segs: [seg('done', 'Mandat signé ✓'), seg('done', 'Offre acceptée ✓'), seg('due', 'Compromis · à noter'), seg('', 'Vente')],
    when: 'Prochaine étape · aujourd’hui',
    step: 'Noter le compromis',
    sentence: 'Offre de la famille Keller acceptée le 28/11 · Point marché arrêté à l’offre acceptée',
    button: 'Noter le compromis',
    filled: true,
    links: '<span class="l">Points marché passés</span><span class="l">Détail des prix</span><span class="l">Ouvrir le dossier →</span>',
  })}
  ${suiviCard({
    bar: 'green',
    name: 'M. et Mme Castel',
    pill: 'Sous compromis · acte prévu le 12/12',
    pillClass: 'now',
    line: 'Maison · 6 pièces · 195 m² · Valbonne · signé le 19/09',
    prices: `${price('Prix signé', '1 590 000 €')}${arrow}${price('Compromis', '1 560 000 €', 'blue')}`,
    segs: [seg('done', 'Mandat signé ✓'), seg('done', 'Offre acceptée ✓'), seg('done', 'Compromis le 25/10 ✓'), seg('due', 'Acte le 12/12')],
    when: 'Prochaine étape · aujourd’hui',
    step: 'Préparer l’acte',
    sentence: 'Acte prévu le 12/12, dans 14 jours',
    button: 'Préparer l’acte',
    filled: false,
    links: '<span class="l">Détail des prix</span><span class="l">Ouvrir le dossier →</span>',
  })}
  <div class="ftitle">Sous « Vendus par l’agence »</div>
  ${suiviCard({
    bar: 'green',
    name: 'M. et Mme Garnier',
    pill: 'Vendu par l’agence · le 25/11',
    pillClass: 'ok',
    line: 'Maison · 5 pièces · 145 m² · La Colle-sur-Loup · signé le 22/08',
    prices: `${price('Il voulait', '850 000 €')}${arrow}${price('Prix signé', '785 000 €')}${arrow}${price('Vendu', '770 000 €', 'green')}<span class="muted xs gap">−1,9 % sur le prix du mandat · 24 jours du mandat au compromis</span>`,
    segs: [seg('done', 'Mandat signé ✓'), seg('done', 'Offre acceptée ✓'), seg('done', 'Compromis ✓'), seg('done', 'Vendu le 25/11 ✓')],
    when: 'Vendu',
    step: 'Plus rien à faire',
    sentence: 'Acte signé le 25/11 chez le notaire',
    button: '',
    filled: false,
    links: '<span class="l">Détail des prix</span><span class="l">Ouvrir le dossier →</span>',
  })}
  <div class="ftitle">Sous « Mandats signés »</div>
  ${suiviCard({
    bar: 'green',
    name: 'Mme Navarro',
    pill: 'Mandat signé · exclusif',
    pillClass: 'ok',
    line: 'Maison · 4 pièces · 118 m² · Saint-Paul-de-Vence · signé le 22/09, jusqu’au 22/12',
    prices: `${price('Il voulait', '763 500 €')}${arrow}${price('Prix signé', '705 000 €', 'orange')}`,
    segs: [seg('done', 'Mandat signé ✓'), seg('due', 'Concurrents · 5 à démarcher'), seg('', 'Point marché · le 22/12'), seg('', 'Visites acquéreurs · 0')],
    when: 'Prochaine étape · aujourd’hui',
    step: 'Préparer le renouvellement',
    sentence: 'Le mandat se termine le 22/12, dans 24 jours',
    button: 'Préparer le renouvellement',
    filled: false,
    links: '<span class="l">Point marché</span><span class="l">Détail des prix</span><span class="l">Ouvrir le dossier →</span>',
  })}
</div>`;

// --- « Aujourd'hui » ------------------------------------------------------------------------------

const task = (icon, iconClass, title, fact, button) =>
  `<div class="task"><span class="round ${iconClass}">${icon}</span><div class="what"><b>${title}</b><span class="muted">${fact}</span></div>${button ? `<span class="bline sm">${button}</span>` : ''}</div>`;
const today = (w) => `
<div class="page ${w}">
  <span class="kicker">Samedi 28 novembre</span>
  <h2>Aujourd’hui</h2>
  <div class="card block">
    <div class="btitle"><b>Vendeurs</b><span class="muted xs">· 4</span></div>
    ${task('!', 'orange', 'Préparer l’acte de M. et Mme Castel', 'acte prévu le 12/12 chez le notaire · dans 14 jours', 'Préparer l’acte')}
    ${task('!', 'orange', 'Préparer le renouvellement du mandat de Mme Navarro', 'le mandat se termine le 22/12 · dans 24 jours', 'Préparer le renouvellement')}
    ${task('!', 'orange', 'Relancer M. et Mme Lambert-Duval', 'Réfléchit au prix · dernier contact il y a 8 jours · relance prévue aujourd’hui', 'Préparer la relance')}
    ${task('!', 'orange', 'Faire le point avant la reconduction du mandat de M. et Mme Delmas', 'reconduction tacite le 08/12 · dans 10 jours', 'Faire le point')}
  </div>
</div>`;

// --- la planche ---------------------------------------------------------------------------------

const note = (html) => `<div class="note">${html}</div>`;

const css = `
@font-face{font-family:Rajdhani;font-weight:700;src:url(${FONTS}/rajdhani/rajdhani-latin-700.woff2)}
@font-face{font-family:Montserrat;font-weight:100 900;src:url(${FONTS}/montserrat/montserrat-latin.woff2)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,Arial,sans-serif;color:#18181b;background:#d4d4d8;padding:28px;display:flex;flex-direction:column;gap:22px}
h1{font-size:24px}.sub{font-size:14px;color:#3f3f46;max-width:1900px;line-height:1.5}
.part{font-family:Rajdhani;font-size:26px;color:#003a57;border-top:2px solid #a1a1aa;padding-top:14px}
.layout{display:flex;gap:22px;align-items:flex-start}
.col{display:flex;flex-direction:column;gap:6px}.ftitle{font-size:13px;font-weight:700;color:#3f3f46}
.notes{width:360px;flex:none;display:flex;flex-direction:column;gap:10px}
.note{background:#fef6c7;border:1px solid #e8cf5a;border-radius:10px;padding:11px 13px;font-size:12.5px;line-height:1.5;color:#3d3200}
.shot{border-radius:12px;border:1px solid #a1a1aa;display:block}
.page{background:#f2f4f8;border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:14px}
.page.desk{width:1000px}.page.tab{width:760px}.page.phone{width:390px;padding:14px}
.card{background:#fff;border:1px solid #e4e4e7;border-radius:18px;box-shadow:0 1px 3px rgba(0,0,0,.05)}
h2{font-family:Rajdhani;font-size:30px;color:#003a57;line-height:1.1}h3{font-family:Rajdhani;font-size:24px;color:#003a57}h4{font-family:Rajdhani;font-size:20px;color:#003a57}
.back{font-size:13px;color:#52525b}.hrow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.hrow.small{gap:10px}.grow{flex:1}
.muted{font-size:13px;color:#52525b}.muted.big{font-size:14.5px}.xs{font-size:11.5px}.gap{margin-left:8px}
.kicker{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#52525b}
.pill{font-size:12px;font-weight:700;border-radius:999px;padding:4px 12px;white-space:nowrap}
.pill.ok{background:#d1fae5;color:#047857}.pill.okl{background:#fff;border:1px solid #6ee7b7;color:#047857;font-weight:600}
.pill.now{background:#e0f2fe;color:#075985}.pill.grey{background:#f4f4f5;color:#52525b;border:1px solid #e4e4e7}
.next{padding:20px 24px;display:flex;align-items:center;gap:18px}.nextt{flex:1;display:flex;flex-direction:column;gap:6px}.next p{font-size:13.5px;color:#3f3f46;line-height:1.5}
.bfill{background:#00527a;color:#fff;font-weight:700;font-size:15px;border-radius:12px;padding:13px 26px;white-space:nowrap;text-align:center}
.bline{background:#fff;color:#18181b;border:1px solid #d4d4d8;font-size:13.5px;border-radius:12px;padding:9px 16px;white-space:nowrap;text-align:center}
.sm{font-size:13px;padding:9px 16px}.wide{display:block}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.tile{padding:14px 16px;display:flex;flex-direction:column;gap:2px}.tile b{font-size:26px;color:#003a57}.tile span{font-size:13px;color:#52525b}
.sectiont{font-size:16px;font-weight:700;color:#003a57;margin-top:2px}
.life,.dsteps{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.dsteps{grid-template-columns:repeat(5,1fr)}
.stepc{background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start}
.stepc b{display:block;font-size:14.5px;color:#003a57}.stepc span{font-size:12.5px;color:#52525b}
.stepc.now{border:2px solid #0284c7}.stepc.later b{color:#71717a}
.dot{width:26px;height:26px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800}
.dot.ok{background:#d1fae5;color:#047857}.dot.now{background:#0284c7;box-shadow:inset 0 0 0 7px #e0f2fe}.dot.later{background:#f4f4f5;border:2px solid #d4d4d8}
.mandate{padding:6px 18px}.mrow{display:grid;grid-template-columns:190px 1fr auto;gap:12px;align-items:baseline;padding:11px 0;border-bottom:1px solid #f4f4f5;font-size:13.5px}
.mrow:last-of-type{border-bottom:none}.mlabel{font-weight:700;color:#3f3f46}.mvalue{color:#18181b;display:flex;flex-direction:column;gap:2px}.hist{font-size:12px;color:#71717a}
.exits{display:flex;gap:18px;padding:10px 0 12px;border-top:1px solid #f4f4f5}
.l{font-size:13px;font-weight:600;color:#00527a;text-decoration:underline;text-underline-offset:3px;white-space:nowrap}
.fold{padding:14px 18px;font-weight:700;color:#003a57;display:flex;justify-content:space-between}
.statesgrid{display:flex;gap:18px;align-items:flex-start}.statesgrid .page.desk{width:640px}.statesgrid .life{grid-template-columns:repeat(2,1fr)}
.formsgrid{display:grid;grid-template-columns:repeat(4,330px);gap:14px}
.form{padding:16px 18px;display:flex;flex-direction:column;gap:10px}
.checkrow{display:flex;gap:10px;align-items:flex-start;font-size:13px;font-weight:600;color:#3f3f46}.checkrow .hint{display:block;font-weight:400;margin-top:2px}.box{width:18px;height:18px;border:1.5px solid #a1a1aa;border-radius:5px;flex:none;margin-top:1px}
.field{display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:600;color:#3f3f46}.input{border:1px solid #d4d4d8;border-radius:10px;padding:9px 11px;font-weight:500;color:#18181b;background:#fff}.hint{font-size:11.5px;font-weight:400;color:#71717a}
.tabs{display:flex;gap:6px;background:#fff;border-radius:12px;padding:4px;align-self:flex-start;border:1px solid #e4e4e7}.tabs span{font-size:13.5px;font-weight:600;color:#52525b;padding:6px 14px;border-radius:9px}.tabs .on{background:#e0f2fe;color:#075985}
.filters{display:flex;flex-wrap:wrap;gap:8px}.fp{font-size:13px;font-weight:600;border:1px solid #e4e4e7;background:#fff;border-radius:999px;padding:6px 12px;white-space:nowrap}.fp.on{background:#e0f2fe;color:#075985;border-color:#bae6fd}
.scard{display:grid;grid-template-columns:minmax(0,1fr) 290px;border-left:5px solid #059669;overflow:hidden}
.sleft{padding:14px 16px;display:flex;flex-direction:column;gap:8px}.sright{padding:14px 16px;border-left:1px solid #f4f4f5;display:flex;flex-direction:column;gap:6px}
.sname{font-family:Rajdhani;font-size:22px;color:#003a57}
.prices{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px}.pr{display:flex;flex-direction:column;gap:1px}.pr b{font-size:16px}.pr b.blue{color:#0369a1}.pr b.green{color:#047857}.pr b.orange{color:#c2410c}.arrow{color:#a1a1aa;padding-bottom:2px}
.segs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.seg{font-size:11.5px;color:#71717a;border-top:3px solid #e4e4e7;padding-top:4px;text-align:center}.seg.done{border-top-color:#059669;color:#047857;font-weight:600}.seg.due{border-top-color:#0284c7;color:#075985;font-weight:700}
.links{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:4px}
.block{padding:16px 20px;display:flex;flex-direction:column}.btitle{display:flex;gap:6px;align-items:baseline;padding-bottom:6px}.btitle b{font-family:Rajdhani;font-size:22px;color:#003a57}
.task{display:flex;align-items:center;gap:14px;padding:12px 0;border-top:1px solid #f4f4f5}.task .what{flex:1;display:flex;flex-direction:column;gap:2px}.task .what b{font-size:14px}
.round{width:28px;height:28px;border-radius:999px;flex:none;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px}.round.orange{background:#f97316}
/* tablette et téléphone */
.tab .life{grid-template-columns:repeat(2,1fr)}.tab .dsteps{grid-template-columns:repeat(3,1fr)}
.tab .scard{grid-template-columns:1fr}.tab .sright{border-left:none;border-top:1px solid #f4f4f5}
.phone .next{flex-direction:column;align-items:stretch;padding:16px}.phone .bfill{display:block}
.phone .life,.phone .dsteps{grid-template-columns:1fr}.phone .tiles{gap:8px}.phone .tile b{font-size:22px}
.phone .mrow{grid-template-columns:1fr;gap:4px}.phone .exits{flex-direction:column;gap:8px}
.phone .scard{grid-template-columns:1fr}.phone .sright{border-left:none;border-top:1px solid #f4f4f5}
.phone .segs{grid-template-columns:repeat(2,1fr)}.phone .task{flex-wrap:wrap}.phone .task .what{flex-basis:calc(100% - 42px)}.phone .task .bline{margin-left:42px}
.phone .hrow.small{flex-direction:column;align-items:flex-start;gap:6px}
`;

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${css}</style></head><body>
<h1>Lot C — La vie du mandat côté vendeur : la maquette (C0), validée le 28/11 avec quatre retouches</h1>
<p class="sub">Aujourd’hui, le dossier vendeur s’arrête à « Mandat signé ». Après : Mandat signé → Offre acceptée → Sous compromis → Vendu par l’agence, et la sortie « Mandat terminé sans vente ». Trois écrans, aux trois tailles, dans le socle de la refonte : la fiche du dossier (M. Lefebvre, de la démo : le mandat de Mougins, offre acceptée de la famille Keller), le Suivi, une tâche d’« Aujourd’hui ». L’« avant » est la capture réelle de l’essai ce 28/11 ; dans l’« après », dates et prix sont inventés, pour montrer chaque état.</p>

<div class="part">1 · La fiche du dossier, état « Offre acceptée »</div>
<div class="layout">
  <div class="col"><div class="ftitle">Avant · ordinateur (capture de l’essai)</div><img class="shot" src="${img('C0-avant-dossier-ordinateur.png')}" width="640"></div>
  <div class="col"><div class="ftitle">Après · ordinateur</div>${dossier('desk')}</div>
  <div class="notes">
    ${note('<b>Retouches de Jean-Guy (28/11)</b> : « Le prix » de « Son dossier » s’appelle « Prix proposé au rendez-vous » — c’est le prix décidé avant le rendez-vous (1 690 000 €), pas celui du mandat (1 639 500 € à la signature) ; le Point marché s’arrête à l’offre acceptée ; la reconduction tacite ; sur téléphone, le bouton d’une tâche sous son texte.')}
    ${note('<b>« Son mandat »</b>, nouveau, avant « Son dossier » : c’est ce qui vit maintenant. Quatre étapes, dans les cartes de « Son dossier » : vert fait, bleu maintenant, gris à venir. Dessous, « Le mandat » : sa fin, son prix et ses avenants, l’offre acceptée. « Son dossier » garde la préparation et le rendez-vous.')}
    ${note('<b>La prochaine étape suit le mandat</b> : « Noter le compromis » quand une offre est acceptée (aujourd’hui : « Voir le Suivi »). Un seul bouton plein, le sien.')}
    ${note('<b>Le badge</b> dit l’étape du mandat (« Offre acceptée », « Sous compromis », « Vendu par l’agence », « Mandat terminé ») ; le type et la fin du mandat passent sur la ligne dessous.')}
    ${note('<b>Rien de nouveau dans <code>projects.status</code></b> (CLAUDE.md : le statut dit la position, jamais l’issue) : chaque étape se lit dans un fait daté — la signature, l’offre acceptée (côté acquéreur), le compromis, l’acte et son prix, la fin sans vente.')}
    ${note('<b>Une vente à un acquéreur venu d’ailleurs</b> : le lien en bas de « Le mandat » ouvre la même saisie que « Noter le compromis », sans fiche acquéreur.')}
  </div>
</div>
<div class="layout">
  <div class="col"><div class="ftitle">Après · tablette</div>${dossier('tab')}</div>
  <div class="col"><div class="ftitle">Après · téléphone</div>${dossier('phone')}</div>
  <div class="col"><div class="ftitle">Avant · téléphone</div><img class="shot" src="${img('C0-avant-dossier-telephone.png')}" width="390"></div>
</div>

<div class="part">2 · « Son mandat » dans ses autres états (ordinateur)</div>
${states}

<div class="part">3 · Les saisies, ouvertes sur place</div>
<div class="layout">${forms}
  <div class="notes">
    ${note('<b>Fin du mandat</b> : la durée ou la date, l’une calcule l’autre depuis la signature. <b>Avenant de baisse</b> : date et nouveau prix ; l’historique est gardé, le prix du mandat est le dernier.')}
    ${note('<b>Noter le compromis</b> : depuis le dossier, ou depuis la fiche de l’acquéreur (« Avant le compromis », où la date du compromis attendait une colonne, M143) — le même fait. <b>Noter la vente</b> : après l’acte, sa date et le prix ; l’écart au prix du mandat et le délai du mandat au compromis se calculent.')}
    ${note('Chaque saisie ouverte porte le seul bouton plein de l’écran (M146) ; tout est relu au serveur ; un dossier archivé ne se modifie pas.')}
  </div>
</div>

<div class="part">4 · Le Suivi : deux onglets nouveaux</div>
<div class="layout">
  <div class="col"><div class="ftitle">Après · ordinateur</div>${suivi('desk')}</div>
  <div class="notes">
    ${note('<b>Deux onglets</b> : « Sous offre · compromis » et « Vendus par l’agence ». « Mandats signés » ne garde que les mandats sans offre acceptée.')}
    ${note('<b>La sortie « Mandat terminé sans vente »</b> rejoint « Vendus ailleurs · retirés », qui devient « Vendus ailleurs · retirés · terminés » : pour le conseiller, le même geste, plus rien à faire (question 5 du 27/11). « Vendu ailleurs » et « Retiré de la vente » ne bougent pas.')}
    ${note('<b>La frise de la carte</b> : tant qu’aucune offre n’est acceptée, celle d’aujourd’hui (concurrents, Point marché, visites : le travail pour vendre) ; dès l’offre acceptée, celle de la vente : Mandat signé → Offre acceptée → Compromis → Vente. <b>Le Point marché</b> s’arrête dès l’offre acceptée et reprend si l’offre tombe (retouche 3 de Jean-Guy) ; les points passés restent lisibles.')}
    ${note('<b>Vendu</b> : le prix de vente en vert, l’écart au prix du mandat et le délai du mandat au compromis ; plus de bouton.')}
  </div>
  <div class="col"><div class="ftitle">Après · téléphone</div>${suivi('phone')}</div>
</div>
<div class="layout">
  <div class="col"><div class="ftitle">Après · tablette</div>${suivi('tab')}</div>
  <div class="col"><div class="ftitle">Avant · ordinateur (capture de l’essai)</div><img class="shot" src="${img('C0-avant-suivi-ordinateur.png')}" width="560"></div>
</div>

<div class="part">5 · « Aujourd’hui » : préparer l’acte, préparer le renouvellement</div>
<div class="layout">
  <div class="col"><div class="ftitle">Après · ordinateur</div>${today('desk')}</div>
  <div class="col"><div class="ftitle">Après · tablette</div>${today('tab')}</div>
  <div class="col"><div class="ftitle">Après · téléphone</div>${today('phone')}</div>
  <div class="notes">
    ${note('<b>« Préparer l’acte »</b> arrive 15 jours avant la date prévue de l’acte ; <b>« Préparer le renouvellement »</b>, 30 jours avant la fin du mandat — <b>« Faire le point avant la reconduction »</b> quand la reconduction tacite est cochée (retouche 4). Dans le bloc Vendeurs, avec son bouton en contour ; sur téléphone, le bouton sous le texte (retouche 2) ; « en retard » seulement une fois la date passée. Le Point marché de M. Lefebvre n’y est plus : son offre est acceptée.')}
    ${note('<b>Quand elles s’en vont</b> : « Préparer le renouvellement », quand la fin du mandat est repoussée ou le mandat terminé ; « Préparer l’acte », quand la vente est notée. Le jour de l’acte passé sans vente notée, elle devient « Noter la vente ».')}
    ${note('Les boutons ouvrent le dossier sur « Son mandat », la saisie déjà ouverte (« Fin du mandat », « Noter la vente »).')}
  </div>
</div>
<div class="layout"><div class="col"><div class="ftitle">Avant · ordinateur (capture de l’essai)</div><img class="shot" src="${img('C0-avant-aujourdhui-ordinateur.png')}" width="760"></div></div>
</body></html>`;

// Les espaces insécables du français, dans le texte seulement (pas dans le style).
const [head, body] = html.split('<body>');
const typographic = body
  .replace(/ ([:;?!])(?=[\s<])/g, (_, mark) => (mark === ':' ? ' :' : ` ${mark}`))
  .replace(/« /g, '« ')
  .replace(/ »/g, ' »');
const out = join(here, 'C0-vie-du-mandat.html');
writeFileSync(out, `${head}<body>${typographic}`);
if (process.argv.includes('--png')) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 2300, height: 1200 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(out).href);
  await page.waitForTimeout(500);
  await page.screenshot({ path: out.replace(/\.html$/, '.png'), fullPage: true });
  await browser.close();
}
console.log(out);
