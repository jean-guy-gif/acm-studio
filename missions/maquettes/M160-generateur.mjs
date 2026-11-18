// M160 — maquette : un accès direct au dossier depuis la carte du Suivi (demande de Jean-Guy, 17/11).
// `node missions/maquettes/M160-generateur.mjs --png` écrit M160-1-carte-du-suivi.html et .png.
// Avant / après, sur ordinateur (1280), tablette (1024) et téléphone (390), d'après la carte réelle
// (`suivi-row.tsx`) : le mandat signé de M. Lefebvre (Mougins) de la démo.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FONTS = pathToFileURL(join(here, '../../src/features/branding/fonts')).href;
const NB = ' ';

// La carte du Suivi, telle qu'aujourd'hui (`after` = false) ou avec la 160 (`after` = true).
const card = ({ after, width }) => {
  const narrow = width < 600;
  const name = after
    ? `<a class="name link" href="#">M. Lefebvre</a>`
    : `<span class="name">M. Lefebvre</span>`;
  const links = [
    'Point marché',
    'Détail des prix',
    'Changer l’issue',
    ...(after ? ['<b class="open">Ouvrir le dossier →</b>'] : []),
  ];
  return `
  <div class="card ${narrow ? 'narrow' : ''}" style="width:${width}px">
    <span class="bar"></span>
    <div class="body">
      <div class="grid">
        <div class="who">
          <div class="row">${name}<span class="badge">Mandat signé · exclusif</span></div>
          <span class="muted">Villa · 6 pièces · 210${NB}m² · Mougins · signé le 18/10</span>
          ${after ? `<span class="hint-on">↑ le nom mène à la Vue d’ensemble du dossier</span>` : ''}
        </div>
        <div class="next">
          <span class="kick">Prochaine étape · aujourd’hui</span>
          <span class="sentence">Faire le Point marché du mois avec M. Lefebvre.</span>
          <span class="btn">Faire le point marché</span>
          <div class="links">${links.map((l) => `<span class="l">${l}</span>`).join('')}</div>
          ${after ? `<span class="hint-on">↑ « Ouvrir le dossier → » : la même Vue d’ensemble, au bout des liens</span>` : ''}
        </div>
        <div class="path">
          <div><small>Il voulait</small><b>1${NB}750${NB}000${NB}€</b></div><span class="arrow">→</span>
          <div><small>Après le marché</small><b>1${NB}690${NB}000${NB}€</b></div><span class="arrow">→</span>
          <div><small>Prix signé · <em>aligné</em></small><b class="green">1${NB}639${NB}500${NB}€</b></div>
        </div>
        <div class="frieze"><span class="done">Mandat signé ✓</span><span class="done">Concurrents · 3 démarchés</span><span class="now">Point marché · dû</span><span class="later">Visites acquéreurs</span></div>
      </div>
    </div>
  </div>`;
};

const frame = (label, inner) => `<div class="col"><div class="ftitle">${label}</div>${inner}</div>`;

const rows = [
  [
    frame('Ordinateur · avant (aujourd’hui)', card({ after: false, width: 1100 })),
    frame('Ordinateur · après (M160)', card({ after: true, width: 1100 })),
  ],
  [
    frame('Tablette · avant', card({ after: false, width: 880 })),
    frame('Tablette · après', card({ after: true, width: 880 })),
  ],
  [
    frame('Téléphone · avant', card({ after: false, width: 360 })),
    frame('Téléphone · après', card({ after: true, width: 360 })),
  ],
];

const notes = [
  [
    'Deux accès, le même lieu',
    'Le nom du vendeur devient un lien vers la Vue d’ensemble du dossier, et « Ouvrir le dossier → » s’ajoute en dernier dans la rangée des liens de la carte, au même rang que « Point marché », « Détail des prix » et « Changer l’issue ».',
  ],
  [
    'Aucun bouton plein de plus',
    'Un lien, pas un bouton : le seul plein de la carte reste la prochaine étape quand elle est due (M146) ; le nom garde sa taille et sa couleur, souligné au survol, son libellé accessible « Ouvrir le dossier de M. Lefebvre ».',
  ],
  [
    'Question',
    '« Ouvrir le dossier », aujourd’hui caché dans « Détail des prix », y reste-t-il (deux endroits) ou en part-il (un seul, dans la rangée) ? Je propose qu’il en parte.',
  ],
  [
    'Partout',
    'Les quatre issues (mandat signé, à relancer, vendu ailleurs, retiré), le dossier d’exemple compris ; rien ne change à « Aujourd’hui » ni à la Prospection.',
  ],
];

