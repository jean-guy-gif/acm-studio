// Mission 154 (point 3) — générateur de la planche « Le bon qui réunit la tournée » (demande de
// Jean-Guy, 12/11). `node missions/maquettes/M154-generateur.mjs --png` écrit M154-2, en HTML et en
// PNG (Chromium du dépôt). Chaque planche : ordinateur (1280), tablette
// (820), téléphone (390), et les notes avant / après. Tout est inventé : la famille Keller et la
// villa de Mougins viennent de la démo (M114), l'agence du confrère « Agence Littoral & Pins »
// aussi (M120 B) ; les numéros de mandat sont inventés.
//
// AVANT = `main` au 12/11 (24d98ca, M153) : un bon est sous mandat OU hors mandat ; hors mandat, un
// seul titre pour le bon ; en collaboration, un bien par bon. APRÈS : un bloc « À quel titre ? » par
// bien hors mandat, et tous les titres sur le même bon.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fonts = pathToFileURL(join(here, '../../src/features/branding/fonts')).href;
const photos = pathToFileURL(join(here, '../../public/demo/photos')).href;

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
  amber: '#b45309',
  amberSoft: '#fff7e6',
  note: '#fef6c7',
  noteLine: '#e8cf5a',
  noteInk: '#5b4a00',
};

// ---------------------------------------------------------------------------------------------
// Le cadre : menu de gauche (ordinateur, tablette) ou barre compacte (téléphone), comme la M151.

const GROUPS = [
  [null, [['Aujourd’hui', 'Ce qu’il y a à faire', '3']]],
  [
    'Vendeurs',
    [
      ['Préparation', 'Dossiers vendeurs'],
      ['Live', 'Rendez-vous vendeur'],
      ['Suivi', 'Après le rendez-vous'],
    ],
  ],
  [
    'Acquéreurs',
    [
      ['Acquéreurs', 'Ce que chacun cherche'],
      ['Visites', 'À planifier, faites, retours', null, 'visits'],
    ],
  ],
  ['Les deux', [['Prospection', 'Courriers et passages']]],
];

const logo = `<span class="logo"><svg width="30" height="20" viewBox="6 20 52 34"><path d="M18 34a14 14 0 0 1 28 0z" fill="#e8a33d"/><path d="M8 36h48" stroke="${C.deep}" stroke-width="3.2" stroke-linecap="round"/><path d="M12 43c4-2.6 8-2.6 12 0s8 2.6 12 0 8-2.6 12 0" fill="none" stroke="${C.deep}" stroke-width="2.6" stroke-linecap="round"/></svg><span><b>HORIZON</b><i>CÔTE D’AZUR</i></span></span>`;

const side = (on) =>
  `<aside class="side">${logo}<nav>${GROUPS.map(
    ([label, items], i) =>
      `<div class="grp${i ? ' sep' : ''}">${label ? `<span class="gt">${label}</span>` : ''}${items
        .map(
          ([l, h, b, key]) =>
            `<a class="it${key === on || l === on ? ' on' : ''}"><span class="il">${l}${b ? `<span class="pb">${b}</span>` : ''}</span><span class="ih">${h}</span></a>`,
        )
        .join('')}</div>`,
  ).join('')}</nav><div class="acc"><span class="av">CM</span><span><b>Claire Martin</b><br>Agence Horizon Côte d’Azur</span></div></aside>`;

const frame = (device, body, on, { bar = '' } = {}) =>
  device === 'phone'
    ? `<div class="frame phone"><div class="topbar">${logo}<span class="pb">3</span><span class="burger">☰</span></div><div class="main">${body}</div>${bar}</div>`
    : `<div class="frame ${device}">${side(on)}<div class="main">${body}</div>${bar}</div>`;

const DEVICE = { desk: 'Ordinateur · 1280', tab: 'Tablette · 820', phone: 'Téléphone · 390' };
const titled = (device, html, extra = '', state = 'APRÈS') =>
  `<div class="col"><div class="ftitle"><span class="st${state === 'AVANT' ? ' before' : ''}">${state}</span>${DEVICE[device]}${extra}</div>${html}</div>`;


// ---------------------------------------------------------------------------------------------
// Planche 2 b — le bon de la tournée : un bloc « À quel titre ? » par bien.

