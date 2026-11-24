// Lancement, mission 6 — maquette : le suivi de l'acquéreur au même endroit (liste de Jean-Guy,
// 23/11 : « un seul endroit par acquéreur avec les biens envoyés, refusés et pourquoi, visités avec
// leur compte rendu, pour faire le point avec lui »).
// `node missions/maquettes/L6-generateur.mjs --png` écrit L6-suivi-de-l-acquereur.html et .png.
// Avant / après, sur ordinateur et téléphone, d'après la fiche réelle (`acquereurs/[buyerId]`) :
// M. et Mme Rossi, de la démo, avec des biens inventés.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FONTS = pathToFileURL(join(here, '../../src/features/branding/fonts')).href;
const NB = ' ';
const eur = (n) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB)}${NB}€`;

// Aujourd'hui : quatre blocs séparés sur la fiche.
const before = (width) => `
<div class="stack" style="width:${width}px">
  <div class="card"><h3>Ce qu’il a répondu</h3>
    <p class="line">Appartement · 3 pièces · 65${NB}m² · Antibes <span class="pill ok">Veut le visiter</span></p>
    <p class="line">Appartement · 3 pièces · 68${NB}m² · Antibes <span class="pill">Peut-être</span></p>
    <p class="line">Appartement · 3 pièces · 71${NB}m² · Antibes <span class="pill no">Pas pour moi · Le quartier</span></p>
  </div>
  <div class="card"><h3>Ses visites à organiser</h3>
    <p class="line">Appartement · 3 pièces · 65${NB}m² · Antibes <span class="muted">demandée il y a 2 jours</span></p>
  </div>
  <div class="card"><h3>Ses visites faites</h3>
    <p class="line">Appartement · 3 pièces · 65${NB}m² · Antibes <span class="muted">Coup de cœur · Deuxième visite</span></p>
  </div>
  <div class="card"><h3>Biens proposés</h3>
    <p class="line">Appartement · 3 pièces · 65${NB}m² · Antibes <span class="muted">proposé le 14/11</span></p>
  </div>
  <p class="missing">Nulle part : les biens que vous avez écartés pour lui, et pourquoi.</p>
</div>`;

const row = ({ label, price, origin, facts, pill, tone, extra, action }) => `
  <li class="item">
    <div class="what">
      <span class="label">${label}</span>
      <span class="muted">${price ? `${eur(price)} · ` : ''}${origin}</span>
      ${facts.map((fact) => `<span class="fact">${fact}</span>`).join('')}
      ${extra ? `<span class="report">${extra}</span>` : ''}
    </div>
    <div class="side">
      <span class="pill ${tone}">${pill}</span>
      ${action ? `<span class="l">${action}</span>` : ''}
    </div>
  </li>`;

const group = (title, count, rows, folded = false) => `
  <div class="group">
    <div class="gtitle">${title} <span class="count">${count}</span>${folded ? '<span class="fold">Voir ▾</span>' : ''}</div>
    ${folded ? '' : `<ul>${rows.join('')}</ul>`}
  </div>`;

// Après : un seul bloc, un bien par ligne, rangé par ce qu'il en a dit.
const after = (width) => `
<div class="card suivi ${width < 600 ? 'narrow' : ''}" style="width:${width}px">
  <div class="head">
    <h2>Son suivi</h2>
    <span class="sum">5 biens envoyés · 1 visité · 1 visite à organiser · 1 refusé · 2 écartés pour lui</span>
  </div>
  ${group('Visités', 1, [
    row({
      label: `Appartement · 3 pièces · 65${NB}m² · Antibes`,
      price: 395000,
      origin: 'Dans l’agence',
      facts: ['Envoyé le 14/11, en présentation · « Veut le visiter »', 'Visité le 22/11'],
      extra: 'Coup de cœur · a aimé : l’extérieur, la luminosité · gêné : le bruit · suite : deuxième visite',
      pill: 'Visité · coup de cœur',
      tone: 'ok',
      action: 'Changer la suite',
    }),
  ])}
  ${group('Visites à organiser', 1, [
    row({
      label: `Appartement · 3 pièces · 65${NB}m² · Antibes`,
      price: 395000,
      origin: 'Dans l’agence',
      facts: ['Deuxième visite demandée le 22/11'],
      pill: 'À organiser',
      tone: 'now',
      action: 'Confirmer la visite',
    }),
  ])}
  ${group('Envoyés, en attente', 2, [
    row({
      label: `Appartement · 3 pièces · 68${NB}m² · Antibes`,
      price: 389000,
      origin: 'Annonce du marché',
      facts: ['Envoyé le 14/11, en présentation'],
      pill: 'Peut-être',
      tone: '',
    }),
    row({
      label: `Appartement · 3 pièces · 62${NB}m² · Juan-les-Pins`,
      price: 372000,
      origin: 'Annonce du marché',
      facts: ['Envoyé le 21/11, par le lien'],
      pill: 'Sans réponse',
      tone: 'wait',
    }),
  ])}
  ${group('Refusés', 1, [
    row({
      label: `Appartement · 3 pièces · 71${NB}m² · Antibes`,
      price: 398000,
      origin: 'Annonce du marché',
      facts: ['Envoyé le 14/11, en présentation', '« Pas pour moi » le 14/11'],
      pill: 'Refusé · le quartier',
      tone: 'no',
    }),
  ])}
  ${group('Écartés pour lui, sans lui en parler', 2, [], true)}
