// Correctifs 161 — maquette : la carte « Le bien dans Academia » sur Bien vendeur (essai de
// Jean-Guy, 19/11). `node missions/maquettes/C161-generateur.mjs --png` écrit
// C161-1-carte-academia.html et .png. Avant / après, pour une agence qui a l'accès à l'API
// (ordinateur, tablette, téléphone), les états où « Coller le lien à la main » reste, la fiche pas
// encore enregistrée, et la carte d'une agence sans accès, qui ne change pas.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FONTS = pathToFileURL(join(here, '../../src/features/branding/fonts')).href;
const ADDRESS = '4 chemin des Restanques Hautes, 06140 Vence';

const academiaCard = ({ width, intro, top = '', body }) => `
  <div class="card" style="width:${width}px">
    <b class="title">Le bien dans Academia</b>
    <p class="hint">${intro}</p>
    ${top}
    <div class="sep"></div>
    <span class="label">Lien « Vivre ici » pour les acquéreurs</span>
    ${body}
  </div>`;

const introBefore =
  'Pour vous seul. Le dossier d’adresse (ventes réelles, DPE, risques, urbanisme, cadastre, copropriété) et « Vivre ici » s’ouvrent dans Academia, dans un nouvel onglet.';
const introAfter = `<span class="changed-inline">Pour vous seul. Le dossier d’adresse d’Academia se lit sur <u>Avant le rendez-vous</u> ; le lien « Vivre ici » se crée ici, en un clic.</span>`;
const linksBefore = `
  <div class="row"><span class="btn2">Dossier d’adresse ↗</span><span class="btn2">Vivre ici ↗</span></div>
  <p class="tiny">Adresse copiée en un toucher : <span class="chip">${ADDRESS}</span></p>`;
const create = `
  <p class="hint">Academia prépare la page du quartier de <b>${ADDRESS}</b> : les écoles, les commerces, les transports. Le lien est montré à chaque acquéreur qui a ce bien dans sa sélection, et dans « Confirmer la visite ».</p>
  <span class="btn2">Créer le lien « Vivre ici »</span>`;
const fallbackClosed = `<p class="summary">▸ Coller le lien à la main</p>`;

const before = (width) =>
  academiaCard({ width, intro: introBefore, top: linksBefore, body: create + fallbackClosed });
const after = (width) =>
  academiaCard({ width, intro: introAfter, body: create });

// Les états où le repli reste (« Academia ne répond pas », plafond atteint), et les autres.
const failed503 = academiaCard({
  width: 560,
  intro: introAfter,
  body: `<p class="err">Academia ne répond pas pour l’instant. Réessayez dans un moment, ou collez le lien vous-même.</p>
    <span class="btn2">Réessayer</span>${fallbackClosed}`,
});
const quota = academiaCard({
  width: 560,
  intro: introAfter,
  body: `<p class="warn">Academia a atteint sa limite de nouveaux dossiers pour aujourd’hui : réessayez demain, à partir de 14 h 05.</p>${fallbackClosed}`,
});
const notFound = academiaCard({
  width: 560,
  intro: introAfter,
  body: `<p class="err">Academia ne trouve pas cette adresse. Corrigez le numéro, la rue, le code postal ou la ville du bien, puis recommencez.</p>
    <span class="btn2">Corriger l’adresse du bien</span>
    <p class="gone">« Ou collez le lien « Vivre ici » vous-même. » retiré</p>`,
});
const waitedLong = academiaCard({
  width: 560,
  intro: introAfter,
  body: `<p class="line">La préparation prend plus de temps que prévu.</p>
    <p class="hint">Revenez sur cette page dans quelques minutes : la demande continue chez Academia.</p>
    <span class="btn2">Vérifier maintenant</span>${fallbackClosed}`,
});
const pasted = academiaCard({
  width: 560,
  intro: introAfter,
  body: `${create}
    <div class="changed"><p class="small"><b>Lien collé à la main</b> le 02/11 : <span class="mono">https://app.myacademia.ai/l/k3Rf…</span> · <u>Retirer</u></p>
    <p class="hint">Un lien collé avant l’ouverture reste montré tant qu’il est valable ; « Créer le lien » le remplace.</p></div>`,
});

// La fiche pas encore enregistrée, et après « Enregistrer ».
const typed = (width) =>
  academiaCard({
    width,
    intro: introAfter,
    body: `<p class="hint changed">Enregistrez d’abord la fiche : le lien se crée sur l’adresse enregistrée du bien.</p>`,
  });
