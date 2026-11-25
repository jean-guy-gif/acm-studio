// Mission 129 — générateur des maquettes qui complètent la v2 validée (M129-ou-en-est-votre-prix-v2.png).
// `node missions/maquettes/M129-generateur.mjs` écrit les cinq HTML M129-1 à M129-5 à côté de lui.
// Données : la démo de M. Lefebvre (Mougins, prix retenu ensemble 1 639 500 €, rendez-vous du 15/10,
// point du 05/11) ; mou-01 a baissé, mou-09 et mou-13 ont disparu, mou-07 et mou-03 sont arrivés.
// Places : au rendez-vous 3e sur 6 (orange), aujourd'hui 2e sur 4 (vert), avec les nouveaux venus
// 4e sur 6 (orange). Règle des tiers : rang ≤ ⌈N/3⌉ vert, ≤ ⌈2N/3⌉ orange, sinon rouge.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const C = {
  green: '#12875a',
  greenSoft: '#e7f4ee',
  greenCell: '#b8dccb',
  orange: '#d9822b',
  orangeSoft: '#fcf0e2',
  orangeCell: '#f3d6b6',
  red: '#c8372d',
  redSoft: '#fbe9e7',
  redCell: '#edc3bf',
  gold: '#b8892b',
  goldSoft: '#fbf4e4',
  brand: '#00527a',
  brandDarker: '#013a58',
  brandSoft: '#eaf5ff',
  ink: '#18181b',
  muted: '#71717a',
  line: '#e4e4e7',
};

const tier = (rank, total) =>
  rank <= Math.ceil(total / 3) ? 'green' : rank <= Math.ceil((2 * total) / 3) ? 'orange' : 'red';