const css = `
@font-face{font-family:Rajdhani;font-weight:700;src:url(${FONTS}/rajdhani/rajdhani-latin-700.woff2)}
@font-face{font-family:Montserrat;font-weight:100 900;src:url(${FONTS}/montserrat/montserrat-latin.woff2)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,Arial,sans-serif;color:#18181b;background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:16px}
h1{font-size:22px}.sub{font-size:13px;color:#3f3f46;max-width:1600px}
.layout{display:flex;gap:24px;align-items:flex-start}.rows{display:flex;flex-direction:column;gap:24px}.rowx{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}
.col{display:flex;flex-direction:column;gap:6px}.ftitle{font-size:13px;font-weight:700;color:#3f3f46}
.notes{width:400px;display:flex;flex-direction:column;gap:10px}.note{background:#fef6c7;border:1px solid #e8cf5a;border-radius:10px;padding:11px 13px;font-size:12.5px;line-height:1.5;color:#3d3200}
.card{display:flex;background:#fff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.bar{width:6px;background:#00527a}.body{flex:1;min-width:0}
.grid{display:grid;grid-template-columns:minmax(0,1fr) 22rem}.narrow .grid{grid-template-columns:1fr}
.who{padding:16px 16px 8px;display:flex;flex-direction:column;gap:4px}
.row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.name{font-family:Rajdhani;font-size:24px;font-weight:700;color:#18181b}.narrow .name{font-size:20px}
.name.link{text-decoration:underline;text-decoration-color:#00527a55;text-underline-offset:4px;color:#18181b}
.badge{font-size:11px;font-weight:700;background:#ecfdf5;color:#065f46;border-radius:999px;padding:2px 9px}
.muted{font-size:13px;color:#71717a}
.next{grid-row:span 2;border-left:1px solid #f4f4f5;padding:16px;display:flex;flex-direction:column;gap:6px}.narrow .next{grid-row:auto;border-left:0;border-top:1px solid #f4f4f5}
.kick{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#00527a}
.sentence{font-size:14px}
.btn{align-self:flex-start;background:#00527a;color:#fff;border-radius:12px;padding:8px 14px;font-size:13px;font-weight:600}
.links{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:4px}.l{font-size:13px;font-weight:600;color:#00527a;text-decoration:underline;text-underline-offset:3px}
.open{background:#fef08a;padding:0 3px;border-radius:4px}
.hint-on{font-size:11px;color:#a16207;font-weight:600}
.path{padding:0 16px 8px;display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}.path small{display:block;font-size:11px;color:#71717a}.path b{font-family:Rajdhani;font-size:18px}.path em{font-style:normal;color:#047857;font-weight:700}.green{color:#047857}.arrow{color:#d4d4d8}
.frieze{padding:0 16px 16px;display:flex;flex-wrap:wrap;gap:6px}.frieze span{font-size:11px;border-radius:999px;padding:3px 9px}.done{background:#ecfdf5;color:#065f46}.now{background:#00527a;color:#fff}.later{background:#f4f4f5;color:#71717a}
`;

writeFileSync(
  join(here, 'M160-1-carte-du-suivi.html'),
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${css}</style></head><body>
<h1>M160 · 1 — La carte du Suivi : un accès direct au dossier</h1>
<p class="sub">Avant / après, sur ordinateur, tablette et téléphone. En jaune, ce qui change. Le mandat signé de M. Lefebvre (Mougins), de la démo.</p>
<div class="layout"><div class="rows">${rows.map((r) => `<div class="rowx">${r.join('')}</div>`).join('')}</div>
<div class="notes">${notes.map(([t, b]) => `<div class="note"><b>${t} :</b> ${b}</div>`).join('')}</div></div></body></html>`,
);

if (process.argv.includes('--png')) {
  const { chromium } = await import(
    pathToFileURL(join(here, '../../node_modules/playwright/index.mjs')).href
  );
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 2700, height: 1000 } });
  await tab.goto(pathToFileURL(join(here, 'M160-1-carte-du-suivi.html')).href);
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: join(here, 'M160-1-carte-du-suivi.png'), fullPage: true });
  await browser.close();
}
console.log('M160-1 écrite');