const typedBefore = academiaCard({
  width: 560,
  intro: introBefore,
  top: `<div class="row"><span class="link">Ajoutez l’adresse du bien</span></div>`,
  body: `<p class="hint">Il faut l’adresse du bien pour créer le lien. <u>Ajoutez l’adresse du bien</u></p>${fallbackClosed}`,
});
const changedAddress = academiaCard({
  width: 560,
  intro: introAfter,
  body: `<p class="hint changed">Enregistrez d’abord la fiche : le lien se crée sur l’adresse enregistrée du bien (vous l’avez modifiée).</p>`,
});

// L'agence sans accès : la carte d'aujourd'hui ; seule la fiche pas encore enregistrée change.
const noAccessToday = `
  <div class="card" style="width:560px">
    <b class="title">Le bien dans Academia</b>
    <p class="hint">${introBefore}</p>
    ${linksBefore}
    <div class="sep"></div>
    <span class="label">Lien « Vivre ici » à montrer aux acquéreurs (facultatif)</span>
    <span class="input">https://app.myacademia.ai/l/…</span>
    <span class="btn2">Enregistrer le lien</span>
  </div>`;
const noAccessTyped = `
  <div class="card" style="width:560px">
    <b class="title">Le bien dans Academia</b>
    <p class="hint">${introBefore}</p>
    <div class="row"><span class="link changed-inline">Enregistrez d’abord la fiche</span></div>
    <div class="sep"></div>
    <span class="label">Lien « Vivre ici » à montrer aux acquéreurs (facultatif)</span>
    <span class="input">https://app.myacademia.ai/l/…</span>
    <span class="btn2">Enregistrer le lien</span>
  </div>`;

const frame = (label, inner) => `<div class="col"><div class="ftitle">${label}</div>${inner}</div>`;
const rows = [
  [
    frame('Ordinateur · avant (aujourd’hui)', before(560)),
    frame('Ordinateur · après', after(560)),
  ],
  [frame('Tablette · avant', before(460)), frame('Tablette · après', after(460))],
  [frame('Téléphone · avant', before(360)), frame('Téléphone · après', after(360))],
  [
    frame('Après · Academia ne répond pas (503) : le repli reste', failed503),
    frame('Après · plafond atteint (429) : le repli reste', quota),
  ],
  [
    frame('Après · 2 minutes d’attente : le repli reste', waitedLong),
    frame('Après · adresse introuvable : pas de repli', notFound),
  ],
  [frame('Après · un lien déjà collé à la main avant l’ouverture', pasted)],
  [
    frame('Fiche pas enregistrée · avant (aujourd’hui)', typedBefore),
    frame('Fiche pas enregistrée · après (ordinateur)', typed(560)),
    frame('Téléphone', typed(360)),
  ],
  [
    frame('Adresse modifiée, pas encore enregistrée · après', changedAddress),
    frame('Après « Enregistrer » · la carte se met à jour seule', after(560)),
  ],
  [
    frame('Agence sans accès · inchangée', noAccessToday),
    frame('Agence sans accès · fiche pas enregistrée', noAccessTyped),
  ],
];

const notes = [
  ['En jaune', 'Ce qui change. Le reste de la carte ne bouge pas.'],
  [
    '1 · Les deux boutons partent',
    'Pour une agence qui a l’accès : « Dossier d’adresse ↗ », « Vivre ici ↗ » et « Adresse copiée en un toucher » quittent la carte ; la phrase du haut dit où se lit le dossier d’adresse (« Avant le rendez-vous », en lien). La démo a l’accès : elle suit.',
  ],
  [
    '1 · Le repli',
    '« Coller le lien à la main » n’est proposé que quand Academia ne répond pas (503, coupure, préparation en échec) ou que le plafond est atteint (429). Je propose de le proposer aussi après les 2 minutes d’attente : c’est le cas où Academia ne répond pas assez vite. Plus de repli pour une adresse introuvable, ambiguë, ou un lien expiré (« Créer un lien neuf »).',
  ],
  [
    '1 · Un lien déjà collé',
    'Start Academy peut avoir des liens collés avant l’ouverture : je propose de les montrer tels quels, avec « Retirer », tant qu’ils sont valables, sans le champ ; « Créer le lien » les remplace. Sans cela, ils seraient montrés aux acquéreurs sans que la carte le dise.',
  ],
  [
    '2 · Après « Enregistrer »',
    'La carte relit l’adresse enregistrée et se met à jour seule, sans recharger.',
  ],
  [
    '3 · Pas encore enregistrée',
    '« Enregistrez d’abord la fiche : le lien se crée sur l’adresse enregistrée du bien. », à la place de « Il faut l’adresse du bien » — aussi quand une adresse déjà enregistrée est modifiée (le lien partirait sur l’ancienne). Pour une agence sans accès, « Ajoutez l’adresse du bien » devient de même « Enregistrez d’abord la fiche ».',
  ],
  [
    'Hors de cette correction',
    '« Dossier d’adresse ↗ » et « Vivre ici ↗ » de « La vente » (fiche acquéreur) et « Ventes réelles dans Academia ↗ » (Avant le rendez-vous) ne changent pas.',
  ],
];