const css = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,Inter,Arial,sans-serif;color:${C.ink};background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:24px;align-items:flex-start}
.frame-title{font-size:13px;font-weight:700;color:#3f3f46;margin-bottom:6px}
.frame{background:#fafafa;position:relative;overflow:hidden;border:1px solid #a1a1aa}
.desk{width:1280px;height:800px;display:flex}
.phone{width:390px;height:844px;background:#fff}
.a4{width:794px;height:1123px;background:#fff;padding:46px 53px;position:relative}
.side{width:232px;height:100%;background:#fff;border-right:1px solid ${C.line};padding:20px 12px;display:flex;flex-direction:column;gap:6px;flex:none}
.switch{display:flex;background:#f4f4f5;border-radius:16px;padding:2px;margin:0 8px 14px}
.switch span{flex:1;text-align:center;font-size:12px;font-weight:600;color:${C.muted};padding:6px 0;border-radius:14px}
.switch .on{background:${C.brand};color:#fff;font-weight:700}
.nav{padding:8px 16px;border-radius:10px}
.nav b{display:block;font-size:14px}
.nav small{font-size:11px;color:${C.muted}}
.nav.on{background:#e8f1f8}.nav.on b{color:${C.brand}}
.account{margin-top:auto;border:1px solid ${C.line};border-radius:10px;padding:10px 16px}
.account b{font-size:12px;display:block}.account small{font-size:10.5px;color:${C.muted}}
.main{flex:1;padding:26px 32px;overflow:hidden;display:flex;flex-direction:column;gap:14px}
.h1{font-family:Rajdhani,Montserrat,Arial,sans-serif;font-size:28px;font-weight:700}
.sub{font-size:12.5px;color:${C.muted};margin-top:-10px}
.card{background:#fff;border:1px solid ${C.line};border-radius:14px;border-left:6px solid #059669;overflow:hidden}
.row-head{padding:14px 18px 10px;display:flex;flex-direction:column;gap:6px}
.name{font-family:Rajdhani,Montserrat,Arial,sans-serif;font-size:17px;font-weight:700;display:flex;gap:10px;align-items:center}
.pill{font-family:Montserrat,Inter,Arial,sans-serif;font-size:10px;font-weight:700;padding:3px 10px;border-radius:10px}
.meta{font-size:12px;color:${C.muted}}
.kick{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.muted}}
.actions{display:flex;gap:12px;align-items:center;padding:4px 18px 12px;flex-wrap:wrap}
.btn{font-size:13px;font-weight:700;padding:9px 16px;border-radius:10px;border:1.5px solid ${C.brand};color:${C.brand};background:#fff;white-space:nowrap}
.btn.full{background:${C.brand};color:#fff}
.btn.sm{font-size:12px;padding:6px 12px}
.btn.off{opacity:.45}
.txt{font-size:12.5px;font-weight:600;color:${C.brand};white-space:nowrap}
.zone{border-top:1px solid #f4f4f5;padding:10px 18px;display:flex;flex-direction:column;gap:8px}
.verdict{display:flex;gap:14px;align-items:flex-start;border:1.5px solid;border-radius:12px;padding:12px 16px}
.verdict .ico{width:34px;height:34px;border-radius:50%;color:#fff;font-weight:800;font-size:19px;display:flex;align-items:center;justify-content:center;flex:none}
.verdict .t{font-weight:800;font-size:17px}
.verdict p{font-size:12.5px;line-height:1.45;margin-top:3px;color:#27272a}
.steps{display:flex;align-items:stretch;gap:6px}
.step{flex:1;border:1px solid ${C.line};border-radius:10px;padding:8px 12px;background:#fff;display:flex;flex-direction:column;gap:5px}
.step .k{font-size:9.5px;font-weight:700;letter-spacing:.05em;white-space:nowrap;color:${C.muted};text-transform:uppercase}
.step .r{font-weight:800;font-size:22px;line-height:1}
.step .r sup{font-size:12px}
.step .r small{font-size:13px;color:${C.muted};font-weight:700;margin-left:5px}
.step .none{font-size:12px;color:${C.muted};border:1px dashed #d4d4d8;border-radius:8px;padding:8px;text-align:center}
.step .hint{font-size:10.5px;color:${C.muted}}
.arrow{align-self:center;color:#a1a1aa;font-size:16px}
.ruler{display:flex;gap:3px;align-items:center;height:14px}
.ruler i{flex:1;height:9px;border-radius:3px;display:block}
.ruler i.me{height:14px;border:2px solid ${C.ink}}
.note{font-size:11.5px;color:${C.muted};line-height:1.45}
.lecture{position:absolute;right:16px;bottom:16px;width:360px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:10px 12px;font-size:11px;line-height:1.45;color:#57534e}
.lecture b{color:#92400e}
.radio{display:flex;align-items:center;gap:10px;padding:7px 10px;border:1px solid ${C.line};border-radius:9px;font-size:12.5px;background:#fff}
.radio .dot{width:15px;height:15px;border-radius:50%;border:2px solid #a1a1aa;flex:none}
.radio.sel{border-color:${C.gold};background:${C.goldSoft}}
.radio.sel .dot{border:5px solid ${C.gold}}
.radio .pr{margin-left:auto;font-weight:700}
.tag{font-size:9.5px;font-weight:800;letter-spacing:.08em;padding:2px 7px;border-radius:5px;text-transform:uppercase;white-space:nowrap}
.tag.new{background:#e6ecfa;color:#1b2f6e}
.tag.gold{background:${C.gold};color:#fff}
.tag.goldline{border:1px solid ${C.gold};color:${C.gold}}
.msg{font-size:12px;padding:7px 10px;border-radius:8px}
.msg.err{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
.msg.ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
.msg.warn{background:${C.goldSoft};color:#713f12;border:1px solid #e9d5a6}
`;

const tone = { green: C.green, orange: C.orange, red: C.red };
const soft = { green: C.greenSoft, orange: C.orangeSoft, red: C.redSoft };
const cell = { green: C.greenCell, orange: C.orangeCell, red: C.redCell };

const ruler = (rank, total) =>
  `<div class="ruler">${Array.from({ length: total }, (_, i) => {
    const t = tier(i + 1, total);
    const me = i + 1 === rank;
    return `<i class="${me ? 'me' : ''}" style="background:${me ? tone[t] : cell[t]}"></i>`;
  }).join('')}</div>`;

const ord = (n) => (n === 1 ? 'er' : 'e');

const step = ({ k, rank, total, hint, none, current }) => {
  if (none)
    return `<div class="step"><span class="k">${k}</span><div class="none">${none}</div></div>`;
  const t = tier(rank, total);
  return `<div class="step" style="${current ? `border-color:${tone[t]};background:${soft[t]}` : ''}"><span class="k">${k}</span><span class="r" style="color:${tone[t]}">${rank}<sup>${ord(rank)}</sup><small>sur ${total}</small></span>${ruler(rank, total)}${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
};

const verdict = ({ rank, total, sentence, compact }) => {
  const t = tier(rank, total);
  const word = { green: 'Pas de problème', orange: 'Attention', red: 'Danger' }[t];
  const icon = { green: '✓', orange: '!', red: '!' }[t];
  return `<div class="verdict" style="border-color:${tone[t]};background:${soft[t]}${compact ? ';padding:10px 14px' : ''}"><span class="ico" style="background:${tone[t]}">${icon}</span><div><div class="t" style="color:${tone[t]}${compact ? ';font-size:16px' : ''}">${word} : vous êtes ${rank}<sup>${ord(rank)}</sup> sur ${total}</div><p>${sentence}</p></div></div>`;
};

const side = `<aside class="side"><div class="switch"><span class="on">Vendeur</span><span>Acquéreur</span></div>
<div class="nav"><b>Préparation</b><small>Dossiers vendeurs</small></div>
<div class="nav"><b>Live</b><small>Rendez-vous vendeur</small></div>
<div class="nav on"><b>Suivi</b><small>Après le rendez-vous</small></div>
<div class="nav"><b>Prospection</b><small>Concurrents à démarcher</small></div>
<div class="account"><b>Natacha Morel</b><small>Mon compte et l’agence ▾</small></div></aside>`;

const SENTENCE =
  'Un concurrent a baissé de 5,8 %, deux ont quitté le marché, et <b>2 biens sont arrivés sur le marché moins chers que le vôtre</b>.';
const SENTENCE_CHANGED =
  'Un concurrent a baissé de 5,8 %, deux ont quitté le marché, et 2 biens sont arrivés moins chers que le vôtre. <b>Un nouveau venu devient le plus dangereux : Maison · 7 pièces · 200 m² · Mougins, à 1 620 000 €, 19 500 € sous votre prix.</b>';

const STEPS = [
  { k: 'Au rendez-vous · 15/10', rank: 3, total: 6 },
  { k: 'Aujourd’hui · 05/11', rank: 2, total: 4 },
  { k: 'Avec les nouveaux venus', rank: 4, total: 6, current: true },
];

const lineHead = (fullPrimary = true) => `<div class="row-head">
<div class="name">M. Lefebvre <span class="pill" style="background:#ecfdf5;color:#059669">Mandat signé</span><span class="pill" style="background:#e8f1f8;color:${C.brand}">Exclusif</span></div>
<div class="meta">Maison · 7 pièces · 210 m² · Mougins · conclu le 15/10 · Durée du Live : 48 min</div>
<div style="display:flex;gap:28px;align-items:baseline"><span class="kick">Le chemin parcouru</span><span style="font-size:13px;font-weight:700">1 774 500 € → 1 690 000 € → 1 639 500 €</span><span style="font-size:12px;font-weight:700;color:#059669">−8 %</span><span class="kick">Prêt à lancer</span><span style="font-size:13px;font-weight:700">7 → 10/10</span></div>
</div>
<div class="actions"><span class="btn ${fullPrimary ? 'full' : ''}">Prospecter · 5 concurrents →</span><span class="meta">1 remis · 1 adresse à confirmer · 1 ne plus solliciter</span><span class="btn">Mettre à jour les concurrents</span><span class="txt">Voir le détail des prix ▾</span><span class="txt">Changer l’issue</span></div>`;

const pointsList = `<div class="zone"><span class="kick">Points marché</span>
<div style="display:flex;gap:12px;align-items:center;font-size:13px"><b>Point du 05/11</b><span class="meta">5 annonces relues · 1 baisse · 1 vente probable · 1 retiré sans vente · 2 nouveaux venus</span><span class="btn sm">Ouvrir le Point marché →</span></div>
<span class="meta">Ont baissé depuis le rendez-vous : 1 sur 5</span></div>`;

const compact = ({ sentence = SENTENCE, steps = STEPS, rank = 4, total = 6 } = {}) => `<div class="zone" data-zone="compact">
<span class="kick">Où en est son prix, tel que le vendeur le lira · Point du 05/11</span>
<div style="display:grid;grid-template-columns:0.85fr 1.6fr;gap:12px;align-items:stretch">
${verdict({ rank, total, sentence, compact: true })}
<div class="steps">${steps.map(step).join('<span class="arrow">→</span>')}</div>
</div></div>`;

const dangerousClosed = `<div class="zone" style="flex-direction:row;align-items:center;gap:12px">
<span class="kick" style="white-space:nowrap">Le plus dangereux</span><span class="tag gold">Selon le vendeur</span>
<span style="font-size:13px;font-weight:600;white-space:nowrap">Maison · 7 pièces · 225 m² · Mougins · 1 690 000 €</span>
<span class="meta" style="white-space:nowrap">son choix au rendez-vous</span>
<span class="btn sm" style="margin-left:auto">Désigner le plus dangereux aujourd’hui</span></div>`;

const page = (title, frames) =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${frames.join('\n')}</body></html>`;

const frame = (label, cls, inner) =>
  `<section><div class="frame-title">${label}</div><div class="frame ${cls}">${inner}</div></section>`;

// ---------- 1 · Suivi, vue compacte ----------
const suivi1 = frame(
  'M129-1 a · Suivi 1280 × 800 · ligne de M. Lefebvre après la mise à jour · le verdict et les trois étapes, sans le classement',
  'desk',
  `${side}<div class="main"><div class="h1">Suivi</div><div class="sub">Mandats signés · 3 · À relancer · 2 · Tous · 6</div>
<div class="card">${lineHead()}${pointsList}${compact()}${dangerousClosed}</div>
<div class="lecture"><b>Lecture.</b> Le bloc vient sous « Points marché », lu sur le DERNIER point. Verdict à gauche (couleur de la place avec les nouveaux venus), trois étapes à droite, la dernière teintée. Ni classement, ni prix des concurrents : « Ouvrir le Point marché → » les montre. Un seul bouton plein : « Prospecter ». Le détail (« Voir le détail des prix ») garde « Ce que le vendeur a dit » et ne répète plus les lignes de prix.</div></div>`,
);

const suivi1b = frame(
  'M129-1 b · Même ligne, point sans recherche des nouveaux venus · la troisième étape ne compte rien',
  'desk',
  `${side}<div class="main"><div class="h1">Suivi</div><div class="sub">Mandats signés · 3 · À relancer · 2 · Tous · 6</div>
<div class="card">${lineHead()}<div class="zone"><span class="kick">Points marché</span>
<div style="display:flex;gap:12px;align-items:center;font-size:13px"><b>Point du 05/11</b><span class="meta">5 annonces relues · 1 baisse · 1 vente probable · 1 retiré sans vente</span><span class="btn sm">Ouvrir le Point marché →</span><span class="txt">Chercher les nouveaux venus · jusqu’à 0,60 €, 1,20 € si la recherche s’élargit</span></div></div>
${compact({
  rank: 2,
  total: 4,
  sentence: 'Un concurrent a baissé de 5,8 % et deux ont quitté le marché : vous restez parmi les moins chers des biens encore en vente.',
  steps: [
    { k: 'Au rendez-vous · 15/10', rank: 3, total: 6 },
    { k: 'Aujourd’hui · 05/11', rank: 2, total: 4, current: true },
    { k: 'Avec les nouveaux venus', none: 'Aucun nouveau venu retenu' },
  ],
})}${dangerousClosed}</div>
<div class="lecture"><b>Lecture.</b> Sans nouveau venu retenu, le verdict prend la place d’« Aujourd’hui » (étape teintée) et la troisième étape dit « Aucun nouveau venu retenu », sans chiffre ni réglette. Après une recherche à zéro : « Aucun nouveau venu entre 1 557 000 € et 1 639 500 € ». Sans aucun point : le bloc n’existe pas (le texte « Aucun point marché pour ce mandat… » reste).</div></div>`,
);

writeFileSync(join(here, 'M129-1-suivi-vue-compacte.html'), page('M129-1 · Suivi, vue compacte', [suivi1, suivi1b]));

// ---------- 2 · Désigner le plus dangereux aujourd'hui ----------
const choices = [
  { label: 'Maison · 6 pièces · 190 m² · Mougins', price: '1 495 000 €', tag: 'new', hint: 'arrivé le 21/10' },
  { label: 'Maison · 7 pièces · 205 m² · Mougins', price: '1 554 000 €', hint: 'a baissé de 5,8 %' },
  { label: 'Maison · 7 pièces · 200 m² · Mougins', price: '1 620 000 €', tag: 'new', hint: 'arrivé le 24/10', sel: true },
  { label: 'Maison · 7 pièces · 225 m² · Mougins', price: '1 690 000 €', hint: 'choix du vendeur au rendez-vous' },
  { label: 'Maison · 7 pièces · 212 m² · Mougins', price: '1 699 000 €', hint: 'en vente depuis 48 jours' },
];
const radioList = (sel) =>
  choices
    .map(
      (c, i) =>
        `<div class="radio ${i === sel ? 'sel' : ''}"><span class="dot"></span><span><b style="font-weight:600">${c.label}</b> ${c.tag ? '<span class="tag new">Nouveau</span>' : ''}<br><span class="meta" style="font-size:11px">${c.hint}</span></span><span class="pr">${c.price}</span></div>`,
    )
    .join('');

const pickerOpen = `<div class="zone" style="background:#fffdf7">
<div style="display:flex;align-items:center;gap:10px"><span class="kick" style="color:${C.gold}">Désigner le plus dangereux aujourd’hui</span><span class="meta">Point du 05/11 · biens encore en vente, du moins cher au plus cher</span></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${radioList(2)}</div>
<div style="display:flex;align-items:center;gap:14px"><span class="btn full sm">En faire le plus dangereux</span><span class="txt" style="color:${C.muted}">Annuler</span>
<span class="note">Le document et son lien le montreront dès maintenant. Le choix du vendeur au rendez-vous reste écrit, avec la mention « votre choix au rendez-vous ».</span></div></div>`;

const suivi2a = frame(
  'M129-2 a · Suivi 1280 × 800 · « Désigner le plus dangereux aujourd’hui » ouvert · un bien choisi',
  'desk',
  `${side}<div class="main"><div class="h1">Suivi</div><div class="sub">Mandats signés · 3 · À relancer · 2 · Tous · 6</div>
<div class="card">${lineHead(false)}${compact()}${pickerOpen}</div>
<div class="lecture" style="width:300px"><b>Lecture.</b> Contrôle replié par défaut (maquette 1). Ouvert : les biens encore en vente de ce point, nouveaux venus compris, disparus exclus, dans l’ordre du classement ; libellé neutre et prix d’aujourd’hui. Le choix actuel est présélectionné ; « En faire le plus dangereux » reste grisé tant qu’on n’en choisit pas un autre. Tant que le contrôle est ouvert, « Prospecter » passe en contour : un seul bouton plein.</div></div>`,
);

const changed = `<div class="zone" style="gap:6px">
<div style="display:flex;align-items:center;gap:10px"><span class="kick" style="white-space:nowrap">Le plus dangereux</span><span class="tag gold">Aujourd’hui</span>
<span style="font-size:13px;font-weight:600;white-space:nowrap">Maison · 7 pièces · 200 m² · Mougins · 1 620 000 €</span><span class="tag new">Nouveau</span>
<span class="meta" style="white-space:nowrap">désigné par vous le 05/11</span></div>
<div style="display:flex;align-items:center;gap:10px"><span class="tag goldline">Au rendez-vous</span><span class="meta">Maison · 7 pièces · 225 m² · Mougins · 1 690 000 € · choix du vendeur, gardé</span>
<span class="btn sm" style="margin-left:auto">Désigner un autre</span><span class="txt">Revenir au choix du rendez-vous</span></div>
<div class="msg ok">Point du 05/11 mis à jour : le plus dangereux aujourd’hui est Maison · 7 pièces · 200 m² · Mougins.</div></div>`;

const suivi2b = frame(
  'M129-2 b · Après le choix · le verdict le dit, le choix du vendeur reste, retour possible',
  'desk',
  `${side}<div class="main"><div class="h1">Suivi</div><div class="sub">Mandats signés · 3 · À relancer · 2 · Tous · 6</div>
<div class="card">${lineHead()}${compact({ sentence: SENTENCE_CHANGED })}${changed}</div>
<div class="lecture" style="width:300px"><b>Lecture.</b> « Revenir au choix du rendez-vous » (texte) remet le choix du vendeur, sans confirmation : rien n’est perdu, l’un et l’autre restent écrits. Le message vert dure 4 s. Le choix du jour est reporté au point suivant tant que le bien reste en vente.</div></div>`,
);

const goneState = `<div class="zone" style="gap:8px">
<div class="msg warn" style="display:flex;align-items:center;gap:12px"><span><b>Le plus dangereux du rendez-vous a quitté le marché</b> (Maison · 7 pièces · 225 m² · Mougins, retirée le 02/11 : vente probable). Désignez-en un autre pour ce point.</span><span class="btn sm" style="margin-left:auto;background:#fff">Désigner le plus dangereux aujourd’hui</span></div>
<div class="note">Tant que vous n’en désignez pas d’autre, le document garde sa fiche dorée avec ce qu’il est devenu, et le classement n’a pas de « Le plus dangereux ». Variante : un plus dangereux désigné un jour puis disparu — « Le bien désigné le 05/11 a quitté le marché : le plus dangereux redevient le choix du vendeur au rendez-vous. »</div>
<span class="kick" style="margin-top:6px">Messages</span>
<div class="msg err">Le choix n’a pas été enregistré. Réessayez.</div>
<div class="msg err">Ce bien n’est plus en vente dans ce point : choisissez-en un autre.</div>
<div class="msg err">Un point plus récent existe : le choix se fait sur le Point du 12/11.</div>
<div class="note">Aucun bien encore en vente dans ce point : le contrôle n’apparaît pas, et la ligne dit « Aucun bien encore en vente : rien à désigner. »</div></div>`;

const suivi2c = frame(
  'M129-2 c · Le plus dangereux du rendez-vous a disparu (exemple de forme : on suppose que la villa de 225 m² s’est retirée) · messages d’erreur',
  'desk',
  `${side}<div class="main"><div class="h1">Suivi</div><div class="sub">Mandats signés · 3 · À relancer · 2 · Tous · 6</div>
<div class="card">${lineHead()}${goneState}</div></div>`,
);

writeFileSync(
  join(here, 'M129-2-suivi-plus-dangereux.html'),
  page('M129-2 · Désigner le plus dangereux aujourd’hui', [suivi2a, suivi2b, suivi2c]),
);

// ---------- 3 · La fiche du plus dangereux, cadre doré ----------
const ph = (h, label = '') =>
  `<div style="height:${h}px;background:linear-gradient(135deg,#9ca3af,#d4d4d8);display:flex;align-items:flex-end;padding:6px;font-size:10px;color:#fff">${label}</div>`;
const grid = (rows) =>
  `<table style="width:100%;border-collapse:collapse;font-size:12px">${rows
    .map(
      ([k, a, b, t]) =>
        `<tr style="border-bottom:1px solid #f4f4f5"><td style="padding:5px 0;color:${C.muted}">${k}</td><td style="text-align:right">${a}</td><td style="text-align:right;padding-left:10px;font-weight:600;color:${t === 'g' ? '#15803d' : t === 'o' ? '#c2410c' : '#52525b'}">${b}</td></tr>`,
    )
    .join('')}</table>`;
const kicker = (t, c = C.muted) =>
  `<div style="font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${c}">${t}</div>`;

const goldBanner = (text) =>
  `<div style="background:${C.gold};color:#fff;font-weight:800;font-size:12px;letter-spacing:.14em;padding:8px 16px;display:flex;align-items:center;gap:8px">◆ ${text}</div>`;

const ficheNew = (banner) => `<article style="border:3px solid ${C.gold};background:#fff;break-inside:avoid">
${goldBanner(banner)}
<div style="padding:16px;display:flex;flex-direction:column;gap:12px;background:${C.goldSoft}">
<div>${kicker('Nouveau venu')}<div style="font-family:Rajdhani,Montserrat,Arial;font-size:22px;font-weight:700;color:${C.brandDarker}">Maison · 7 pièces · 200 m² · Mougins</div></div>
<div style="display:grid;grid-template-columns:2fr 1fr;gap:6px">${ph(230, 'photo de l’annonce')}<div style="display:grid;gap:6px">${ph(112)}${ph(112)}</div></div>
${kicker('Ses caractéristiques face à votre bien')}
${grid([
  ['Surface', '210 m²', '200 m²', 'o'],
  ['Terrain', '1 800 m²', '1 600 m²', 'o'],
  ['Pièces · chambres', '7 · 4', '7 · 4', ''],
  ['DPE', 'B', 'C', 'o'],
])}
${kicker('Le prix, depuis son arrivée sur le marché', C.brand)}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
<div style="border:1px solid ${C.line};background:#fff;padding:10px 12px">${kicker('Vu sur le marché depuis le')}<div style="font-weight:700;font-size:16px">24/10</div><div style="color:${C.muted}">pas encore en vente au rendez-vous</div></div>
<div style="border:1.5px solid ${C.gold};background:#fff;padding:10px 12px">${kicker('Prix affiché')}<div style="font-weight:800;font-size:22px">1 620 000 €</div><div style="color:${C.muted}">8 100 €/m² · 19 500 € sous votre prix</div></div></div>
</div></article>`;

const ficheOld = `<article style="border:1px solid ${C.line};border-top:3px solid ${C.brand};background:#fff;padding:16px;display:flex;flex-direction:column;gap:12px">
<div>${kicker(`Concurrent 1 · <span style="color:${C.gold}">votre choix au rendez-vous</span>`)}<div style="font-family:Rajdhani,Montserrat,Arial;font-size:22px;font-weight:700;color:${C.brandDarker}">Maison · 7 pièces · 225 m² · Mougins</div></div>
<div style="display:grid;grid-template-columns:2fr 1fr;gap:6px">${ph(200, 'photo de l’annonce')}<div style="display:grid;gap:6px">${ph(97)}${ph(97)}</div></div>
${kicker('Ses caractéristiques face à votre bien')}
${grid([
  ['Surface', '210 m²', '225 m²', 'g'],
  ['Pièces · chambres', '7 · 4', '7 · 5', 'g'],
  ['DPE', 'B', 'B', ''],
])}
${kicker('Le prix, depuis le rendez-vous', C.brand)}
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px">
<div style="border:1px solid ${C.line};padding:10px 12px">${kicker('Au rendez-vous')}<div style="font-weight:700;font-size:16px">1 690 000 €</div></div>
<div style="border:1px solid ${C.line};padding:10px 12px">${kicker('Aujourd’hui')}<div style="font-weight:800;font-size:18px">1 690 000 €</div></div>
<div style="border:1px solid ${C.line};padding:10px 12px">${kicker('Écart')}<div style="font-weight:700;font-size:16px">0 %</div><div style="color:${C.muted}">prix inchangé</div></div></div>
<div style="font-size:12px;color:${C.muted}">Toujours en vente depuis 65 jours · 7 511 €/m² aujourd’hui</div></article>`;

const a4Footer = `<div style="position:absolute;left:53px;right:53px;bottom:24px;display:flex;justify-content:space-between;font-size:9px;letter-spacing:.12em;color:#64748b">ÉTUDE CONFIDENTIELLE · MOUGINS · 5 NOVEMBRE 2026<span>04 / 11</span></div>`;

const a4a = frame(
  'M129-3 a · Document A4 · plus dangereux changé · le nouveau, cadre doré, « LE PLUS DANGEREUX AUJOURD’HUI »',
  'a4',
  `${ficheNew('LE PLUS DANGEREUX AUJOURD’HUI')}${a4Footer}`,
);
const a4b = frame(
  'M129-3 b · Document A4 · même document · l’ancien choix : plus de cadre, la mention discrète « votre choix au rendez-vous »',
  'a4',
  `${ficheOld}<div style="margin-top:18px;border:1px dashed #d4d4d8;padding:12px;font-size:12px;color:${C.muted};line-height:1.5"><b style="color:${C.ink}">Sans changement</b> (aucun plus dangereux désigné après le rendez-vous) : cette fiche-ci porte le cadre doré et le bandeau « ◆ LE PLUS DANGEREUX, SELON VOUS », exactement comme la fiche a. Un seul cadre doré par document. Même cadre (3 px, fond ${C.goldSoft}) sur sa ligne du classement, comme la v2.</div>${a4Footer}`,
);

const phoneFiche = frame(
  'M129-3 c · Lien, téléphone 390 × 844 · la même fiche, le cadre doré pleine largeur',
  'phone',
  `<div style="padding:12px 12px 90px;height:100%;overflow:hidden">${ficheNew('LE PLUS DANGEREUX AUJOURD’HUI')
    .replace('grid-template-columns:2fr 1fr;gap:6px">' + ph(230, 'photo de l’annonce'), 'grid-template-columns:1fr;gap:6px">' + ph(200, 'photo de l’annonce'))
    .replace(`<div style="display:grid;gap:6px">${ph(112)}${ph(112)}</div>`, `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${ph(80)}${ph(80)}</div>`)}</div>
<div style="position:absolute;left:0;right:0;bottom:0;background:#fff;border-top:1px solid ${C.line};padding:12px 16px 22px"><div class="btn" style="text-align:center">Télécharger en PDF</div></div>`,
);

writeFileSync(
  join(here, 'M129-3-fiche-plus-dangereux.html'),
  page('M129-3 · Fiche du plus dangereux, cadre doré', [
    `<div style="display:flex;gap:24px;align-items:flex-start">${a4a}${a4b}</div>`,
    phoneFiche,
  ]),
);

// ---------- 4 · Le classement sur téléphone ----------
const rows = [
  { label: 'Maison · 6 p. · 190 m² · Mougins', detail: 'arrivé le 21/10', today: '1 495 000 €', tag: 'new' },
  { label: 'Maison · 7 p. · 205 m² · Mougins', detail: 'a baissé de 5,8 % · en vente depuis 55 jours', meeting: '1 650 000 €', today: '1 554 000 €' },
  { label: 'Maison · 7 p. · 200 m² · Mougins', detail: 'arrivé le 24/10', today: '1 620 000 €', tag: 'new' },
  { me: true, label: 'Maison · 7 p. · 210 m² · Mougins', detail: 'prix retenu ensemble', today: '1 639 500 €' },
  { label: 'Maison · 7 p. · 225 m² · Mougins', detail: 'votre choix au rendez-vous · en vente depuis 65 jours', meeting: '1 690 000 €', today: '1 690 000 €', gold: true },
  { label: 'Maison · 7 p. · 212 m² · Mougins', detail: 'en vente depuis 48 jours', meeting: '1 699 000 €', today: '1 699 000 €' },
];
const phoneRow = (r, i) => {
  const rank = i + 1;
  const t = tier(rank, 6);
  if (r.me)
    return `<div style="background:${tone[t]};color:#fff;border-radius:12px;padding:12px 12px;display:grid;grid-template-columns:24px 1fr auto;gap:8px;align-items:start;margin:6px 0">
<span style="font-weight:800;font-size:20px">${rank}</span><div style="font-size:13.5px;line-height:1.35"><b>VOTRE BIEN</b><br>${r.label}<div style="font-size:11.5px;opacity:.9">${r.detail}</div></div>
<div style="text-align:right"><div style="font-weight:800;font-size:19px;white-space:nowrap">${r.today}</div><div style="font-size:11px;opacity:.9;white-space:nowrap">au rendez-vous :<br>${r.today}</div></div></div>`;
  return `<div style="display:grid;grid-template-columns:4px 22px 1fr auto;gap:8px;align-items:start;padding:10px ${r.gold ? '8px' : '0'};border-bottom:1px solid #f4f4f5;${r.gold ? `border:2px solid ${C.gold};background:${C.goldSoft};border-radius:10px;margin:4px 0` : ''}">
<i style="display:block;width:4px;height:100%;min-height:44px;border-radius:2px;background:${tone[t]}"></i>
<span style="font-weight:800;font-size:19px;color:${tone[t]}">${rank}</span>
<div style="font-size:13.5px;line-height:1.35">${r.label}${r.tag ? ' <span class="tag new">Nouveau</span>' : ''}${r.gold ? ' <span class="tag gold">Le plus dangereux</span>' : ''}<div style="font-size:11.5px;color:${C.muted}">${r.detail}</div></div>
<div style="text-align:right"><div style="font-weight:800;font-size:17px;white-space:nowrap">${r.today}</div>${r.meeting ? `<div style="font-size:11px;color:${C.muted};white-space:nowrap">au rendez-vous :<br>${r.meeting}</div>` : `<div style="font-size:11px;color:${C.muted};white-space:nowrap">pas en vente<br>au rendez-vous</div>`}</div></div>`;
};

const phoneHeader = `<div style="display:flex;align-items:center;gap:10px;border-bottom:2px solid ${C.brandDarker};padding-bottom:8px"><span style="border:1.5px solid ${C.brandDarker};font-weight:700;font-size:12px;padding:1px 6px;color:${C.brandDarker}">03</span><span style="font-family:Rajdhani,Montserrat,Arial;font-size:26px;font-weight:700;color:${C.brandDarker}">Où en est votre prix</span></div>`;

const phoneStep = (s) => {
  if (s.none)
    return `<div style="border:1px solid ${C.line};border-radius:10px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center"><span class="step-k" style="font-size:9.5px;font-weight:700;letter-spacing:.1em;color:${C.muted};text-transform:uppercase">${s.k}</span><span style="font-size:12px;color:${C.muted}">${s.none}</span></div>`;
  const t = tier(s.rank, s.total);
  return `<div style="border:1px solid ${s.current ? tone[t] : C.line};background:${s.current ? soft[t] : '#fff'};border-radius:10px;padding:8px 12px;display:flex;flex-direction:column;gap:5px">
<div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-size:9.5px;font-weight:700;letter-spacing:.1em;color:${C.muted};text-transform:uppercase">${s.k}</span><span style="font-weight:800;font-size:20px;color:${tone[t]}">${s.rank}<sup style="font-size:11px">${ord(s.rank)}</sup> <small style="font-size:12px;color:${C.muted}">sur ${s.total}</small></span></div>${ruler(s.rank, s.total)}</div>`;
};

const pdfBar = `<div style="position:absolute;left:0;right:0;bottom:0;background:#fff;border-top:1px solid ${C.line};padding:12px 16px 22px"><div class="btn" style="text-align:center">Télécharger en PDF</div></div>`;

const phone4a = frame(
  'M129-4 a · Lien, téléphone 390 × 844 · haut de la page : verdict, trois étapes l’une sous l’autre, début du classement',
  'phone',
  `<div style="padding:18px 16px 90px;display:flex;flex-direction:column;gap:12px">${phoneHeader}
${verdict({ rank: 4, total: 6, sentence: SENTENCE, compact: true }).replace('font-size:16px', 'font-size:18px')}
<div style="display:flex;flex-direction:column;gap:6px">${STEPS.map(phoneStep).join('<div style="text-align:center;color:#a1a1aa;font-size:12px;line-height:1">↓</div>')}</div>
<div style="font-size:9.5px;font-weight:700;letter-spacing:.1em;color:${C.muted};text-transform:uppercase;margin-top:4px">Classement, du moins cher au plus cher</div>
<div>${rows.slice(0, 2).map(phoneRow).join('')}</div></div>${pdfBar}`,
);
const phone4b = frame(
  'M129-4 b · Même page après défilement · VOTRE BIEN, le plus dangereux en cadre doré, la légende · la barre garde sa place',
  'phone',
  `<div style="padding:12px 16px 90px;display:flex;flex-direction:column;gap:0">
<div style="font-size:9.5px;font-weight:700;letter-spacing:.1em;color:${C.muted};text-transform:uppercase;margin-bottom:4px">Classement, du moins cher au plus cher</div>
${rows.map(phoneRow).join('')}
<div style="display:flex;flex-direction:column;gap:5px;margin-top:12px;font-size:12px;color:${C.muted}">
<span><i style="display:inline-block;width:11px;height:11px;border-radius:3px;background:${C.green};vertical-align:-1px"></i> 1<sup>er</sup> tiers : pas de problème</span>
<span><i style="display:inline-block;width:11px;height:11px;border-radius:3px;background:${C.orange};vertical-align:-1px"></i> 2<sup>e</sup> tiers : attention</span>
<span><i style="display:inline-block;width:11px;height:11px;border-radius:3px;background:${C.red};vertical-align:-1px"></i> dernier tiers : danger</span></div>
<div style="font-size:11.5px;color:${C.muted};margin-top:10px;line-height:1.45">Ont quitté le marché depuis le rendez-vous, hors classement : Maison · 6 p. · 180 m² · Mougins (vente probable) · Maison · 5 p. · 160 m² · Mougins (retiré sans vente).</div></div>${pdfBar}`,
);

writeFileSync(
  join(here, 'M129-4-classement-telephone.html'),
  page('M129-4 · Le classement sur téléphone', [`<div style="display:flex;gap:24px">${phone4a}${phone4b}</div>`]),
);

// ---------- 5 · Les nouveaux venus : la fourchette, le coût, « en vente avant le rendez-vous » ----------
const proposal = `<div class="zone" style="gap:10px">
<div style="border:1px solid ${C.line};border-left:5px solid #059669;border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;background:#fff">
<b style="font-size:15px">Chercher les nouveaux venus sur le marché ?</b>
<p style="font-size:12.5px;line-height:1.5">Les biens vus sur le marché depuis le 15/10, avec les critères du dossier, <b>de 1 557 000 € à 1 639 500 €</b> (jusqu’à 5 % sous le prix de commercialisation). S’il y en a moins de 3, la recherche s’élargit <b>à partir de 1 475 000 €</b> (jusqu’à 10 % sous). Sans ceux déjà retenus ou écartés.</p>
<p style="font-size:12.5px"><b>Recherche payante : jusqu’à 0,60 €, 1,20 € si la recherche s’élargit.</b></p>
<div style="display:flex;gap:14px;align-items:center"><span class="btn full">Chercher les nouveaux venus</span><span class="txt" style="color:${C.muted}">Pas maintenant</span></div>
</div></div>`;

const results = `<div class="zone" style="gap:8px">
<b style="font-size:14px">Nouveaux sur le marché depuis le rendez-vous</b>
<span class="meta">2 trouvés de 1 475 000 € à 1 639 500 € · recherche élargie à 10 % sous le prix de commercialisation (1 seul bien jusqu’à 5 %) · 40 annonces facturées (0,40 €) · critères du dossier · vus sur le marché après le 15/10</span>
<span class="meta">3 biens sous 1 475 000 € : non proposés · 2 annonces en vente avant le rendez-vous : non proposées</span>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
<div style="border:1px solid ${C.line};border-radius:10px;padding:10px 12px;font-size:12.5px;background:#fff"><b>Maison · 7 pièces · 200 m² · Mougins</b><br>1 620 000 € · 8 100 €/m²<br><span style="color:${C.brand};font-weight:600">Vu sur le marché depuis le 24/10</span><div style="margin-top:6px;display:flex;gap:10px"><span class="btn sm">Retenir</span><span class="txt" style="color:${C.muted}">Écarter</span></div></div>
<div style="border:1px solid ${C.line};border-radius:10px;padding:10px 12px;font-size:12.5px;background:#fff"><b>Maison · 6 pièces · 190 m² · Mougins</b><br>1 495 000 € · 7 868 €/m²<br><span style="color:${C.brand};font-weight:600">Vu sur le marché depuis le 21/10</span><div style="margin-top:6px;display:flex;gap:10px"><span class="btn sm">Retenir</span><span class="txt" style="color:${C.muted}">Écarter</span></div></div></div></div>`;

const suivi5 = frame(
  'M129-5 a · Suivi 1280 × 800 · proposition de recherche (fourchette et coût annoncés avant), puis résultats élargis',
  'desk',
  `${side}<div class="main"><div class="h1">Suivi</div>
<div class="card">${lineHead(false)}${proposal}${results}</div>
<div class="lecture" style="width:330px;bottom:12px"><b>Lecture.</b> La proposition et les résultats ne sont pas à l’écran en même temps : montrés ensemble pour les textes. Bornes au millier : plancher arrondi au millier INFÉRIEUR, le même dans la requête et à l’écran (1 557 525 → 1 557 000 ; 1 475 550 → 1 475 000). Pendant : « Recherche en cours… · Jusqu’à 1,20 € réservés sur le budget du mois ; la part non utilisée est rendue. »</div></div>`,
);

const docMentions = `<div style="display:flex;flex-direction:column;gap:14px">
${kicker('Étape 3 de « Où en est votre prix », sous « 4e sur 6 »')}
<div style="border:1px solid ${C.orange};background:${C.orangeSoft};border-radius:10px;padding:10px 14px;width:330px">${kicker('Avec les nouveaux venus')}<div style="font-weight:800;font-size:28px;color:${C.orange}">4<sup style="font-size:14px">e</sup> <small style="font-size:16px;color:${C.muted}">sur 6</small></div>${ruler(4, 6)}<div style="font-size:11px;color:${C.muted};margin-top:5px">cherchés de 1 475 000 € à 1 639 500 €</div></div>
${kicker('Pour lire ce document (dernière page), une phrase ajoutée')}
<p style="font-size:13px;line-height:1.5;max-width:640px">Les nouveaux venus ont été cherchés de 1 475 000 € à 1 639 500 €, soit jusqu’à 10 % sous votre prix, avec les critères de votre bien, parmi les annonces vues sur le marché après le rendez-vous.</p>
${kicker('Un bien retenu à tort (Biot, vu sur le marché depuis le 17/06/2025) · exemple de forme')}
<div style="border:1px solid ${C.line};border-top:3px solid ${C.brand};padding:12px 14px;max-width:640px">${kicker('Retenu après le rendez-vous · en vente avant le rendez-vous, non montré alors')}<div style="font-family:Rajdhani,Montserrat,Arial;font-size:20px;font-weight:700;color:${C.brandDarker}">Maison · 5 pièces · 110 m² · Biot</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-top:8px"><div style="border:1px solid ${C.line};padding:8px 10px">${kicker('En vente depuis le')}<b style="font-size:15px">17/06/2025</b><div style="color:${C.muted}">non montré au rendez-vous</div></div><div style="border:1px solid ${C.line};padding:8px 10px">${kicker('Prix affiché')}<b style="font-size:18px">798 000 €</b></div></div>
<p style="font-size:12px;color:${C.muted};margin-top:8px">Il n’entre ni dans les trois étapes ni dans le classement.</p></div>
<p style="font-size:12px;color:${C.muted};max-width:640px">Sur le Suivi, sa ligne dit : « Concurrent 7 · Maison · 5 pièces · 110 m² · Biot » · « En vente avant le rendez-vous, non montré alors · 798 000 € ». Rien n’est effacé ; il reste retenu.</p></div>`;

const docFrame = frame(
  'M129-5 b · Document et lien · la fourchette cherchée, et la mention « en vente avant le rendez-vous, non montré alors »',
  'a4',
  docMentions,
);

writeFileSync(
  join(here, 'M129-5-nouveaux-venus-fourchette.html'),
  page('M129-5 · Nouveaux venus : fourchette, coût, mention', [suivi5, docFrame]),
);

console.log('M129-1 à M129-5 écrits.');
