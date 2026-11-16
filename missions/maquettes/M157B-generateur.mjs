// M157 B — générateur des maquettes « Le lien « Vivre ici » montré au vendeur » (décision de Jean-Guy
// du 14/11, place proposée le 16/11). `node missions/maquettes/M157B-generateur.mjs --png` écrit
// M157B-1 (le Live, « Votre bien ») et M157B-2 (la synthèse et l'Étude de marché), en HTML et en PNG.
// Tout est inventé : la maison de M. et Mme Lopez à Vence (démo), son lien d'Academia.
//
// AVANT = `main` au 16/11 : rien d'Academia côté vendeur (`never-seller-side.test.ts`, M147 A).

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FONTS = pathToFileURL(join(here, '../../src/features/branding/fonts')).href;
const PHOTOS = pathToFileURL(join(here, '../../public/demo/photos/mandat-vence-maison')).href;
const LINK = 'app.myacademia.ai/l/Vb4nT8wLp2';

// Un QR code dessiné à la main (une grille fixe) : la maquette montre sa place, pas un vrai code.
const qr = (size) => {
  const n = 21;
  const cell = size / n;
  let rects = '';
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const finder =
        (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
      const ring = finder && (((x % 14 === 0 || x % 14 === 6 || y % 14 === 0 || y % 14 === 6) && true) || (x % 14 >= 2 && x % 14 <= 4 && y % 14 >= 2 && y % 14 <= 4));
      const on = finder ? ring : (x * 7 + y * 13 + x * y) % 3 === 0;
      if (on) rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}"/>`;
    }
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="#111">${rects}</svg>`;
};

const chips = [
  ['Type', 'Maison'],
  ['Surface', '135 m²'],
  ['Pièces', '5'],
  ['Chambres', '4'],
  ['Exposition', 'Sud'],
  ['État', 'Bon'],
  ['Construction', '1998'],
  ['DPE', 'C'],
  ['Extérieurs', 'Terrasse, Jardin'],
  ['Stationnement', 'Garage'],
  ['Quartier', 'Les Collines'],
  ['Ville', 'Vence'],
];

const living = (compact = false) => `
  <a class="living${compact ? ' compact' : ''}"><span><b>Vivre ici</b><small>Le quartier, les écoles, les commerces</small></span><i>↗</i></a>`;

const liveScreen = (device, withLink) => {
  const phone = device === 'phone';
  return `
  <div class="live ${device}">
    <div class="top"><b>AGENCE HORIZON CÔTE D’AZUR</b><span class="step">VOTRE BIEN</span><span class="n">2/25</span>${phone ? '' : '<span class="menu">Réglages · Clair · Plein écran · Quitter</span>'}</div>
    <h2>Votre bien</h2><p class="sub">Reconnaissez-vous votre bien dans cette présentation ?</p>
    <div class="body">
      <div class="photo" style="background-image:url('${PHOTOS}/01-facade.jpg')"></div>
      <div class="side">
        <div class="ask"><p>Est-ce que cette présentation correspond bien à votre bien ?</p><span class="yes">Oui, c’est bien mon bien</span><span class="no">Non, il y a des choses à corriger</span><u>+ Ajouter un commentaire</u></div>
        <div class="chips">${chips.slice(0, phone ? 9 : 12).map(([k, v]) => `<span><small>${k}</small>${v}</span>`).join('')}</div>
        ${phone ? '' : '<p class="strong">POINTS FORTS · Terrain de 900 m² · Quatre chambres · Pompe à chaleur · Garage</p>'}
        ${withLink ? living(phone) : ''}
      </div>
    </div>
    <div class="bar"><span>← Précédent</span><b>Valider et continuer →</b></div>
  </div>`;
};

const titled = (label, html, state = 'APRÈS') =>
  `<div class="col"><div class="ftitle"><span class="st${state === 'AVANT' ? ' before' : ''}">${state}</span>${label}</div>${html}</div>`;

const sheet1 = {
  title: 'M157 B · 1 — Le Live : « Vivre ici » sur « Votre bien »',
  sub: 'Le deuxième écran du Live, juste après l’introduction (M. et Mme Lopez, Vence, dans la démo) : le lien « Vivre ici » du mandat, créé par Academia (M157), sous les caractéristiques, en contour. Le seul bouton plein reste « Valider et continuer ». L’écran ne défile toujours pas sur tablette (M148 B).',
  rows: [
    [titled('Tablette paysage · 1024 × 768 · aujourd’hui', liveScreen('tab', false), 'AVANT')],
    [titled('Tablette paysage · 1024 × 768 · le lien du mandat', liveScreen('tab', true))],
    [titled('Téléphone · 390 × 844', liveScreen('phone', true))],
  ],
  notes: [
    ['Avant', 'Rien d’Academia devant le vendeur (M147 A, `never-seller-side.test.ts`).'],
    ['Où, au plus tôt', '« Votre bien », le deuxième écran, juste après l’introduction : le vendeur y regarde son bien, le quartier vient avec lui. Dans le Live interactif comme en présentation directe (M131), en français comme en anglais (« Living here — The neighbourhood, schools and shops »).'],
    ['Le geste', 'Un toucher du conseiller ouvre la page d’Academia dans un nouvel onglet, ouvert dans le geste (Safari, iPad), comme « Voir l’annonce » (M152 A) : la page du Live n’envoie pas son adresse (`no-referrer`) et rien n’est écrit. Revenir à l’onglet du Live le rend tel qu’il était.'],
    ['Quand il n’y est pas', 'Sans lien, un lien expiré (la date d’Academia, M157) ou un lien dont l’adresse du bien a changé depuis : rien, aucune place réservée.'],
    ['Ce qui passe', 'Seul le lien `https://app.myacademia.ai/l/<jeton>`, relu par la règle d’aujourd’hui. Jamais l’adresse du bien envoyée à Academia, l’identifiant de sa demande, ni rien d’autre d’Academia.'],
    ['Le test « jamais côté vendeur »', 'Il s’ouvre au seul lien client, dans un seul composant : tout autre mot d’Academia reste refusé dans le Live et les documents. Un test sur la charge, avec des pièges (une adresse, l’URL d’un dossier d’Academia, une valeur, un DPE) : seul le lien `/l/<jeton>` relu passe.'],
  ],
};

