// Mission 149 — générateur des maquettes « Les titres du menu » (demande de Jean-Guy, 10/11) :
// les titres de groupe du menu de gauche (« Vendeurs », « Acquéreurs », « Les deux ») se voient au
// premier coup d'œil, sans alourdir le menu. Deux variantes : A typographique, B avec une icône.
// `node missions/maquettes/M149-generateur.mjs --png` écrit M149-1 (ordinateur) et M149-2
// (téléphone, menu ☰ ouvert), en HTML et en PNG (Chromium du dépôt).
//
// AVANT = `src/components/app-shell/sidebar-nav.tsx` de `main` au 10/11 (43340a3) : titre en
// 11 px, gras, capitales espacées, gris zinc-500, 12 px au-dessus, aucun filet. Les entrées ne
// changent pas. Couleur de l'agence : la charte par défaut (brand-deep #00527a), le cas de toute
// agence étant garanti par `ensureTextContrast` (≥ 4,5:1 sur blanc, M143).

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fonts = pathToFileURL(join(here, '../../src/features/branding/fonts')).href;

const C = {
  brand: '#3ea9ff',
  brandDeep: '#00527a',
  brandSoft: '#eaf5ff',
  ink: '#18181b',
  zinc600: '#52525b',
  zinc500: '#71717a',
  zinc200: '#e4e4e7',
  zinc100: '#f4f4f5',
  page: '#fafafa',
  orange: '#ea580c',
  green: '#12875a',
  note: '#fef6c7',
  noteLine: '#e8cf5a',
  noteInk: '#5b4a00',
};

// Contraste WCAG entre deux couleurs #rrggbb.
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return ((hi + 0.05) / (lo + 0.05)).toFixed(1).replace('.', ',');
};

const ICONS = {
  Vendeurs:
    '<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>',
  Acquéreurs:
    '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c.8-3.5 3.3-5.4 6.2-5.4s5.4 1.9 6.2 5.4"/><circle cx="17.4" cy="9" r="2.5"/><path d="M16.6 14.5c2.5.3 4.1 2 4.7 5.5"/>',
  'Les deux':
    '<path d="M4 8h15.5M16 4.5 19.5 8 16 11.5M20 16H4.5M8 12.5 4.5 16 8 19.5"/>',
};
const icon = (name, size = 17) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

const GROUPS = [
  { label: null, items: [['Aujourd’hui', 'Ce qu’il y a à faire', 7]] },
  {
    label: 'Vendeurs',
    items: [
      ['Préparation', 'Dossiers vendeurs'],
      ['Live', 'Rendez-vous vendeur'],
      ['Suivi', 'Après le rendez-vous', null, true],
    ],
  },
  {
    label: 'Acquéreurs',
    items: [
      ['Acquéreurs', 'Ce que chacun cherche'],
      ['Visites', 'À planifier, faites, retours'],
    ],
  },
  { label: 'Les deux', items: [['Prospection', 'Courriers et passages']] },
];

const item = ([label, hint, badge, active], phone) => `
  <a class="item${active ? ' active' : ''}">
    <span class="il">${label}${badge ? `<span class="badge">${badge}</span>` : ''}</span>
    ${phone ? '' : `<span class="ih">${hint}</span>`}
  </a>`;

// variant : 'avant' | 'A' | 'B'
const nav = (variant, phone) =>
  `<nav class="nav v-${variant}">${GROUPS.map(
    (group, index) => `
    <div class="group${group.label ? '' : ' first'}${index > 1 ? ' later' : ''}">
      ${
        group.label
          ? `<span class="gt">${variant === 'B' ? icon(group.label, phone ? 16 : 17) : ''}<span>${group.label}</span></span>`
          : ''
      }
      ${group.items.map((entry) => item(entry, phone)).join('')}
    </div>`,
  ).join('')}</nav>`;

const account = `
  <div class="account"><span class="avatar">CM</span><span class="who"><b>Claire Martin</b><span>claire.martin@example.com</span><span>Agence Horizon Côte d’Azur</span></span><span class="chev">⌃</span></div>`;