</div>`;

const frame = (label, inner) => `<div class="col"><div class="ftitle">${label}</div>${inner}</div>`;

const notes = [
  [
    'Un seul endroit',
    '« Son suivi » remplace quatre blocs de la fiche acquéreur : « Ce qu’il a répondu », « Ses visites à organiser », « Ses visites faites » et « Biens proposés ». Un bien = une ligne, avec tout ce qui lui est arrivé.',
  ],
  [
    'Rangé pour faire le point avec lui',
    'D’abord ce qu’il a visité (avec son compte rendu), puis les visites à organiser, ce qui attend sa réponse, ce qu’il a refusé et pourquoi. Les biens que vous avez écartés pour lui, absents de la fiche aujourd’hui, viennent en dernier, repliés.',
  ],
  [
    'Les gestes restent',
    '« Confirmer la visite », « Visite faite », « Changer la suite » restent sur la ligne du bien. Un toucher sur le bien ouvre sa fiche complète. Aucun bouton plein de plus : la prochaine étape de la fiche reste le seul.',
  ],
  [
    'Sans rien inventer',
    'Tout est lu dans ce qui existe déjà (sélections, réponses, visites, envois notés, biens écartés) : aucune saisie nouvelle. Les suggestions tirées de ses refus (« retirer ce quartier de sa recherche ? ») gardent leur bloc.',
  ],
  [
    'Mes choix par défaut',
    'Le même bloc sert sur ordinateur, tablette et téléphone (une colonne). La ligne du haut dit les nombres. Je code sans attendre ; dites non dans l’heure si l’ordre ou les mots ne vont pas.',
  ],
];

const css = `
@font-face{font-family:Rajdhani;font-weight:700;src:url(${FONTS}/rajdhani/rajdhani-latin-700.woff2)}
@font-face{font-family:Montserrat;font-weight:100 900;src:url(${FONTS}/montserrat/montserrat-latin.woff2)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,Arial,sans-serif;color:#18181b;background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:16px}
h1{font-size:22px}.sub{font-size:13px;color:#3f3f46;max-width:1500px}
.layout{display:flex;gap:24px;align-items:flex-start}.rowx{display:flex;gap:24px;align-items:flex-start}
.col{display:flex;flex-direction:column;gap:6px}.ftitle{font-size:13px;font-weight:700;color:#3f3f46}
.notes{width:380px;display:flex;flex-direction:column;gap:10px}.note{background:#fef6c7;border:1px solid #e8cf5a;border-radius:10px;padding:11px 13px;font-size:12.5px;line-height:1.5;color:#3d3200}
.stack{display:flex;flex-direction:column;gap:12px}
.card{background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:16px 18px;box-shadow:0 1px 3px rgba(0,0,0,.06);display:flex;flex-direction:column;gap:8px}
h3{font-family:Rajdhani;font-size:19px;color:#00527a}
h2{font-family:Rajdhani;font-size:24px;color:#003a57}
.line{font-size:13px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;border-top:1px solid #f4f4f5;padding-top:8px}
.muted{font-size:12.5px;color:#71717a}
.missing{font-size:12.5px;font-weight:600;color:#a16207;padding:0 4px}
.pill{font-size:11.5px;font-weight:700;border-radius:999px;padding:3px 10px;background:#f4f4f5;color:#3f3f46;white-space:nowrap}
.pill.ok{background:#ecfdf5;color:#065f46}.pill.no{background:#fff7ed;color:#9a3412}.pill.now{background:#e0f2fe;color:#075985}.pill.wait{background:#fafafa;color:#71717a;border:1px solid #e4e4e7}
.suivi{gap:14px}.head{display:flex;flex-direction:column;gap:2px}.sum{font-size:13px;color:#52525b}
.group{display:flex;flex-direction:column;gap:6px}
.gtitle{font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#00527a;display:flex;align-items:center;gap:8px}
.count{font-size:11px;background:#e0f2fe;color:#075985;border-radius:999px;padding:1px 8px;letter-spacing:0}
.fold{font-size:12px;font-weight:600;color:#00527a;text-transform:none;letter-spacing:0;text-decoration:underline;margin-left:auto}
ul{list-style:none;display:flex;flex-direction:column;gap:8px}
.item{display:flex;justify-content:space-between;gap:12px;border:1px solid #e4e4e7;border-radius:12px;padding:10px 14px}
.narrow .item{flex-direction:column}
.what{display:flex;flex-direction:column;gap:2px;min-width:0}
.label{font-size:14px;font-weight:700;color:#003a57;text-decoration:underline;text-decoration-color:#00527a44;text-underline-offset:3px}
.fact{font-size:12.5px;color:#3f3f46}
.report{font-size:12.5px;color:#18181b;background:#f8fafc;border-left:3px solid #00527a;padding:4px 8px;border-radius:4px;margin-top:2px}
.side{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0}.narrow .side{flex-direction:row;align-items:center;justify-content:space-between}
.l{font-size:12.5px;font-weight:600;color:#00527a;text-decoration:underline;text-underline-offset:3px}
`;

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${css}</style></head><body>
<h1>Lancement · 6 — La fiche acquéreur : son suivi au même endroit</h1>
<p class="sub">Avant / après, sur ordinateur (et tablette) et sur téléphone. M. et Mme Rossi, de la démo, avec des biens inventés.</p>
<div class="layout"><div class="rowx">
${frame('Avant (aujourd’hui) : quatre blocs', before(430))}
${frame('Après · ordinateur et tablette', after(760))}
${frame('Après · téléphone', after(360))}
</div>
<div class="notes">${notes.map(([t, b]) => `<div class="note"><b>${t} :</b> ${b}</div>`).join('')}</div></div></body></html>`;

writeFileSync(join(here, 'L6-suivi-de-l-acquereur.html'), html);

if (process.argv.includes('--png')) {
  const { chromium } = await import(
    pathToFileURL(join(here, '../../node_modules/playwright/index.mjs')).href
  );
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 2080, height: 900 } });
  await tab.goto(pathToFileURL(join(here, 'L6-suivi-de-l-acquereur.html')).href);
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: join(here, 'L6-suivi-de-l-acquereur.png'), fullPage: true });
  await browser.close();
}
console.log('L6 écrite');
