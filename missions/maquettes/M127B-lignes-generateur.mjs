// Générateur des maquettes SVG de la mission 127 B — la page « Où en est votre prix » (les trois lignes).
// Contenu : la démo de Mougins (M. Lefebvre), rendez-vous du 08/10, point du 29/10. Aucune adresse, aucun titre.
// `node missions/maquettes/M127B-lignes-generateur.mjs` écrit M127B-lignes.svg et M127B-lignes-vide.svg.
import { writeFileSync } from 'node:fs';

const OUT = '/Users/jean-guyourmieres/Documents/acm-studio/missions/maquettes/';
const F = 'Montserrat, Inter, Arial, sans-serif';
const FT = 'Rajdhani, Montserrat, Arial, sans-serif';
const C = {
  brand: '#0d4d78',
  soft: '#e8f1f8',
  band: '#d4e4f3', // bande du marché, douce ; gris clair en noir et blanc
  ink: '#18181b',
  grey: '#71717a',
  greyLight: '#a1a1aa',
  line: '#e4e4e7',
  grid: '#eef2f6',
  dot: '#94a3b8',
  green: '#047857', // emerald-700, la couleur M116 du prix retenu (ici « aligné »)
  red: '#dc2626',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const t = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" font-family="${o.title ? FT : F}" font-size="${o.size ?? 11}"` +
  (o.weight ? ` font-weight="${o.weight}"` : '') +
  ` fill="${o.fill ?? C.ink}"` +
  (o.anchor ? ` text-anchor="${o.anchor}"` : '') +
  (o.spacing ? ` letter-spacing="${o.spacing}"` : '') +
  (o.italic ? ' font-style="italic"' : '') +
  `>${esc(s)}</text>`;
const eur = (n) => n.toLocaleString('fr-FR').replace(/ | /g, ' ') + ' €';

function wrap(s, max) {
  const out = [];
  let cur = '';
  for (const w of s.split(' ')) {
    if ((cur + ' ' + w).trim().length > max) {
      out.push(cur.trim());
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  return out;
}

// ---- géométrie commune ---------------------------------------------------------------------
const W = 794;
const H = 1123;
const ML = 56; // marge gauche ≈ 14 mm
const MR = 738;
const X0 = 220; // début de l'échelle (à droite de la colonne des titres)
const X1 = MR; // fin de l'échelle
const BAND_H = 16; // épaisseur de la bande du marché
const NUM = 14; // taille des chiffres en gros
const LAB = 9; // taille des étiquettes courtes

function page({ file, title, hasNew, pageNo, pageTotal }) {
  const vendor = 1_639_500;
  const dangerous = 1_690_000;
  const row1 = [1_475_000, 1_480_000, 1_650_000, 1_690_000, 1_699_000];
  const row2 = [1_554_000, 1_690_000, 1_699_000];
  const gone = [
    { price: 1_475_000, label: 'retiré sans vente' },
    { price: 1_480_000, label: 'vente probable' },
  ];
  const moved = { from: 1_650_000, to: 1_554_000, pct: '−5,8 %' };
  const row3 = hasNew ? [1_580_000, 1_830_000] : [];

  const pmin = 1_450_000;
  const pmax = hasNew ? 1_850_000 : 1_750_000;
  const X = (p) => X0 + ((p - pmin) * (X1 - X0)) / (pmax - pmin);
  const med = (a) => {
    const s = [...a].sort((x, y) => x - y);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  const xv = X(vendor);
  const PHRASE_MAX = 62; // caractères par ligne : la phrase s'arrête 12 px avant la barre
  const P1 = wrap('Au rendez-vous, votre prix retenu était parmi ceux des 5 concurrents : le 3e moins cher des 6 biens comparés.', PHRASE_MAX);
  const P2 = wrap('Aujourd’hui, 1 concurrent sur 3 est sous votre prix, dont 1 passé dessous depuis le rendez-vous : vous êtes le 2e moins cher des 4 biens encore en vente. 2 annonces ont disparu : 1 vente probable, 1 retirée sans vente.', PHRASE_MAX);
  const P3 = wrap('2 nouveaux venus retenus depuis le rendez-vous : 1 est sous votre prix, 1 au-dessus. Leur prix médian est 65 500 € au-dessus du vôtre.', PHRASE_MAX);
  const B1 = 300;
  const PH1 = B1 + 96; // après la flèche
  const B2 = PH1 + (P1.length - 1) * 16 + 14 + 66;
  const PH2 = B2 + 66; // après les mentions des disparus
  const B3 = PH2 + (P2.length - 1) * 16 + 14 + 66;
  const PH3 = B3 + 44;
  const AXIS = hasNew ? PH3 + (P3.length - 1) * 16 + 30 : PH2 + (P2.length - 1) * 16 + 30;
  const BAR_TOP = 214;
  const BAR_BOTTOM = AXIS + 8;
  const crossesBar = (left, right) => left < xv + 8 && right > xv - 8;
  // Une étiquette ne passe jamais sur la barre ni hors de l'échelle : on essaie les ancrages dans l'ordre
  const place = (x, width, order) => {
    for (const a of order) {
      const left = a === 'start' ? x : a === 'end' ? x - width : x - width / 2;
      const right = left + width;
      if (left >= X0 - 4 && right <= X1 + 4 && !crossesBar(left, right)) return a;
    }
    return order[0];
  };
  const NUM_W = 84; // largeur estimée d'un montant à 14 px

  const g = [];
  g.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>`);

  // En-tête de section, comme les autres pages du document
  g.push(`<rect x="${ML}" y="52" width="28" height="26" fill="none" stroke="${C.brand}" stroke-width="1"/>`);
  g.push(t(70, 71, '03', { size: 11, weight: 700, fill: C.brand, anchor: 'middle' }));
  g.push(t(96, 72, 'Où en est votre prix', { title: true, size: 22, weight: 700, fill: C.brand }));
  g.push(`<line x1="${ML}" y1="86" x2="${MR}" y2="86" stroke="${C.brand}" stroke-width="2"/>`);
  g.push(
    t(96, 106, 'Trois lignes à la même échelle : votre prix reste à la même place, la fourchette du marché se déplace.', {
      size: 10.5,
      fill: C.grey,
    }),
  );

  // Légende, une seule fois, en haut
  const L1 = 132;
  const L2 = 152;
  let lx = ML;
  const legend = (icon, label, y) => {
    g.push(icon(lx, y));
    g.push(t(lx + 22, y + 4, label, { size: 9.5, fill: C.ink }));
    lx += 22 + label.length * 5.4 + 22;
  };
  legend((x, y) => `<rect x="${x + 6}" y="${y - 8}" width="5" height="16" rx="1" fill="${C.green}"/>`, 'Votre prix retenu ensemble', L1);
  legend((x, y) => `<rect x="${x}" y="${y - 5}" width="18" height="10" rx="5" fill="${C.band}"/>`, 'Fourchette du marché, du plus bas au plus haut', L1);
  legend((x, y) => `<line x1="${x + 9}" y1="${y - 8}" x2="${x + 9}" y2="${y + 8}" stroke="${C.brand}" stroke-width="1.5"/>`, 'Prix médian', L1);
  lx = ML;
  legend((x, y) => `<path d="M${x + 9} ${y - 7} L${x + 16} ${y} L${x + 9} ${y + 7} L${x + 2} ${y} Z" fill="${C.red}"/>`, 'Le plus dangereux, selon vous', L2);
  legend((x, y) => `<circle cx="${x + 9}" cy="${y}" r="5" fill="${C.dot}"/>`, 'Un concurrent', L2);
  legend((x, y) => `<circle cx="${x + 9}" cy="${y}" r="5" fill="#fff" stroke="${C.dot}" stroke-width="1.6"/>`, 'Annonce disparue', L2);
  legend(
    (x, y) =>
      `<line x1="${x + 17}" y1="${y}" x2="${x + 3}" y2="${y}" stroke="${C.ink}" stroke-width="1.4"/>` +
      `<path d="M${x + 7} ${y - 4} L${x + 1} ${y} L${x + 7} ${y + 4}" fill="none" stroke="${C.ink}" stroke-width="1.4"/>`,
    'A bougé depuis le rendez-vous',
    L2,
  );
  g.push(`<line x1="${ML}" y1="${L2 + 16}" x2="${MR}" y2="${L2 + 16}" stroke="${C.line}" stroke-width="1"/>`);

  // Grille : repères de l'échelle à travers les trois lignes (très légers)
  const ticks = [];
  for (let p = 1_500_000; p <= pmax; p += 100_000) ticks.push(p);
  for (const p of ticks) {
    g.push(`<line x1="${X(p)}" y1="${BAR_TOP + 8}" x2="${X(p)}" y2="${AXIS}" stroke="${C.grid}" stroke-width="1"/>`);
  }

  // Une ligne : la bande, la médiane, les points, les étiquettes
  const row = ({ Bc, no, title, sub1, sub2, prices, withDangerous }) => {
    const sorted = [...prices].sort((a, b) => a - b);
    const lo = sorted[0];
    const hi = sorted[sorted.length - 1];
    const m = med(prices);
    // titres, colonne de gauche
    g.push(t(ML, Bc - 10, `${no} · ${title}`, { title: true, size: 14, weight: 700, fill: C.ink }));
    g.push(t(ML, Bc + 7, sub1, { size: 9.5, fill: C.grey }));
    if (sub2) g.push(t(ML, Bc + 21, sub2, { size: 9.5, fill: C.grey }));
    // ligne de base et bande
    g.push(`<line x1="${X0}" y1="${Bc}" x2="${X1}" y2="${Bc}" stroke="${C.line}" stroke-width="1"/>`);
    g.push(`<rect x="${X(lo)}" y="${Bc - BAND_H / 2}" width="${X(hi) - X(lo)}" height="${BAND_H}" rx="${BAND_H / 2}" fill="${C.band}"/>`);
    // médiane : trait fin, prolongé jusqu'à son étiquette (niveau 2)
    g.push(`<line x1="${X(m)}" y1="${Bc - 42}" x2="${X(m)}" y2="${Bc + 14}" stroke="${C.brand}" stroke-width="1.5"/>`);
    const am = place(X(m), NUM_W, ['middle', 'start', 'end']);
    const mx = am === 'start' ? X(m) + 6 : am === 'end' ? X(m) - 6 : X(m);
    g.push(t(mx, Bc - 66, 'MÉDIANE', { size: LAB, weight: 600, fill: C.brand, anchor: am, spacing: 1 }));
    g.push(t(mx, Bc - 52, eur(m), { size: NUM, weight: 700, fill: C.brand, anchor: am }));
    // plus bas / plus haut : niveau 1, ancrés du côté où il y a la place, jamais sur la barre
    const alo = place(X(lo), NUM_W, ['start', 'end', 'middle']);
    g.push(t(X(lo), Bc - 32, 'PLUS BAS', { size: LAB, weight: 600, fill: C.grey, anchor: alo, spacing: 1 }));
    g.push(t(X(lo), Bc - 18, eur(lo), { size: NUM, weight: 700, fill: C.ink, anchor: alo }));
    if (hi !== lo) {
      const ahi = place(X(hi), NUM_W, ['start', 'end', 'middle']);
      g.push(t(X(hi), Bc - 32, 'PLUS HAUT', { size: LAB, weight: 600, fill: C.grey, anchor: ahi, spacing: 1 }));
      g.push(t(X(hi), Bc - 18, eur(hi), { size: NUM, weight: 700, fill: C.ink, anchor: ahi }));
    }
    // les concurrents en points gris ; le plus dangereux en losange rouge
    for (const p of prices) {
      if (withDangerous && p === dangerous) continue;
      g.push(`<circle cx="${X(p)}" cy="${Bc}" r="5" fill="${C.dot}"/>`);
    }
    if (withDangerous) {
      const x = X(dangerous);
      g.push(`<path d="M${x} ${Bc - 8} L${x + 8} ${Bc} L${x} ${Bc + 8} L${x - 8} ${Bc} Z" fill="${C.red}"/>`);
      const ad = place(x, NUM_W + 12, ['start', 'end', 'middle']);
      const dx = ad === 'start' ? x + 12 : ad === 'end' ? x - 12 : x;
      g.push(t(dx, Bc + 26, 'PLUS DANGEREUX', { size: LAB, weight: 600, fill: C.red, anchor: ad, spacing: 1 }));
      g.push(t(dx, Bc + 41, eur(dangerous), { size: NUM, weight: 700, fill: C.red, anchor: ad }));
    }
  };

  // Ligne 1 — au rendez-vous
  row({ Bc: B1, no: 1, title: 'Au rendez-vous', sub1: '8 octobre', sub2: '5 concurrents', prices: row1, withDangerous: true });
  // flèche du concurrent qui a bougé, entre la ligne 1 et la ligne 2
  {
    const xa = X(moved.from);
    const xb = X(moved.to);
    const y = B1 + 58;
    g.push(`<line x1="${xa}" y1="${B1 + 9}" x2="${xa}" y2="${y}" stroke="${C.ink}" stroke-width="1.4"/>`);
    g.push(`<line x1="${xa}" y1="${y}" x2="${xb + 4}" y2="${y}" stroke="${C.ink}" stroke-width="1.4"/>`);
    g.push(`<path d="M${xb + 10} ${y - 5} L${xb + 2} ${y} L${xb + 10} ${y + 5}" fill="none" stroke="${C.ink}" stroke-width="1.4"/>`);
    g.push(
      t(X(vendor) - 12, y + 15, `A baissé : ${eur(moved.from)} → ${eur(moved.to)} · ${moved.pct}`, {
        size: 9.5,
        fill: C.ink,
        anchor: 'end',
      }),
    );
  }
  // phrase de fait, ligne 1
  P1.forEach((l, i) => g.push(t(ML, PH1 + i * 16, l, { size: 11.5, fill: C.ink, weight: 500 })));

  // Ligne 2 — aujourd'hui
  row({
    Bc: B2,
    no: 2,
    title: 'Aujourd’hui',
    sub1: '29 octobre · 3 encore en vente',
    sub2: '2 annonces disparues',
    prices: row2,
    withDangerous: true,
  });
  // les disparus : points vides à leur prix du rendez-vous, avec leur mention
  gone.forEach((d, i) => {
    g.push(`<circle cx="${X(d.price)}" cy="${B2}" r="5" fill="#fff" stroke="${C.dot}" stroke-width="1.6"/>`);
    g.push(
      t(X(gone[0].price) - 6, B2 + 26 + i * 14, `${eur(d.price)} · ${d.label}`, {
        size: 9.5,
        fill: C.grey,
        italic: true,
      }),
    );
  });
  P2.forEach((l, i) => g.push(t(ML, PH2 + i * 16, l, { size: 11.5, fill: C.ink, weight: 500 })));

  // Ligne 3 — les nouveaux venus
  if (hasNew) {
    row({
      Bc: B3,
      no: 3,
      title: 'Les nouveaux venus',
      sub1: 'vus depuis le 8 octobre',
      sub2: '2 retenus',
      prices: row3,
      withDangerous: false,
    });
    P3.forEach((l, i) => g.push(t(ML, PH3 + i * 16, l, { size: 11.5, fill: C.ink, weight: 500 })));
  }

  // Axe commun, en bas, une seule fois
  g.push(`<line x1="${X0}" y1="${AXIS}" x2="${X1}" y2="${AXIS}" stroke="${C.dot}" stroke-width="1"/>`);
  for (const p of ticks) {
    g.push(`<line x1="${X(p)}" y1="${AXIS - 4}" x2="${X(p)}" y2="${AXIS + 4}" stroke="${C.dot}" stroke-width="1"/>`);
    g.push(t(X(p), AXIS + 17, eur(p), { size: 9, fill: C.grey, anchor: 'middle' }));
  }
  g.push(t(ML, AXIS + 17, 'Même échelle sur les trois lignes', { size: 9, fill: C.greyLight }));

  // La barre verticale du prix du vendeur, pleine, qui traverse les lignes, et son étiquette une fois en haut
  g.push(`<rect x="${xv - 2.5}" y="${BAR_TOP}" width="5" height="${BAR_BOTTOM - BAR_TOP}" rx="2" fill="${C.green}"/>`);
  g.push(t(xv, 180, 'VOTRE PRIX', { size: LAB, weight: 700, fill: C.green, anchor: 'middle', spacing: 1.2 }));
  g.push(t(xv, 199, eur(vendor), { size: 17, weight: 800, fill: C.green, anchor: 'middle' }));
  g.push(t(xv, 211, 'Prix aligné sur le marché', { size: 8.5, weight: 500, fill: C.green, anchor: 'middle' }));

  // Ligne 3 vide : un cadre pointillé, rien de dessiné
  if (!hasNew) {
    const y = AXIS + 70;
    g.push(t(ML, y, '3 · Les nouveaux venus', { title: true, size: 14, weight: 700, fill: C.ink }));
    g.push(`<rect x="${X0 + 12}" y="${y - 24}" width="${X1 - X0 - 12}" height="52" rx="4" fill="none" stroke="${C.dot}" stroke-width="1" stroke-dasharray="4 3"/>`);
    g.push(t((X0 + X1) / 2, y + 6, 'Aucun nouveau venu retenu depuis le rendez-vous', { size: 11.5, fill: C.grey, anchor: 'middle' }));
  }

  // Pied de page, posé par le navigateur dans le vrai document
  g.push(t(ML, 1080, `ÉTUDE CONFIDENTIELLE · MOUGINS · 29 OCTOBRE 2026`, { size: 8.5, fill: C.greyLight, spacing: 1.2 }));
  g.push(t(MR, 1080, `${pageNo} / ${pageTotal}`, { size: 8.5, fill: C.greyLight, anchor: 'end' }));

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${F}">\n` +
    `<title>${esc(title)}</title>\n` +
    g.join('\n') +
    '\n</svg>\n';
  writeFileSync(OUT + file, svg);
  console.log('écrit', file);
}

page({ file: 'M127B-lignes.svg', title: 'M127 B — Où en est votre prix, trois lignes, deux nouveaux venus', hasNew: true, pageNo: '08', pageTotal: '09' });
page({ file: 'M127B-lignes-vide.svg', title: 'M127 B — Où en est votre prix, sans nouveau venu retenu', hasNew: false, pageNo: '07', pageTotal: '08' });