const logo = `<span class="logo"><svg width="30" height="20" viewBox="6 20 52 34"><path d="M18 34a14 14 0 0 1 28 0z" fill="#e8a33d"/><path d="M8 36h48" stroke="${C.brandDeep}" stroke-width="3.2" stroke-linecap="round"/><path d="M12 43c4-2.6 8-2.6 12 0s8 2.6 12 0 8-2.6 12 0" fill="none" stroke="${C.brandDeep}" stroke-width="2.6" stroke-linecap="round"/></svg><span><b>HORIZON</b><i>CÔTE D’AZUR</i></span></span>`;

const pageStub = `
  <div class="pagezone">
    <span class="kicker">Après le rendez-vous</span>
    <span class="ptitle">Suivi</span>
    <div class="stub w60"></div>
    <div class="cardstub"><div class="stub w40"></div><div class="stub w80"></div><div class="stub w70"></div></div>
    <div class="cardstub"><div class="stub w50"></div><div class="stub w80"></div></div>
  </div>`;

const desktop = (variant) => `
  <div class="frame desk">
    <aside class="side">${logo}<div class="sidebody">${nav(variant, false)}${account}</div></aside>
    ${pageStub}
  </div>`;

const phone = (variant) => `
  <div class="frame phone">
    <div class="topbar">${logo}<span class="pbadge">7</span><span class="burger">✕</span></div>
    <div class="panel">${nav(variant, true)}${account}</div>
    <div class="under">… la page continue sous le menu</div>
  </div>`;

const LABELS = { avant: ['AVANT', 'av'], A: ['APRÈS · A', 'ap'], B: ['APRÈS · B', 'alt'] };
const titleOf = (variant, device) =>
  `<div class="frame-title"><span class="st ${LABELS[variant][1]}">${LABELS[variant][0]}</span>${
    { avant: 'aujourd’hui', A: 'typographique', B: 'typographique + icône' }[variant]
  } · ${device}</div>`;

const ratioZinc = contrast(C.zinc500, '#ffffff');
const ratioDeep = contrast(C.brandDeep, '#ffffff');
const ratioStage = contrast(C.brand, '#051826');

const notes = `
  <div class="notes">
    <div class="note"><b>Le constat</b> — aujourd’hui le titre fait 11 px, gris (${ratioZinc}:1), au même gris que les sous-titres des entrées (« Dossiers vendeurs »…) et 4 px plus petit qu’elles : l’œil le lit comme une légende, pas comme un repère. Seuls 12 px le séparent de l’entrée du dessus, sans filet.</div>
    <div class="note"><b>A, typographique</b>
      <ul>
        <li>Titre : 13 px (au lieu de 11), extra-gras, capitales espacées, dans la couleur foncée de l’agence (<code>brand-deep</code>, ${ratioDeep}:1 sur blanc avec la charte par défaut ; toute charte est ramenée à ≥ 4,5:1 par <code>ensureTextContrast</code>, M143).</li>
        <li>Un filet fin (1 px, zinc-200) au-dessus de chaque groupe, 12 px d’air au-dessus du filet, 14 px entre le filet et le titre (aujourd’hui : 12 px, sans filet).</li>
        <li>Rien d’autre ne bouge : les entrées, leurs sous-titres, la pastille d’« Aujourd’hui », l’entrée choisie en bleu clair.</li>
      </ul>
    </div>
    <div class="note"><b>B, avec une icône</b> — la même chose, plus une icône de trait de 17 px (16 sur téléphone), dans la même couleur, devant le titre : une maison pour « Vendeurs », deux personnes pour « Acquéreurs », deux flèches qui se croisent pour « Les deux ». Tracées en SVG dans le code (aucune bibliothèque ajoutée), masquées aux lecteurs d’écran.</div>
    <div class="note"><b>Mode sombre</b> (« Sombre » de la carte du conseiller) — le titre passe dans la couleur claire de l’agence (<code>brand</code>, ${ratioStage}:1 sur le fond sombre), le filet en blanc à 10 %.</div>
    <div class="note"><b>Téléphone</b> — le menu ☰ ouvert : la même règle ; les entrées n’y ont pas de sous-titre (inchangé), le filet et le titre suffisent à séparer les groupes. Le menu s’allonge d’environ 57 px (mesuré sur la planche), sur téléphone comme sur ordinateur ; il tient toujours dans l’écran.</div>
    <div class="note"><b>Ma recommandation : A.</b> La couleur, la taille et le filet suffisent à faire voir les groupes ; les icônes ajoutent trois dessins à apprendre pour trois mots déjà courts, et « Les deux » n’a pas d’icône évidente.</div>
  </div>`;