const css = `
@font-face{font-family:Rajdhani;font-weight:700;src:url(${FONTS}/rajdhani/rajdhani-latin-700.woff2)}
@font-face{font-family:Montserrat;font-weight:100 900;src:url(${FONTS}/montserrat/montserrat-latin.woff2)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,Arial,sans-serif;color:#18181b;background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:16px}
h1{font-size:22px}.sub{font-size:13px;color:#3f3f46}
.layout{display:flex;gap:24px;align-items:flex-start}.rows{display:flex;flex-direction:column;gap:22px}.rowx{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap}
.col{display:flex;flex-direction:column;gap:6px}.ftitle{font-size:13px;font-weight:700;color:#3f3f46}
.notes{width:420px;display:flex;flex-direction:column;gap:10px}.note{background:#fef6c7;border:1px solid #e8cf5a;border-radius:10px;padding:11px 13px;font-size:12.5px;line-height:1.5;color:#3d3200}
.card{background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:9px}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.title{font-family:Rajdhani;font-size:20px}
.label{font-size:13px;font-weight:700;color:#3f3f46}
.hint{font-size:13px;color:#52525b;line-height:1.45}.tiny{font-size:11.5px;color:#71717a}.small{font-size:13px}.line{font-size:14px}
.chip{background:#f4f4f5;border-radius:6px;padding:1px 6px;font-weight:600;color:#27272a}
.mono{font-family:monospace;font-size:12px;background:#f4f4f5;border-radius:6px;padding:1px 6px}
.err{font-size:14px;color:#b91c1c;font-weight:600}.warn{font-size:14px;color:#b45309;font-weight:600}
.btn2{align-self:flex-start;border:1px solid #d4d4d8;border-radius:12px;padding:7px 13px;font-size:13px;font-weight:600}
.link{font-size:13px;font-weight:600;color:#00527a;text-decoration:underline}
.input{border:1px solid #d4d4d8;border-radius:10px;padding:8px 10px;font-size:13px;color:#a1a1aa}
.summary{font-size:13px;color:#52525b}
.sep{border-top:1px solid #f4f4f5;margin:2px 0}
.gone{font-size:12px;color:#a16207;text-decoration:line-through}
.changed{background:#fefce8;outline:2px dashed #eab308;outline-offset:3px;border-radius:8px;padding:6px;display:flex;flex-direction:column;gap:6px}
.changed-inline{background:#fef08a;border-radius:4px;padding:0 3px}
`;

writeFileSync(
  join(here, 'C161-1-carte-academia.html'),
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${css}</style></head><body>
<h1>Correctifs 161 · 1 — La carte « Le bien dans Academia » (Bien vendeur)</h1>
<p class="sub">Avant / après pour une agence qui a l’accès à l’API, sur ordinateur, tablette et téléphone ; les états où le repli reste ; la fiche pas encore enregistrée ; l’agence sans accès. Pour le conseiller seul.</p>
<div class="layout"><div class="rows">${rows.map((r) => `<div class="rowx">${r.join('')}</div>`).join('')}</div>
<div class="notes">${notes.map(([t, b]) => `<div class="note"><b>${t} :</b> ${b}</div>`).join('')}</div></div></body></html>`,
);

if (process.argv.includes('--png')) {
  const { chromium } = await import(
    pathToFileURL(join(here, '../../node_modules/playwright/index.mjs')).href
  );
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 2100, height: 1000 } });
  await tab.goto(pathToFileURL(join(here, 'C161-1-carte-academia.html')).href);
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: join(here, 'C161-1-carte-academia.png'), fullPage: true });
  await browser.close();
}
console.log('C161-1 écrite');
