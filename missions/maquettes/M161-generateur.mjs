// M161 — maquette : les états nouveaux de l'API réelle d'Academia (annonce de Laurent, 18/11).
// `node missions/maquettes/M161-generateur.mjs --png` écrit M161-1-etats-academia.html et .png.
// Seulement les états nouveaux à l'écran : l'attente du dossier, le bloc vide (« aucun » et
// « non vérifié »), l'adresse introuvable, le plafond atteint. Ordinateur, tablette, téléphone pour
// la carte de Bien vendeur ; le dossier d'adresse sur ordinateur.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FONTS = pathToFileURL(join(here, '../../src/features/branding/fonts')).href;

const academiaCard = ({ width, body, changed }) => `
  <div class="card" style="width:${width}px">
    <div class="row"><b class="title">Le bien dans Academia</b><span class="pill">Pour vous seul</span></div>
    <p class="muted">4 chemin des Restanques Hautes, 06140 Vence</p>
    <div class="${changed ? 'changed' : ''}">${body}</div>
  </div>`;

const waiting = `
  <p class="line"><span class="dots">●●●</span> Academia prépare le dossier de cette adresse : 20 à 60 secondes.</p>
  <p class="hint">La page vérifie toute seule, toutes les 10 secondes, deux minutes au plus.</p>`;
const waitingLong = `
  <p class="line">La préparation prend plus de temps que prévu.</p>
  <p class="hint">Revenez sur cette page dans quelques minutes : la demande continue chez Academia.</p>
  <span class="btn2">Vérifier maintenant</span>`;
const notFound = `
  <p class="err">Academia ne trouve pas cette adresse. Corrigez le numéro, la rue, le code postal ou la ville du bien, puis recommencez.</p>
  <span class="btn2">Corriger l’adresse du bien</span>
  <p class="hint">Ou collez le lien « Vivre ici » vous-même.</p>`;
const minute = `
  <p class="warn">Academia reçoit beaucoup de demandes en ce moment : réessayez dans 1 minute.</p>
  <span class="btn2">Réessayer</span>`;
const day = `
  <p class="warn">Academia a atteint sa limite de nouveaux dossiers pour aujourd’hui : réessayez demain, à partir de 14 h 05.</p>
  <p class="hint">Les dossiers déjà prêts restent lisibles. Ou collez le lien « Vivre ici » vous-même.</p>`;

const block = (title, text, note, empty) => `
  <div class="blk ${empty ? 'changed' : ''}"><b>${title}</b><p>${text}</p>${note ? `<p class="hint">${note}</p>` : ''}</div>`;
const addressView = `
  <div class="card" style="width:1180px">
    <div class="row"><b class="title">Dossier d’adresse</b><span class="pill">Pour vous seul</span></div>
    <div class="blocks">
      ${block('Permis autour', 'Aucun permis de construire relevé à moins de 300 m depuis 2022.', 'Sitadel (SDES) · données du 07/10/2026', true)}
      ${block('Permis de démolir', 'Non vérifiés pour cette adresse.', 'Pas montré au vendeur.', true)}
      ${block('Copropriété', 'Aucune copropriété enregistrée à cette adresse.', 'Registre national des copropriétés (Anah) · données du 07/10/2026', true)}
      ${block('Risques', 'Argiles (à l’adresse du bien) : exposition moyenne · Séisme (la commune) : zone 4, moyenne', 'Géorisques · données du 07/10/2026', false)}
    </div>
    <div class="choice changed">
      <b class="title2">Ce que verra le vendeur : le quartier</b>
      <label><span class="box on"></span>Permis autour <small>— Aucun permis de construire relevé à moins de 300 m depuis 2022.</small></label>
      <label class="off"><span class="box"></span>Copropriété <small>— rien à montrer : aucune copropriété à cette adresse</small></label>
      <p class="hint">Un bloc non vérifié par la source n’est jamais proposé au vendeur.</p>
    </div>
  </div>`;
const addressWaiting = `
  <div class="card changed" style="width:1180px">
    <div class="row"><b class="title">Dossier d’adresse</b><span class="pill">Pour vous seul</span></div>
    <p class="line"><span class="dots">●●●</span> Academia prépare le dossier d’adresse : 20 à 60 secondes. Il s’affiche ici dès qu’il est prêt, sans recharger.</p>
    <p class="hint">Le reste de la page est déjà là ; votre décision de prix ne l’attend pas.</p>
  </div>`;

const frame = (label, inner) => `<div class="col"><div class="ftitle">${label}</div>${inner}</div>`;
const rows = [
  [
    frame('Bien vendeur · l’attente (ordinateur)', academiaCard({ width: 560, body: waiting, changed: true })),
    frame('Après 2 minutes', academiaCard({ width: 560, body: waitingLong, changed: true })),
    frame('Téléphone · l’attente', academiaCard({ width: 360, body: waiting, changed: true })),
  ],
  [
    frame('Bien vendeur · adresse introuvable (422)', academiaCard({ width: 560, body: notFound, changed: true })),
    frame('Tablette · adresse introuvable', academiaCard({ width: 460, body: notFound, changed: true })),
    frame('Téléphone · adresse introuvable', academiaCard({ width: 360, body: notFound, changed: true })),
  ],
  [
    frame('Plafond · trop d’appels (429, 120 par minute)', academiaCard({ width: 560, body: minute, changed: true })),
    frame('Plafond · 200 dossiers neufs par 24 h (429, Retry-After)', academiaCard({ width: 560, body: day, changed: true })),
  ],
  [frame('Avant le rendez-vous · l’attente du dossier d’adresse', addressWaiting)],
  [frame('Avant le rendez-vous · blocs vides (« aucun ») et non vérifiés', addressView)],
];