const radio = (on, label, hint) =>
  `<label class="radio${on ? ' on' : ''}"><i></i><span><b>${label}</b><small>${hint}</small></span></label>`;

const titleBox = (kind, { agency = '', number = '', hint = '', compact = false } = {}) => `
  <div class="title-box${kind ? '' : ' missing'}">
    <span class="tl">À quel titre intervenez-vous ? <em>obligatoire</em></span>
    <div class="radios${compact ? ' col' : ''}">
      ${radio(kind === 'search', 'Mon mandat de recherche', 'signé avec l’acquéreur')}
      ${radio(kind === 'colleague', 'Collaboration avec le confrère', 'délégation de son mandat de vente')}
    </div>
    ${
      kind === 'search'
        ? `<div class="g2"><label class="f"><span>N° du mandat de recherche</span><i class="in on">R-2026-031</i></label><label class="f"><span>Signé le</span><i class="in on">04/11/2026</i></label></div><p class="hint">${hint || 'Le même mandat de recherche pour tous ses biens, repris du dernier document de M. et Mme Wilson.'}</p>`
        : kind === 'colleague'
          ? `<div class="g2"><label class="f"><span>Agence du confrère</span><i class="in${agency ? ' on' : ''}">${agency || 'À saisir'}</i></label><label class="f"><span>N° de son mandat de vente</span><i class="in${number ? ' on' : ''}">${number || 'À saisir'}</i></label></div>${hint ? `<p class="hint">${hint}</p>` : ''}`
          : `<p class="err">Choisissez à quel titre vous intervenez pour ce bien : sans lui, le bon ne se signe pas.</p>`
    }
  </div>`;

const bienCard = ({ label, note, title, price, priceLabel, mandate, address, compact }) => `
  <li class="vb">
    <label class="check"><i class="box on">✓</i><b>${label}</b></label>
    <span class="hint">${note}</span>
    ${title ? titleBox(title.kind, { ...title, compact }) : ''}
    <div class="g2">${
      mandate
        ? `<label class="f"><span>N° de mandat</span><i class="in on">${mandate}</i></label>`
        : ''
    }<label class="f"><span>${priceLabel}</span><i class="in on">${price}</i></label><label class="f"><span>Adresse du bien</span><i class="in${address ? ' on' : ''}">${address || 'À saisir'}</i></label></div>
  </li>`;

const BIENS = [
  {
    label: 'Maison · 7 pièces · 210 m² · Mougins',
    note: 'Visite confirmée samedi 10 h · Mandat signé',
    mandate: 'M-2026-0142',
    priceLabel: 'Prix de commercialisation (€)',
    price: '1 639 500',
    address: '12 allée du Décor, 06250 Mougins',
    line: 'Mandat de vente de l’Agence n° M-2026-0142 · Prix de commercialisation : 1 639 500 €',
  },
  {
    label: 'Appartement · 3 pièces · 66 m² · Antibes',
    note: 'Visite demandée il y a 3 jours · Annonce du marché, hors mandat de l’agence',
    title: { kind: 'search' },
    priceLabel: 'Prix affiché (€)',
    price: '395 000',
    address: '3 rue du Vieux Pressoir, 06600 Antibes',
    line: 'Mandat de recherche n° R-2026-031 du 04/11/2026 · Prix affiché : 395 000 €',
  },
  {
    label: 'Maison · 7 pièces · 220 m² · Mougins',
    note: 'Visite confirmée samedi 11 h 30 · Collaboration obtenue · hors mandat de l’agence',
    title: {
      kind: 'colleague',
      agency: 'Agence Littoral &amp; Pins',
      number: 'V-4471',
      hint: 'Collaboration obtenue le 10/11, sur sa carte de Prospection.',
    },
    priceLabel: 'Prix affiché (€)',
    price: '1 720 000',
    address: '',
    line: 'En collaboration avec Agence Littoral &amp; Pins, mandat de vente n° V-4471 · Prix affiché : 1 720 000 €',
  },
  {
    label: 'Maison · 6 pièces · 190 m² · Mouans-Sartoux',
    note: 'Visite confirmée samedi 15 h · Annonce du marché, hors mandat de l’agence',
    title: { kind: 'colleague', agency: 'Collines &amp; Vallons Immobilier', number: 'V-2210' },
    priceLabel: 'Prix affiché (€)',
    price: '1 620 000',
    address: '8 allée des Cistes Blancs, 06370 Mouans-Sartoux',
    line: 'En collaboration avec Collines &amp; Vallons Immobilier, mandat de vente n° V-2210 · Prix affiché : 1 620 000 €',
  },
];