const css = `
@font-face{font-family:Montserrat;src:url('${fonts}/montserrat/montserrat-latin.woff2') format('woff2');font-weight:100 900}
@font-face{font-family:Rajdhani;src:url('${fonts}/rajdhani/rajdhani-latin-500.woff2') format('woff2');font-weight:500}
@font-face{font-family:Rajdhani;src:url('${fonts}/rajdhani/rajdhani-latin-600.woff2') format('woff2');font-weight:600}
@font-face{font-family:Rajdhani;src:url('${fonts}/rajdhani/rajdhani-latin-700.woff2') format('woff2');font-weight:700}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,Arial,sans-serif;color:${C.ink};background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:20px;align-items:flex-start}
h1.sheet{font-size:22px;color:#27272a}
.sheet-sub{font-size:13px;color:#3f3f46;max-width:1700px;line-height:1.5}
.layout{display:flex;gap:26px;align-items:flex-start}
.col{display:flex;flex-direction:column}
.frame-title{font-size:13px;font-weight:800;color:#3f3f46;margin-bottom:6px;display:flex;gap:8px;align-items:center}
.st{font-size:11px;font-weight:800;letter-spacing:.1em;border-radius:6px;padding:2px 7px;color:#fff}
.st.av{background:#71717a}.st.ap{background:${C.green}}.st.alt{background:#7c5cbf}
.frame{background:${C.page};border:1px solid #a1a1aa;overflow:hidden;position:relative}
.desk{width:560px;height:820px;display:flex}
.side{width:256px;flex:none;background:#fff;border-right:1px solid ${C.zinc200};padding:24px 20px;display:flex;flex-direction:column;gap:32px}
.sidebody{display:flex;flex-direction:column;justify-content:space-between;flex:1}
.logo{display:flex;align-items:center;gap:6px;color:${C.brandDeep}}
.logo span{display:flex;flex-direction:column;line-height:1}
.logo b{font-size:15px;font-weight:800;letter-spacing:.08em}.logo i{font-style:normal;font-size:7px;font-weight:600;letter-spacing:.2em;color:#00527a;margin-top:2px}
.nav{display:flex;flex-direction:column;gap:6px}
.group{display:flex;flex-direction:column;gap:6px}
.item{display:flex;flex-direction:column;border-radius:12px;padding:8px 14px}
.item .il{display:flex;justify-content:space-between;align-items:center;font-family:Rajdhani,Montserrat,sans-serif;font-size:16px;font-weight:500;color:${C.zinc600}}
.item .ih{font-size:12px;color:${C.zinc500}}
.item.active{background:${C.brandSoft}}.item.active .il{color:${C.brandDeep};font-weight:600}.item.active .ih{color:rgba(0,82,122,.6)}
.badge{border-radius:999px;background:${C.orange};color:#fff;font-family:Montserrat,sans-serif;font-size:12px;font-weight:700;padding:1px 8px}
/* AVANT : le code d'aujourd'hui */
.v-avant .gt{padding:12px 14px 0;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${C.zinc500}}
/* APRÈS A et B */
.v-A .group:not(.first),.v-B .group:not(.first){border-top:1px solid ${C.zinc200};margin-top:12px;padding-top:14px}
.v-A .gt,.v-B .gt{display:flex;align-items:center;gap:8px;padding:0 14px 2px;font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.brandDeep}}
.account{display:flex;align-items:center;gap:10px;border:1px solid ${C.zinc200};border-radius:12px;padding:10px 12px;background:#fff}
.avatar{width:34px;height:34px;border-radius:999px;background:${C.brandSoft};color:${C.brandDeep};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex:none}
.who{display:flex;flex-direction:column;font-size:11px;color:${C.zinc500};min-width:0;flex:1}.who b{font-size:12.5px;color:${C.ink}}
.who span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chev{color:${C.zinc500};font-size:12px}
.pagezone{flex:1;padding:40px 30px;display:flex;flex-direction:column;gap:12px}
.kicker{font-size:11px;font-weight:800;letter-spacing:.14em;color:${C.zinc500};text-transform:uppercase}
.ptitle{font-family:Rajdhani,Montserrat,sans-serif;font-size:34px;font-weight:700;color:${C.brandDeep};line-height:1}
.stub{height:10px;border-radius:5px;background:#e4e4e7}.w40{width:40%}.w50{width:50%}.w60{width:60%}.w70{width:70%}.w80{width:80%}
.cardstub{background:#fff;border:1px solid ${C.zinc200};border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px}
.phone{width:390px;height:820px;display:flex;flex-direction:column;background:#fff}
.topbar{display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid ${C.zinc200}}
.topbar .logo{flex:1}
.pbadge{border-radius:999px;background:${C.orange};color:#fff;font-size:12px;font-weight:700;padding:1px 8px}
.burger{width:40px;height:40px;border:1px solid ${C.zinc200};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;color:#3f3f46}
.panel{padding:12px 16px 4px;display:flex;flex-direction:column;gap:16px;border-bottom:1px solid ${C.zinc200}}
.phone .nav,.phone .group{gap:4px}
.phone .item{padding:7px 14px}
.under{padding:14px 16px;font-size:12px;color:#a1a1aa;background:${C.page};flex:1}
.notes{display:flex;flex-direction:column;gap:12px;width:390px}
.note{background:${C.note};border:1px solid ${C.noteLine};border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.5;color:${C.noteInk}}
.note ul{margin:4px 0 0 16px}.note code{font-size:11px;background:rgba(0,0,0,.06);padding:0 3px;border-radius:3px}
`;