const synthesis = (print) => `
  <div class="doc ${print ? 'a4' : 'phone-doc'}">
    <p class="kicker">1 · VOTRE BIEN</p>
    <div class="docrow">
      <div class="docphoto" style="background-image:url('${PHOTOS}/01-facade.jpg')"></div>
      <div class="facts"><b>Maison · 5 pièces · 135 m²</b><span>Terrain 900 m² · DPE C · Terrasse, Jardin · Garage</span><span class="atouts">Ses atouts : quatre chambres, pompe à chaleur, garage.</span></div>
    </div>
    <div class="vivre${print ? '' : ' screen'}">
      ${print ? qr(86) : ''}
      <div><b>Vivre ici — le quartier, les écoles, les commerces</b>
        <span>${print ? `Scannez pour ouvrir la page d’Academia, ou tapez ${LINK}` : 'Ouvrir la page d’Academia ↗'}</span>
        <small>Lien valable jusqu’au 16 décembre 2026.</small></div>
    </div>
  </div>`;

const study = `
  <div class="doc a4">
    <p class="kicker">ÉTUDE DE MARCHÉ · VENCE</p>
    <div class="cover" style="background-image:url('${PHOTOS}/01-facade.jpg')"><span>Maison · 5 pièces · 135 m² · Vence</span></div>
    <div class="vivre">${qr(86)}<div><b>Vivre ici — le quartier, les écoles, les commerces</b><span>Scannez pour ouvrir la page d’Academia, ou tapez ${LINK}</span><small>Lien valable jusqu’au 16 décembre 2026.</small></div></div>
  </div>`;