const lines = (biens) => {
  const kinds = new Set(biens.map((bien) => (bien.mandate ? 'sale' : bien.title?.kind)));
  const phrases = [
    kinds.has('sale') ? '« Pour les biens que l’Agence a en mandat de vente, je suis informé(e)… »' : null,
    kinds.has('search')
      ? '« Pour les biens présentés au titre de mon mandat de recherche, je reconnais… »'
      : null,
    kinds.has('colleague')
      ? '« Pour chaque bien présenté en collaboration, je suis informé(e) que le vendeur a confié un mandat de vente à l’agence indiquée sur sa ligne… »'
      : null,
  ].filter(Boolean);
  return `
  <div class="preview"><span class="tl">Sur le bon</span>
    ${biens.map((bien) => `<p>« ${bien.line} · Adresse du bien : ${bien.address || '…'} »</p>`).join('')}
    <span class="tl sub">Et, une fois chacune, les phrases des titres présents</span>
    <p class="small">${phrases.join(' · ')}</p>
  </div>`;
};

const tourPage = (biens, { phone = false, withPreview = true } = {}) => `
  <a class="back">← Mr and Mrs Wilson</a>
  <h1 class="h1">Bon de visite</h1>
  <section class="card">
    <h2 class="h2">Les biens visités</h2>
    <p class="hint">Les visites de la tournée sont cochées d’office ; décochez celles qui n’ont pas lieu.</p>
    <ul class="vbs">${biens.map((bien) => bienCard({ ...bien, compact: phone })).join('')}</ul>
    ${withPreview ? lines(biens) : ''}
  </section>
  <section class="card stub"><h2 class="h2">Le visiteur</h2><p class="hint">Inchangé (points 1 et 2 de la M154) : le nom de la fiche en suggestion, le visiteur du dernier document, la pièce d’identité (le type seul), « Fait à ».</p></section>`;

const tourBar = (missing, count = '4 biens · 3 titres') =>
  `<div class="bar"><span class="bstate${missing ? '' : ' ok'}">${missing || count}</span><button class="btn fill${missing ? ' off' : ''}">Signer le bon de visite</button></div>`;

const phoneBiens = [
  BIENS[1],
  { ...BIENS[3], title: { kind: null }, note: 'Visite confirmée samedi 15 h · Annonce du marché, hors mandat de l’agence' },
];