const notes = [
  ['En jaune', 'Ce qui est nouveau. Le reste de la carte et du dossier d’adresse ne change pas.'],
  ['L’attente', '20 à 60 secondes annoncées ; la page vérifie toute seule toutes les 10 s (Laurent : 5 s au plus souvent), 2 minutes au plus ; au-delà, « Vérifier maintenant ». Sur « Avant le rendez-vous », le dossier d’adresse vérifie lui aussi, sans retenir la page (M158).'],
  ['Bloc vide', '« aucun » : la source a été lue et n’a rien trouvé, dit avec son échelle (« Aucun permis… à moins de 300 m »), proposé au vendeur quand c’est une information (urbanisme, permis, ventes), pas quand il n’y a rien à montrer (copropriété, population). « non vérifié » : dit au conseiller, jamais proposé ni montré au vendeur.'],
  ['Adresse introuvable', '422 sans proposition : le conseiller corrige l’adresse du bien (le bouton mène au champ). 422 avec propositions : le choix d’aujourd’hui (M157) ne change pas.'],
  ['Plafond', 'Le délai vient de Retry-After : « dans 1 minute », ou « demain, à partir de 14 h 05 » au-delà d’une heure. 503 : le message d’aujourd’hui, « Academia ne répond pas pour l’instant ».'],
];

const css = `
@font-face{font-family:Rajdhani;font-weight:700;src:url(${FONTS}/rajdhani/rajdhani-latin-700.woff2)}
@font-face{font-family:Montserrat;font-weight:100 900;src:url(${FONTS}/montserrat/montserrat-latin.woff2)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,Arial,sans-serif;color:#18181b;background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:16px}
h1{font-size:22px}.sub{font-size:13px;color:#3f3f46}
.layout{display:flex;gap:24px;align-items:flex-start}.rows{display:flex;flex-direction:column;gap:22px}.rowx{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap}
.col{display:flex;flex-direction:column;gap:6px}.ftitle{font-size:13px;font-weight:700;color:#3f3f46}
.notes{width:400px;display:flex;flex-direction:column;gap:10px}.note{background:#fef6c7;border:1px solid #e8cf5a;border-radius:10px;padding:11px 13px;font-size:12.5px;line-height:1.5;color:#3d3200}
.card{background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.title{font-family:Rajdhani;font-size:20px}.title2{font-family:Rajdhani;font-size:17px}
.pill{font-size:11px;font-weight:700;background:#e0f2fe;color:#00527a;border-radius:999px;padding:2px 9px}
.muted{font-size:13px;color:#71717a}.hint{font-size:12.5px;color:#71717a}.line{font-size:14px}
.err{font-size:14px;color:#b91c1c;font-weight:600}.warn{font-size:14px;color:#b45309;font-weight:600}
.btn2{align-self:flex-start;border:1px solid #d4d4d8;border-radius:12px;padding:7px 13px;font-size:13px;font-weight:600}
.dots{color:#00527a;letter-spacing:2px;margin-right:6px}
.changed{background:#fefce8;outline:2px dashed #eab308;outline-offset:4px;border-radius:10px;padding:6px;display:flex;flex-direction:column;gap:8px}
.blocks{display:grid;grid-template-columns:1fr 1fr;gap:10px}.blk{border:1px solid #e4e4e7;border-radius:12px;padding:12px;font-size:13px;display:flex;flex-direction:column;gap:4px}.blk b{font-family:Rajdhani;font-size:16px}
.choice{margin-top:6px}.choice label{display:flex;gap:10px;align-items:center;font-size:14px;font-weight:600}.choice label small{font-weight:400;color:#71717a}.choice .off{opacity:.5}
.box{width:16px;height:16px;border:2px solid #a1a1aa;border-radius:4px;display:inline-block}.box.on{background:#00527a;border-color:#00527a}
`;

writeFileSync(
  join(here, 'M161-1-etats-academia.html'),
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${css}</style></head><body>
<h1>M161 · 1 — L’API réelle d’Academia : les états nouveaux à l’écran</h1>
<p class="sub">L’attente du dossier, l’adresse introuvable, le plafond atteint (carte « Le bien dans Academia », Bien vendeur) ; l’attente et les blocs vides (« Avant le rendez-vous »). Pour le conseiller seul.</p>
<div class="layout"><div class="rows">${rows.map((r) => `<div class="rowx">${r.join('')}</div>`).join('')}</div>
<div class="notes">${notes.map(([t, b]) => `<div class="note"><b>${t} :</b> ${b}</div>`).join('')}</div></div></body></html>`,
);

if (process.argv.includes('--png')) {
  const { chromium } = await import(
    pathToFileURL(join(here, '../../node_modules/playwright/index.mjs')).href
  );
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 2200, height: 1000 } });
  await tab.goto(pathToFileURL(join(here, 'M161-1-etats-academia.html')).href);
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: join(here, 'M161-1-etats-academia.png'), fullPage: true });
  await browser.close();
}
console.log('M161-1 écrite');
