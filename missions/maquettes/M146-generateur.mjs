// Mission 146 — générateur des maquettes « Moins de boutons », version 2 (réponses de Jean-Guy, 08/11 :
// la mission en deux parties, A côté vendeur, B côté acquéreur et prospection ; le Suivi et la liste
// du Live ajoutés ; « Plage des prix des concurrents » ; le type du bien dans « Aujourd'hui » ; sans
// logo, le nom en grand dans la carte ; les acquéreurs s'ouvrent sur « Mes fiches »).
// Version 1 : (audit du 07/11 : I4, I5, I9, I10, C3,
// C4, C9 ; ajoutés par Jean-Guy le 08/11 : C8, le fondu de la présentation acquéreur, le libellé
// d'« Aujourd'hui »). `node missions/maquettes/M146-generateur.mjs` écrit les HTML M146-A1 à M146-B5
// à côté de lui ; `--png` les rend aussi en PNG (Chromium du dépôt).
//
// Chaque planche : l'écran touché, AVANT (le code de `main` au 08/11, f11ac39, relevé dans les
// composants) et APRÈS, sur ordinateur (1280), tablette (1024) et téléphone (390) ; la zone de
// l'écran qui change, pas la page entière. Données : la démo (Vence, Mougins, Antibes, les
// acquéreurs semés), jamais inventées. Les pastilles jaunes renvoient aux notes.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const C = {
  brand: '#00527a',
  brandDeep: '#013a58',
  brandSoft: '#eaf5ff',
  ink: '#18181b',
  muted: '#52525b',
  soft: '#71717a',
  line: '#e4e4e7',
  orange: '#c2410c',
  amber: '#b45309',
  amberSoft: '#fef3c7',
  green: '#12875a',
  greenSoft: '#e6f4ec',
  red: '#b91c1c',
  note: '#fef6c7',
  noteLine: '#e8cf5a',
  noteInk: '#5b4a00',
};