const sheet = {
  title: 'M154 · 2 — Le bon de la tournée : un titre par bien',
  sub: 'Le bon de visite de la M153 (planche M153-2), quand une tournée réunit des biens sous des titres différents : le mandat de vente de l’agence, le mandat de recherche, la collaboration avec un ou plusieurs confrères. Chaque bien hors mandat a son bloc « À quel titre ? » ; chaque bien garde sa ligne et son titre sur le bon. Partie éteinte jusqu’à ce que Jean-Guy l’allume.',
  rows: [
    [titled('desk', frame('desk', tourPage(BIENS), 'Acquéreurs', { bar: tourBar(null) }))],
    [
      titled('tab', frame('tab', tourPage(BIENS.slice(0, 3)), 'Acquéreurs', { bar: tourBar(null, '3 biens · 3 titres') }), ' · trois titres'),
      titled('phone', frame('phone', tourPage(phoneBiens, { phone: true, withPreview: false }), null, { bar: tourBar('Il manque : le titre pour la maison de Mouans-Sartoux') }), ' · un titre manque'),
    ],
  ],
  notes: [
    [
      'Avant (M153)',
      'Un bon est sous mandat OU hors mandat (« Un bien hors mandat se signe sur un bon à part. ») ; hors mandat, un seul titre pour tout le bon ; en collaboration, un bien par bon. Une tournée de quatre biens demandait trois ou quatre bons.',
    ],
    [
      'Après',
      'Tous les biens de la tournée sur un seul bon. Un bien de l’agence garde son « N° de mandat » ; chaque bien hors mandat a <b>son</b> bloc « À quel titre ? », rien de coché d’avance, sauf la collaboration obtenue sur sa carte (à vérifier).',
    ],
    [
      'Le mandat de recherche',
      'Un seul par acquéreur : choisi sur un bien, le même n° et la même date se proposent sur les autres (« Le même mandat de recherche pour tous ses biens »), modifiables.',
    ],
    [
      'Plusieurs confrères',
      'Chaque bien en collaboration porte son agence et le n° de son mandat ; la phrase de l’engagement ne nomme plus d’agence (« l’agence indiquée sur sa ligne »).',
    ],
    [
      'Ce qui s’imprime',
      'Les lignes, une par bien, dans l’ordre de la tournée ; puis, une fois chacune, les seules phrases des titres présents. Un bon qui n’a qu’un titre garde mot pour mot ses textes d’aujourd’hui (M153).',
    ],
    [
      'Un titre manque',
      'Le bloc reste orange, la barre dit « Il manque : le titre pour la maison de Mouans-Sartoux », et « Signer le bon de visite » reste grisé ; le serveur refuse de même.',
    ],
    [
      'Éteinte',
      'Tant que Jean-Guy ne l’allume pas, les règles de la M153 tiennent (un bon à part, un bien par bon en collaboration).',
    ],
  ],
};

// ---------------------------------------------------------------------------------------------