const sheet2 = {
  title: 'M157 B · 2 — Le document final : la synthèse et l’Étude de marché',
  sub: 'La synthèse laissée au vendeur, section « Votre bien » (M113), imprimée en A4 et ouverte sur son téléphone par le lien de 30 jours ; l’Étude de marché en « Document seul » (M131), sous la photo du bien. Le lien du mandat, avec un QR code à l’impression et sa date de validité.',
  rows: [
    [
      titled('Synthèse · impression A4', synthesis(true)),
      titled('Synthèse · le lien sur téléphone', synthesis(false)),
    ],
    [titled('Étude de marché · impression A4', study)],
  ],
  notes: [
    ['Où', 'Dans la synthèse, à la fin de la section « Votre bien », après ses atouts ; dans l’Étude de marché, sous la photo du bien, avant les concurrents.'],
    ['À l’impression', 'Un QR code (tracé sans image ni service extérieur, comme celui du conseiller, M84) et l’adresse courte du lien, à taper ; « Lien valable jusqu’au 16 décembre 2026 » : un document imprimé survit au lien de 30 jours, la date le dit.'],
    ['Sur le lien du vendeur', 'Un lien qui s’ouvre dans un nouvel onglet, sans QR code. La page publique relit le lien à chaque ouverture (M113) : expiré ou retiré, le bloc disparaît.'],
    ['Après la conclusion', 'Les montants de la synthèse sont figés à la conclusion (M111) ; le lien, lui, suit le mandat : un lien neuf créé sur le bien vendeur remplace l’ancien dans le lien envoyé, jamais dans un document déjà imprimé.'],
    ['Quand il n’y est pas', 'Sans lien, expiré ou d’une ancienne adresse : rien, ni case vide ni « — ».'],
    ['Ce qui passe', 'Le seul lien client relu ; jamais l’adresse envoyée à Academia ni une donnée d’Academia (les ventes, la valeur, le DPE restent pour le lot 3 et le conseiller).'],
  ],
};