const sheet = ({ title, sub, frames }) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>
<h1 class="sheet">${title}</h1><p class="sheet-sub">${sub}</p>
<div class="layout">${frames}${notes}</div></body></html>`;

const SHEETS = {
  'M149-1-menu-ordinateur.html': {
    title: 'M149 · 1 — Les titres du menu, sur ordinateur (1280, colonne de gauche)',
    sub: 'Avant, puis les deux variantes. Les entrées et leurs sous-titres ne changent pas ; « Suivi » est l’entrée choisie. À droite, le début de la page, pour l’échelle.',
    frames: ['avant', 'A', 'B']
      .map((v) => `<div class="col">${titleOf(v, 'Ordinateur')}${desktop(v)}</div>`)
      .join(''),
  },
  'M149-2-menu-telephone.html': {
    title: 'M149 · 2 — Les titres du menu, sur téléphone (390, menu ☰ ouvert)',
    sub: 'La barre compacte du haut, le menu déplié sous elle (M132) ; les entrées n’y ont pas de sous-titre, comme aujourd’hui.',
    frames: ['avant', 'A', 'B']
      .map((v) => `<div class="col">${titleOf(v, 'Téléphone')}${phone(v)}</div>`)
      .join(''),
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
  const tab = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  for (const name of Object.keys(files)) {
    await tab.goto(pathToFileURL(join(here, name)).href);
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: join(here, name.replace('.html', '.png')), fullPage: true });
  }
  await browser.close();
}
console.log(`zinc-500 ${ratioZinc}:1 · brand-deep ${ratioDeep}:1 · brand sur fond sombre ${ratioStage}:1`);