const css = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,Inter,Arial,sans-serif;color:${C.ink};background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:22px;align-items:flex-start}
h1.sheet{font-size:22px;color:#27272a}
.sheet-sub{font-size:13px;color:#3f3f46;max-width:1900px;line-height:1.5}
.layout{display:flex;gap:28px;align-items:flex-start}
.devices{display:flex;flex-direction:column;gap:26px}
.pair{display:flex;gap:22px;align-items:flex-start}
.frame-title{font-size:13px;font-weight:800;color:#3f3f46;margin-bottom:6px;display:flex;gap:8px;align-items:center}
.frame-title .st{font-size:11px;font-weight:800;letter-spacing:.1em;border-radius:6px;padding:2px 7px;color:#fff}
.frame-title .st.av{background:#71717a}
.frame-title .st.ap{background:${C.green}}
.frame{background:#f7f8fa;position:relative;overflow:hidden;border:1px solid #a1a1aa}
.desk{width:1280px}
.tab{width:1024px}
.phone{width:390px}
.zone{padding:22px 32px;display:flex;flex-direction:column;gap:14px}
.tab .zone{padding:20px 22px}
.phone .zone{padding:14px 12px;gap:12px}
.kicker{font-size:11.5px;font-weight:800;letter-spacing:.14em;color:${C.soft};text-transform:uppercase}
.title{font-family:Rajdhani,Montserrat,Arial,sans-serif;font-size:34px;font-weight:800;color:${C.brandDeep};line-height:1.05}
.phone .title{font-size:27px}
.subtitle{font-size:13.5px;color:${C.muted};margin-top:4px;line-height:1.45}
.head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap}
.actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:6px;border-radius:10px;padding:9px 15px;font-size:13.5px;font-weight:700;white-space:nowrap;border:1.5px solid #d4d4d8;color:${C.ink};background:#fff}
.btn.full{background:${C.brand};border-color:${C.brand};color:#fff}
.btn.sm{padding:5px 10px;font-size:12px;border-radius:8px;border-width:1px}
.btn.red{border:0;background:none;color:${C.red};padding-left:4px;padding-right:4px}
.btn.green{background:${C.green};border-color:${C.green};color:#fff}
.btn.more{padding:5px 10px;font-size:15px;line-height:1;letter-spacing:.05em}
.lnk{font-size:12.5px;font-weight:700;color:${C.brand};white-space:nowrap}
.lnk.grey{color:${C.muted};font-weight:600}
.card{background:#fff;border:1px solid ${C.line};border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;position:relative}
.phone .card{padding:12px}
.row{display:flex;gap:12px;align-items:flex-start}
.phone .row.stack{flex-direction:column}
.grow{flex:1;min-width:0}
.name{font-size:15px;font-weight:800}
.name a{color:${C.brandDeep};text-decoration:none}
.facts{font-size:12.5px;color:${C.muted};line-height:1.5}
.badge{display:inline-block;font-size:11px;font-weight:800;border-radius:999px;padding:2px 9px;background:#f4f4f5;color:#3f3f46;margin-right:4px;vertical-align:middle}
.badge.green{background:${C.greenSoft};color:#0b6b46}
.badge.amber{background:${C.amberSoft};color:${C.amber}}
.badge.brand{background:${C.brandSoft};color:${C.brandDeep}}
.badge.redb{background:#fde8e8;color:${C.red}}
.badge.orange{background:#fff1e6;color:${C.orange}}
.photo{width:150px;height:104px;border-radius:10px;flex:none;background:linear-gradient(135deg,#c8d3c4,#9fb39a);display:flex;align-items:flex-end;justify-content:flex-end;padding:5px;font-size:10px;color:#fff;font-weight:700}
.tab .photo{width:130px;height:92px}
.phone .photo{width:100%;height:150px}
.chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px;color:${C.muted}}
.chip{border:1px solid #d4d4d8;border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:600;background:#fff;color:#3f3f46}
.chip.on{background:${C.brandSoft};border-color:${C.brand};color:${C.brandDeep}}
.btnrow{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.handle{color:#a1a1aa;font-size:18px;letter-spacing:-3px;cursor:grab;padding-top:4px;flex:none}
.check{width:16px;height:16px;border:1.5px solid #a1a1aa;border-radius:4px;flex:none;margin-top:4px;background:#fff}
.menu{position:absolute;right:14px;top:auto;bottom:-128px;width:230px;background:#fff;border:1px solid ${C.line};border-radius:12px;box-shadow:0 12px 28px rgb(0 0 0 / .14);padding:6px;z-index:5;display:flex;flex-direction:column}
.menu div{font-size:13px;padding:8px 10px;border-radius:8px;font-weight:600}
.menu div.on{background:#f4f4f5}
.menu div.danger{color:${C.red};border-top:1px solid #f0f0f2;border-radius:0 0 8px 8px;margin-top:4px}
.menu.inline{position:static;width:auto;box-shadow:0 6px 18px rgb(0 0 0 / .1)}
.dialog-wrap{position:absolute;inset:0;background:rgb(24 24 27 / .45);display:flex;align-items:center;justify-content:center;z-index:6}
.dialog{background:#fff;border-radius:14px;padding:18px 20px;width:380px;display:flex;flex-direction:column;gap:10px;box-shadow:0 18px 40px rgb(0 0 0 / .2)}
.phone .dialog{width:330px}
.dialog h3{font-size:16px}
.dialog p{font-size:13px;color:${C.muted};line-height:1.45}
.btn.danger{border-color:${C.red};color:${C.red}}
.kpis{display:flex;gap:10px;flex-wrap:wrap}
.kpi{background:#fff;border:1px solid ${C.line};border-radius:12px;padding:8px 14px;min-width:120px}
.kpi b{display:block;font-size:19px;color:${C.brandDeep}}
.kpi span{font-size:11.5px;color:${C.muted}}
.kpi.fill{background:${C.brandDeep};border-color:${C.brandDeep};min-width:210px}
.kpi.fill b,.kpi.fill span{color:#fff}
.phone .kpi{min-width:0;flex:1 1 40%}
.compact{display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:${C.muted};background:#fff;border:1px solid ${C.line};border-radius:12px;padding:9px 14px}
.compact b{color:${C.brandDeep};font-size:15px;margin-right:4px}
.synth{background:#fff;border:1px solid ${C.line};border-radius:14px;padding:12px 16px}
.synth h3{font-size:13px;font-weight:800;color:${C.muted};margin-bottom:8px}
.synth .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
.synth .grid.three{grid-template-columns:repeat(3,1fr)}
.tab .synth .grid{grid-template-columns:repeat(4,1fr)}
.tab .synth .grid.three{grid-template-columns:repeat(3,1fr)}
.phone .synth .grid{grid-template-columns:repeat(2,1fr)}
.phone .synth .grid.three{grid-template-columns:1fr}
.synth .grid div{font-size:11.5px;color:${C.muted}}
.synth .grid b{display:block;font-size:16px;color:${C.ink}}
.steps{display:flex;gap:4px;font-size:12.5px;font-weight:700;background:#fff;border:1px solid ${C.line};border-radius:12px;padding:4px;flex-wrap:wrap}
.steps span{padding:6px 11px;border-radius:8px;color:${C.muted}}
.steps span.on{background:${C.brandSoft};color:${C.brandDeep}}
.tabs{display:flex;gap:6px}
.tabs span{font-size:13px;font-weight:700;border-radius:999px;padding:6px 14px;border:1px solid #d4d4d8;background:#fff;color:${C.muted}}
.tabs span.full{background:${C.brand};color:#fff;border-color:${C.brand}}
.tabs span.soft{background:${C.brandSoft};color:${C.brandDeep};border-color:#bcd9ee}
.cols{display:grid;gap:12px;grid-template-columns:repeat(4,1fr)}
.cols.three{grid-template-columns:repeat(3,1fr)}
.tab .cols{grid-template-columns:repeat(2,1fr)}
.tab .cols.three{grid-template-columns:repeat(2,1fr)}
.phone .cols,.phone .cols.three{grid-template-columns:1fr}
.col{background:#f0f0f2;border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:10px}
.col h4{font-size:13px;font-weight:800;color:#3f3f46;display:flex;justify-content:space-between}
.col h4 span{background:#fff;border-radius:999px;padding:0 8px;font-size:11.5px}
.col .none{font-size:12.5px;color:${C.soft};padding:4px 2px}
.pc{background:#fff;border:1px solid ${C.line};border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;position:relative}
.pc .addr{font-size:13px;font-weight:800}
.pc .lbl{font-size:12px;color:${C.muted}}
.pc .ready{font-size:12px;font-weight:700;color:#0b6b46}
.pc .foot{font-size:11px;color:${C.soft};border-top:1px dashed ${C.line};padding-top:5px}
.input{background:#fff;border:1px solid #d4d4d8;border-radius:10px;padding:9px 12px;font-size:13px;color:${C.soft};min-width:260px}
.phone .input{min-width:0;flex:1}
.filters{display:flex;gap:6px;flex-wrap:wrap}
.blist{display:flex;flex-direction:column;gap:8px}
.brow{background:#fff;border:1px solid ${C.line};border-radius:12px;padding:11px 14px;display:flex;gap:14px;align-items:center}
.phone .brow{flex-direction:column;align-items:stretch;gap:8px}
.brow .left{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.brow .right{display:flex;flex-direction:column;align-items:flex-end;gap:5px;max-width:420px;text-align:right}
.phone .brow .right{align-items:stretch;text-align:left;max-width:none}
.brow .step{font-size:12px;color:${C.muted}}
.late{color:${C.orange};font-weight:700}
.vgroup{display:flex;flex-direction:column;gap:8px}
.vgroup h3{font-size:15px;font-weight:800;color:${C.brandDeep};display:flex;justify-content:space-between;align-items:center}
.track{display:flex;gap:4px;align-items:center;font-size:11.5px;font-weight:700;flex-wrap:wrap}
.track span{border-radius:999px;padding:2px 9px;background:#f4f4f5;color:${C.soft}}
.track span.done{background:${C.greenSoft};color:#0b6b46}
.track span.now{background:${C.brandSoft};color:${C.brandDeep}}
.track i{color:#c4c4c8;font-style:normal}
.details{font-size:12.5px;font-weight:700;color:${C.brand};border-top:1px solid #f0f0f2;padding-top:6px}
.importcard{background:#fff;border:1px solid ${C.line};border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:8px}
.importcard h3{font-size:15px;font-weight:800}
.importcard p{font-size:12.5px;color:${C.muted};line-height:1.45}
.formline{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.tab .formline{grid-template-columns:repeat(2,1fr)}
.phone .formline{grid-template-columns:1fr}
.field{display:flex;flex-direction:column;gap:3px;font-size:11.5px;color:${C.muted};font-weight:600}
.field span{background:#fff;border:1px solid #d4d4d8;border-radius:8px;padding:7px 10px;font-size:13px;color:${C.ink};font-weight:500}
.reimport{background:#fff;border:1px solid ${C.line};border-radius:12px;padding:10px 14px;font-size:13px;color:${C.muted};display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center}
.notes{width:440px;display:flex;flex-direction:column;gap:12px;flex:none}
.note{background:${C.note};border:1px solid ${C.noteLine};border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.5;color:#3a3000}
.note b{color:${C.noteInk}}
.note ol,.note ul{padding-left:18px;display:flex;flex-direction:column;gap:5px}
.note code{font-size:11.5px;background:#fff8d6;padding:0 3px;border-radius:3px}
.pin{display:inline-flex;width:18px;height:18px;border-radius:50%;background:${C.noteLine};color:${C.noteInk};font-size:10.5px;font-weight:800;align-items:center;justify-content:center;vertical-align:middle;margin:0 3px;flex:none;font-style:normal}
.stage{background:radial-gradient(120% 90% at 20% 0%,#0a4f78 0%,#062b44 55%,#041d2f 100%);color:#fff;display:flex;flex-direction:column}
.stage .bar{display:flex;justify-content:space-between;align-items:center;padding:16px 26px;gap:10px}
.phone .stage .bar{padding:12px 12px}
.stage .ag{font-size:14px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stage .ag small{font-weight:600;letter-spacing:0;text-transform:none;color:rgb(255 255 255 / .55);margin-left:10px;font-size:13px}
.stage .tools{display:flex;gap:6px;flex:none}
.stage .tools span{font-size:12px;font-weight:700;border:1px solid rgb(255 255 255 / .25);border-radius:8px;padding:5px 9px;color:rgb(255 255 255 / .85)}
.intro{margin:8px 26px 0;border-radius:18px;background:linear-gradient(135deg,#0d6a9c,#033453);padding:34px 40px;display:flex;flex-direction:column;gap:26px}
.phone .intro{margin:6px 10px 0;padding:22px 18px;gap:18px}
.intro.full{flex:1;margin-bottom:22px;justify-content:space-between}
.phone .intro.full{margin-bottom:12px}
.intro .logo{font-size:15px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.intro .logo.mark{display:inline-flex;align-items:center;gap:10px;font-size:17px}
.intro .logo.mark i:not(.pin){width:40px;height:40px;border-radius:10px;border:2px solid #fff;display:inline-flex;align-items:center;justify-content:center;font-style:normal;font-size:18px}
.intro .k{font-size:11.5px;font-weight:700;letter-spacing:.2em;color:#7cc4ee;text-transform:uppercase}
.intro h2{font-size:34px;line-height:1.15;font-weight:600;max-width:640px}
.phone .intro h2{font-size:24px}
.intro .who{font-size:17px;font-weight:600;color:rgb(255 255 255 / .85)}
.intro .who small{display:block;font-size:13px;font-weight:500;margin-top:2px}
.intro .go{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.intro .go span.b{background:#fff;color:${C.brandDeep};font-weight:700;border-radius:8px;padding:12px 22px;font-size:15px}
.intro .go small{font-size:13px;color:rgb(255 255 255 / .7)}
.empty-half{flex:1;border-top:2px dashed rgb(255 255 255 / .25);margin:18px 26px 0;display:flex;align-items:center;justify-content:center;font-size:12px;color:rgb(255 255 255 / .45)}
.strip{display:flex;gap:10px;align-items:flex-end}
.shot{display:flex;flex-direction:column;gap:5px;align-items:center;font-size:11.5px;font-weight:700;color:#3f3f46}
.shot .scr{width:150px;height:100px;border-radius:10px;background:#041d2f;position:relative;overflow:hidden;border:1px solid #a1a1aa}
.shot .scr .content{position:absolute;inset:14px 14px 18px 14px;border-radius:8px;background:linear-gradient(135deg,#d9e7f2,#9dbad0);display:flex;flex-direction:column;gap:5px;padding:8px}
.shot .scr .content i{display:block;height:7px;border-radius:4px;background:#fff;opacity:.9}
.tline{display:flex;flex-direction:column;gap:6px}
.tline .lbl{font-size:12.5px;font-weight:800;color:#3f3f46}
.today-line{background:#fff;border:1px solid ${C.line};border-radius:14px;padding:12px 16px;display:flex;gap:14px;align-items:center}
.phone .today-line{flex-wrap:wrap;gap:8px 10px;align-items:flex-start}
.ico{width:30px;height:30px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;background:#ea7a1a}
.txt{flex:1;min-width:0}
.txt b{display:block;font-size:14.5px;font-weight:700;line-height:1.3}
.txt span{display:block;font-size:12.5px;color:${C.muted};margin-top:2px;line-height:1.4}
.txt span.argue{display:inline-block;margin-top:4px;font-size:12px;font-weight:700;color:#0b6b46;background:${C.greenSoft};border-radius:999px;padding:1px 9px}
.phone .today-line .btn{width:calc(100% - 40px);margin-left:40px;justify-content:center}
`;

const page = (title, body) =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${body}</body></html>`;

const p = (n) => `<i class="pin">${n}</i>`;

const DEVICES = [
  { key: 'desk', label: 'Ordinateur · 1280' },
  { key: 'tab', label: 'Tablette · 1024' },
  { key: 'phone', label: 'Téléphone · 390' },
];

// Une planche : pour chaque appareil, AVANT puis APRÈS ; les notes à droite.
function sheet({ title, sub, render, notes, heights = {} }) {
  const rows = DEVICES.map((dev) => {
    const h = heights[dev.key] ? ` style="height:${heights[dev.key]}px"` : '';
    const frame = (state) =>
      `<div><div class="frame-title"><span class="st ${state === 'avant' ? 'av' : 'ap'}">${state === 'avant' ? 'AVANT' : 'APRÈS'}</span>${dev.label}</div><div class="frame ${dev.key}"${h}>${render(dev.key, state)}</div></div>`;
    return `<div class="pair">${frame('avant')}${frame('apres')}</div>`;
  }).join('');
  return page(
    title,
    `<h1 class="sheet">${title}</h1><p class="sheet-sub">${sub}</p><div class="layout"><div class="devices">${rows}</div><div class="notes">${notes}</div></div>`,
  );
}

// ================================================================================================
// 1 · Concurrents (I5)
// ================================================================================================
const VENCE = [
  { label: 'Maison · 5 pièces · 130 m² · Vence', district: 'Les Collines', price: '715 000 €', m2: '5 500 €/m²', gap: '−10 m² que votre bien', dpe: 'C' },
  { label: 'Maison · 5 pièces · 140 m² · Vence', district: 'Les Collines', price: '779 000 €', m2: '5 564 €/m²', gap: 'même surface', dpe: 'B' },
  { label: 'Maison · 5 pièces · 128 m² · Vence', district: 'Les Collines', price: '659 000 €', m2: '5 148 €/m²', gap: '−12 m² que votre bien', dpe: 'D' },
];

function compCard(dev, c, state, { menu = false, first = false } = {}) {
  const photo = `<div class="photo">1/6</div>`;
  const chips = `<div class="chips">Vendu par : <span class="chip on">Agence</span><span class="chip">Particulier</span><span class="chip">Inconnu</span> &nbsp; Exclusivité : <span class="chip">Oui</span><span class="chip on">Non</span><span class="chip">Inconnu</span> <span style="color:#a1a1aa">donnée de l’annonce</span></div>`;
  const facts = `<div class="facts">${c.district} · Importé depuis l’annonce<br><b style="color:${C.ink}">${c.price}</b> · ${c.m2} · ${c.gap} · DPE ${c.dpe}</div>`;
  const head = `<div class="name">${c.label} <span class="badge green">Retenu</span></div>`;
  if (state === 'avant') {
    return `<div class="card"><div class="row stack"><div class="check"></div>${photo}<div class="grow" style="display:flex;flex-direction:column;gap:6px">${head}${facts}<div class="facts">Adresse confirmée par le Localisateur</div>${chips}<div class="btnrow">${first ? p(1) : ''}<span class="btn sm">Écarter</span><span class="btn sm"${first ? ' style="opacity:.45"' : ''}>↑ Monter</span><span class="btn sm">↓ Descendre</span><span class="btn sm">Modifier</span><span class="btn sm red">Supprimer</span></div></div></div></div>`;
  }
  const m = menu
    ? `<div class="menu" style="bottom:-150px">${'<div>Modifier la fiche</div><div class="on">Monter d’un cran</div><div>Descendre d’un cran</div><div class="danger">Supprimer…</div>'}</div>`
    : '';
  return `<div class="card"><div class="row stack">${dev === 'phone' ? '' : `<span class="handle" title="Glisser pour réordonner">⋮⋮</span>`}<div class="check"></div>${photo}<div class="grow" style="display:flex;flex-direction:column;gap:6px">${head}${facts}<div class="facts">Adresse confirmée par le Localisateur</div>${chips}<div class="btnrow" style="justify-content:flex-end">${first ? p(1) : ''}<span class="btn sm">Écarter</span><span class="btn sm more" title="Plus d’actions">…</span>${menu ? p(2) : ''}</div></div></div>${m}</div>`;
}

function renderComparables(dev, state) {
  const before = state === 'avant';
  const header = `<div class="head"><div><div class="kicker">Dossier · Mme Garcia</div><div class="title">Biens concurrents</div></div><div class="actions">${
    before
      ? `<span class="btn full">Lancer le Live →</span><span class="btn">Trouver des concurrents</span><span class="btn">Ajouter un bien</span><span class="btn">Avant le rendez-vous →</span>`
      : `<span class="btn full">Lancer le Live →</span><span class="btn">Trouver des concurrents</span><span class="lnk">Ajouter un bien</span>${p(4)}`
  }</div></div>`;
  const synth = before
    ? `<div class="synth"><h3>Synthèse · 5 retenus ${p(3)}</h3><div class="grid"><div>Prix moyen<b>702 200 €</b></div><div>Prix médian<b>715 000 €</b></div><div>Prix minimum<b>598 000 €</b></div><div>Prix maximum<b>779 000 €</b></div><div>Surface moyenne<b>132 m²</b></div><div>Prix moyen au m²<b>5 343 €</b></div><div>Prix médian au m²<b>5 436 €</b></div></div></div>`
    : `<div class="synth"><h3>Synthèse · 5 retenus ${p(3)}</h3><div class="grid three"><div>Plage des prix des concurrents<b>598 000 € à 779 000 €</b></div><div>Prix médian au m²<b>5 436 €</b></div><div>Surface moyenne<b>132 m²</b></div></div></div>`;
  const listTitle = `<div style="display:flex;justify-content:space-between;align-items:baseline"><div class="name" style="font-size:16px">Concurrents retenus (5)</div>${before ? '' : `<span class="facts">${dev === 'phone' ? '« … » → Monter / Descendre' : 'Glissez ⋮⋮ pour changer l’ordre du Live'} ${p(5)}</span>`}</div>`;
  const cards = VENCE.slice(0, dev === 'phone' ? 2 : 3)
    .map((c, i) => compCard(dev, c, state, { first: i === 0, menu: !before && i === 0 && dev === 'desk' }))
    .join('');
  const dialog =
    !before && dev !== 'desk'
      ? `<div class="dialog-wrap"><div class="dialog"><h3>Supprimer ce concurrent ? ${p(6)}</h3><p>Maison · 5 pièces · 130 m² · Vence disparaîtra du dossier, avec ses réponses du Live s’il en a. Pour le garder sans le montrer, écartez-le.</p><div class="actions" style="justify-content:flex-end"><span class="btn">Annuler</span><span class="btn danger">Supprimer</span></div></div></div>`
      : '';
  return `<div class="zone">${header}${synth}${listTitle}${cards}</div>${dialog}`;
}

const notesComparables = `<div class="note"><b>Avant</b> (relevé dans <code>comparable-card.tsx</code>) : par carte, cinq boutons de même poids — Écarter, ↑ Monter, ↓ Descendre, Modifier, et « Supprimer » rouge juste à côté, confirmé par la boîte du navigateur. En-tête : le bouton d’étape suivante plein, puis trois contours. Synthèse en sept chiffres.</div>
<div class="note"><b>Après</b>
<ol>
<li>${p(1)} Par carte : <b>« Écarter »</b> visible, et <b>« … »</b> pour le reste. Les pastilles « Vendu par » et « Exclusivité » restent : ce sont des réponses, pas des boutons.</li>
<li>${p(2)} Le menu « … » : Modifier la fiche · Monter d’un cran · Descendre d’un cran · Supprimer… (en rouge, en bas, séparé). Monter et Descendre restent pour le clavier et le téléphone ; désactivés, comme aujourd’hui, une fois le Live commencé (« Ordre figé »).</li>
<li>${p(3)} La synthèse en trois chiffres : <b>« Plage des prix des concurrents : 598 000 € à 779 000 € »</b>, le nom décidé à la M105 (« fourchette » reste réservé au conseiller), prix médian au m², surface moyenne (décision de Jean-Guy, 08/11).</li>
<li>${p(4)} En-tête : le seul bouton plein reste l’étape suivante du dossier. « Ajouter un bien » devient un lien ; « Avant le rendez-vous → » disparaît, il est dans la barre des étapes. Quand il manque des concurrents, l’étape suivante est déjà « Chercher les concurrents » : « Trouver des concurrents » ne s’affiche alors pas en double.</li>
<li>${p(5)} <b>Réordonner en glissant</b> la poignée ⋮⋮ (ordinateur et tablette), le glisser-déposer déjà écrit pour le mode expert d’« Avant le rendez-vous » (M110, <code>reorder_retained_comparables</code>) : chaque dépôt s’enregistre, « Ordre enregistré ». Sur téléphone, pas de poignée : « … » → Monter / Descendre.</li>
<li>${p(6)} <b>« Supprimer… »</b> ouvre une confirmation dans l’écran, plus la boîte du navigateur ; elle dit ce que la suppression emporte, et rappelle qu’« Écarter » garde le bien. La barre de lot (cases cochées) garde ses deux gestes ; « Écarter les N biens » y passe en contour, pour qu’il n’y ait jamais deux boutons pleins.</li>
</ol></div>`;

// ================================================================================================
// 2 · Préparation (I9)
// ================================================================================================
function prepCard(dev, state, d) {
  const left = `<div class="grow" style="display:flex;flex-direction:column;gap:4px"><div class="name">${state === 'avant' ? d.name : `<a>${d.name}</a>`} <span class="badge ${d.ready ? 'green' : 'brand'}">${d.ready ? 'Prêt pour le rendez-vous' : 'En préparation'}</span></div><div class="facts">${d.property}<br>${d.range}<br>${d.progress}</div></div>`;
  if (state === 'avant') {
    const actions = d.ready
      ? `<span class="btn sm">Ouvrir le dossier</span><span class="btn sm red">Remettre en préparation</span>`
      : `<span class="btn sm">Ouvrir le dossier</span>${p(1)}<span class="btn sm">Déclarer prêt</span><span class="btn sm red">Supprimer</span>`;
    return `<div class="card"><div class="row stack">${left}<div class="btnrow">${actions}</div></div></div>`;
  }
  return `<div class="card"><div class="row stack">${left}<div class="btnrow" style="${dev === 'phone' ? '' : 'flex-direction:column;align-items:flex-end'}"><span class="facts">Prochaine étape ${d.first ? p(2) : ''}</span><div class="btnrow"><span class="btn sm">${d.next} →</span><span class="btn sm more">…</span>${d.menu ? p(3) : ''}</div></div></div>${
    d.menu ? `<div class="menu inline" style="align-self:flex-end;width:280px"><div>Déclarer prêt <span style="font-weight:500;color:${C.soft}">· il manque : bien vendeur, 3 concurrents, décision de prix</span></div><div class="danger">Supprimer le dossier…</div></div>` : ''
  }</div>`;
}

function renderPreparation(dev, state) {
  const before = state === 'avant';
  const head = `<div class="head"><div><div class="kicker">Préparation</div><div class="title">Dossiers vendeurs</div></div><span class="btn full">Nouveau dossier vendeur</span></div>`;
  const tabs = `<div class="tabs">${before ? '<span class="full">En cours</span><span>Prêts</span>' : `<span class="soft">En cours</span><span>Prêts</span> ${p(4)}`}</div>`;
  const martin = {
    name: 'M. et Mme Martin',
    property: 'Bien vendeur non renseigné',
    range: 'Votre fourchette : non saisie',
    progress: 'Bien vendeur — à compléter · 0/3 concurrents · Décision de prix',
    next: 'Saisir le bien vendeur',
    first: true,
    menu: !before && dev !== 'phone',
  };
  const garcia = {
    name: 'Mme Garcia',
    ready: true,
    property: 'Maison · 5 pièces · 140 m² · Vence',
    range: 'Votre fourchette : 690 000 – 760 000 €',
    progress: 'Bien vendeur ✓ · 5 concurrents ✓ · Décision de prix ✓',
    next: 'Lancer le Live',
  };
  const readyTitle = `<div class="facts" style="font-weight:700;margin-top:4px">Onglet « Prêts » :</div>`;
  return `<div class="zone">${head}${tabs}${prepCard(dev, state, martin)}${readyTitle}${prepCard(dev, state, garcia)}</div>`;
}

const notesPreparation = `<div class="note"><b>Avant</b> (relevé dans <code>builder/(liste)/page.tsx</code>) : « Ouvrir le dossier », « Déclarer prêt » et « Supprimer » rouge, au même niveau, sur un dossier vide ; l’onglet actif est plein, comme un bouton. La démo n’a qu’un dossier en cours (M. et Mme Martin) ; Mme Garcia et M. et Mme Bernard sont dans « Prêts ».</div>
<div class="note"><b>Après</b>
<ol>
<li>${p(1)} Plus de « Déclarer prêt » ni de « Supprimer » sur la carte.</li>
<li>${p(2)} <b>Une prochaine étape par carte</b>, en contour, à droite : la même que le bouton d’étape suivante du dossier (<code>nextDossierAction</code>, M110) — « Saisir le bien vendeur », « Chercher les concurrents », « Décider votre prix », « Lancer le Live », « Ouvrir l’Étude de marché ». Le nom du vendeur devient le lien vers la Vue d’ensemble (« Ouvrir le dossier » disparaît).</li>
<li>${p(3)} <b>« … »</b> : « Déclarer prêt », avec ce qui manque, puis « Supprimer le dossier… » (la confirmation de M93, inchangée) ; sur un dossier prêt : « Remettre en préparation ». « Déclarer prêt » reste toujours possible, suivi de ce qui manque : M52 gardée (« l’outil informe, il ne barre pas la route » ; décision de Jean-Guy, 08/11).</li>
<li>${p(4)} L’onglet choisi passe en bleu clair : le seul bouton plein de l’écran est « Nouveau dossier vendeur ».</li>
</ol></div>`;

// ================================================================================================
// 3 · Avant le rendez-vous (C4)
// ================================================================================================
function renderBefore(dev, state) {
  const before = state === 'avant';
  const steps = `<div class="head"><div class="steps"><span>Vue d’ensemble</span><span>Bien vendeur</span><span>Concurrents</span><span class="on">Avant le rendez-vous</span><span>Live</span></div><span class="btn full">Lancer le Live →</span></div>`;
  const checks = `<div class="chips"><span class="badge green">✓ Bien vendeur</span><span class="badge green">✓ 5 concurrents retenus</span><span class="badge green">✓ Prix et surface pour les 5</span><span class="badge green">✓ Décision enregistrée</span></div>`;
  const seq = `<div class="card"><div class="name">Ce que verra le vendeur</div><div class="facts">Introduction · Votre bien · Votre valeur perçue · 5 concurrents · Analyse des prix · Conclusion — 23 écrans<br>Accéléré : environ 34 min · Complet : environ 40 min</div>${
    before
      ? `<div class="btnrow">${p(1)}<span class="btn">Lancer le Live →</span><span class="lnk grey">Aperçu côté vendeur</span></div>`
      : `<div class="btnrow">${p(2)}<span class="lnk grey">Aperçu côté vendeur</span></div>`
  }</div>`;
  return `<div class="zone"><div><div class="kicker">Dossier · Mme Garcia</div><div class="title">Avant le rendez-vous</div></div>${steps}${checks}${seq}</div>`;
}

const notesBefore = `<div class="note"><b>Avant</b> : sur « Avant le rendez-vous », « Lancer le Live » deux fois — le bouton d’étape suivante, plein, en haut, et le même en contour dans « Ce que verra le vendeur » (<code>avant-rendez-vous/page.tsx:552</code>). L’onglet « Live » de la barre est la navigation, il reste. Sur la Vue d’ensemble, la 143 a déjà réduit à un seul bloc « Prochaine étape » : rien à y changer.</div>
<div class="note"><b>Après</b>
<ol>
<li>${p(1)} Le bouton du bloc disparaît.</li>
<li>${p(2)} Il reste celui de l’en-tête, qui passe par « Lancer le Live » (<code>/lancer-le-live</code>, M107) : les rappels du lancement — peu de concurrents, imports en attente, aucune décision de prix, « devant le vendeur ? » — y sont tous. En « Document seul » (M131), rien ne change : « Ouvrir l’Étude de marché » reste le seul plein.</li>
<li>Partout ailleurs, « Lancer le Live » n’apparaît qu’une fois par écran (un test le vérifie sur la Vue d’ensemble, « Avant le rendez-vous » et Concurrents).</li>
</ol></div>`;

// ================================================================================================
// 4 · Bien vendeur (C3)
// ================================================================================================
function renderProperty(dev, state) {
  const before = state === 'avant';
  const head = `<div><div class="kicker">Dossier · Mme Garcia</div><div class="title">Bien vendeur</div></div>`;
  const imports = before
    ? `<div class="importcard"><h3>Importer depuis une annonce en ligne ${p(1)}</h3><p>Le bien est déjà commercialisé ? Collez le lien SeLoger, Bien’ici, Green-Acres, Maisons et Appartements… — infos et caractéristiques sont reprises pour vous, à relire avant d’enregistrer.</p><div class="actions"><span class="input">https://…</span><span class="btn full">Importer l’annonce</span></div></div>
<div class="importcard"><h3>Importer depuis votre fiche (PDF)</h3><p>Le bien n’est pas encore commercialisé ? Importez la fiche produite par votre logiciel d’agence : caractéristiques, diagnostics et copropriété sont repris, à relire avant d’enregistrer.</p><div class="actions"><span class="input">Choisir un fichier</span><span class="btn full">Analyser la fiche</span></div></div>`
    : `<div class="reimport"><span>${p(2)}<b style="color:${C.ink}">▸ Importer à nouveau</b> · depuis une annonce en ligne, ou depuis votre fiche (PDF)</span><span class="lnk grey">Fiche enregistrée</span></div>`;
  const form = `<div class="card"><div class="name">L’essentiel</div><div class="formline"><div class="field">Type de bien<span>Maison</span></div><div class="field">Surface<span>140 m²</span></div><div class="field">Pièces<span>5</span></div><div class="field">Adresse<span>Vence</span></div><div class="field">Commune, code postal<span>Vence 06140</span></div><div class="field">Classe DPE<span>C</span></div></div></div>`;
  return `<div class="zone">${head}${imports}${form}</div>`;
}

const notesProperty = `<div class="note"><b>Avant</b> (<code>subject-property-import-form.tsx</code>) : les deux blocs d’import sont toujours ouverts, en tête, même sur une fiche déjà enregistrée ; deux boutons pleins (« Importer l’annonce », « Analyser la fiche ») au-dessus de la fiche, et un troisième, « Enregistrer », dans la barre du bas.</div>
<div class="note"><b>Après</b>
<ol>
<li>${p(1)} Fiche jamais enregistrée (M. et Mme Martin) : rien ne change, les deux blocs ouverts en tête ; c’est le premier geste (M38).</li>
<li>${p(2)} Fiche enregistrée : les deux blocs se replient en une ligne, « Importer à nouveau », qui les déplie sur place. Leurs boutons y passent en contour : le seul plein de l’écran est « Enregistrer », dans la barre (M77). Dans la démo, les choix « Annonces à importer » et « Fiches à importer » (M114) sont dans le pli, comme le reste.</li>
<li>Rien ne change à ce que fait un import (« À vérifier », prix « pour information », M38, M97).</li>
</ol></div>`;

// ================================================================================================
// 5 · Visites (I10)
// ================================================================================================
function renderVisits(dev, state) {
  const before = state === 'avant';
  const head = `<div><div class="kicker">Acquéreurs</div><div class="title">Visites</div></div>`;
  const wilsonBefore = `<div class="vgroup"><h3>Mr and Mrs Wilson <span class="btn sm">Bon de visite</span>${p(1)}</h3><div class="card"><div class="name">Appartement · 3 pièces · 66 m² · Antibes <span class="facts">395 000 €</span> <span class="badge">Annonce</span> <span class="badge">À planifier</span></div><div class="facts">Demandée le 05/11/2026 depuis le dossier</div><div class="details">▸ Vivre ici · ce que l’acquéreur lira, dans sa langue</div><div class="btnrow">${p(2)}<span class="btn sm">Actualiser Vivre ici</span><span class="btn sm">Confirmer la visite</span><span class="badge">À qui écrire ?</span><span class="btn sm">Préparer le courrier au propriétaire</span><span class="btn sm">Préparer le dossier de collaboration au confrère</span><span class="btn sm">Visite faite</span></div></div></div>`;
  const kellerBefore = `<div class="vgroup"><h3 style="font-size:13px;color:${C.muted}">Visites faites</h3><h3>Famille Keller <span class="btn sm">Bon de visite</span></h3><div class="card"><div class="name">Maison · 7 pièces · 210 m² · Mougins <span class="facts">1 639 500 €</span> <span class="badge green">Offre acceptée le 06/11</span></div><div class="facts">Demandée le 17/10/2026 pendant la présentation · visitée le 06/11/2026 · Bon de visite signé le 06/11/2026 · Offre d’achat</div><div class="facts">Intéressé · a aimé : l’extérieur, la piscine · gêné : le prix · Offre envisagée</div><div class="btnrow"><span class="btn sm">Messages prêts</span><span class="btn sm">Actualiser Vivre ici</span></div></div></div>`;
  const others = `<div class="card"><div class="name">Ses autres réponses ${p(6)}</div><div class="facts">Famille Keller · Maison · 6 pièces · 190 m² · Mougins — Pas pour lui : Le prix · le 17/10/2026<br>M. et Mme Lambert · Maison · 5 pièces · 150 m² · Vence — Peut-être · le 04/11/2026</div></div>`;
  if (before) return `<div class="zone">${head}${wilsonBefore}${dev === 'phone' ? '' : kellerBefore}${others}</div>`;

  const track = (steps, now) =>
    `<div class="track">${steps
      .map((s, i) => `<span class="${i < now ? 'done' : i === now ? 'now' : ''}">${i < now ? '✓ ' : ''}${s}</span>`)
      .join('<i>→</i>')}</div>`;
  const wilson = `<div class="vgroup"><h3>Mr and Mrs Wilson</h3><div class="card"><div class="name">Appartement · 3 pièces · 66 m² · Antibes <span class="facts">395 000 €</span> <span class="badge">Annonce</span></div><div class="facts">Demandée le 05/11 depuis le dossier · ses créneaux : samedi matin</div>${track(['Écrire au propriétaire', 'Confirmer la visite', 'Visite faite'], 0)}${p(3)}<div class="row stack" style="align-items:center;justify-content:space-between"><div class="facts"><b style="color:${C.ink}">À qui écrire ?</b> L’annonce ne dit pas si le mandat est exclusif.</div><div class="btnrow"><span class="btn sm">Préparer le courrier au propriétaire</span><span class="btn sm">Dossier au confrère</span></div></div><div class="btnrow" style="gap:14px">${p(4)}<span class="lnk">▸ Vivre ici</span><span class="lnk grey">Confirmer la visite</span><span class="lnk grey">Visite faite</span></div></div></div>`;
  const lopez = `<div class="vgroup"><h3>La famille Moreau <span class="facts">exemple de forme : une visite sur le mandat de M. et Mme Lopez</span></h3><div class="card"><div class="name">Maison · 5 pièces · 135 m² · Vence <span class="facts">713 000 €</span> <span class="badge brand">Mandat signé</span></div><div class="facts"><b style="color:${C.green}">Visite planifiée le mardi 10/11 à 14 h</b></div>${track(['Confirmer la visite', 'Bon de visite', 'Visite faite'], 1)}<div class="row stack" style="align-items:center;justify-content:space-between"><div class="facts">Le jour de la visite, faites signer le bon au visiteur.</div><span class="btn sm">Signer le bon de visite</span></div><div class="btnrow" style="gap:14px"><span class="lnk">▸ Vivre ici</span><span class="lnk grey">Changer la date</span><span class="lnk grey">Visite faite</span><span class="lnk grey">Proposer une visite au vendeur</span></div></div></div>`;
  const keller = `<div class="vgroup"><h3 style="font-size:13px;color:${C.muted}">Visites faites</h3><h3>Famille Keller</h3><div class="card"><div class="name">Maison · 7 pièces · 210 m² · Mougins <span class="facts">1 639 500 €</span> <span class="badge green">Offre acceptée le 06/11</span></div><div class="facts">Visitée le 06/11 · Intéressé · a aimé : l’extérieur, la piscine · gêné : le prix</div>${track(['Confirmer la visite', 'Bon de visite', 'Visite faite'], 3)}<div class="btnrow" style="gap:14px"><span class="lnk">Offre d’achat</span><span class="lnk grey">Bon de visite signé le 06/11</span><span class="lnk grey">Messages prêts</span><span class="lnk grey">▸ Vivre ici</span></div></div></div>`;
  return `<div class="zone">${head}${wilson}${dev === 'phone' ? '' : lopez}${dev === 'desk' ? keller : ''}<div class="facts">${p(6)} « Ses autres réponses » ne sont plus ici : elles sont sur la fiche de chaque acquéreur (« Ce qu’il a répondu »).</div></div>`;
}

const notesVisits = `<div class="note"><b>Avant</b> (<code>visit-row.tsx</code>, démo le 08/11) : la visite de Mr and Mrs Wilson (l’appartement d’Antibes, une annonce, exclusivité inconnue) porte six gestes de même poids — Actualiser Vivre ici, Confirmer la visite, deux courriers, Visite faite — et « Bon de visite » en tête du groupe, alors que ce bien ne peut pas en avoir (M137 A : seuls les biens de l’agence). « Ses autres réponses » (des « Peut-être », des « Pas pour lui ») sont mêlées aux visites, en bas.</div>
<div class="note"><b>Après</b>
<ol>
<li>${p(1)} « Bon de visite » quitte l’en-tête du groupe : il devient une étape de la visite, seulement sur un bien de l’agence (mandat signé, mandat rentré, collaboration obtenue, M137 A). Il ouvre la page d’aujourd’hui, la visite cochée ; plusieurs biens visités le même jour s’y ajoutent comme avant.</li>
<li>${p(2)} Six gestes → <b>une prochaine étape</b> en contour (Visites n’a aucun bouton plein, M120 B), le reste en liens.</li>
<li>${p(3)} <b>Le chemin de la visite</b>, calculé par un service pur : un bien qui n’est pas à l’agence — écrire au propriétaire ou au confrère (M120), puis attendre (« En attente du propriétaire · remis le … », « Suivre dans Prospection → »), puis confirmer la visite, puis visite faite ; un bien de l’agence — confirmer la visite (jour et heure, M142), signer le bon de visite, visite faite (le compte rendu, M139) ; une visite faite — l’offre d’achat si « Offre envisagée », sinon « Messages prêts ».</li>
<li>${p(4)} En liens : « Vivre ici » (replié), « Confirmer la visite » / « Changer la date », « Visite faite » (on peut toujours noter une visite faite sans l’avoir confirmée), « Proposer une visite au vendeur » (mandat signé, M86).</li>
<li>Une visite planifiée dit sa date en vert, « Visite planifiée le mardi 10/11 à 14 h » ; le lien « Confirmer la visite » devient « Changer la date ».</li>
<li>${p(6)} « Ses autres réponses » quittent Visites : la fiche les a déjà, « Ce qu’il a répondu » (M122).</li>
</ol></div>`;

// ================================================================================================
// 6 · Acquéreurs (I4)
// ================================================================================================
const BUYERS_BEFORE = [
  ['Famille Keller', 'Sous offre', null, true, 'Maison · Mougins, Mouans-Sartoux, Valbonne · jusqu’à 1 650 000 € · 5 p.', 'Lancer le compromis · depuis 2 jours', 'Prévenir la famille Keller'],
  ['Mr and Mrs Wilson', 'En visite', null, true, 'Appartement · Antibes · jusqu’à 420 000 € · 3 p.', 'Organiser la visite · depuis 3 jours', 'Organiser les visites'],
  ['M. et Mme Rossi', 'En recherche', 'green:Prêt à visiter', false, 'Appartement · Antibes, Juan-les-Pins · jusqu’à 400 000 € · 3 p.', 'Trouver ses biens idéaux · depuis 6 semaines', 'Trouver les biens idéaux'],
  ['M. et Mme Lambert', 'En recherche', 'green:Prêt à visiter', false, 'Maison · Vence, Saint-Paul-de-Vence · jusqu’à 800 000 € · 5 p.', 'Relancer sa réponse · depuis le 04/11', 'L’appeler'],
  ['M. et Mme Roux', 'En recherche', 'green:Prêt à visiter', false, 'Maison · Vence, La Colle-sur-Loup · jusqu’à 760 000 € · 4 p.', 'Lui proposer la maison de M. et Mme Lopez · depuis 3 jours', 'Proposer ce bien'],
];

function buyerRow(dev, b, state, opts = {}) {
  const [name, status, ready, mine, facts, step, action] = b;
  const [rc, rl] = ready ? ready.split(':') : [];
  const left = `<div class="left"><div class="name"><a>${name}</a> <span class="badge brand">${status}</span>${ready ? `<span class="badge ${rc}">${rl}</span>` : ''}${state === 'avant' && mine ? `<span class="badge">Ma fiche</span>${opts.pinMine ? p(3) : ''}` : ''}</div><div class="facts">${facts}</div></div>`;
  const right =
    state === 'avant'
      ? `<div class="right"><span class="step">Prochaine étape · ${step}</span><span class="lnk">${action} →</span>${opts.pinAction ? p(2) : ''}</div>`
      : `<div class="right"><span class="step">${opts.late ? `${step.split(' · ')[0]} · <span class="late">${opts.late}</span>` : step}</span><span class="btn sm">${action}</span>${opts.pinAction ? p(2) : ''}</div>`;
  return `<div class="brow">${left}${right}</div>`;
}

function renderBuyers(dev, state) {
  const before = state === 'avant';
  const head = `<div class="head"><div><div class="kicker">Acquéreurs</div><div class="title">Les acquéreurs de l’agence</div><div class="subtitle">Ce mois-ci : N biens proposés · N réponses · N visites (inchangé)</div></div><span class="btn full">Nouvel acquéreur</span></div>`;
  const search = before
    ? `<div class="actions"><span class="input">Rechercher par nom</span><span class="lnk">Rechercher</span>${p(4)}</div>`
    : `<div class="actions"><span class="input">Rechercher par nom — filtre en tapant</span>${p(4)}</div><div class="filters">${p(5)}<span class="tabs"><span class="soft">Mes fiches</span><span>Toute l’agence</span></span>&nbsp;<span class="chip on">Toutes · 9</span><span class="chip">Prêts à visiter · 7</span><span class="chip">À recontacter</span><span class="chip">Sous offre · 1</span></div>`;
  const list = before
    ? BUYERS_BEFORE.map((b, i) => buyerRow(dev, b, state, { pinMine: i === 0, pinAction: i === 1 }))
    : [
        buyerRow(dev, BUYERS_BEFORE[0], state, {}),
        buyerRow(dev, BUYERS_BEFORE[3], state, { late: 'en retard d’un jour' }),
        buyerRow(dev, BUYERS_BEFORE[1], state, { pinAction: true }),
        buyerRow(dev, BUYERS_BEFORE[4], state, {}),
        buyerRow(dev, BUYERS_BEFORE[2], state, {}),
      ];
  const order = before
    ? 'Ordre : mes fiches d’abord, puis la dernière modifiée.'
    : 'Ordre : la vente en cours, puis ce qui est en retard, puis la prochaine étape la plus ancienne.';
  const rows = list.slice(0, dev === 'phone' ? 3 : 5).join('') + `<div class="facts">${p(1)} ${order}</div>`;
  return `<div class="zone">${head}${search}<div class="blist">${rows}</div></div>`;
}

const notesBuyers = `<div class="note"><b>Avant</b> (<code>buyer-list.tsx</code>, <code>sortBuyers</code>) : mes fiches d’abord, puis la plus récemment modifiée ; l’étiquette « Ma fiche » ; l’action est un lien texte sous la prochaine étape ; « Rechercher » à cliquer ; aucun filtre.</div>
<div class="note"><b>Après</b>
<ol>
<li>${p(1)} <b>Trié par urgence</b>, dans les deux vues : une vente en cours (offre acceptée, réponse du vendeur à traiter) en tête ; puis les fiches en retard, la plus en retard d’abord — « en retard » est la même échéance qu’« Aujourd’hui » : la relance d’une sélection sans réponse (M135), le contact à reprendre à 30 jours (M132) ; puis la prochaine étape la plus ancienne (« depuis le … »). Remplace « mes fiches d’abord » (M117 ; décision de Jean-Guy, 08/11).</li>
<li>${p(2)} L’action devient un <b>bouton en contour, à droite</b>, sous sa prochaine étape ; « en retard » en orange (M145). Le seul plein de l’écran est « Nouvel acquéreur ».</li>
<li>${p(3)} « Ma fiche » disparaît : la liste s’ouvre sur <b>« Mes fiches »</b> (celles dont le conseiller est le titulaire, M145 B), et « Toute l’agence » est à un geste, pour tous, manager ou non (M117 : toute l’agence partage les fiches).</li>
<li>${p(4)} La recherche filtre <b>en tapant</b> (nom, sans accent ni casse, comme M117), sans bouton ; l’adresse garde <code>?q=</code> pour un lien envoyé.</li>
<li>${p(5)} « Mes fiches | Toute l’agence », puis les <b>filtres d’état</b>, comptés dans la vue choisie : Toutes · Prêts à visiter · À recontacter (M132) · Sous offre (M138) ; un filtre à zéro ne s’affiche pas. « Ce mois-ci » reste celui de toute l’agence (M135).</li>
</ol>Sur téléphone, la ligne passe sur deux étages, le bouton dessous, pleine largeur.</div>`;

// ================================================================================================
// 7 · Prospection (C9)
// ================================================================================================
function pcard(state, d) {
  const head = `<div class="addr">${d.addr}</div><div class="lbl">${d.label}</div><div>${d.badge}</div>${d.ready ? `<div class="ready">${d.ready}</div>` : ''}${d.extra ? `<div class="lbl">${d.extra}</div>` : ''}`;
  if (state === 'avant') {
    return `<div class="pc">${head}<div class="btnrow">${d.before}</div><span class="lnk grey" style="font-size:11.5px">Ne plus solliciter</span><div class="foot">${d.foot}</div></div>`;
  }
  return `<div class="pc">${head}<div class="btnrow" style="justify-content:space-between"><span class="btnrow">${d.after}</span><span class="btn sm more">…</span></div>${d.menu ? `<div class="menu inline">${d.menu}</div>` : ''}<div class="foot">${d.foot}</div></div>`;
}

const PCARDS = {
  ready: {
    addr: 'Maison · 5 pièces · 130 m² · Vence',
    label: '715 000 € · Les Collines',
    badge: '<span class="badge brand">Propriétaire · aller sonner</span>',
    ready: '4 acquéreurs prêts correspondent · courrier ou passage',
    before: '<span class="btn sm full">Préparer le dossier</span><span class="btn sm">Corriger l’adresse</span><span class="btn sm">Marquer remis</span><span class="btn sm">Pas intéressé</span>',
    after: `<span class="btn sm">Préparer le dossier</span><span class="lnk">Marquer remis</span>`,
    menu: '<div>Corriger l’adresse</div><div>Pas intéressé</div><div class="danger">Ne plus solliciter…</div>',
    foot: 'Dossier vendeur : M. et Mme Lopez · Maison · Vence',
  },
  handed: {
    addr: 'Villa · 7 pièces · 205 m² · Mougins',
    label: '1 554 000 € · baisse depuis le rendez-vous',
    badge: '<span class="badge brand">Propriétaire · aller sonner</span>',
    extra: 'Remis le 02/11 · relance conseillée le 09/11',
    before: '<span class="btn sm">Corriger l’adresse</span><span class="btn sm full">RDV obtenu</span><span class="btn sm">Pas intéressé</span><span class="lnk grey">Annuler</span>',
    after: `<span class="btn sm">RDV obtenu</span>`,
    foot: 'Dossier vendeur : M. Lefebvre · Villa · Mougins',
  },
  confrere: {
    addr: 'Villa · 7 pièces · 220 m² · Mougins',
    label: '1 720 000 € · Agence Littoral & Pins',
    badge: '<span class="badge redb">Exclusivité · appeler le confrère</span>',
    extra: 'Contacté le 03/11',
    before: '<span class="btn sm">Corriger l’adresse</span><span class="btn sm full">Collaboration obtenue</span><span class="btn sm">Collaboration refusée</span><span class="btn sm">Pas intéressé</span><span class="lnk grey">Annuler</span>',
    after: `<span class="btn sm">Collaboration obtenue</span><span class="lnk">Refusée</span>`,
    foot: 'Recherche acquéreur : Famille Keller · dossier au confrère',
  },
};

function renderProspection(dev, state) {
  const before = state === 'avant';
  const head = `<div class="head"><div><div class="kicker">Concurrents à démarcher</div><div class="title">Prospection</div></div><div class="actions"><span class="chip">Bien vendeur : tous</span><span class="chip">Confrères et propriétaires</span><span class="chip">Toutes les origines</span><span class="btn">Imprimer ma tournée</span></div></div>`;
  const tiles = before
    ? `<div class="kpis">${p(1)}<div class="kpi"><b>9</b><span>Concurrents à démarcher</span></div><div class="kpi"><b>3</b><span>Dossiers remis</span></div><div class="kpi"><b style="color:${C.green}">0</b><span>Rendez-vous obtenus</span></div><div class="kpi fill"><b>0</b><span>Mandats rentrés (déclarés)</span></div><div class="kpi"><b>0</b><span>Collaborations obtenues (déclarées)</span></div></div>`
    : `<div class="compact">${p(1)}<span><b>9</b>à démarcher</span><span><b>3</b>remis</span><span><b>0</b>rendez-vous</span><span><b>0</b>mandats rentrés</span><span><b>0</b>collaborations</span><span style="color:${C.soft}">· déclarés par vous</span></div>`;
  const col = (title, n, cards) =>
    `<div class="col"><h4>${title}<span>${n}</span></h4>${cards.length ? cards.join('') : `<div class="none">Aucun.</div>`}</div>`;
  const cols = before
    ? `<div class="cols">${col(`Adresse à confirmer ${p(2)}`, 0, [])}${col('Prêt à envoyer', 6, [pcard(state, PCARDS.ready)])}${col('Dossier remis', 3, [pcard(state, PCARDS.handed), dev === 'desk' ? pcard(state, PCARDS.confrere) : ''])}${col('Rendez-vous, mandats & collaborations', 0, [])}</div>`
    : `<div class="cols" style="grid-template-columns:repeat(${dev === 'phone' ? 1 : 2},1fr)">${col(`Prêt à envoyer ${p(3)}`, 6, [pcard(state, PCARDS.ready)])}${col('Dossier remis', 3, [pcard(state, PCARDS.handed), dev === 'desk' ? pcard(state, PCARDS.confrere) : ''])}</div><div class="facts">${p(2)} « Adresse à confirmer » et « Rendez-vous, mandats & collaborations », vides dans la démo : elles ne s’affichent pas.</div>`;
  return `<div class="zone">${head}${tiles}${cols}</div>`;
}

const notesProspection = `<div class="note"><b>Avant</b> (<code>prospecting-card.tsx</code>, démo Mougins et Vence) : jusqu’à six gestes par carte — « Préparer le dossier » plein, Corriger l’adresse, Marquer remis, Pas intéressé, Annuler, Ne plus solliciter ; plusieurs boutons pleins à l’écran (un par carte prête ou remise). Cinq tuiles, dont « Mandats rentrés » en bleu plein sans raison, qui passent sur deux lignes à 1280 px. Une colonne vide prend un quart de l’écran (« Aucun. »).</div>
<div class="note"><b>Après</b>
<ol>
<li>${p(1)} Les compteurs sur <b>une ligne</b>, tous de même poids ; « déclarés par vous » une fois pour les mandats et les collaborations (M91, M115).</li>
<li>${p(2)} Une colonne vide ne s’affiche pas ; les autres prennent la place. « Rendez-vous, mandats & collaborations » reste quand elle a des cartes.</li>
<li>${p(3)} Par carte, <b>une prochaine étape</b> en contour et au plus un lien : à confirmer → « Confirmer l’adresse » (puis « C’est la bonne adresse », « Localiser moi-même », « Saisir l’adresse », comme M84) ; prêt → « Préparer le dossier », lien « Marquer remis » ; remis → « RDV obtenu » (confrère : « Collaboration obtenue », lien « Refusée ») ; rendez-vous → « Mandat rentré ». Les pastilles « Vendu par » / « Exclusivité » d’une carte « à vérifier » sont son étape, elles restent.</li>
<li><b>« … »</b> : Corriger l’adresse · Pas intéressé · Annuler (revenir d’un cran) · Ne plus solliciter… (en rouge, en bas, sa confirmation de M98 inchangée).</li>
<li>Aucun bouton plein sur les cartes ; le seul plein de l’écran est « Préparer tous les courriers », quand un bien vendeur est filtré (M98). « 4 acquéreurs prêts correspondent · courrier ou passage » (M145) reste. Jamais de lien <code>tel:</code> (M145).</li>
</ol></div>`;

// ================================================================================================
// 8 · Accueil du Live (C8)
// ================================================================================================
function renderLiveIntro(dev, state) {
  const before = state === 'avant';
  // Après : la tablette montre une agence qui a déposé un logo ; ordinateur et téléphone, la démo
  // sans logo (le nom en grand dans la carte, pas de nom dans le bandeau sur cet écran).
  const withLogo = !before && dev === 'tab';
  const tools =
    dev === 'phone'
      ? '<span>⚙</span><span>Clair</span><span>✕</span>'
      : '<span>Réglages</span><span>Clair</span><span>Plein écran</span><span>Quitter</span>';
  const kickerBar = dev === 'phone' ? '' : '<small>Rendez-vous vendeur</small>';
  const left = before
    ? `Agence Horizon Côte d’Azur${kickerBar}`
    : withLogo
      ? `Agence Horizon Côte d’Azur${kickerBar}`
      : `<small style="margin-left:0">Rendez-vous vendeur</small>`;
  const bar = `<div class="bar"><span class="ag">${left}</span>${p(before ? 1 : 2)}<span class="tools">${tools}</span></div>`;
  const body = (logo, kicker = true) =>
    `${logo}<div style="display:flex;flex-direction:column;gap:12px">${kicker ? '<span class="k">Rendez-vous vendeur</span>' : ''}<h2>Découvrons ensemble les biens en concurrence avec votre logement.</h2><div class="who">Mme Garcia<small>Vence</small></div></div><div class="go"><span class="b">Démarrer la présentation</span><small>5 biens concurrents à examiner</small></div>`;
  if (before) {
    return `<div class="stage" style="height:100%">${bar}<div class="intro">${body(`<span class="logo">Agence Horizon Côte d’Azur</span>`)}</div><div class="empty-half">${p(4)} la moitié basse, vide</div></div>`;
  }
  const logo = withLogo
    ? `<span class="logo mark"><i>H</i>Logo de l’agence ${p(3)}</span>`
    : `<span class="logo" style="font-size:${dev === 'phone' ? 22 : 30}px;line-height:1.15;letter-spacing:.05em">Agence Horizon Côte d’Azur ${p(3)}</span>`;
  return `<div class="stage" style="height:100%">${bar}<div class="intro full">${body(logo, false)}</div></div>`;
}

const notesLiveIntro = `<div class="note"><b>Avant</b> (<code>live-page-intro.tsx</code>, démo) : l’agence de démonstration n’a pas de logo ; le bandeau affiche son nom (le repli du logo, M55), la carte l’affiche une seconde fois. La carte s’arrête à mi-hauteur ; sur tablette, la moitié basse de l’écran reste vide.</div>
<div class="note"><b>Après</b> (reporté de la 144 ; partie A)
<ol>
<li>${p(1)} ${p(2)} <b>Avec un logo</b> (tablette) : le bandeau dit le nom de l’agence en texte, « Rendez-vous vendeur » à côté (dès 640 px), sur tous les écrans du Live ; la carte porte le logo. <b>Sans logo</b> (ordinateur et téléphone, la démo) : sur cet écran, le bandeau ne dit que « Rendez-vous vendeur », et le nom est en grand dans la carte ; les écrans suivants gardent le nom dans le bandeau (décision de Jean-Guy, 08/11).</li>
<li>${p(3)} En haut de la carte : le logo (variante pour fond sombre, ratio gardé, M55 ; exemple de forme, aucun logo n’est inventé), sinon le nom de l’agence en grand. Un logo fictif pour l’agence de démonstration est noté pour la 147.</li>
<li>${p(4)} <b>La carte prend toute la hauteur</b> sous le bandeau, sur tablette comme sur ordinateur : le logo en haut, la phrase au milieu, « Démarrer la présentation » en bas, à portée du pouce. Sur téléphone, de même.</li>
<li>« Rendez-vous vendeur » ne se dit plus qu’une fois, dans le bandeau (la carte le répétait sous le nom).</li><li>Aucun montant, comme avant ; le texte du vendeur suit sa langue (M140 A).</li>
</ol></div>`;

// ================================================================================================
// 9 · Présentation acquéreur : le fondu
// ================================================================================================
function renderFade(dev, state) {
  const before = state === 'avant';
  const steps = before
    ? [
        [0, 0, 14],
        [110, 0.28, 10],
        [225, 0.62, 5],
        [340, 0.88, 2],
        [450, 1, 0],
      ]
    : [
        [0, 0.6, 0],
        [50, 0.75, 0],
        [100, 0.9, 0],
        [150, 1, 0],
      ];
  if (dev === 'phone') {
    return `<div class="zone"><div class="tline"><span class="lbl">Le lien du dossier sur le téléphone de l’acquéreur</span><div class="facts">${
      before ? 'Pas de fondu : un écran à la fois, sans animation (<code>dossier-phone-deck.tsx</code>).' : 'Inchangé : pas de fondu sur le téléphone.'
    }</div></div></div>`;
  }
  const shots = steps
    .map(
      ([ms, op, dy]) =>
        `<div class="shot"><div class="scr"><div class="content" style="opacity:${op};transform:translateY(${dy}px)"><i style="width:70%"></i><i style="width:45%"></i><i style="width:85%"></i></div></div>${ms} ms</div>`,
    )
    .join('');
  return `<div class="zone"><div class="tline"><span class="lbl">De « Bien A » à « Bien B », présentation plein cadre (<code>/presentation</code>)</span><div class="strip">${shots}</div><div class="facts">${
    before
      ? `${p(1)} 0,45 s, depuis un écran transparent qui monte de 14 px (<code>live-fade-up</code>) : chaque changement d’écran passe par un écran vide.`
      : `${p(2)} 150 ms, depuis 60 % d’opacité, sans glissement (<code>live-enter</code>, M144) : l’écran ne disparaît jamais.`
  }</div></div></div>`;
}

const notesFade = `<div class="note"><b>Avant</b> : <code>deck-presentation.tsx</code> remonte l’écran à chaque changement (ses mots, la grille, chaque bien, sa réponse) avec <code>live-fade-up</code> : 0,45 s depuis l’opacité nulle, 14 px de glissement.</div>
<div class="note"><b>Après</b>
<ol>
<li>${p(2)} Le fondu du Live (M144) : <b>150 ms depuis 60 %</b>, à chaque changement d’écran de la présentation (chaque écran y est un autre bien, ou la grille, ou sa réponse), jamais depuis un écran transparent.</li>
<li>« Mouvement réduit » demandé par l’appareil : aucun fondu, comme le Live.</li>
<li>Le lien du dossier sur téléphone n’a pas de fondu aujourd’hui : rien n’y change. La révélation du Live (<code>live-reveal-pop</code>) n’est pas touchée.</li>
</ol>Pas de maquette d’écran : la disposition ne change pas, seul le mouvement ; la frise montre ce que l’œil voit pendant le changement.</div>`;

// ================================================================================================
// 10 · Aujourd'hui : « à leur bien »
// ================================================================================================
function renderToday(dev, state) {
  const before = state === 'avant';
  const argue = before ? '« 1 acquéreur prêt correspond à votre bien »' : '1 acquéreur prêt correspond à l’appartement';
  return `<div class="zone"><div class="today-line"><div class="ico">!</div><div class="txt"><b>Relancer M. et Mme Lambert-Duval</b><span class="argue">${argue}</span> ${p(before ? 1 : 2)}<span>réfléchit au prix · dernier contact il y a 8 jours · relance prévue aujourd’hui</span></div><span class="btn full">Relancer</span></div><div class="today-line"><div class="ico">!</div><div class="txt"><b>Relancer Mme Garcia</b> <span class="facts" style="display:inline">exemple de forme, une maison</span><span class="argue">${before ? '« 2 acquéreurs prêts correspondent à votre bien »' : '2 acquéreurs prêts correspondent à la maison'}</span> ${p(3)}<span>veut en parler à un proche · dernier contact il y a 7 jours</span></div><span class="btn">Relancer</span></div></div>`;
}

const notesToday = `<div class="note"><b>Avant</b> (<code>readyBuyersArgument</code>, M145) : l’argument est écrit comme ce que le conseiller dira au vendeur, entre guillemets : « 1 acquéreur prêt correspond à votre bien ».</div>
<div class="note"><b>Après</b>
<ol>
<li>${p(2)} Côté conseiller, sans guillemets, par <b>le type du bien</b> : « 1 acquéreur prêt correspond à l’appartement » (l’appartement d’Antibes des Lambert-Duval).</li>
<li>${p(3)} « à la maison », « au terrain », « à l’immeuble », « au local commercial », « au parking » ; <b>« au bien »</b> quand le type manque ou ne se reconnaît pas (décision de Jean-Guy, 08/11 : ni « leur » ni « son »).</li>
<li>« votre » reste réservé au message envoyé au vendeur, qui ne change pas : « Depuis notre rendez-vous, un acquéreur prêt à visiter cherche un bien comme le vôtre » (M145 B), le Suivi et la conclusion compris.</li>
</ol></div>`;


// ================================================================================================
// Liste du Live (la règle partout)
// ================================================================================================
function renderLiveList(dev, state) {
  const before = state === 'avant';
  const head = `<div><div class="kicker">Live</div><div class="title">Live</div><div class="subtitle">Choisissez un dossier : la présentation s’ouvre en plein cadre, prête à animer le rendez-vous.</div></div>`;
  const row = (name, status, sub, launch, first, pin) =>
    `<div class="brow"><div class="left"><div class="name">${name} <span class="badge">${status}</span></div><div class="facts">${sub}</div></div><div class="actions" style="${dev === 'phone' ? '' : 'justify-content:flex-end'}"><span class="lnk">Vérifier la préparation</span><span class="btn${before || first ? ' full' : ''}">${launch}</span>${pin}</div></div>`;
  if (before) {
    return `<div class="zone">${head}<div class="blist">${row('Mr and Mrs Bernard', 'Prêt', 'Dossier créé il y a 15 jours · présentation directe', 'Lancer le Live →', true, p(1))}${row('Mme Garcia', 'Prêt', 'Dossier créé il y a 15 jours', 'Lancer le Live →', true, '')}</div><div class="facts">Ordre : le dossier le plus récemment créé d’abord.</div></div>`;
  }
  return `<div class="zone">${head}<div class="blist">${row('Mme Garcia', 'Prêt', 'Dossier créé il y a 15 jours', 'Lancer le Live →', true, p(2))}${row('Mr and Mrs Bernard', 'Prêt', 'Dossier créé il y a 15 jours · présentation directe', 'Lancer le Live →', false, p(3))}</div><div class="facts">${p(5)} Ordre : d’abord les dossiers prêts pour le Live, puis les autres ; dans chaque groupe, du plus récemment modifié au plus ancien.</div></div>`;
}

const notesLiveList = `<div class="note"><b>Avant</b> (<code>live/page.tsx</code>, <code>getReadyProjects</code>) : chaque dossier prêt porte son « Lancer le Live » plein ; la liste est rangée du dossier le plus récemment créé au plus ancien.</div>
<div class="note"><b>Après</b> (décision de Jean-Guy, 08/11)
<ol>
<li>${p(5)} <b>D’abord les dossiers prêts pour le Live</b> — ceux dont « Lancer le Live » s’ouvre : un concurrent retenu au moins, pas en « Document seul » (M104, M131), Live commencé compris (« Reprendre ») —, <b>puis les autres</b> ; dans chaque groupe, du plus récemment modifié au plus ancien.</li>
<li>${p(2)} Le premier dossier garde le plein : « Lancer le Live → », ou « Reprendre (écran N sur M) → » (M92).</li>
<li>${p(3)} Les suivants passent en contour, mêmes vérifications au clic (M104, M107, M112).</li>
<li>La date du rendez-vous et le tri par date : une future mission (planche A8, gardée pour ce jour-là).</li>
</ol></div>`;

// ================================================================================================
// La date du rendez-vous (précision de Jean-Guy, 08/11)
// ================================================================================================
function renderMeetingDate(dev, state) {
  const before = state === 'avant';
  const steps = `<div class="head"><div class="steps"><span>Vue d’ensemble</span><span>Bien vendeur</span><span>Concurrents</span><span class="on">Avant le rendez-vous</span><span>Live</span></div><span class="btn full">Lancer le Live →</span></div>`;
  const checks = `<div class="chips"><span class="badge green">✓ Bien vendeur</span><span class="badge green">✓ 5 concurrents retenus</span><span class="badge green">✓ Prix et surface pour les 5</span><span class="badge green">✓ Décision enregistrée</span></div>`;
  let date = '';
  if (!before) {
    const edit = dev === 'tab';
    date = edit
      ? `<div class="card" style="gap:10px"><div class="name">Le rendez-vous avec Mme Garcia ${p(1)}</div><div class="row stack" style="align-items:flex-end;gap:10px"><div class="field">Jour<span>10/11/2026</span></div><div class="field">Heure<span>14:00</span></div><span class="btn">Enregistrer la date</span><span class="lnk grey">Annuler</span></div><div class="facts">D’aujourd’hui à un an. Il range la liste du Live : le prochain rendez-vous en tête. ${p(2)}</div></div>`
      : `<div class="card" style="flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px"><div class="name">Rendez-vous avec Mme Garcia : <span style="color:${C.green}">mardi 10/11 à 14 h</span> ${p(3)}</div><span class="lnk">Changer la date</span></div>`;
  }
  const seq = `<div class="card"><div class="name">Ce que verra le vendeur</div><div class="facts">Introduction · Votre bien · Votre valeur perçue · 5 concurrents · Analyse des prix · Conclusion — 23 écrans<br>Accéléré : environ 34 min · Complet : environ 40 min</div></div>`;
  return `<div class="zone"><div><div class="kicker">Dossier · Mme Garcia</div><div class="title">Avant le rendez-vous</div></div>${steps}${checks}${date}${seq}</div>`;
}

const notesMeetingDate = `<div class="note"><b>Avant</b> : aucune date de rendez-vous ; ni le conseiller ni la liste du Live ne savent quand il a lieu.</div>
<div class="note"><b>Après</b> (précision de Jean-Guy, 08/11 ; une migration)
<ol>
<li>${p(1)} Sur « Avant le rendez-vous », sous la liste cochée : « Le rendez-vous avec Mme Garcia », <b>Jour</b> et <b>Heure</b> saisis à l’heure de Paris, d’aujourd’hui à un an, comme « Confirmer la visite » (M142) ; « Enregistrer la date » en contour : le seul plein reste « Lancer le Live → ». Tablette : la saisie ouverte.</li>
<li>${p(2)} La date range la liste du Live (planche A5) ; elle n’est jamais montrée au vendeur.</li>
<li>${p(3)} Enregistrée : « Rendez-vous avec Mme Garcia : mardi 10/11 à 14 h » et « Changer la date » (ordinateur, téléphone). Facultative : sans date, rien ne bloque, rien ne change pour être prêt (M52).</li>
<li>Elle se change tant que le dossier n’est ni conclu ni archivé ; le Live commencé ou non. Un dossier conclu ne la montre plus.</li>
<li><b>Base</b> : une colonne nullable, <code>projects.meeting_scheduled_at</code> (horodatage), écrite par une action du serveur qui relit tout (le dossier de l’agence, ni conclu ni archivé, d’aujourd’hui à un an), comme la langue du dossier (M140) ; aucune ligne modifiée ; compatible avec le code de <code>main</code>, qui ne la lit pas.</li>
</ol></div>`;

// ================================================================================================
// Suivi (la règle partout)
// ================================================================================================
function renderSuivi(dev, state) {
  const before = state === 'avant';
  const chips = `<div class="filters">${before ? `<span class="chip" style="background:${C.brandDeep};color:#fff;border-color:${C.brandDeep}">Tous · 4</span>${p(1)}` : `<span class="chip on">Tous · 4</span>${p(4)}`}<span class="chip">Mandats signés · 2</span><span class="chip">À relancer · 1</span><span class="chip">Vendus ailleurs · retirés · 0</span></div>`;
  const card = (name, badge, bien, path, frise, when, title, phrase, button, full, pin, links) =>
    `<div class="card" style="flex-direction:row;padding:0;gap:0;overflow:hidden"><span style="width:6px;background:${badge.includes('relancer') ? '#ea7a1a' : C.green}"></span><div class="row stack" style="flex:1;padding:12px 14px;gap:16px"><div class="grow" style="display:flex;flex-direction:column;gap:5px"><div class="name" style="font-size:17px">${name} <span class="badge ${badge.includes('relancer') ? 'orange' : 'green'}">${badge}</span></div><div class="facts">${bien}</div><div class="facts">${path}</div>${frise ? `<div class="track">${frise}</div>` : ''}</div><div style="width:${dev === 'phone' ? '100%' : '300px'};display:flex;flex-direction:column;gap:5px;${dev === 'phone' ? '' : 'border-left:1px solid #f0f0f2;padding-left:14px'}"><span class="kicker" style="font-size:10.5px">Prochaine étape · ${when}</span><b style="font-size:14px">${title}</b><span class="facts">${phrase}</span><span class="btn${full ? ' full' : ''}" style="justify-content:center">${button}</span>${pin}<div class="btnrow" style="gap:12px">${links}</div></div></div></div>`;
  const ld = card(
    'M. et Mme Lambert-Duval',
    'À relancer',
    'Appartement · 3 pièces · 68 m² · Antibes',
    'Il voulait → Après le marché → Prix proposé (inchangé)',
    '',
    'aujourd’hui',
    'Relancer M. et Mme Lambert-Duval',
    'Réfléchit au prix · dernier contact il y a 8 jours',
    'Relancer',
    true,
    before ? '' : p(2),
    '<span class="lnk">Point marché</span><span class="lnk">Détail des prix</span><span class="lnk">Changer l’issue</span>',
  );
  const lef = card(
    'M. Lefebvre',
    'Mandat signé · exclusif',
    'Villa · 7 pièces · 210 m² · Mougins',
    'Il voulait → Après le marché → Prix signé 1 639 500 € (inchangé)',
    '<span class="done">✓ Mandat signé</span><i>→</i><span class="done">Concurrents</span><i>→</i><span class="now">Point marché</span><i>→</i><span>Visites acquéreurs</span>',
    'aujourd’hui',
    'Faire le Point marché',
    'Premier Point marché dû, un mois après la signature.',
    'Faire le point marché',
    before,
    before ? p(1) : p(3),
    '<span class="lnk">Prospection</span><span class="lnk">Détail des prix</span><span class="lnk">Changer l’issue</span>',
  );
  return `<div class="zone"><div><div class="kicker">Après le rendez-vous</div><div class="title">Suivi</div></div>${chips}${ld}${dev === 'phone' ? '' : lef}</div>`;
}

const notesSuivi = `<div class="note"><b>Avant</b> (<code>suivi-row.tsx</code>, M130 A) : chaque carte dont l’étape est due a son bouton plein ; la démo en a deux le même jour (la relance des Lambert-Duval, le Point marché de M. Lefebvre). La pastille de filtre choisie est pleine, comme un bouton.</div>
<div class="note"><b>Après</b>
<ol>
<li>${p(2)} La <b>première carte due</b>, dans l’ordre du Suivi (M96), garde son bouton plein — comme « Aujourd’hui » (M145) ; le Point marché ouvert et dû reste le plein de sa carte (M130 A).</li>
<li>${p(3)} Les autres étapes dues passent en contour ; « aujourd’hui », « en retard de N jours » en orange restent au-dessus, rien ne se perd.</li>
<li>${p(4)} La pastille de filtre choisie passe en bleu clair, comme l’onglet de Préparation.</li>
<li>Un filtre change la première carte due : le plein la suit.</li>
</ol></div>`;

// ================================================================================================

const SHEETS = {
  // ---- Partie A, côté vendeur ----
  'M146-A1-preparation.html': {
    title: 'M146 A · 1 — Préparation : une prochaine étape par carte, « Supprimer » dans « … » (I9)',
    sub: 'Démo : M. et Mme Martin (en cours, bien à importer), Mme Garcia (onglet « Prêts »). Ordinateur et tablette : le menu « … » de M. et Mme Martin ouvert.',
    render: renderPreparation,
    notes: notesPreparation,
  },
  'M146-A2-bien-vendeur.html': {
    title: 'M146 A · 2 — Bien vendeur : les imports repliés quand la fiche est enregistrée (C3)',
    sub: 'Dossier de Mme Garcia, fiche enregistrée : le haut de l’écran.',
    render: renderProperty,
    notes: notesProperty,
  },
  'M146-A3-concurrents.html': {
    title: 'M146 A · 3 — Concurrents : « Écarter » visible, le reste dans « … », l’ordre en glissant (I5)',
    sub: 'Dossier de Mme Garcia (démo, Vence, 5 concurrents retenus). Ordinateur : le menu « … » ouvert ; tablette et téléphone : la confirmation de « Supprimer… ».',
    render: renderComparables,
    notes: notesComparables,
  },
  'M146-A4-avant-le-rendez-vous.html': {
    title: 'M146 A · 4 — « Lancer le Live » une seule fois par écran (C4)',
    sub: 'Dossier de Mme Garcia, « Avant le rendez-vous » : la zone de la barre des étapes et du déroulé.',
    render: renderBefore,
    notes: notesBefore,
  },
  'M146-A5-liste-du-live.html': {
    title: 'M146 A · 5 — Liste du Live : les dossiers prêts pour le Live en tête, un seul « Lancer le Live » plein',
    sub: 'Démo : les deux dossiers prêts, Mme Garcia et Mr and Mrs Bernard (présentation directe).',
    render: renderLiveList,
    notes: notesLiveList,
  },
  'M146-A6-accueil-du-live.html': {
    title: 'M146 A · 6 — Accueil du Live : le logo dans la carte, sinon le nom en grand ; la carte en pleine hauteur (C8)',
    sub: 'Dossier de Mme Garcia, premier écran du Live, scène sombre. Tablette après : une agence qui a déposé un logo ; ordinateur et téléphone après : la démo, sans logo.',
    render: renderLiveIntro,
    notes: notesLiveIntro,
    heights: { desk: 800, tab: 768, phone: 844 },
  },
  'M146-A7-suivi.html': {
    title: 'M146 A · 7 — Suivi : le plein sur la première carte due seulement',
    sub: 'Démo le jour où la relance des Lambert-Duval et le premier Point marché de M. Lefebvre sont dus ensemble (téléphone : la première carte). Le chemin du prix et la frise ne changent pas.',
    render: renderSuivi,
    notes: notesSuivi,
  },
  'M146-A8-date-du-rendez-vous.html': {
    title: 'M146 A · 8 — La date du rendez-vous (hors de la 146 : gardée pour une future mission)',
    sub: 'Dossier de Mme Garcia. Ordinateur et téléphone : la date enregistrée ; tablette : la saisie ouverte.',
    render: renderMeetingDate,
    notes: notesMeetingDate,
  },
  // ---- Partie B, côté acquéreur et prospection ----
  'M146-B1-visites.html': {
    title: 'M146 B · 1 — Visites : une prochaine étape par visite, le reste en liens (I10)',
    sub: 'Démo : Mr and Mrs Wilson (l’appartement d’Antibes, une annonce, exclusivité inconnue), la famille Keller (visite faite, offre acceptée) ; une visite planifiée sur le mandat Lopez comme exemple de forme (la démo n’en a pas).',
    render: renderVisits,
    notes: notesVisits,
  },
  'M146-B2-acquereurs.html': {
    title: 'M146 B · 2 — Acquéreurs : « Mes fiches » d’abord, triés par urgence, l’action à droite, filtrer en tapant (I4)',
    sub: 'Démo : cinq des neuf fiches (téléphone : trois) ; les prochaines étapes sont celles que calcule `buyerNextAction` aujourd’hui ; budgets et nombres des filtres relevés de la démo à titre indicatif. Dans la démo, toutes les fiches sont au closer : « Mes fiches » vaut « Toute l’agence ».',
    render: renderBuyers,
    notes: notesBuyers,
  },
  'M146-B3-prospection.html': {
    title: 'M146 B · 3 — Prospection : une étape par carte, compteurs sur une ligne, colonnes vides masquées (C9)',
    sub: 'Démo : un concurrent du mandat Lopez (prêt à envoyer), deux de Mougins (remis, dont mou-02 chez un confrère).',
    render: renderProspection,
    notes: notesProspection,
  },
  'M146-B4-presentation-fondu.html': {
    title: 'M146 B · 4 — Présentation acquéreur : le fondu court du Live',
    sub: 'Ce que l’œil voit pendant un changement d’écran de la présentation plein cadre.',
    render: renderFade,
    notes: notesFade,
  },
  'M146-B5-aujourdhui-libelle.html': {
    title: 'M146 B · 5 — Aujourd’hui : « correspond à l’appartement », côté conseiller',
    sub: 'Le bloc Vendeurs d’« Aujourd’hui » : la relance des Lambert-Duval (démo, un appartement), et une maison en exemple de forme.',
    render: renderToday,
    notes: notesToday,
  },
};

const files = {};
for (const [name, def] of Object.entries(SHEETS)) files[name] = sheet(def);
for (const [name, html] of Object.entries(files)) writeFileSync(join(here, name), html);

if (process.argv.includes('--png')) {
  const { chromium } = await import(
    pathToFileURL(join(here, '../../node_modules/playwright/index.mjs')).href
  );
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  for (const name of Object.keys(files)) {
    await tab.goto(pathToFileURL(join(here, name)).href);
    await tab.screenshot({ path: join(here, name.replace('.html', '.png')), fullPage: true });
  }
  await browser.close();
}
