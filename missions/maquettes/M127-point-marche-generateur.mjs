// Générateur des maquettes SVG de la mission 127 — Le point marché.
// Contenu : le dossier de démonstration « Conclu, mandat signé » (villa avec piscine à Mougins,
// M. Lefebvre, 5 concurrents, prix retenu ensemble 1 639 500 €). Aucune adresse, aucun titre d'annonce.
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = '/Users/jean-guyourmieres/Documents/acm-studio/missions/maquettes/';
mkdirSync(OUT, { recursive: true });

const F = 'Montserrat, Inter, Arial, sans-serif';
const FT = 'Rajdhani, Montserrat, Arial, sans-serif';
const C = {
  brand: '#0d4d78',
  deep: '#0a3d5f',
  soft: '#e8f1f8',
  ink: '#18181b',
  grey: '#71717a',
  line: '#e4e4e7',
  bg: '#fafafa',
  green: '#059669',
  greenSoft: '#ecfdf5',
  orange: '#d97706',
  orangeSoft: '#fff7ed',
  red: '#dc2626',
  redSoft: '#fef2f2',
  amber: '#b45309',
  amberSoft: '#fffbeb',
  photo: '#cfd8e3',
  photoText: '#6b7a92',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function t(x, y, s, o = {}) {
  const a = [
    `x="${x}"`,
    `y="${y}"`,
    `font-family="${o.title ? FT : F}"`,
    `font-size="${o.size ?? 12}"`,
    o.weight ? `font-weight="${o.weight}"` : '',
    `fill="${o.fill ?? C.ink}"`,
    o.anchor ? `text-anchor="${o.anchor}"` : '',
    o.italic ? 'font-style="italic"' : '',
    o.spacing ? `letter-spacing="${o.spacing}"` : '',
    o.opacity ? `opacity="${o.opacity}"` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<text ${a}>${esc(s)}</text>`;
}
const kicker = (x, y, s, fill = C.grey) =>
  t(x, y, s.toUpperCase(), { size: 8.5, weight: 700, fill, spacing: 1.4 });
function r(x, y, w, h, o = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 0}" fill="${o.fill ?? '#fff'}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw ?? 1}"` : ''}${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`;
}
const line = (x1, y1, x2, y2, stroke = C.line, sw = 1) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"/>`;
function pill(x, y, s, o = {}) {
  const w = o.w ?? Math.round(s.length * 6.3 + 18);
  return (
    r(x, y, w, 20, { rx: 10, fill: o.fill ?? '#f4f4f5', stroke: o.stroke }) +
    t(x + w / 2, y + 13.5, s, { size: 10, weight: 700, fill: o.color ?? C.ink, anchor: 'middle' })
  );
}
function btn(x, y, s, o = {}) {
  const w = o.w ?? Math.round(s.length * 7 + 32);
  const h = o.h ?? 36;
  const kind = o.kind ?? 'primary';
  const fill = kind === 'primary' ? C.brand : '#fff';
  const stroke = kind === 'primary' ? C.brand : C.brand;
  const color = kind === 'primary' ? '#fff' : C.brand;
  if (kind === 'text') return t(x, y + h / 2 + 4, s, { size: 12.5, weight: 600, fill: C.brand });
  return (
    r(x, y, w, h, { rx: h / 2, fill, stroke, sw: 1.5 }) +
    t(x + w / 2, y + h / 2 + 4.5, s, { size: 12.5, weight: 700, fill: color, anchor: 'middle' })
  );
}
function photo(x, y, w, h, label = 'photo de l’annonce') {
  return (
    r(x, y, w, h, { fill: C.photo }) +
    `<path d="M${x + w * 0.1} ${y + h * 0.8} L${x + w * 0.38} ${y + h * 0.45} L${x + w * 0.55} ${y + h * 0.65} L${x + w * 0.68} ${y + h * 0.52} L${x + w * 0.9} ${y + h * 0.8} Z" fill="#b8c4d3"/>` +
    `<circle cx="${x + w * 0.75}" cy="${y + h * 0.28}" r="${Math.min(w, h) * 0.07}" fill="#e6ecf3"/>` +
    t(x + w / 2, y + h - 8, label, { size: 9, fill: C.photoText, anchor: 'middle' })
  );
}
function checkbox(x, y, checked, label) {
  return (
    r(x, y, 14, 14, { rx: 3, fill: checked ? C.brand : '#fff', stroke: checked ? C.brand : '#a1a1aa' }) +
    (checked ? t(x + 7, y + 11, '✓', { size: 11, weight: 800, fill: '#fff', anchor: 'middle' }) : '') +
    t(x + 20, y + 11.5, label, { size: 12 })
  );
}
const svg = (w, h, title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${F}">\n<title>${esc(title)}</title>\n${r(0, 0, w, h, { fill: C.bg })}\n${body}\n</svg>\n`;
const save = (name, content) => {
  writeFileSync(OUT + name, content);
  console.log('écrit', name);
};
const euro = (n) => n.toLocaleString('fr-FR').replace(/ | /g, ' ') + ' €';

// ---------------------------------------------------------------------------------------------
// Les données (dossier de démonstration de Mougins, étape « Conclu, mandat signé »)
// ---------------------------------------------------------------------------------------------
const MEETING = '12 octobre 2026';
const MEETING_SHORT = '12/10';
const POINT = '15 novembre 2026';
const POINT_SHORT = '15/11';
const AGREED = 1639500;
const ANALYSIS = 1642000;
const PERCEIVED = 1774500;
const REVISED = 1690000;
const ALIGN = { label: 'Prix aligné sur le marché', color: C.green, soft: C.greenSoft };

const COMPETITORS = [
  {
    n: 1,
    label: 'Villa · 7 pièces · 225 m² · Valbonne',
    dangerous: true,
    meeting: null,
    today: 1690000,
    days: 'environ 160 jours',
    state: 'unread',
    facts: [
      ['Surface', '225 m² (vous : 210 m²)', 'Avantage pour lui'],
      ['Terrain', '2 400 m² (vous : 1 800 m²)', 'Avantage pour lui'],
      ['Pièces · chambres', '7 pièces · 5 ch. (vous : 7 · 4)', 'Avantage pour lui'],
      ['Extérieur', 'Jardin, piscine (vous : terrasse, jardin, piscine)', 'Équivalent'],
      ['État', 'Bon état (vous : excellent)', 'Avantage pour vous'],
      ['DPE', 'B (vous : B)', 'Équivalent'],
    ],
  },
  {
    n: 2,
    label: 'Villa · 7 pièces · 212 m² · Mougins',
    meeting: 1699000,
    today: null,
    state: 'probable',
    goneDate: '03/11',
    goneDays: 150,
    nego: '5 à 10 %',
    range: [1529000, 1614000],
    facts: [
      ['Surface', '212 m² (vous : 210 m²)', 'Équivalent'],
      ['Terrain', '1 850 m² (vous : 1 800 m²)', 'Équivalent'],
      ['Pièces · chambres', '7 pièces · 4 ch. (vous : 7 · 4)', 'Équivalent'],
      ['Extérieur', 'Jardin, piscine (vous : terrasse, jardin, piscine)', 'Équivalent'],
      ['État', 'Bon état (vous : excellent)', 'Avantage pour vous'],
      ['DPE', 'C (vous : B)', 'Avantage pour vous'],
    ],
  },
  {
    n: 3,
    label: 'Villa · 7 pièces · 220 m² · Mougins',
    meeting: 1720000,
    today: null,
    state: 'withdrawn',
    goneDate: '20/10',
    goneDays: 320,
    before: 'Avait déjà baissé de 70 000 € avant le rendez-vous (1 790 000 → 1 720 000 €).',
    facts: [
      ['Surface', '220 m² (vous : 210 m²)', 'Avantage pour lui'],
      ['Terrain', '2 200 m² (vous : 1 800 m²)', 'Avantage pour lui'],
      ['Pièces · chambres', '7 pièces · 5 ch. (vous : 7 · 4)', 'Avantage pour lui'],
      ['Extérieur', 'Jardin, piscine (vous : terrasse, jardin, piscine)', 'Équivalent'],
      ['État', 'Bon état (vous : excellent)', 'Avantage pour vous'],
      ['DPE', 'C (vous : B)', 'Avantage pour vous'],
    ],
  },
  {
    n: 4,
    label: 'Villa · 7 pièces · 205 m² · Mougins',
    meeting: 1650000,
    today: 1590000,
    pct: '−3,6 %',
    dropDate: '03/11',
    days: '142 jours',
    state: 'drop',
    facts: [
      ['Surface', '205 m² (vous : 210 m²)', 'Équivalent'],
      ['Terrain', '1 600 m² (vous : 1 800 m²)', 'Avantage pour vous'],
      ['Pièces · chambres', '7 pièces · 4 ch. (vous : 7 · 4)', 'Équivalent'],
      ['Extérieur', 'Jardin, piscine (vous : terrasse, jardin, piscine)', 'Équivalent'],
      ['État', 'Bon état (vous : excellent)', 'Avantage pour vous'],
      ['DPE', 'B (vous : B)', 'Équivalent'],
    ],
  },
  {
    n: 5,
    label: 'Villa · 7 pièces · 240 m² · Mougins',
    meeting: 1745000,
    today: 1695000,
    pct: '−2,9 %',
    dropDate: '09/11',
    days: '95 jours',
    state: 'drop',
    facts: [],
  },
];
const NEWCOMERS = [
  {
    label: 'Villa · 7 pièces · 210 m² · Mougins',
    price: 1830000,
    sqm: '8 714 €/m²',
    seen: '02/11',
    facts: 'Terrain 1 700 m² · 4 chambres · piscine · garage · DPE A · construite en 2018',
  },
  {
    label: 'Villa · 7 pièces · 215 m² · Mougins',
    price: 1580000,
    sqm: '7 349 €/m²',
    seen: '28/10',
    facts: 'Terrain 1 900 m² · 4 chambres · piscine · garage · DPE D · à rafraîchir',
  },
];

// ---------------------------------------------------------------------------------------------
// La ligne de prix (une échelle commune : 1 550 000 → 1 850 000 €)
// ---------------------------------------------------------------------------------------------
const SCALE = { min: 1550000, max: 1850000 };
function priceLine(x, y, w, o) {
  // o : { points: [{price,label,kind}], subject:{price,label}, empty?:string, compact? }
  const px = (p) => x + ((p - SCALE.min) / (SCALE.max - SCALE.min)) * w;
  let s = '';
  s += line(x, y, x + w, y, '#cbd5e1', 3);
  // graduations
  for (let p = SCALE.min; p <= SCALE.max; p += 50000) {
    s += line(px(p), y - 4, px(p), y + 4, '#cbd5e1', 1);
  }
  s += t(x, y + (o.compact ? 16 : 20), euro(SCALE.min), { size: o.compact ? 8.5 : 9.5, fill: C.grey });
  s += t(x + w, y + (o.compact ? 16 : 20), euro(SCALE.max), { size: o.compact ? 8.5 : 9.5, fill: C.grey, anchor: 'end' });
  if (o.empty) {
    s += r(x, y - 22, w, 44, { fill: '#fff', stroke: C.line, dash: '4 3', rx: 6 });
    s += t(x + w / 2, y + 4, o.empty, { size: o.compact ? 11 : 12.5, weight: 600, fill: C.grey, anchor: 'middle' });
    return s;
  }
  if (o.band) {
    s += line(px(o.band[0]), y, px(o.band[1]), y, '#94a3b8', 3);
  }
  const up = o.compact ? 14 : 18;
  for (const p of o.points) {
    const cx = px(p.price);
    const isMed = p.kind === 'median';
    const isDanger = p.kind === 'danger';
    if (isDanger) {
      s += `<path d="M${cx} ${y - 9} L${cx + 8} ${y} L${cx} ${y + 9} L${cx - 8} ${y} Z" fill="${C.brand}"/>`;
    } else if (isMed) {
      s += line(cx, y - 10, cx, y + 10, C.ink, 2.5);
    } else {
      s += `<circle cx="${cx}" cy="${y}" r="6" fill="#94a3b8"/>`;
    }
    const row = p.row ?? 1;
    const ly = y - up - (row - 1) * (o.compact ? 20 : 24) - 2;
    const anchor = p.anchor ?? 'middle';
    s += t(cx, ly - (o.compact ? 10 : 12), p.label, { size: o.compact ? 8.5 : 9.5, fill: isDanger ? C.brand : C.grey, anchor, weight: isDanger ? 700 : 500 });
    s += t(cx, ly, euro(p.price), { size: o.compact ? 10 : 11.5, weight: 700, fill: isDanger ? C.brand : C.ink, anchor });
    if (row > 1) s += line(cx, y - 10, cx, ly + 3, '#cbd5e1', 1);
  }
  if (o.subject) {
    const cx = px(o.subject.price);
    s += r(cx - 2.5, y - 14, 5, 28, { rx: 2, fill: o.subject.color ?? ALIGN.color });
    const by = y + (o.compact ? 34 : 42);
    s += t(cx, by, o.subject.label, { size: o.compact ? 8.5 : 9.5, weight: 700, fill: o.subject.color ?? ALIGN.color, anchor: 'middle' });
    s += t(cx, by + (o.compact ? 13 : 16), euro(o.subject.price), { size: o.compact ? 11 : 13, weight: 800, fill: o.subject.color ?? ALIGN.color, anchor: 'middle' });
  }
  return s;
}

const LINE1 = {
  points: [
    { price: 1650000, label: 'Le plus bas', kind: 'low' },
    { price: 1690000, label: 'Le plus dangereux, selon vous', kind: 'danger', row: 2 },
    { price: 1699000, label: 'Prix médian', kind: 'median' },
    { price: 1745000, label: 'Le plus haut', kind: 'high' },
  ],
  subject: { price: AGREED, label: 'Prix retenu ensemble' },
};
const LINE2 = {
  points: [
    { price: 1590000, label: 'Le plus bas', kind: 'low' },
    { price: 1690000, label: 'Prix médian · le plus dangereux, selon vous', kind: 'danger', row: 2 },
    { price: 1695000, label: 'Le plus haut', kind: 'high' },
  ],
  subject: { price: AGREED, label: 'Votre prix, inchangé' },
};
const LINE3 = {
  points: [
    { price: 1580000, label: 'Le plus bas', kind: 'low' },
    { price: 1705000, label: 'Prix médian', kind: 'median' },
    { price: 1830000, label: 'Le plus haut', kind: 'high' },
  ],
  subject: { price: AGREED, label: 'Votre prix' },
};
const PHRASES = {
  l1: [
    'Au rendez-vous, votre prix retenu était sous le plus bas des 5 concurrents :',
    'le moins cher des 6 biens comparés.',
  ],
  l2: [
    'Aujourd’hui, 1 concurrent sur 3 est passé sous votre prix : vous êtes le 2e moins cher des',
    '4 biens encore en vente. 2 annonces ont disparu : 1 vente probable, 1 retirée sans vente.',
  ],
  l3: [
    '2 nouveaux venus retenus depuis le rendez-vous : 1 est sous votre prix, 1 au-dessus.',
    'Leur prix médian est 65 500 € au-dessus du vôtre.',
  ],
  l3empty: ['Aucun nouveau venu retenu depuis le rendez-vous.'],
};

// ---------------------------------------------------------------------------------------------
// Chrome commun des écrans conseiller (1280 × 800) : menu de gauche, en-tête
// ---------------------------------------------------------------------------------------------
function shell(title, sub) {
  let s = '';
  s += r(0, 0, 232, 800, { fill: '#fff', stroke: C.line });
  // interrupteur Vendeur | Acquéreur
  s += r(20, 20, 192, 32, { rx: 16, fill: '#f4f4f5' });
  s += r(22, 22, 94, 28, { rx: 14, fill: C.brand });
  s += t(69, 40, 'Vendeur', { size: 12, weight: 700, fill: '#fff', anchor: 'middle' });
  s += t(163, 40, 'Acquéreur', { size: 12, weight: 600, fill: C.grey, anchor: 'middle' });
  const items = [
    ['Préparation', 'Dossiers vendeurs'],
    ['Live', 'Rendez-vous vendeur'],
    ['Suivi', 'Après le rendez-vous'],
    ['Prospection', 'Concurrents à démarcher'],
  ];
  items.forEach(([a, b], i) => {
    const y = 84 + i * 62;
    if (a === 'Suivi') s += r(12, y - 20, 208, 52, { rx: 10, fill: C.soft });
    s += t(28, y + 2, a, { size: 14, weight: 700, fill: a === 'Suivi' ? C.brand : C.ink });
    s += t(28, y + 20, b, { size: 11, fill: C.grey });
  });
  s += r(12, 728, 208, 56, { rx: 10, fill: '#fff', stroke: C.line });
  s += t(28, 752, 'Compte de démonstration', { size: 12, weight: 700 });
  s += t(28, 768, 'Mon compte et l’agence ▾', { size: 10.5, fill: C.grey });
  s += t(264, 50, title, { size: 28, weight: 700, title: true });
  s += t(264, 72, sub, { size: 12.5, fill: C.grey });
  return s;
}

// La ligne du Suivi de M. Lefebvre (en-tête de ligne, commune à tous les états)
function suiviRowHead(y, o = {}) {
  const x = 264;
  const w = 984;
  let s = '';
  s += r(x, y, w, o.h ?? 118, { rx: 14, fill: '#fff', stroke: C.line });
  s += r(x, y, 6, o.h ?? 118, { fill: C.green });
  s += `<path d="M${x} ${y + 14} Q${x} ${y} ${x + 14} ${y} L${x + 6} ${y} Z" fill="#fff"/>`;
  s += t(x + 22, y + 30, 'M. Lefebvre', { size: 16, weight: 700, title: true });
  s += pill(x + 118, y + 16, 'Mandat signé', { fill: C.greenSoft, color: C.green });
  s += pill(x + 226, y + 16, 'Exclusif', { fill: C.soft, color: C.brand });
  s += t(x + 22, y + 52, 'Villa · 7 pièces · 210 m² · Mougins · conclu le 12/10 · Durée du Live : 48 min', { size: 12, fill: C.grey });
  // le chemin parcouru
  s += kicker(x + 470, y + 24, 'Le chemin parcouru');
  s += t(x + 470, y + 48, '1 774 500 €  →  1 690 000 €  →  1 639 500 €', { size: 14, weight: 700, title: true });
  s += pill(x + 742, y + 34, '−8 %', { fill: C.greenSoft, color: C.green, w: 46 });
  // Prêt à lancer
  s += kicker(x + 470, y + 80, 'Prêt à lancer');
  s += t(x + 470, y + 102, '7 → 10/10', { size: 14, weight: 700, title: true });
  // actions
  s += btn(x + 790, y + 18, 'Prospecter · 5 concurrents →', { w: 176, h: 34 });
  s += t(x + 966, y + 70, '1 remis · 1 adresse à confirmer · 1 ne plus solliciter', { size: 10.5, fill: C.grey, anchor: 'end' });
  s += t(x + 966, y + 100, o.open ? 'Masquer le détail des prix ▴' : 'Voir le détail des prix ▾', { size: 11.5, weight: 600, fill: C.brand, anchor: 'end' });
  return s;
}

// Barre du bas de la ligne : Changer l'issue · Mettre à jour les concurrents · ce qu'il en reste
function suiviBottomBar(y, o) {
  const x = 264;
  let s = '';
  s += btn(x + 22, y, 'Changer l’issue', { kind: 'secondary', w: 130, h: 32 });
  s += btn(x + 166, y, o.busy ?? 'Mettre à jour les concurrents', { kind: 'secondary', w: 230, h: 32 });
  return s;
}

// ---------------------------------------------------------------------------------------------
// 01 — Suivi, avant : aucun point encore
// ---------------------------------------------------------------------------------------------
{
  let b = shell('Suivi', 'Vos rendez-vous conclus, et ce qu’il reste à faire pour chacun.');
  // tuiles
  const tiles = [
    ['6', 'Mandats signés · dont 4 exclusifs', true],
    ['12', 'À relancer · 3 à relancer aujourd’hui'],
    ['3', 'Vendus ailleurs · retirés'],
  ];
  tiles.forEach(([n, l, on], i) => {
    const x = 264 + i * 250;
    b += r(x, 92, 236, 62, { rx: 12, fill: '#fff', stroke: on ? C.brand : C.line, sw: on ? 2 : 1 });
    b += t(x + 16, 122, n, { size: 22, weight: 700, title: true, fill: on ? C.brand : C.ink });
    b += t(x + 16, 142, l, { size: 10.5, fill: C.grey });
  });
  b += r(1014, 92, 234, 62, { rx: 12, fill: C.deep });
  b += t(1030, 122, '−7 %', { size: 22, weight: 700, title: true, fill: '#fff' });
  b += t(1030, 142, 'Écart moyen : prix du vendeur → prix de commercialisation', { size: 9.5, fill: '#fff', opacity: 0.85 });
  // filtres
  b += pill(264, 172, 'Tous', { fill: '#fff', stroke: C.line });
  b += pill(320, 172, 'Mandats signés', { fill: C.brand, color: '#fff' });
  b += pill(436, 172, 'À relancer', { fill: '#fff', stroke: C.line });
  b += pill(526, 172, 'Vendus ailleurs · retirés', { fill: '#fff', stroke: C.line });

  b += suiviRowHead(212, { h: 214 });
  b += suiviBottomBar(334, {});
  b += line(286, 380, 1226, 380);
  b += kicker(286, 400, 'Points marché');
  b += t(286, 418, 'Aucun point marché pour ce mandat. La relecture des annonces est gratuite ; le premier Point marché s’écrira à la fin de la mise à jour.', { size: 11.5, fill: C.grey });

  // une autre ligne, pour situer
  b += r(264, 446, 984, 86, { rx: 14, fill: '#fff', stroke: C.line });
  b += r(264, 446, 6, 86, { fill: C.green });
  b += t(286, 476, 'M. et Mme Martin', { size: 16, weight: 700, title: true });
  b += pill(430, 462, 'Mandat signé', { fill: C.greenSoft, color: C.green });
  b += t(286, 498, 'Maison · 5 pièces · 140 m² · Vence · conclu le 05/10', { size: 12, fill: C.grey });
  b += kicker(734, 470, 'Le chemin parcouru');
  b += t(734, 494, '720 000 €  →  680 000 €', { size: 14, weight: 700, title: true });
  b += btn(1054, 464, 'Prospecter · 4 concurrents →', { w: 176, h: 34 });

  // annotation
  b += r(264, 560, 984, 200, { rx: 12, fill: '#fff', stroke: C.brand, dash: '5 4' });
  b += t(284, 586, 'Ce qui change sur la ligne d’un mandat signé (M127)', { size: 13, weight: 700, fill: C.brand });
  const notes = [
    '• « Mettre à jour les prix des concurrents » (M105) devient « Mettre à jour les concurrents », en contour : « Prospecter » reste le seul bouton plein de la ligne.',
    '• Sous la barre, une zone « Points marché » : vide au départ (cette phrase), puis la liste des points datés, le plus récent en premier.',
    '• La mise à jour s’enchaîne dans un panneau sous la ligne : (a) relecture → (b) ce qu’elle conclut → (c) la proposition payante. Un seul bouton plein dans le panneau.',
    '• « Voir le détail des prix » gagne, à côté de « Ce que le vendeur a dit », les trois lignes du dernier point (maquette 04).',
    '• En 1024 × 768, la ligne passe sur deux rangées (@xl) : le chemin et les actions sous le nom ; les boutons de la barre restent sur une ligne.',
  ];
  notes.forEach((n, i) => (b += t(284, 612 + i * 26, n, { size: 11.5 })));
  save('M127-point-marche-01-suivi-avant.svg', svg(1280, 800, 'M127 — Suivi, mandat signé, avant la mise à jour', b));
}

// ---------------------------------------------------------------------------------------------
// 02 — Suivi, l’enchaînement a → b → c (trois instants de la même ligne)
// ---------------------------------------------------------------------------------------------
{
  let b = shell('Suivi', 'L’enchaînement de « Mettre à jour les concurrents » : trois instants de la même ligne.');
  // (a) relecture en cours
  let y = 92;
  b += t(264, y - 6, '(a) Relecture en cours — aucun appel payant', { size: 12, weight: 700, fill: C.brand });
  b += r(264, y + 4, 984, 92, { rx: 14, fill: '#fff', stroke: C.line });
  b += r(264, y + 4, 6, 92, { fill: C.green });
  b += t(286, y + 32, 'M. Lefebvre', { size: 16, weight: 700, title: true });
  b += pill(382, y + 18, 'Mandat signé', { fill: C.greenSoft, color: C.green });
  b += btn(286, y + 50, 'Changer l’issue', { kind: 'secondary', w: 130, h: 32 });
  b += r(430, y + 50, 230, 32, { rx: 16, fill: '#f4f4f5', stroke: C.line });
  b += t(545, y + 70, 'Relecture 3 sur 5…', { size: 12.5, weight: 700, fill: C.grey, anchor: 'middle' });
  b += r(680, y + 62, 300, 8, { rx: 4, fill: '#f4f4f5' });
  b += r(680, y + 62, 180, 8, { rx: 4, fill: C.brand });
  b += t(996, y + 66, 'Par l’extension ACM, sans appel payant.', { size: 10.5, fill: C.grey });
  b += t(996, y + 80, 'Ne fermez pas l’onglet.', { size: 10.5, fill: C.grey });

  // (b) ce qu'elle conclut
  y = 214;
  b += t(264, y - 6, '(b) Ce que la relecture conclut — le point est écrit', { size: 12, weight: 700, fill: C.brand });
  b += r(264, y + 4, 984, 262, { rx: 14, fill: '#fff', stroke: C.line });
  b += r(264, y + 4, 6, 262, { fill: C.green });
  b += t(286, y + 32, 'Point du 15/11 enregistré', { size: 15, weight: 700, title: true, fill: C.green });
  b += t(470, y + 32, '5 annonces relues · 2 baisses · 1 vente probable · 1 retiré sans vente · 1 prix au rendez-vous non relu', { size: 12, weight: 600 });
  const rows = [
    ['Baisse', 'Villa · 7 pièces · 205 m² · Mougins', '1 650 000 € au rendez-vous → 1 590 000 € aujourd’hui · −3,6 % · baisse vue le 03/11', C.green],
    ['Baisse', 'Villa · 7 pièces · 240 m² · Mougins', '1 745 000 € au rendez-vous → 1 695 000 € aujourd’hui · −2,9 % · baisse vue le 09/11', C.green],
    ['Vente probable', 'Villa · 7 pièces · 212 m² · Mougins', 'Retirée le 03/11 après 150 jours : vente probable, négociation estimée de 5 à 10 % (1 529 000 à 1 614 000 €)', C.orange],
    ['Retiré sans vente', 'Villa · 7 pièces · 220 m² · Mougins', 'Retirée le 20/10 après 320 jours : retiré du marché sans vente', C.grey],
    ['Non relu', 'Villa · 7 pièces · 225 m² · Valbonne', 'Prix au rendez-vous non relu ; prix du jour : 1 690 000 € · en vente depuis environ 160 jours', C.amber],
  ];
  rows.forEach((row, i) => {
    const ry = y + 56 + i * 36;
    b += line(286, ry + 26, 1226, ry + 26);
    b += pill(286, ry, row[0], { fill: '#fff', stroke: row[3], color: row[3], w: 122 });
    b += t(420, ry + 14, row[1], { size: 12, weight: 700 });
    b += t(690, ry + 14, row[2], { size: 11, fill: C.ink });
  });
  b += t(286, y + 250, '« Ont baissé depuis le rendez-vous : 2 sur 5 » se calcule sur le prix du rendez-vous. Les conclusions sont des règles ACM (jours de commercialisation au retrait), toujours dites « estimées ».', { size: 10.5, fill: C.grey });

  // (c) proposition payante
  y = 506;
  b += t(264, y - 6, '(c) La proposition payante — rien ne part sans le clic', { size: 12, weight: 700, fill: C.brand });
  b += r(264, y + 4, 984, 148, { rx: 14, fill: '#fff', stroke: C.line });
  b += r(264, y + 4, 6, 148, { fill: C.green });
  b += t(286, y + 34, 'Chercher les nouveaux venus sur le marché ?', { size: 16, weight: 700, title: true });
  b += t(286, y + 58, 'Recherche payante sur le marché : jusqu’à 0,60 €. Les critères du dossier, les annonces vues sur le marché depuis le 12/10 seulement,', { size: 12 });
  b += t(286, y + 76, 'sans celles déjà retenues ou écartées. Budget de recherche du mois : 4,20 € sur 30 €.', { size: 12 });
  b += btn(286, y + 98, 'Chercher les nouveaux venus · jusqu’à 0,60 €', { w: 318, h: 38 });
  b += btn(624, y + 98, 'Pas maintenant', { kind: 'text' });
  b += t(1226, y + 122, 'Le point du 15/11 est déjà écrit : « Pas maintenant » ferme le panneau et laisse « Points marché » à jour.', { size: 10.5, fill: C.grey, anchor: 'end' });

  b += t(264, 690, 'Chaque instant remplace le précédent dans le même panneau, sous la ligne du mandat. Le bouton « Mettre à jour les concurrents » reste grisé tant que l’enchaînement n’est pas fini.', { size: 11.5, fill: C.grey });
  b += t(264, 712, 'Extension absente : le panneau dit « Installez ou activez l’extension ACM, puis réessayez. » avec « Réessayer » en contour, rien n’est écrit, aucun point n’est créé.', { size: 11.5, fill: C.grey });
  b += t(264, 734, 'Budget du mois atteint : (c) dit « Budget de recherche du mois atteint : la recherche des nouveaux venus reviendra le 1er décembre. » et n’a pas de bouton plein ; le point est écrit quand même.', { size: 11.5, fill: C.grey });
  save('M127-point-marche-02-suivi-enchainement.svg', svg(1280, 800, 'M127 — Suivi, l’enchaînement a → b → c', b));
}

// ---------------------------------------------------------------------------------------------
// 03 — Suivi, après : les nouveaux venus trouvés, le résumé, la liste des points
// ---------------------------------------------------------------------------------------------
{
  let b = shell('Suivi', 'Après la recherche des nouveaux venus : retenir ou écarter, puis ouvrir le Point marché.');
  b += suiviRowHead(92, { h: 560 });
  b += suiviBottomBar(214, {});
  b += t(734, 234, 'Mise à jour faite le 15/11 à 10:42', { size: 11, fill: C.grey });

  // nouveaux venus
  let y = 262;
  b += r(286, y, 940, 212, { rx: 12, fill: C.bg, stroke: C.line });
  b += t(302, y + 26, 'Nouveaux sur le marché depuis le rendez-vous', { size: 15, weight: 700, title: true });
  b += t(302, y + 44, '2 trouvés · 0,20 € facturé · critères du dossier · vus sur le marché après le 12/10', { size: 11, fill: C.grey });
  NEWCOMERS.forEach((n, i) => {
    const cy = y + 60 + i * 72;
    b += r(302, cy, 908, 62, { rx: 10, fill: '#fff', stroke: C.line });
    b += photo(312, cy + 8, 70, 46, '');
    b += t(394, cy + 24, n.label, { size: 13, weight: 700 });
    b += t(394, cy + 42, `${euro(n.price)} · ${n.sqm} · ${n.facts}`, { size: 11, fill: C.grey });
    b += t(394, cy + 56, `Vu sur le marché depuis le ${n.seen}`, { size: 10.5, fill: C.brand, weight: 600 });
    if (i === 0) {
      b += pill(1030, cy + 20, 'Retenu ✓', { fill: C.greenSoft, color: C.green, w: 80 });
      b += t(1160, cy + 34, 'Écarter', { size: 12, weight: 600, fill: C.grey });
    } else {
      b += btn(1024, cy + 14, 'Retenir', { kind: 'secondary', w: 90, h: 32 });
      b += btn(1130, cy + 14, 'Écarter', { kind: 'text' });
    }
  });
  // points marché
  y = 494;
  b += line(286, y, 1226, y);
  b += kicker(286, y + 22, 'Points marché');
  b += t(286, y + 46, 'Point du 15/11', { size: 13, weight: 700 });
  b += t(400, y + 46, '5 annonces relues · 2 baisses · 1 vente probable · 1 retiré sans vente · 2 nouveaux venus', { size: 12 });
  b += btn(1010, y + 26, 'Ouvrir le Point marché →', { kind: 'secondary', w: 216, h: 34 });
  b += t(286, y + 70, 'Ont baissé depuis le rendez-vous : 2 sur 5 · Depuis le rendez-vous, 2 des biens que nous avions vus ont baissé leur prix (repris dans « Préparer un message », M96).', { size: 11, fill: C.grey });
  b += t(286, y + 110, 'Un second point, plus tard, s’ajoute au-dessus : « Point du 20/12 » · son résumé · « Ouvrir ». Chaque point rouvre son document tel qu’il était.', { size: 11, fill: C.grey, italic: true });

  b += r(264, 676, 984, 100, { rx: 12, fill: '#fff', stroke: C.brand, dash: '5 4' });
  b += t(284, 700, 'Lecture', { size: 13, weight: 700, fill: C.brand });
  b += t(284, 724, '• « Retenir » fait du nouveau venu un concurrent du dossier (sans prix du rendez-vous) : ligne 3 du point du jour, et Prospection. « Écarter » retire la carte, motif comme M50.', { size: 11.5 });
  b += t(284, 746, '• Les deux cartes disent « Vu sur le marché depuis le … », jamais « Publié le ». Le résumé du point compte les nouveaux venus RETENUS.', { size: 11.5 });
  b += t(284, 768, '• « Ouvrir le Point marché → » mène à l’écran conseiller du document (maquette 05). Un seul bouton plein sur la ligne : « Prospecter ».', { size: 11.5 });
  save('M127-point-marche-03-suivi-apres.svg', svg(1280, 800, 'M127 — Suivi, après la mise à jour', b));
}

// ---------------------------------------------------------------------------------------------
// 04 — Suivi, le détail ouvert : « Ce que le vendeur a dit » à côté des trois lignes
// ---------------------------------------------------------------------------------------------
{
  let b = shell('Suivi', '« Voir le détail des prix » : ce que le vendeur a dit, et où en est son prix.');
  b += suiviRowHead(92, { h: 690, open: true });
  b += suiviBottomBar(214, {});
  b += line(264, 262, 1248, 262);
  // colonne gauche : ce que le vendeur a dit
  let x = 286;
  let y = 290;
  b += kicker(x, y, 'Ce que le vendeur a dit');
  const said = [
    ['Au début → Après avoir vu le marché → Prix retenu', '1 774 500 € → 1 690 000 € → 1 639 500 €'],
    ['Ses réponses face aux prix affichés', 'Il a sous-estimé 5 concurrents sur 5, de 0,5 % en moyenne'],
    ['Le concurrent le plus dangereux, selon lui', 'Villa · 7 pièces · 225 m² · Valbonne · 1 690 000 €'],
    ['Prêt à lancer', '7/10 → 10/10'],
    ['Durée du Live', '48 min'],
  ];
  said.forEach(([l, v], i) => {
    const ry = y + 24 + i * 44;
    b += t(x, ry, l, { size: 10.5, fill: C.grey });
    b += t(x, ry + 17, v, { size: 12.5, weight: 700 });
    b += line(x, ry + 28, x + 380, ry + 28);
  });
  b += kicker(x, y + 256, 'Depuis le rendez-vous');
  b += t(x, y + 278, '2 concurrents ont baissé leur prix · 1 vente probable · 1 retiré sans vente', { size: 12 });
  b += btn(x, y + 300, 'Préparer un message', { kind: 'secondary', w: 170, h: 32 });
  b += t(x, y + 360, 'Le chemin parcouru pendant le rendez-vous, Les repères, Prêt à lancer,', { size: 10.5, fill: C.grey });
  b += t(x, y + 376, 'Rendez-vous conclu le 12 octobre 2026 · Ouvrir le dossier (inchangés, dessous)', { size: 10.5, fill: C.grey });

  // colonne droite : les trois lignes compactes
  x = 700;
  b += line(686, 280, 686, 760);
  b += kicker(x, y, 'Où en est son prix · Point du 15/11');
  b += t(x + 526, y, 'Ouvrir le Point marché →', { size: 11.5, weight: 600, fill: C.brand, anchor: 'end' });
  const lw = 526;
  const titles = ['1 · Au rendez-vous du 12/10', '2 · Aujourd’hui', '3 · Face aux nouveaux venus'];
  const compactLines = [
    { points: [
        { price: 1650000, label: 'Le plus bas', kind: 'low' },
        { price: 1690000, label: 'Le plus dangereux', kind: 'danger', row: 2 },
        { price: 1699000, label: 'Médiane', kind: 'median' },
        { price: 1745000, label: 'Le plus haut', kind: 'high' },
      ], subject: { price: AGREED, label: 'Prix retenu' } },
    { points: [
        { price: 1590000, label: 'Le plus bas', kind: 'low' },
        { price: 1690000, label: 'Médiane · le plus dangereux', kind: 'danger', row: 2 },
        { price: 1695000, label: 'Le plus haut', kind: 'high' },
      ], subject: { price: AGREED, label: 'Prix retenu' } },
    { points: [
        { price: 1580000, label: 'Le plus bas', kind: 'low' },
        { price: 1705000, label: 'Médiane', kind: 'median' },
        { price: 1830000, label: 'Le plus haut', kind: 'high' },
      ], subject: { price: AGREED, label: 'Prix retenu' } },
  ];
  const phr = [
    'Le moins cher des 6 biens comparés.',
    '1 concurrent sur 3 passé sous son prix · 2e moins cher sur 4 · 2 disparus : 1 vente probable, 1 retiré.',
    '2 nouveaux venus retenus : 1 sous son prix, 1 au-dessus · médiane 65 500 € au-dessus.',
  ];
  titles.forEach((ti, i) => {
    const ly = y + 36 + i * 148;
    b += t(x, ly, ti, { size: 12.5, weight: 700 });
    b += priceLine(x, ly + 58, lw, { ...compactLines[i], compact: true });
    b += r(x, ly + 110, lw, 22, { fill: C.soft });
    b += r(x, ly + 110, 3, 22, { fill: C.brand });
    b += t(x + 10, ly + 125, phr[i], { size: 9.5 });
  });
  b += t(x, y + 36 + 3 * 148 - 2, 'Même couleur sur les trois lignes : l’écart du prix retenu à votre analyse (M116). La position face à la médiane est dite dans la phrase.', { size: 9, fill: C.grey });
  save('M127-point-marche-04-suivi-detail-trois-lignes.svg', svg(1280, 800, 'M127 — Suivi, détail ouvert : ce que le vendeur a dit et les trois lignes', b));
}

// ---------------------------------------------------------------------------------------------
// 05 — L’écran conseiller du document
// ---------------------------------------------------------------------------------------------
{
  let b = shell('Point marché', 'M. Lefebvre · Villa · 7 pièces · 210 m² · Mougins · mandat signé le 12/10');
  b += t(264, 100, '← Retour au Suivi', { size: 12, weight: 600, fill: C.brand });
  // panneau de gauche : réglages
  b += r(264, 116, 400, 664, { rx: 14, fill: '#fff', stroke: C.line });
  b += kicker(284, 142, 'Point');
  b += r(284, 152, 360, 36, { rx: 8, fill: '#fff', stroke: C.line });
  b += t(298, 175, 'Point du 15/11 — 5 relues · 2 baisses · 2 nouveaux venus', { size: 12, weight: 600 });
  b += t(630, 175, '▾', { size: 12, fill: C.grey });
  b += t(284, 212, 'Ce document montre au vendeur ce qui a bougé depuis le rendez-vous', { size: 11.5 });
  b += t(284, 228, 'du 12/10 : chaque concurrent, son prix d’alors et d’aujourd’hui, les', { size: 11.5 });
  b += t(284, 244, 'annonces disparues, les nouveaux venus, puis où en est son prix.', { size: 11.5 });
  b += t(284, 260, 'Ni adresse, ni titre, ni lien d’annonce ; « estimé » partout où l’outil déduit.', { size: 11.5 });
  b += btn(284, 282, 'Imprimer', { w: 360, h: 40 });
  b += btn(284, 332, 'Créer un lien pour le vendeur (30 jours)', { kind: 'secondary', w: 360, h: 38 });
  b += t(284, 392, 'Sans compte, jamais indexé, 30 jours ; l’outil n’envoie rien.', { size: 10.5, fill: C.grey });
  b += line(284, 412, 644, 412);
  b += kicker(284, 436, 'Photos des concurrents');
  b += t(284, 454, 'Cochez « Sans photo » pour retirer la photo du document imprimé et du lien.', { size: 10.5, fill: C.grey });
  COMPETITORS.forEach((c, i) => {
    const cy = 474 + i * 30;
    b += checkbox(284, cy, i === 2, `Sans photo · Concurrent ${c.n} · ${c.label}`);
  });
  b += line(284, 640, 644, 640);
  b += kicker(284, 664, 'Nouveaux venus');
  NEWCOMERS.forEach((n, i) => {
    b += checkbox(284, 680 + i * 30, false, `Sans photo · Nouveau venu ${i + 1} · ${n.label}`);
  });
  b += t(284, 756, 'Rien ici n’est imprimé.', { size: 10.5, fill: C.grey, italic: true });

  // aperçu du document (couverture + début) à droite
  const px = 690;
  b += r(px, 116, 558, 664, { rx: 14, fill: '#fff', stroke: C.line });
  b += kicker(px + 20, 142, 'Aperçu · 9 pages · A4');
  b += t(px + 538, 142, 'Défiler pour tout voir', { size: 10.5, fill: C.grey, anchor: 'end' });
  // mini couverture
  b += r(px + 20, 156, 518, 300, { fill: C.deep });
  b += photo(px + 20, 156, 518, 300, '');
  b += r(px + 20, 300, 518, 156, { fill: C.deep, });
  b += `<rect x="${px + 20}" y="${236}" width="518" height="80" fill="url(#g)"/>`;
  b += t(px + 40, 184, 'LOGO DE L’AGENCE', { size: 10, weight: 700, fill: '#fff', spacing: 1.5 });
  b += t(px + 518, 184, '15 NOVEMBRE 2026', { size: 9, fill: '#fff', anchor: 'end', spacing: 1.5 });
  b += r(px + 40, 326, 92, 18, { stroke: '#fff', fill: 'none' });
  b += t(px + 86, 339, 'POINT MARCHÉ', { size: 8, fill: '#fff', anchor: 'middle', spacing: 1.5 });
  b += t(px + 40, 362, 'VILLA · MOUGINS', { size: 8.5, fill: '#fff', spacing: 2 });
  b += t(px + 40, 394, 'Point marché', { size: 26, weight: 700, fill: '#fff', title: true });
  b += t(px + 40, 420, 'du 15 novembre 2026', { size: 22, weight: 700, fill: '#fff', title: true });
  b += t(px + 40, 442, 'Depuis notre rendez-vous du 12 octobre 2026 · Pour M. Lefebvre', { size: 10.5, fill: '#fff' });
  // page 2 début
  b += r(px + 20, 470, 518, 300, { fill: '#fff', stroke: C.line });
  b += r(px + 36, 486, 24, 24, { stroke: C.brand, fill: 'none' });
  b += t(px + 48, 503, '01', { size: 10, weight: 700, fill: C.brand, anchor: 'middle' });
  b += t(px + 70, 504, 'Les concurrents, depuis le rendez-vous', { size: 16, weight: 700, title: true, fill: C.brand });
  b += line(px + 36, 516, px + 522, 516, C.brand, 2);
  b += kicker(px + 36, 540, 'Concurrent 1 · le plus dangereux, selon vous');
  b += t(px + 36, 560, 'Villa · 7 pièces · 225 m² · Valbonne', { size: 13, weight: 700 });
  for (let i = 0; i < 4; i++) b += photo(px + 36 + i * 122, 572, 114, 76, '');
  b += t(px + 36, 672, 'Surface  225 m² (vous : 210 m²)', { size: 10 });
  b += t(px + 36, 690, 'Terrain  2 400 m² (vous : 1 800 m²)', { size: 10 });
  b += t(px + 36, 708, 'Pièces · chambres  7 · 5 (vous : 7 · 4)', { size: 10 });
  b += t(px + 36, 726, '…', { size: 10 });
  b += `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.deep}" stop-opacity="0"/><stop offset="1" stop-color="${C.deep}" stop-opacity="1"/></linearGradient></defs>`;
  save('M127-point-marche-05-ecran-conseiller.svg', svg(1280, 800, 'M127 — Écran conseiller du Point marché', b));
}

// ---------------------------------------------------------------------------------------------
// Le document A4 (794 × 1123)
// ---------------------------------------------------------------------------------------------
const A4W = 794;
const A4H = 1123;
const M = 56; // marge
const CW = A4W - 2 * M;
function a4(title, body, pageNo, total = 9) {
  let s = r(0, 0, A4W, A4H, { fill: '#fff' });
  s += body;
  s += t(M, A4H - 40, `ÉTUDE CONFIDENTIELLE · MOUGINS · 15 NOVEMBRE 2026`, { size: 7.5, fill: '#64748b', spacing: 1.2 });
  s += t(A4W - M, A4H - 40, `${String(pageNo).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, { size: 7.5, fill: '#64748b', anchor: 'end' });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${A4W}" height="${A4H}" viewBox="0 0 ${A4W} ${A4H}" font-family="${F}">\n<title>${esc(title)}</title>\n${s}\n</svg>\n`;
}
function sectionTitle(y, num, title, hint) {
  let s = '';
  s += r(M, y - 18, 28, 26, { stroke: C.brand, fill: 'none' });
  s += t(M + 14, y + 1, num, { size: 11, weight: 700, fill: C.brand, anchor: 'middle' });
  s += t(M + 40, y + 2, title, { size: 22, weight: 700, title: true, fill: C.brand });
  s += line(M, y + 16, A4W - M, y + 16, C.brand, 2);
  if (hint) s += t(M + 40, y + 36, hint, { size: 10.5, fill: C.grey });
  return s;
}
function factsTable(y, facts) {
  let s = r(M, y, CW, facts.length * 28 + 8, { fill: '#fff', stroke: C.line });
  facts.forEach(([l, v, badge], i) => {
    const ry = y + 8 + i * 28;
    if (i > 0) s += line(M + 14, ry - 3, A4W - M - 14, ry - 3);
    s += t(M + 14, ry + 16, l, { size: 10.5, fill: C.grey });
    s += t(M + 150, ry + 16, v, { size: 10.5 });
    const col = badge === 'Équivalent' ? ['#f4f4f5', C.grey] : badge === 'Avantage pour lui' ? [C.greenSoft, C.green] : [C.orangeSoft, C.orange];
    const w = badge.length * 5.8 + 16;
    s += r(A4W - M - 14 - w, ry + 2, w, 20, { rx: 10, fill: col[0] });
    s += t(A4W - M - 14 - w / 2, ry + 15.5, badge, { size: 9.5, weight: 700, fill: col[1], anchor: 'middle' });
  });
  return s;
}
function priceCard(x, y, w, h, kick, value, sub, o = {}) {
  let s = r(x, y, w, h, { fill: o.fill ?? '#fff', stroke: o.stroke ?? C.line, sw: o.sw ?? 1 });
  s += kicker(x + 14, y + 22, kick, o.kickColor ?? C.grey);
  s += t(x + 14, y + 50, value, { size: o.size ?? 20, weight: 700, title: true, fill: o.color ?? C.ink });
  if (sub) s += t(x + 14, y + 70, sub, { size: 10, fill: o.subColor ?? C.grey });
  return s;
}

// 01 — couverture
{
  let b = '';
  b += photo(0, 0, A4W, A4H, 'photo principale du bien du vendeur');
  b += `<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.deep}" stop-opacity="0"/><stop offset="0.55" stop-color="${C.deep}" stop-opacity="0.8"/><stop offset="1" stop-color="${C.deep}" stop-opacity="0.97"/></linearGradient></defs>`;
  b += `<rect x="0" y="${A4H * 0.35}" width="${A4W}" height="${A4H * 0.65}" fill="url(#cg)"/>`;
  b += r(M, 44, 130, 36, { fill: '#fff' });
  b += t(M + 65, 67, 'LOGO DE L’AGENCE', { size: 9, weight: 700, fill: C.brand, anchor: 'middle', spacing: 1 });
  b += t(A4W - M, 66, '15 NOVEMBRE 2026', { size: 10, fill: '#fff', anchor: 'end', spacing: 2 });
  let y = 760;
  b += r(M, y - 16, 112, 22, { stroke: '#fff', fill: 'none' });
  b += t(M + 56, y - 1, 'POINT MARCHÉ', { size: 9, fill: '#fff', anchor: 'middle', spacing: 2 });
  b += t(M, y + 34, 'VILLA · MOUGINS', { size: 10, fill: '#fff', spacing: 2.5, opacity: 0.9 });
  b += t(M, y + 86, 'Point marché', { size: 46, weight: 700, fill: '#fff', title: true });
  b += t(M, y + 136, 'du 15 novembre 2026', { size: 40, weight: 700, fill: '#fff', title: true });
  b += t(M, y + 170, 'Depuis notre rendez-vous du 12 octobre 2026 · Pour M. Lefebvre', { size: 13, fill: '#fff', opacity: 0.95 });
  b += line(M, y + 196, A4W - M, y + 196, 'rgba(255,255,255,0.4)', 1);
  const figs = [
    ['Prix retenu ensemble', '1 639 500 €'],
    ['Concurrents suivis', '5'],
    ['Nouveaux venus retenus', '2'],
  ];
  figs.forEach(([l, v], i) => {
    const fx = M + i * (CW / 3);
    b += t(fx, y + 222, l.toUpperCase(), { size: 8.5, weight: 700, fill: '#fff', spacing: 1.4, opacity: 0.8 });
    b += t(fx, y + 250, v, { size: 24, weight: 700, fill: '#fff', title: true });
  });
  save('M127-point-marche-06-doc-01-couverture.svg', a4('M127 — Point marché, couverture', b, 1));
}

// Une page de concurrent
function competitorPage(c, pageNo) {
  let b = '';
  let y = 70;
  if (c.n === 1) {
    b += sectionTitle(y, '01', 'Les concurrents, depuis le rendez-vous', 'Pour chaque bien regardé ensemble : son prix au rendez-vous, son prix aujourd’hui, et ce qu’il est devenu.');
    y += 60;
  } else {
    b += t(M, y, 'LES CONCURRENTS, DEPUIS LE RENDEZ-VOUS', { size: 8.5, weight: 700, fill: C.brand, spacing: 1.5 });
    b += line(M, y + 10, A4W - M, y + 10, C.brand, 1);
    y += 30;
  }
  const cardH = c.state === 'probable' ? 576 : 560;
  b += r(M, y, CW, cardH, { fill: '#fff', stroke: C.line });
  b += r(M, y, CW, 4, { fill: c.dangerous ? C.orange : C.brand });
  b += kicker(M + 16, y + 28, `Concurrent ${c.n}${c.dangerous ? ' · le plus dangereux, selon vous' : ''}`, c.dangerous ? C.orange : C.grey);
  b += t(M + 16, y + 52, c.label, { size: 18, weight: 700, title: true, fill: C.brand });
  // quatre photos
  const pw = (CW - 32 - 3 * 8) / 4;
  for (let i = 0; i < 4; i++) b += photo(M + 16 + i * (pw + 8), y + 66, pw, 112, i === 0 ? 'photo 1' : `photo ${i + 1}`);
  // faits
  const fy = y + 194;
  b += kicker(M + 16, fy, 'Ses caractéristiques face à votre bien');
  const facts = c.facts.length ? c.facts : COMPETITORS[3].facts;
  let s2 = '';
  facts.forEach(([l, v, badge], i) => {
    const ry = fy + 14 + i * 27;
    if (i > 0) s2 += line(M + 16, ry - 2, A4W - M - 16, ry - 2);
    s2 += t(M + 16, ry + 16, l, { size: 10.5, fill: C.grey });
    s2 += t(M + 150, ry + 16, v, { size: 10.5 });
    const col = badge === 'Équivalent' ? ['#f4f4f5', C.grey] : badge === 'Avantage pour lui' ? [C.greenSoft, C.green] : [C.orangeSoft, C.orange];
    const w = badge.length * 5.8 + 16;
    s2 += r(A4W - M - 16 - w, ry + 3, w, 20, { rx: 10, fill: col[0] });
    s2 += t(A4W - M - 16 - w / 2, ry + 16.5, badge, { size: 9.5, weight: 700, fill: col[1], anchor: 'middle' });
  });
  b += s2;
  // bloc des prix
  const py = fy + 14 + facts.length * 27 + 18;
  b += kicker(M + 16, py, 'Le prix, depuis le rendez-vous');
  const bw = (CW - 32 - 2 * 10) / 3;
  const bx = (i) => M + 16 + i * (bw + 10);
  const by = py + 12;
  if (c.state === 'drop') {
    b += priceCard(bx(0), by, bw, 84, 'Au rendez-vous', euro(c.meeting), `le ${MEETING_SHORT}`);
    b += priceCard(bx(1), by, bw, 84, 'Aujourd’hui', euro(c.today), `baisse vue le ${c.dropDate}`, { fill: C.greenSoft, stroke: '#a7f3d0', color: C.green, kickColor: C.green, subColor: C.green });
    b += priceCard(bx(2), by, bw, 84, 'Écart', c.pct, `soit ${euro(c.meeting - c.today)} de moins`, { color: C.green });
    b += r(M + 16, by + 96, CW - 32, 40, { fill: C.bg, stroke: C.line });
    b += t(M + 30, by + 120, `Toujours en vente · depuis ${c.days} · ${Math.round(c.today / 205).toLocaleString('fr-FR')} €/m² aujourd’hui`, { size: 11.5, weight: 600 });
  } else if (c.state === 'probable') {
    b += priceCard(bx(0), by, bw, 84, 'Au rendez-vous', euro(c.meeting), `le ${MEETING_SHORT}`);
    b += priceCard(bx(1), by, bw, 84, 'Aujourd’hui', 'Retirée', `le ${c.goneDate}, après ${c.goneDays} jours`, { fill: C.orangeSoft, stroke: '#fed7aa', color: C.orange, kickColor: C.orange, subColor: C.orange });
    b += priceCard(bx(2), by, bw, 84, 'Conclusion', 'Vente probable', `négociation estimée de ${c.nego}`, { color: C.orange, size: 17 });
    b += r(M + 16, by + 96, CW - 32, 58, { fill: C.orangeSoft, stroke: '#fed7aa' });
    b += t(M + 30, by + 118, `Prix de vente estimé : entre ${euro(c.range[0])} et ${euro(c.range[1])}`, { size: 13, weight: 700, fill: C.orange, title: true });
    b += t(M + 30, by + 140, 'Une estimation d’après la durée de commercialisation au retrait, selon la règle de l’agence : rien ne dit que ce bien est vendu, ni à quel prix.', { size: 9.5, fill: C.ink });
  } else if (c.state === 'withdrawn') {
    b += priceCard(bx(0), by, bw, 84, 'Au rendez-vous', euro(c.meeting), `le ${MEETING_SHORT}`);
    b += priceCard(bx(1), by, bw, 84, 'Aujourd’hui', 'Retirée', `le ${c.goneDate}, après ${c.goneDays} jours`, { fill: '#f4f4f5', stroke: C.line, color: C.grey, kickColor: C.grey, subColor: C.grey });
    b += priceCard(bx(2), by, bw, 84, 'Conclusion', 'Retiré sans vente', 'plus de 300 jours en vente', { color: C.grey, size: 17 });
    b += r(M + 16, by + 96, CW - 32, 40, { fill: C.bg, stroke: C.line });
    b += t(M + 30, by + 120, c.before, { size: 11, weight: 600 });
  } else if (c.state === 'unread') {
    b += priceCard(bx(0), by, bw, 84, 'Au rendez-vous', 'Non relu', 'le prix d’alors n’a pas été relevé', { fill: C.amberSoft, stroke: '#fde68a', color: C.amber, kickColor: C.amber, subColor: C.amber, size: 18 });
    b += priceCard(bx(1), by, bw, 84, 'Prix du jour', euro(c.today), `relu le ${POINT_SHORT}`);
    b += priceCard(bx(2), by, bw, 84, 'Écart', '—', 'sans prix du rendez-vous, pas d’écart', { color: C.grey });
    b += r(M + 16, by + 96, CW - 32, 40, { fill: C.bg, stroke: C.line });
    b += t(M + 30, by + 120, `Toujours en vente · depuis ${c.days} · 7 511 €/m² aujourd’hui`, { size: 11.5, weight: 600 });
  }
  return a4(`M127 — Point marché, concurrent ${c.n}`, b, pageNo);
}
save('M127-point-marche-07-doc-02-concurrent-non-relu.svg', competitorPage(COMPETITORS[0], 2));
save('M127-point-marche-08-doc-03-concurrent-vente-probable.svg', competitorPage(COMPETITORS[1], 3));
save('M127-point-marche-09-doc-04-concurrent-retire.svg', competitorPage(COMPETITORS[2], 4));
save('M127-point-marche-10-doc-05-concurrent-baisse.svg', competitorPage(COMPETITORS[3], 5));

// 07 — nouveaux venus
{
  let b = '';
  let y = 70;
  b += sectionTitle(y, '02', 'Nouveaux sur le marché depuis le rendez-vous', 'Les biens apparus depuis le 12 octobre et retenus par votre conseiller pour la comparaison.');
  y += 70;
  NEWCOMERS.forEach((n, i) => {
    const cy = y + i * 330;
    b += r(M, cy, CW, 310, { fill: '#fff', stroke: C.line });
    b += r(M, cy, CW, 4, { fill: C.brand });
    b += kicker(M + 16, cy + 28, `Nouveau venu ${i + 1}`);
    b += t(M + 16, cy + 52, n.label, { size: 18, weight: 700, title: true, fill: C.brand });
    b += photo(M + 16, cy + 66, 300, 170, 'photo de l’annonce');
    b += photo(M + 324, cy + 66, 170, 81, '');
    b += photo(M + 502, cy + 66, 164, 81, '');
    b += photo(M + 324, cy + 155, 170, 81, '');
    b += photo(M + 502, cy + 155, 164, 81, '');
    b += t(M + 16, cy + 262, n.facts, { size: 10.5 });
    b += r(M + 16, cy + 274, 300, 26, { fill: C.soft });
    b += t(M + 26, cy + 291, `${euro(n.price)} · ${n.sqm}`, { size: 12.5, weight: 700, title: true, fill: C.brand });
    b += t(M + 330, cy + 291, `Vu sur le marché depuis le ${n.seen}`, { size: 10.5, fill: C.grey });
  });
  b += t(M, y + 2 * 330 + 10, 'Ces annonces n’étaient pas en vente au rendez-vous : elles n’entrent pas dans les lignes « Au rendez-vous » et « Aujourd’hui » de la page suivante.', { size: 9.5, fill: C.grey });
  save('M127-point-marche-11-doc-07-nouveaux-venus.svg', a4('M127 — Point marché, nouveaux venus', b, 7));
}

// 08 — les trois lignes de prix
function threeLinesPage(variant) {
  let b = '';
  let y = 70;
  b += sectionTitle(y, '03', 'Où en est votre prix', 'Trois lignes, à la même échelle, pour comparer d’un coup d’œil.');
  y += 66;
  const lw = CW - 40;
  const blocks = [
    ['1 · Au rendez-vous du 12 octobre', '5 concurrents · prix du rendez-vous', LINE1, PHRASES.l1],
    ['2 · Aujourd’hui, 15 novembre', '3 concurrents encore en vente · 2 annonces disparues, comptées à part', LINE2, PHRASES.l2],
    variant === 'empty'
      ? ['3 · Face aux nouveaux venus', 'Aucun bien retenu depuis le rendez-vous', { empty: 'Aucun nouveau venu retenu depuis le rendez-vous' }, PHRASES.l3empty]
      : ['3 · Face aux nouveaux venus', '2 nouveaux venus retenus · vus sur le marché après le 12 octobre', LINE3, PHRASES.l3],
  ];
  blocks.forEach(([ti, sub, ln, ph], i) => {
    const by = y + i * 262;
    b += r(M, by, CW, 246, { fill: '#fff', stroke: C.line });
    b += t(M + 20, by + 30, ti, { size: 15, weight: 700, title: true });
    b += t(M + 20, by + 48, sub, { size: 10, fill: C.grey });
    b += priceLine(M + 20, by + 116, lw, ln);
    const py = by + 208;
    b += r(M + 20, py - 14, lw, 50, { fill: C.soft });
    b += r(M + 20, py - 14, 4, 50, { fill: C.brand });
    ph.forEach((p, j) => (b += t(M + 34, py + 6 + j * 16, p, { size: 10.5, weight: j === 0 ? 600 : 400 })));
    if (i === 1) {
      // disparus comptés à part
      b += pill(A4W - M - 20 - 236, by + 16, '1 vente probable · 1 retiré sans vente', { fill: C.orangeSoft, color: C.orange, w: 236 });
    }
  });
  // légende
  const ly = y + 3 * 262 - 6;
  b += `<circle cx="${M + 6}" cy="${ly - 4}" r="5" fill="#94a3b8"/>` + t(M + 16, ly, 'plus bas · plus haut', { size: 9, fill: C.grey });
  b += line(M + 140, ly - 11, M + 140, ly + 2, C.ink, 2.5) + t(M + 148, ly, 'prix médian', { size: 9, fill: C.grey });
  b += `<path d="M${M + 226} ${ly - 11} L${M + 233} ${ly - 4} L${M + 226} ${ly + 3} L${M + 219} ${ly - 4} Z" fill="${C.brand}"/>` + t(M + 240, ly, 'le plus dangereux, selon vous', { size: 9, fill: C.grey });
  b += r(M + 400, ly - 12, 4, 16, { rx: 2, fill: C.green }) + t(M + 410, ly, 'votre prix retenu ensemble', { size: 9, fill: C.grey });
  b += t(M, ly + 18, 'Couleur de votre prix : vert, sous +5 % de l’analyse de votre conseiller (ici « Prix aligné sur le marché ») · orange, de +5 à +10 % · rouge, au-delà. La même sur les trois lignes.', { size: 9, fill: C.grey });
  return a4('M127 — Point marché, les trois lignes de prix', b, 8);
}
save('M127-point-marche-12-doc-08-trois-lignes.svg', threeLinesPage('full'));
save('M127-point-marche-12b-doc-08-trois-lignes-sans-nouveau-venu.svg', threeLinesPage('empty'));

// 09 — mentions
{
  let b = '';
  let y = 70;
  b += t(M, y, 'POUR LIRE CE DOCUMENT', { size: 8.5, weight: 700, fill: C.brand, spacing: 1.5 });
  b += line(M, y + 10, A4W - M, y + 10, C.brand, 1);
  const lines = [
    'Les prix cités sont ceux des annonces, pas des prix de vente.',
    'Une annonce disparue n’est pas une vente constatée : « vente probable » et la négociation « estimée » sont déduites',
    'de la durée de commercialisation au retrait, selon la règle de l’agence ; « retiré sans vente » dit une annonce retirée',
    'après plus de 300 jours. Rien ici n’affirme qu’un bien est vendu, ni à quel prix.',
    'Surfaces et caractéristiques telles qu’annoncées, à vérifier. « Vu sur le marché depuis le … » est la date à laquelle',
    'l’annonce a été vue pour la première fois, pas sa date de publication.',
  ];
  lines.forEach((l, i) => (b += t(M, y + 36 + i * 18, l, { size: 10.5 })));
  y = 220;
  b += r(M, y, CW, 110, { fill: '#fff', stroke: C.line });
  b += `<circle cx="${M + 50}" cy="${y + 55}" r="30" fill="${C.photo}"/>`;
  b += t(M + 50, y + 59, 'photo', { size: 8, fill: C.photoText, anchor: 'middle' });
  b += kicker(M + 100, y + 32, 'Votre conseiller');
  b += t(M + 100, y + 56, 'Jean-Guy Ourmières', { size: 16, weight: 700, title: true });
  b += t(M + 100, y + 76, '06 00 00 00 01 · demo@start-academy.fr', { size: 11, fill: C.grey });
  b += r(A4W - M - 86, y + 16, 70, 70, { fill: '#fff', stroke: C.line });
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if ((i * 7 + j * 3) % 4 !== 1) b += r(A4W - M - 80 + i * 10, y + 22 + j * 10, 9, 9, { fill: C.ink });
  b += t(A4W - M - 51, y + 100, 'carte de contact', { size: 7.5, fill: C.grey, anchor: 'middle' });
  y = 360;
  b += t(M, y, 'LOGO DE L’AGENCE · Agence de démonstration', { size: 9, weight: 700, fill: C.brand, spacing: 1 });
  b += t(M, y + 20, 'Carte professionnelle CPI 0605 2024 000 000 123 délivrée par la CCI Nice Côte d’Azur · Ne peut recevoir aucun fonds', { size: 9.5, fill: C.grey });
  b += t(M, y + 36, '12 avenue de la Démonstration, 06600 Antibes', { size: 9.5, fill: C.grey });
  b += t(M, y + 70, 'Le reste de la page est blanc : le document se termine ici.', { size: 9.5, fill: C.grey, italic: true });
  save('M127-point-marche-13-doc-09-mentions.svg', a4('M127 — Point marché, dernière page', b, 9));
}

// ---------------------------------------------------------------------------------------------
// 14 — Le lien sur téléphone (390 × 844) : la page des trois lignes
// ---------------------------------------------------------------------------------------------
{
  let b = r(0, 0, 390, 844, { fill: '#fff' });
  const x = 16;
  const w = 358;
  b += r(0, 0, 390, 44, { fill: C.deep });
  b += t(x, 28, 'LOGO DE L’AGENCE', { size: 9, weight: 700, fill: '#fff', spacing: 1.2 });
  b += t(374, 28, 'Point marché du 15/11', { size: 10, fill: '#fff', anchor: 'end' });
  let y = 70;
  b += r(x, y - 14, 22, 20, { stroke: C.brand, fill: 'none' });
  b += t(x + 11, y + 1, '03', { size: 9.5, weight: 700, fill: C.brand, anchor: 'middle' });
  b += t(x + 30, y + 2, 'Où en est votre prix', { size: 20, weight: 700, title: true, fill: C.brand });
  b += line(x, y + 12, x + w, y + 12, C.brand, 2);
  const lw = w - 24;
  const blocks = [
    ['1 · Au rendez-vous du 12/10', LINE1, PHRASES.l1],
    ['2 · Aujourd’hui', LINE2, PHRASES.l2],
    ['3 · Face aux nouveaux venus', LINE3, PHRASES.l3],
  ];
  const phoneLines = {
    0: ['Au rendez-vous, votre prix était sous le plus bas', 'des 5 concurrents : le moins cher des 6 biens', 'comparés.'],
    1: ['Aujourd’hui, 1 concurrent sur 3 est passé sous', 'votre prix : le 2e moins cher des 4 biens encore', 'en vente. 2 annonces ont disparu : 1 vente', 'probable, 1 retirée sans vente.'],
    2: ['2 nouveaux venus retenus : 1 sous votre prix,', '1 au-dessus. Leur prix médian est 65 500 €', 'au-dessus du vôtre.'],
  };
  // sur téléphone, les libellés des repères passent sous la ligne, en liste : la ligne ne porte que les points
  blocks.forEach(([ti, ln], i) => {
    const by = y + 30 + i * 240;
    b += r(x, by, w, 226, { rx: 10, fill: '#fff', stroke: C.line });
    b += t(x + 12, by + 24, ti, { size: 13.5, weight: 700, title: true });
    // ligne nue
    const ly = by + 70;
    const px = (p) => x + 12 + ((p - SCALE.min) / (SCALE.max - SCALE.min)) * lw;
    b += line(x + 12, ly, x + 12 + lw, ly, '#cbd5e1', 3);
    b += t(x + 12, ly + 16, '1,55 M€', { size: 8.5, fill: C.grey });
    b += t(x + 12 + lw, ly + 16, '1,85 M€', { size: 8.5, fill: C.grey, anchor: 'end' });
    ln.points.forEach((p) => {
      const cx = px(p.price);
      if (p.kind === 'danger') b += `<path d="M${cx} ${ly - 8} L${cx + 7} ${ly} L${cx} ${ly + 8} L${cx - 7} ${ly} Z" fill="${C.brand}"/>`;
      else if (p.kind === 'median') b += line(cx, ly - 9, cx, ly + 9, C.ink, 2.5);
      else b += `<circle cx="${cx}" cy="${ly}" r="5" fill="#94a3b8"/>`;
    });
    const sx = px(ln.subject.price);
    b += r(sx - 2.5, ly - 13, 5, 26, { rx: 2, fill: C.green });
    // liste des repères
    const items = [
      ...ln.points.map((p) => [p.kind === 'danger' ? '◆' : p.kind === 'median' ? '|' : '●', `${p.label} : ${euro(p.price)}`, p.kind === 'danger' ? C.brand : C.grey]),
      ['▮', `${ln.subject.label} : ${euro(ln.subject.price)}`, C.green],
    ];
    items.forEach(([ic, l, col], j) => {
      b += t(x + 12, ly + 36 + j * 14, ic, { size: 9, fill: col });
      b += t(x + 26, ly + 36 + j * 14, l, { size: 9.5, fill: col, weight: col === C.green || col === C.brand ? 700 : 500 });
    });
    const py = ly + 36 + items.length * 14 + 2;
    const ph = phoneLines[i];
    b += r(x + 12, py - 10, lw, ph.length * 13 + 8, { fill: C.soft });
    b += r(x + 12, py - 10, 3, ph.length * 13 + 8, { fill: C.brand });
    ph.forEach((p, j) => (b += t(x + 22, py + 2 + j * 13, p, { size: 9.5 })));
  });
  b += r(0, 790, 390, 54, { fill: '#fff', stroke: C.line });
  b += btn(x, 798, 'Télécharger en PDF', { kind: 'secondary', w: w, h: 38 });
  save('M127-point-marche-14-telephone.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844" font-family="${F}">\n<title>M127 — Le lien sur téléphone : la page des trois lignes</title>\n${b}\n</svg>\n`);
}