const css = `
@font-face{font-family:Inter;src:url('${fonts}/inter/inter-latin.woff2') format('woff2');font-weight:100 900}
@font-face{font-family:Montserrat;src:url('${fonts}/montserrat/montserrat-latin.woff2') format('woff2');font-weight:100 900}
@font-face{font-family:Rajdhani;src:url('${fonts}/rajdhani/rajdhani-latin-600.woff2') format('woff2');font-weight:600}
@font-face{font-family:Rajdhani;src:url('${fonts}/rajdhani/rajdhani-latin-700.woff2') format('woff2');font-weight:700}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,Arial,sans-serif;color:${C.ink};background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:18px;align-items:flex-start}
h1.sheet{font-size:22px;color:#27272a}.sheet-sub{font-size:13px;color:#3f3f46;max-width:1720px;line-height:1.5}
.layout{display:flex;gap:26px;align-items:flex-start}.rows{display:flex;flex-direction:column;gap:26px}.row{display:flex;gap:22px;align-items:flex-start}
.col{display:flex;flex-direction:column}
.ftitle{font-size:13px;font-weight:700;color:#3f3f46;margin-bottom:6px;display:flex;gap:8px;align-items:center}
.st{font-size:11px;font-weight:800;letter-spacing:.1em;border-radius:6px;padding:2px 7px;color:#fff;background:${C.green}}.st.before{background:#71717a}
.notes{width:400px;display:flex;flex-direction:column;gap:12px;position:sticky;top:0}
.note{background:${C.note};border:1px solid ${C.noteLine};border-radius:10px;padding:12px 14px;font-size:13px;line-height:1.5;color:#3d3200}.note b.t{color:${C.noteInk}}
code{font-size:12px;background:rgba(0,0,0,.06);padding:0 3px;border-radius:3px}
.frame{background:${C.page};border:1px solid #a1a1aa;overflow:hidden;position:relative;display:flex}
.frame.desk{width:1280px;min-height:760px}.frame.tab{width:820px;min-height:1000px}.frame.phone{width:390px;min-height:844px;flex-direction:column}
.side{width:256px;flex:none;background:#fff;border-right:1px solid ${C.z200};padding:22px 18px;display:flex;flex-direction:column;gap:26px}
.tab .side{width:220px}
.logo{display:flex;align-items:center;gap:6px;color:${C.deep}}.logo span{display:flex;flex-direction:column;line-height:1}
.logo b{font-family:Montserrat;font-size:15px;font-weight:800;letter-spacing:.08em}.logo i{font-style:normal;font-family:Montserrat;font-size:7px;font-weight:600;letter-spacing:.2em;margin-top:2px}
nav{display:flex;flex-direction:column;gap:4px;flex:1}.grp{display:flex;flex-direction:column;gap:2px}.grp.sep{border-top:1px solid ${C.z200};margin-top:10px;padding-top:12px}
.gt{font-family:Montserrat;font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.deep};padding:0 12px 4px}
.it{display:flex;flex-direction:column;border-radius:12px;padding:7px 12px}.il{display:flex;justify-content:space-between;font-family:Rajdhani,Montserrat;font-size:16px;font-weight:600;color:${C.z600}}.ih{font-size:11.5px;color:${C.z500}}
.it.on{background:${C.soft}}.it.on .il{color:${C.deep}}
.pb{border-radius:999px;background:#ea580c;color:#fff;font-family:Inter;font-size:11px;font-weight:700;padding:1px 7px;align-self:center}
.acc{display:flex;gap:9px;align-items:center;border:1px solid ${C.z200};border-radius:12px;padding:9px;font-size:11px;color:${C.z500}}.acc b{color:${C.ink};font-size:12px}
.av{width:30px;height:30px;border-radius:99px;background:${C.soft};color:${C.deep};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;flex:none}
.topbar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid ${C.z200};background:#fff}.topbar .logo{flex:1}
.burger{width:38px;height:38px;border:1px solid ${C.z200};border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px}
.main{flex:1;min-width:0;padding:30px 36px 110px;display:flex;flex-direction:column;gap:16px;container-type:inline-size;overflow:hidden}
.tab .main{padding:24px 24px 110px}.phone .main{padding:16px 14px 96px;gap:12px}
.back{font-size:13px;color:${C.z500}}
.h1{font-family:Rajdhani,Montserrat;font-weight:700;font-size:36px;line-height:1.05;color:${C.deep}}.phone .h1{font-size:28px}
.h2{font-family:Rajdhani,Montserrat;font-weight:700;font-size:23px;color:${C.deep}}
.card{background:#fff;border:1px solid ${C.z200};border-radius:16px;padding:20px 22px;display:flex;flex-direction:column;gap:12px}.phone .card{padding:14px;border-radius:14px}
.card.stub{opacity:.7}
.gh{display:flex;justify-content:space-between;align-items:baseline}.lnk{color:${C.deep};font-weight:700;font-size:13.5px}
.lead{font-size:14.5px;color:${C.z700};line-height:1.45}
.visits{list-style:none;display:flex;flex-direction:column;gap:12px}
.visit{border:1px solid ${C.z200};border-radius:12px;padding:12px 16px;display:flex;flex-direction:column;gap:8px}
.vh{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.vt{font-family:Rajdhani,Montserrat;font-size:17px}.price{font-size:14px;color:${C.z600}}
.badge{font-size:12px;font-weight:600;border-radius:999px;padding:3px 10px;background:${C.z100};color:${C.z700}}
.meta{font-size:12px;color:${C.z500}}
.track{list-style:none;display:flex;flex-wrap:wrap;gap:6px}
.track li{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;border-radius:999px;padding:4px 10px;background:${C.z100};color:${C.z500}}
.track li i{width:8px;height:8px;border-radius:99px;background:currentColor}
.track li.done{background:${C.greenSoft};color:${C.green}}.track li.now{background:${C.soft};color:${C.deep}}
.vact{display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:space-between}.ph{font-size:13.5px;color:${C.z700}}
.vlinks{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;font-weight:600;color:${C.deep};text-decoration:underline}
.grey{font-size:12px;color:${C.z500};line-height:1.45}
.ok{font-size:13.5px;font-weight:700;color:${C.green}}
.btn{font-family:inherit;font-size:14.5px;font-weight:700;border-radius:12px;padding:11px 18px;border:1.5px solid ${C.deep};background:#fff;color:${C.deep}}
.btn.sm{font-size:13px;padding:7px 12px;border-radius:10px}
.btn.fill{background:${C.deep};color:#fff}.btn.fill.off{background:#a1a1aa;border-color:#a1a1aa}
.vbs{list-style:none;display:flex;flex-direction:column;gap:12px}
.vb{border:1px solid ${C.z200};border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px}
.check{display:flex;align-items:center;gap:10px;font-size:15px}.box{width:22px;height:22px;border:2px solid ${C.deep};border-radius:6px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:13px;color:#fff}.box.on{background:${C.deep}}
.hint{font-size:12.5px;color:${C.z500};line-height:1.45}
.title-box{border:1.5px solid ${C.deep};background:${C.soft};border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px}
.title-box.missing{border-color:${C.amber};background:${C.amberSoft}}
.tl{font-size:13px;font-weight:800;color:${C.deep}}.tl em{font-style:normal;font-weight:600;color:${C.z500};margin-left:6px}
.radios{display:grid;grid-template-columns:1fr 1fr;gap:8px}.radios.col{grid-template-columns:1fr}
.radio{display:flex;gap:10px;align-items:flex-start;background:#fff;border:1.5px solid ${C.z200};border-radius:10px;padding:10px}
.radio i{flex:none;width:18px;height:18px;border-radius:99px;border:2px solid ${C.z500};margin-top:2px}
.radio.on{border-color:${C.deep}}.radio.on i{border:5px solid ${C.deep}}
.radio span{display:flex;flex-direction:column}.radio b{font-size:14px}.radio small{font-size:12px;color:${C.z500}}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}@container (max-width:520px){.g2{grid-template-columns:1fr}}
.f{display:flex;flex-direction:column;gap:5px;font-size:12.5px;font-weight:600;color:${C.z600}}
.in{font-style:normal;font-weight:400;border:1px solid ${C.z200};border-radius:10px;padding:10px 12px;color:${C.z500};font-size:14px;background:#fff}
.in.on{color:${C.ink}}.in.ro{background:${C.z100};color:${C.z700}}
.seg{display:flex;gap:8px}.seg b{font-size:13px;font-weight:600;background:${C.z100};border-radius:9px;padding:8px 11px;color:${C.z700}}.seg b.on{background:${C.deep};color:#fff}
.err{font-size:13px;font-weight:600;color:${C.amber}}
.preview{border-left:4px solid ${C.deep};background:#fff;border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:4px;border:1px solid ${C.z200};border-left-width:4px;border-left-color:${C.deep}}
.preview p{font-size:13px;color:${C.z700};font-family:Georgia,serif;line-height:1.45}
.pending{font-size:12.5px;line-height:1.45;color:${C.amber};background:${C.amberSoft};border:1px dashed ${C.amber};border-radius:10px;padding:8px 10px}
.bar{position:absolute;left:0;right:0;bottom:0;background:#fff;border-top:1px solid ${C.z200};display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:12px 24px;box-shadow:0 -4px 12px rgba(0,0,0,.05)}
.desk .bar{left:256px}.tab .bar{left:220px}.phone .bar{padding:10px 14px;flex-wrap:wrap}.phone .bar .btn.fill{flex:1}
.bstate{margin-right:auto;font-size:13px;color:${C.amber};font-weight:600}.tl.sub{margin-top:6px;color:${C.z600}}.preview p.small{font-family:Inter;font-size:12px;color:${C.z600}}
.bstate.ok{color:${C.z500};font-weight:400}
`;

const sheetHtml = ({ title, sub, rows, notes }) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>
<h1 class="sheet">${title}</h1><p class="sheet-sub">${sub}</p>
<div class="layout"><div class="rows">${rows.map((r) => `<div class="row">${r.join('')}</div>`).join('')}</div>
<div class="notes">${notes.map(([t, b]) => `<div class="note"><b class="t">${t} :</b> ${b}</div>`).join('')}</div></div></body></html>`;

const SHEETS = {
  'M154-2-le-bon-de-la-tournee.html': sheet,
};

for (const [name, def] of Object.entries(SHEETS)) writeFileSync(join(here, name), sheetHtml(def));

if (process.argv.includes('--png')) {
  const { chromium } = await import(
    pathToFileURL(join(here, '../../node_modules/playwright/index.mjs')).href
  );
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  for (const name of Object.keys(SHEETS)) {
    await tab.goto(pathToFileURL(join(here, name)).href);
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: join(here, name.replace('.html', '.png')), fullPage: true });
  }
  await browser.close();
}
console.log(`${Object.keys(SHEETS).length} planches écrites (${photos ? 'photos de la démo disponibles' : ''})`);