const css = `
@font-face{font-family:Rajdhani;font-weight:600;src:url(${FONTS}/rajdhani/rajdhani-latin-600.woff2)}
@font-face{font-family:Rajdhani;font-weight:700;src:url(${FONTS}/rajdhani/rajdhani-latin-700.woff2)}
@font-face{font-family:Montserrat;font-weight:100 900;src:url(${FONTS}/montserrat/montserrat-latin.woff2)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,Arial,sans-serif;color:#18181b;background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:18px;align-items:flex-start}
h1.sheet{font-size:22px;color:#27272a}.sheet-sub{font-size:13px;color:#3f3f46;max-width:1500px;line-height:1.5}
.layout{display:flex;gap:26px;align-items:flex-start}.rows{display:flex;flex-direction:column;gap:26px}.row{display:flex;gap:22px;align-items:flex-start}
.col{display:flex;flex-direction:column}.ftitle{font-size:13px;font-weight:700;color:#3f3f46;margin-bottom:6px;display:flex;gap:8px;align-items:center}
.st{font-size:11px;font-weight:800;letter-spacing:.1em;border-radius:6px;padding:2px 7px;color:#fff;background:#12875a}.st.before{background:#71717a}
.notes{width:400px;display:flex;flex-direction:column;gap:12px}
.note{background:#fef6c7;border:1px solid #e8cf5a;border-radius:10px;padding:12px 14px;font-size:13px;line-height:1.5;color:#3d3200}.note b.t{color:#5b4a00}
code{font-size:12px;background:rgba(0,0,0,.06);padding:0 3px;border-radius:3px}
.live{background:linear-gradient(160deg,#1f5f99,#0f3a66);color:#fff;display:flex;flex-direction:column;position:relative;overflow:hidden}
.live.tab{width:1024px;height:768px;padding:18px 28px 0}.live.phone{width:390px;height:844px;padding:14px 16px 0}
.top{display:flex;gap:14px;align-items:center;font-size:11px;letter-spacing:.06em;border-bottom:1px solid rgba(255,255,255,.2);padding-bottom:10px}.top .step{color:#7cc4ff;font-weight:700}.top .n{opacity:.7}.top .menu{margin-left:auto;opacity:.85;letter-spacing:0}
.live h2{font-family:Rajdhani;font-size:34px;font-weight:700;margin-top:14px}.phone h2{font-size:28px}.sub{font-size:14px;opacity:.85}
.body{display:flex;gap:18px;margin-top:12px;flex:1;min-height:0}.phone .body{flex-direction:column;gap:10px}
.photo{flex:1.05;border-radius:12px;background:center/cover}.phone .photo{flex:none;height:200px}
.side{flex:1;display:flex;flex-direction:column;gap:9px}
.ask{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:7px;font-size:12px}
.ask .yes{background:#fff;color:#0f3a66;border-radius:8px;padding:8px;text-align:center;font-weight:700;font-family:Rajdhani;font-size:15px}
.ask .no{border:1.5px solid rgba(255,255,255,.6);border-radius:8px;padding:7px;text-align:center;font-family:Rajdhani;font-size:15px}.ask u{font-size:11px;opacity:.85}
.chips{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.chips span{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:4px 8px;font-size:12px;font-weight:700;display:flex;flex-direction:column}.chips small{font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;opacity:.7;font-weight:600}
.strong{font-size:10.5px;opacity:.85}
.living{display:flex;justify-content:space-between;align-items:center;border:1.5px solid rgba(255,255,255,.7);border-radius:12px;padding:9px 12px}.living span{display:flex;flex-direction:column}.living b{font-family:Rajdhani;font-size:17px}.living small{font-size:11.5px;opacity:.85}.living i{font-style:normal;font-size:20px}
.living.compact{padding:7px 10px}
.bar{margin:12px -28px 0;border-top:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.18);height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;font-size:14px}.phone .bar{margin:10px -16px 0;padding:0 16px}
.bar b{background:#fff;color:#0f3a66;border-radius:10px;padding:10px 16px;font-family:Rajdhani;font-size:15px}
.doc{background:#fff;border:1px solid #a1a1aa;padding:28px 32px;display:flex;flex-direction:column;gap:14px}.doc.a4{width:640px}.doc.phone-doc{width:390px;padding:18px}
.kicker{font-family:Rajdhani;font-weight:700;color:#00527a;letter-spacing:.12em;font-size:15px}
.docrow{display:flex;gap:14px}.phone-doc .docrow{flex-direction:column}.docphoto{width:240px;height:160px;border-radius:8px;background:center/cover;flex:none}.phone-doc .docphoto{width:100%}
.facts{display:flex;flex-direction:column;gap:6px;font-size:13px;color:#3f3f46}.facts b{font-family:Rajdhani;font-size:19px;color:#18181b}.atouts{color:#12875a}
.vivre{display:flex;gap:14px;align-items:center;border:1.5px solid #00527a;border-radius:10px;padding:12px 14px}.vivre div{display:flex;flex-direction:column;gap:3px;font-size:12.5px;color:#3f3f46}.vivre b{font-family:Rajdhani;font-size:17px;color:#00527a}.vivre small{font-size:11.5px;color:#71717a}
.vivre.screen span{color:#00527a;font-weight:700;text-decoration:underline}
.cover{height:200px;border-radius:8px;background:center/cover;display:flex;align-items:flex-end;padding:12px}.cover span{background:rgba(255,255,255,.92);border-radius:6px;padding:4px 8px;font-size:13px;font-weight:700}
`;

const sheetHtml = ({ title, sub, rows, notes }) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>
<h1 class="sheet">${title}</h1><p class="sheet-sub">${sub}</p>
<div class="layout"><div class="rows">${rows.map((r) => `<div class="row">${r.join('')}</div>`).join('')}</div>
<div class="notes">${notes.map(([t, b]) => `<div class="note"><b class="t">${t} :</b> ${b.replace(/`([^`]+)`/g, '<code>$1</code>')}</div>`).join('')}</div></div></body></html>`;

const SHEETS = {
  'M157B-1-le-live-votre-bien.html': sheet1,
  'M157B-2-le-document-final.html': sheet2,
};

for (const [name, def] of Object.entries(SHEETS)) writeFileSync(join(here, name), sheetHtml(def));

if (process.argv.includes('--png')) {
  const { chromium } = await import(
    pathToFileURL(join(here, '../../node_modules/playwright/index.mjs')).href
  );
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
  for (const name of Object.keys(SHEETS)) {
    await tab.goto(pathToFileURL(join(here, name)).href);
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: join(here, name.replace('.html', '.png')), fullPage: true });
  }
  await browser.close();
}
console.log(`${Object.keys(SHEETS).length} planches écrites`);
