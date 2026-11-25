// Mission 147 — générateur des maquettes « Vivre ici et démo crédible », version 2 (réponses de
// Jean-Guy, 09/11 : choix B, le lien client « Vivre ici » collé sur le mandat ; « Ventes réelles
// dans Academia » sous l'analyse ; la démo ouvre la présentation d'Academia ; I8 en partie B).
// `node missions/maquettes/M147-generateur.mjs` écrit les HTML M147-1 à M147-6 à côté de lui ;
// `--png` les rend aussi en PNG (Chromium du dépôt) et écrit les deux logos SVG proposés.
//
// Chaque planche : l'écran touché, AVANT (le code de `main` au 09/11, ad4fdb6) et APRÈS, sur
// ordinateur (1280), tablette (1024) et téléphone (390) ; la zone qui change, pas la page entière.
// Données : la démo (Vence, Mougins, Antibes, les acquéreurs semés). Pastilles jaunes = notes.

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
  amberSoft: '#fef3c7',
  amber: '#b45309',
  green: '#12875a',
  greenSoft: '#e6f4ec',
  red: '#b91c1c',
  sun: '#e8a33d',
  note: '#fef6c7',
  noteLine: '#e8cf5a',
  noteInk: '#5b4a00',
};

// ---- Les deux logos proposés (SVG, sans police : le nom est tracé en texte système dans la
// maquette, en chemins dans les fichiers livrés par la mission). ----
const logoMark = (sea, sun) =>
  `<g><path d="M18 34a14 14 0 0 1 28 0z" fill="${sun}"/><path d="M8 36h48" stroke="${sea}" stroke-width="3.2" stroke-linecap="round"/><path d="M12 43c4-2.6 8-2.6 12 0s8 2.6 12 0 8-2.6 12 0" fill="none" stroke="${sea}" stroke-width="2.6" stroke-linecap="round"/><path d="M18 50c3-2 6-2 9 0s6 2 9 0 6-2 9 0" fill="none" stroke="${sea}" stroke-width="2.2" stroke-linecap="round" opacity=".75"/></g>`;
const logoSvg = ({ ink, sun, sub, width = 236, height = 64 }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 236 64" width="${width}" height="${height}" role="img" aria-label="Agence Horizon Côte d’Azur">${logoMark(ink, sun)}<text x="66" y="33" font-family="Montserrat,Arial,sans-serif" font-size="22" font-weight="800" letter-spacing="2" fill="${ink}">HORIZON</text><text x="67" y="50" font-family="Montserrat,Arial,sans-serif" font-size="10.5" font-weight="600" letter-spacing="3.2" fill="${sub}">CÔTE D’AZUR</text></svg>`;
const LOGO_LIGHT = logoSvg({ ink: C.brandDeep, sun: C.sun, sub: C.brand });
const LOGO_DARK = logoSvg({ ink: '#ffffff', sun: C.sun, sub: '#9fd3f2' });

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
.st.av{background:#71717a}.st.ap{background:${C.green}}.st.alt{background:#7c5cbf}
.frame{background:#f7f8fa;position:relative;overflow:hidden;border:1px solid #a1a1aa}
.desk{width:1280px}.tab{width:1024px}.phone{width:390px}
.zone{padding:22px 32px;display:flex;flex-direction:column;gap:14px}
.tab .zone{padding:20px 22px}.phone .zone{padding:14px 12px;gap:12px}
.kicker{font-size:11.5px;font-weight:800;letter-spacing:.14em;color:${C.soft};text-transform:uppercase}
.title{font-family:Rajdhani,Montserrat,Arial,sans-serif;font-size:34px;font-weight:800;color:${C.brandDeep};line-height:1.05}
.phone .title{font-size:27px}
.btn{display:inline-flex;align-items:center;gap:6px;border-radius:10px;padding:9px 15px;font-size:13.5px;font-weight:700;white-space:nowrap;border:1.5px solid #d4d4d8;color:${C.ink};background:#fff}
.btn.full{background:${C.brand};border-color:${C.brand};color:#fff}
.btn.sm{padding:6px 11px;font-size:12.5px;border-radius:8px;border-width:1px}
.lnk{font-size:12.5px;font-weight:700;color:${C.brand};white-space:nowrap}
.card{background:#fff;border:1px solid ${C.line};border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:9px;position:relative}
.phone .card{padding:12px}
.h2{font-size:17px;font-weight:800;color:${C.brandDeep}}
.hint{font-size:12.5px;color:${C.muted};line-height:1.5}
.small{font-size:11.5px;color:${C.soft}}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.field{display:flex;flex-direction:column;gap:3px;font-size:11.5px;color:${C.muted};font-weight:600}
.field span{background:#fff;border:1px solid #d4d4d8;border-radius:8px;padding:7px 10px;font-size:13px;color:${C.ink};font-weight:500}
.field span.empty{color:#a1a1aa}
.formline{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.tab .formline{grid-template-columns:repeat(2,1fr)}.phone .formline{grid-template-columns:1fr}
.blocks{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.tab .blocks{grid-template-columns:repeat(2,1fr)}.phone .blocks{grid-template-columns:1fr}
.blk{border:1px solid ${C.line};border-radius:10px;padding:9px 11px;font-size:12px;color:${C.muted};line-height:1.45}
.blk b{display:block;color:${C.ink};font-size:12.5px;margin-bottom:2px}
.addr{font-size:13px;font-weight:700;color:${C.ink};background:#f4f4f5;border-radius:8px;padding:6px 10px;display:inline-block}
.toast{display:inline-flex;gap:8px;align-items:center;font-size:12.5px;font-weight:700;color:#0b6b46;background:${C.greenSoft};border-radius:999px;padding:4px 12px}
.warn{font-size:12.5px;font-weight:700;color:${C.amber};background:${C.amberSoft};border-radius:10px;padding:8px 12px}
.badge{display:inline-block;font-size:11px;font-weight:800;border-radius:999px;padding:2px 9px;background:#f4f4f5;color:#3f3f46;vertical-align:middle}
.badge.green{background:${C.greenSoft};color:#0b6b46}
.photo{width:120px;height:82px;border-radius:10px;flex:none;background:linear-gradient(135deg,#c8d3c4,#9fb39a)}
.phone .photo{width:96px;height:68px}
.gone{position:relative;opacity:.55}
.gone::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 10px,rgb(185 28 28 / .10) 10px 12px);border-radius:inherit;pointer-events:none}
.strike{text-decoration:line-through;text-decoration-color:${C.red}}
.notes{width:440px;display:flex;flex-direction:column;gap:12px;flex:none}
.note{background:${C.note};border:1px solid ${C.noteLine};border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.5;color:#3a3000}
.note b{color:${C.noteInk}}
.note ol,.note ul{padding-left:18px;display:flex;flex-direction:column;gap:5px}
.note code{font-size:11.5px;background:#fff8d6;padding:0 3px;border-radius:3px}
.pin{display:inline-flex;width:18px;height:18px;border-radius:50%;background:${C.noteLine};color:${C.noteInk};font-size:10.5px;font-weight:800;align-items:center;justify-content:center;vertical-align:middle;margin:0 3px;flex:none;font-style:normal}
.mobile{background:#fff;display:flex;flex-direction:column;gap:12px;padding:16px 14px}
.desk .mobile,.tab .mobile{max-width:560px;margin:0 auto;border-left:1px solid ${C.line};border-right:1px solid ${C.line}}
.lh{border:1px solid ${C.line};border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:5px;font-size:12px;color:${C.muted}}
.lh b{color:${C.ink}}
.lh .t{font-size:13.5px;font-weight:800;color:${C.brandDeep}}
.academia{border:1px solid #bcd9ee;background:${C.brandSoft};border-radius:12px;padding:10px 12px;display:flex;justify-content:space-between;gap:10px;align-items:center}
.academia b{font-size:13.5px;color:${C.brandDeep}}
.msg{background:#f4f4f5;border-radius:12px;padding:10px 12px;font-size:12.5px;line-height:1.55;color:${C.ink};white-space:pre-line}
.bar{height:8px;border-radius:999px;background:#e4e4e7;overflow:hidden}
.bar i{display:block;height:100%;background:${C.brand};border-radius:999px}
.steps{display:flex;flex-direction:column;gap:5px;font-size:12.5px}
.steps div{display:flex;gap:8px;align-items:center;color:${C.muted}}
.steps .ok{color:#0b6b46;font-weight:700}
.steps .now{color:${C.brandDeep};font-weight:800}
.ok-box{background:${C.greenSoft};border:1px solid #b9e0c9;border-radius:12px;padding:10px 14px;font-size:13.5px;color:#0b6b46;font-weight:700}
.err-box{background:#fde8e8;border:1px solid #f5c2c2;border-radius:12px;padding:10px 14px;font-size:13px;color:${C.red};font-weight:600;line-height:1.5}
.dl{display:flex;flex-direction:column;gap:6px}
.dl div{display:flex;justify-content:space-between;align-items:center;border:1px solid ${C.line};border-radius:10px;padding:8px 12px;font-size:12.5px;background:#fff}
.stage{background:radial-gradient(120% 90% at 20% 0%,#0a4f78 0%,#062b44 55%,#041d2f 100%);color:#fff;display:flex;flex-direction:column;height:430px}
.phone .stage{height:560px}
.stage .top{display:flex;justify-content:space-between;align-items:center;padding:14px 22px;gap:10px;font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.stage .top small{font-weight:600;letter-spacing:0;text-transform:none;color:rgb(255 255 255 / .6);margin-left:8px}
.stage .tools{display:flex;gap:6px}
.stage .tools span{font-size:11.5px;font-weight:700;border:1px solid rgb(255 255 255 / .25);border-radius:8px;padding:4px 8px;text-transform:none;letter-spacing:0}
.intro{flex:1;margin:4px 22px 20px;border-radius:18px;background:linear-gradient(135deg,#0d6a9c,#033453);padding:28px 34px;display:flex;flex-direction:column;justify-content:space-between}
.phone .intro{margin:4px 10px 12px;padding:20px 16px}
.intro .big{font-size:26px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.intro .k{font-size:11px;font-weight:700;letter-spacing:.2em;color:#7cc4ee;text-transform:uppercase}
.intro h2{font-size:28px;line-height:1.15;font-weight:600;max-width:600px}
.phone .intro h2{font-size:21px}
.intro .go{display:inline-flex;background:#fff;color:${C.brandDeep};font-weight:800;border-radius:12px;padding:11px 18px;font-size:14px;align-self:flex-start}
.side{display:flex;gap:0}
.sidebar{width:220px;background:#fff;border-right:1px solid ${C.line};padding:14px;display:flex;flex-direction:column;gap:10px;font-size:13px}
.sidebar .ag{font-weight:800;color:${C.brandDeep};font-size:14px}
.sidebar div.m{color:${C.muted};font-weight:600;padding:5px 8px;border-radius:8px}
.sidebar div.m.on{background:${C.brandSoft};color:${C.brandDeep}}
.topbar{display:flex;justify-content:space-between;align-items:center;background:#fff;border-bottom:1px solid ${C.line};padding:10px 12px;font-size:13px;font-weight:800;color:${C.brandDeep}}
`;

const page = (title, body) =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${body}</body></html>`;
const p = (n) => `<i class="pin">${n}</i>`;
const DEVICES = [
  { key: 'desk', label: 'Ordinateur · 1280' },
  { key: 'tab', label: 'Tablette · 1024' },
  { key: 'phone', label: 'Téléphone · 390' },
];
const STATE_LABEL = { avant: ['av', 'AVANT'], apres: ['ap', 'APRÈS'], 'apres-b': ['ap', 'APRÈS'] };

function sheet({ title, sub, render, notes, states = ['avant', 'apres'], labels = {} }) {
  const rows = DEVICES.map((dev) => {
    const frame = (state) => {
      const [cls, word] = STATE_LABEL[state];
      const extra = labels[state] ? ` · ${labels[state]}` : '';
      return `<div><div class="frame-title"><span class="st ${cls}">${word}</span>${dev.label}${extra}</div><div class="frame ${dev.key}">${render(dev.key, state)}</div></div>`;
    };
    return `<div class="pair">${states.map(frame).join('')}</div>`;
  }).join('');
  return page(
    title,
    `<h1 class="sheet">${title}</h1><p class="sheet-sub">${sub}</p><div class="layout"><div class="devices">${rows}</div><div class="notes">${notes}</div></div>`,
  );
}

// ================================================================================================
// 1 · Bien vendeur : le dossier d'adresse d'ACM → deux liens vers Academia
// ================================================================================================
const VENCE_ADDRESS = '4 chemin des Restanques Hautes, 06140 Vence';

function academiaLinks(dev, variant) {
  // variant : 'ready' (adresse connue), 'copied' (juste touché), 'missing' (sans adresse)
  if (variant === 'missing') {
    return `<div class="warn">Ajoutez l’adresse du bien ${p(3)} <span class="lnk" style="margin-left:6px">Aller au champ Adresse →</span></div>`;
  }
  const links = `<div class="row"><span class="btn sm">Dossier d’adresse ↗</span><span class="btn sm">Vivre ici ↗</span>${variant === 'copied' ? `<span class="toast">✓ Adresse copiée : collez-la dans Academia ${p(2)}</span>` : ''}</div>`;
  return `${links}<div class="small">Adresse copiée en un toucher : <span class="addr">${VENCE_ADDRESS}</span></div>`;
}

function renderProperty(dev, state) {
  const head = `<div><div class="kicker">Dossier · Mme Garcia</div><div class="title">Bien vendeur</div></div>`;
  const variant = dev === 'desk' ? 'ready' : dev === 'tab' ? 'copied' : 'missing';
  const addressValue =
    state === 'apres' && variant === 'missing'
      ? '<span class="empty">Numéro et rue</span>'
      : '<span>4 chemin des Restanques Hautes</span>';
  const form = `<div class="card"><div class="h2">L’essentiel</div><div class="formline"><div class="field">Type de bien<span>Maison</span></div><div class="field">Surface<span>140 m²</span></div><div class="field">Adresse${addressValue}</div><div class="field">Commune, code postal<span>Vence 06140</span></div><div class="field">Pièces<span>5</span></div><div class="field">Classe DPE<span>C</span></div></div><div class="small">… compléments, photos, barre « Enregistrer » inchangés</div></div>`;
  if (state === 'avant') {
    const blocks = [
      ['Ventes réelles autour', 'Médiane 4 896 €/m² · 12 ventes de maisons à 500 m · DVF'],
      ['Le DPE à cette adresse', 'Rien trouvé à cette adresse. · ADEME'],
      ['Risques', 'Sismicité : zone 4 · feux de forêt · Géorisques'],
      ['Urbanisme', 'Zone du PLU : UFb4 · servitudes · Géoportail'],
      ['Parcelle cadastrale', 'Parcelle à vérifier au cadastre.'],
      ['Copropriété', 'Aucune copropriété immatriculée à cette adresse.'],
    ]
      .slice(0, dev === 'phone' ? 3 : 6)
      .map(([t, d]) => `<div class="blk"><b>${t}</b>${d}</div>`)
      .join('');
    const dossier = `<div class="card">${p(1)}<div class="row" style="justify-content:space-between"><div><div class="h2">Dossier d’adresse</div><div class="hint">Ce que les données publiques disent de l’adresse : pour vous seul, rien n’en est montré au vendeur. Construit le 07/11.</div></div><span class="btn sm">Actualiser</span></div><div class="blocks">${blocks}</div><div class="hint">Votre analyse de valeur : 5 444 €/m², au-dessus de la médiane.</div></div>`;
    return `<div class="zone">${head}${form}${dossier}</div>`;
  }
  const field = `<div style="border-top:1px solid ${C.line};padding-top:9px;display:flex;flex-direction:column;gap:6px"><div class="field">Lien « Vivre ici » à montrer aux acquéreurs (facultatif) ${p(4)}<span class="empty">Collez le lien donné par Academia</span></div><div class="row"><span class="btn sm">Enregistrer le lien</span></div></div>`;
  const card = `<div class="card"><div class="h2">Le bien dans Academia</div><div class="hint">Pour vous seul. Le dossier d’adresse (ventes réelles, DPE, risques, urbanisme, cadastre, copropriété) et « Vivre ici » s’ouvrent dans Academia, dans un nouvel onglet.</div>${academiaLinks(dev, variant)}${field}</div>`;
  return `<div class="zone">${head}${form}${card}</div>`;
}

const notesProperty = `<div class="note"><b>Avant</b> (<code>address-dossier-block.tsx</code>, M141) : sous la fiche, le dossier d’adresse construit par ACM ${p(1)} — six blocs lus aux sources publiques, gardés et datés, « Actualiser », et l’analyse de valeur située face aux ventes réelles.</div>
<div class="note"><b>Après</b> — même place, une carte « Le bien dans Academia », pour le conseiller seul, deux liens en contour (le seul plein de l’écran reste « Enregistrer », M146 A). Trois états, un par appareil, valables sur les trois :
<ol>
<li><b>Ordinateur</b> : adresse connue. L’adresse qui sera copiée est écrite sous les liens.</li>
<li>${p(2)} <b>Tablette</b> : juste touché. Academia s’ouvre dans un nouvel onglet ; ici, « Adresse copiée : collez-la dans Academia » quelques secondes. Copie refusée : « Copiez l’adresse : … », sélectionnable.</li>
<li>${p(3)} <b>Téléphone</b> : rue ou commune manquante. Pas de lien : « Ajoutez l’adresse du bien », qui mène au champ.</li>
<li>${p(4)} Sous les liens, le lien client « Vivre ici » à coller une fois : ses états sur la planche 6 bis.</li>
</ol></div>
<div class="note"><b>Démo</b> (décision du 09/11) : les deux liens ouvrent la page de présentation d’Academia ; ni adresse écrite, ni « Adresse copiée ». La ligne dit « S’ouvre sur la présentation d’Academia. »</div>
<div class="note"><b>Le réglage</b> : l’adresse d’Academia (<code>NEXT_PUBLIC_ACADEMIA_URL</code>) et une constante pour le lien direct <code>/app/ouvrir?adresse=…&amp;vers=dossier|vivre-ici</code> : basculée, plus de copie ni de message.</div>
<div class="note">La Vue d’ensemble ne change pas.</div>`;

// ================================================================================================
// 2 · Avant le rendez-vous : la ligne des ventes réelles part
// ================================================================================================
function renderBefore(dev, state) {
  const head = `<div><div class="kicker">Dossier · Mme Garcia</div><div class="title">Avant le rendez-vous</div></div>`;
  const line =
    state === 'avant'
      ? `<div class="hint" style="background:#f4f4f5;border-radius:8px;padding:7px 10px">${p(1)} Ventes réelles à 500 m : médiane 4 896 €/m² (12 ventes) · votre analyse de valeur : 5 444 €/m², au-dessus de la médiane.</div>`
      : `<div class="row"><span class="lnk" style="font-weight:600">Ventes réelles dans Academia ↗</span>${p(2)}${dev === 'tab' ? '<span class="toast">✓ Adresse copiée : collez-la dans Academia</span>' : ''}</div>`;
  const form = `<div class="card"><div class="h2">Votre décision de prix</div><div class="formline"><div class="field">Prix des concurrents (calculé, modifiable)<span>761 000 €</span></div><div class="field">Votre analyse de valeur<span>735 000 €</span>${dev === 'phone' ? '' : ''}</div><div class="field">Justification<span>Maison au calme, vue dégagée…</span></div></div>${line}<div class="small">Affiché au vendeur · « Enregistrer la décision » inchangé</div></div>`;
  return `<div class="zone">${head}${form}</div>`;
}
const notesBefore = `<div class="note"><b>Avant</b> (M141) : ${p(1)} sous le champ, dès la frappe, l’analyse située face aux ventes réelles du dossier d’adresse d’ACM.</div>
<div class="note"><b>Après</b> (décision du 09/11) : ${p(2)} à la place, un lien discret, « Ventes réelles dans Academia ↗ » : le conseiller retrouve la médiane en un clic au moment où il décide de son prix. Même geste que sur Bien vendeur : copie de l’adresse, nouvel onglet, « Adresse copiée » (tablette). Sans adresse : « Ajoutez l’adresse du bien », vers l’onglet Bien vendeur. Démo : la présentation d’Academia.</div>
<div class="note">Rien d’autre ne change sur la décision. Un lien, jamais un prix pour le bien.</div>`;

// ================================================================================================
// 3 · Fiche acquéreur, « La vente » : les deux liens
// ================================================================================================
const MOUGINS_ADDRESS = '7 traverse des Exemples, 06250 Mougins';
function renderSale(dev, state) {
  const head = `<div><div class="kicker">Acquéreur</div><div class="title">Famille Keller</div></div>`;
  const links =
    state === 'avant'
      ? `<div class="row" style="gap:18px"><span class="lnk">Bon de visite signé</span><span class="lnk">Offre d’achat signée</span></div>`
      : `<div class="row" style="gap:18px"><span class="lnk">Bon de visite signé</span><span class="lnk">Offre d’achat signée</span><span class="lnk">Dossier d’adresse ↗ ${p(1)}</span><span class="lnk">Vivre ici ↗</span></div>${dev === 'tab' ? `<span class="toast">✓ Adresse copiée : collez-la dans Academia</span>` : ''}<div class="small">Adresse du bien : ${MOUGINS_ADDRESS}</div>`;
  const body = `<div class="card"><div class="h2">La vente</div><div class="row" style="align-items:flex-start;flex-wrap:${dev === 'phone' ? 'wrap' : 'nowrap'}"><div class="photo"></div><div style="flex:1;min-width:0"><div style="font-weight:800;font-size:14.5px">Maison · 7 pièces · 260 m² · Mougins</div><div class="hint">Vendeur : M. Lefebvre (mandat exclusif) · prix affiché 1 639 500 €</div></div><div style="text-align:right"><div style="font-size:21px;font-weight:800">1 600 000 €</div><div class="small">offre acceptée</div></div></div>${links}</div>`;
  return `<div class="zone">${head}${body}</div>`;
}
const notesSale = `<div class="note"><b>Avant</b> (M143) : « La vente » dit le bien de l’offre, son vendeur et le montant, avec le bon de visite et l’offre signés.</div>
<div class="note"><b>Après</b> : ${p(1)} les deux liens Academia à la suite, en liens (aucun plein ici), sur l’adresse du mandat de l’offre — toujours un mandat signé de l’agence, donc une adresse saisie. Même geste que sur Bien vendeur : copie, nouvel onglet, « Adresse copiée » (tablette). Sans adresse sur la fiche du mandat : « Ajoutez l’adresse du bien », qui mène à son onglet Bien vendeur.</div>
<div class="note">Montants et libellé : ceux de la démo, à titre indicatif.</div>`;

// ================================================================================================
// 4 · Ce que voyait l'acquéreur : son lien et le message de confirmation
// ================================================================================================
function renderBuyerLink(dev, state) {
  const bien = `<div class="row" style="flex-wrap:nowrap"><div class="photo"></div><div><div style="font-weight:800;font-size:14px">A · Maison · 7 pièces · 260 m² · Mougins</div><div class="small">Prix affiché 1 639 500 € · dans l’agence</div></div></div>`;
  const living = `<div class="lh">${p(1)}<div class="t">Vivre ici</div><div>Distances depuis le bien.</div><div><b>★ Des commerces à pied</b> · en partie</div><div>Boulangerie 9 min à pied · Supermarché 6 min en voiture · Pharmacie 11 min à pied</div><div>École élémentaire 12 min à pied · Collège 8 min en voiture</div><div>Arrêt de bus 4 min · Gare TGV de Cannes 14 min en voiture · Aéroport Nice Côte d’Azur 25 min</div><div>Risques connus sur la commune : inondation, feux de forêt, séisme</div></div>`;
  const academia = `<div class="academia">${p(2)}<div><b>Vivre ici ↗</b><div class="small">Le quartier, les écoles, les commerces</div></div><span style="font-size:18px">↗</span></div>`;
  const tail =
    state === 'avant'
      ? '<span style="background:#fde8e8">Pour la préparer, voici ce qui l’entoure — commerces, écoles, transports : https://…/dossier/…</span>'
      : state === 'apres'
        ? 'Votre sélection : https://…/dossier/…'
        : 'Votre sélection : https://…/dossier/…\nVivre ici, autour du bien : https://app.myacademia.ai/l/…';
  const msg = `<div class="small" style="font-weight:700">Message « Confirmer la visite » ${p(3)}</div><div class="msg">Bonjour Famille Keller,\nJe vous confirme la visite de la maison à Mougins le 12 novembre à 10 h 30.\n${tail}\nÀ bientôt,\nJean</div>`;
  const content =
    state === 'avant'
      ? `${bien}${living}${msg}`
      : state === 'apres'
        ? `${bien}<div class="small">(rien sous le bien)</div>${msg}`
        : `${bien}${academia}${msg}`;
  return `<div class="mobile"><div class="small" style="font-weight:800;letter-spacing:.1em">VOTRE SÉLECTION · 1 / 3</div>${content}</div>`;
}
const notesBuyerLink = `<div class="note"><b>Avant</b> (M142) : sur son lien, sous chaque bien qu’il va visiter (et après sa réponse), ${p(1)} la fiche « Vivre ici » d’ACM, dans sa langue ; ${p(3)} le message de confirmation y menait (« voici ce qui l’entoure… »).</div>
<div class="note"><b>Après, sans lien collé</b> : rien sous le bien ; le message dit « Votre sélection : [lien] ».</div>
<div class="note"><b>Après, avec le lien collé sur le mandat</b> (choix B, 09/11) : ${p(2)} sous le bien, « Vivre ici ↗ — Le quartier, les écoles, les commerces », qui ouvre Academia dans un nouvel onglet ; le message ajoute « Vivre ici, autour du bien : [lien Academia] ». En anglais pour un acquéreur anglophone : « Living here ↗ — The neighbourhood, schools and shops », « Living here, around the property: … » (textes du client, M140).</div>
<div class="note">Seulement un bien de l’agence (un mandat) : un concurrent ou une annonce du marché n’a jamais ce lien (les Wilson sur ant-01 : rien). Ni la présentation plein cadre, ni le PDF ne le montrent.</div>
<div class="note">Exemple : la famille Keller et le mandat de Mougins, une visite à confirmer (forme seulement : dans la démo, aucun lien Academia n’est semé).</div>
<div class="note">Côté conseiller, « Vivre ici » quitte Visites : la visite garde « Confirmer la visite », « Visite faite », le bon et la suite (M146 B).</div>`;

// ================================================================================================
// 5 · Ma démo : la remise à zéro en étapes, « prête » seulement sur preuve
// ================================================================================================
function renderDemo(dev, state) {
  const head = `<div><div class="kicker">Démo</div><div class="title">Ma démo</div></div>`;
  const list = ['M. et Mme Martin · À préparer', 'Mme Garcia · Prêt pour le Live', 'Mr and Mrs Bernard · Prêt, présentation directe', 'M. Lefebvre · Conclu, mandat signé', 'M. et Mme Lopez · Conclu, mandat signé', 'M. et Mme Lambert-Duval · À relancer']
    .map((d) => `<div><span>${d}</span><span class="lnk">Ouvrir →</span></div>`)
    .join('');
  if (state === 'avant') {
    return `<div class="zone">${head}<div class="card"><div class="h2">Ma démo</div><div class="hint">Six dossiers aux étapes de l’outil… et neuf acquéreurs à rapprocher.</div><div class="dl">${list}</div><div class="row"><span class="btn" style="opacity:.5">Remise à zéro…</span>${p(1)}<span class="small">~20 s sans rien dire, puis la page… ou « Première connexion », ou 12 dossiers</span></div></div></div>`;
  }
  if (dev === 'desk') {
    return `<div class="zone">${head}<div class="card"><div class="h2">Remise à zéro de votre démo ${p(2)}</div><div class="bar"><i style="width:58%"></i></div><div class="steps"><div class="ok">✓ Vos anciens dossiers et acquéreurs supprimés</div><div class="ok">✓ Dossiers 1 à 3 créés</div><div class="now">● Dossier 4 sur 6 : M. Lefebvre, mandat signé…</div><div>○ Acquéreurs</div><div>○ Vérification</div></div><div class="small">Environ 20 secondes. Gardez cette page ouverte.</div></div></div>`;
  }
  if (dev === 'tab') {
    return `<div class="zone">${head}<div class="ok-box">✓ Votre démo est prête : six dossiers et neuf acquéreurs, datés d’aujourd’hui. ${p(3)}</div><div class="card"><div class="dl">${list}</div><div class="row"><span class="btn">Remettre ma démo à zéro</span></div></div></div>`;
  }
  return `<div class="zone">${head}<div class="err-box">La remise à zéro n’a pas abouti : 5 dossiers sur 6 (il manque « Prêt, présentation directe »). Rien n’est prêt. ${p(4)}<div style="margin-top:8px"><span class="btn sm full">Recommencer</span></div></div><div class="card"><div class="hint" style="color:${C.red}">Vos dossiers de démo n’ont pas pu être lus : rechargez la page. ${p(5)}</div><div class="small">(autre état : lecture en échec — ni « Préparer », ni « Remettre à zéro »)</div></div></div>`;
}
const notesDemo = `<div class="note"><b>Avant</b> ${p(1)} : un seul bouton « Remise à zéro… » pendant ~20 s, sans message de fin (C7). Trois ratés en trois jours : 12 dossiers, un dossier manquant, « Première connexion ». Cause trouvée dans le code : des lectures en échec lues comme des absences (inventaire §4).</div>
<div class="note"><b>Après</b> — trois états, un par appareil, valables sur les trois :
<ol>
<li>${p(2)} <b>Ordinateur</b> : la remise à zéro en étapes courtes, la barre et l’étape en cours (« Dossier 4 sur 6 »). Le seul plein de l’écran pendant ce temps : aucun.</li>
<li>${p(3)} <b>Tablette</b> : « Votre démo est prête » seulement quand la base relit six dossiers, un par étape attendue, et les neuf acquéreurs.</li>
<li>${p(4)} <b>Téléphone</b> : autre chose (5, 12, une étape en double, une étape en échec) : le message le dit, « Recommencer » est le seul plein, jamais « prête ».</li>
<li>${p(5)} Les dossiers illisibles : la page le dit et ne propose ni « Préparer » (qui en recréait six) ni « Remettre à zéro ».</li>
</ol></div>
<div class="note">Hors de « Ma démo » : un profil illisible ne mène plus à « Première connexion » mais à la page d’erreur, relu une fois d’abord (question 7).</div>`;

// ================================================================================================
// 6 · Le logo de l'agence de démo
// ================================================================================================
function renderLogo(dev, state) {
  const withLogo = state === 'apres';
  const stage = `<div class="stage"><div class="top"><span>${withLogo ? 'Agence Horizon Côte d’Azur' : ''}<small>Rendez-vous vendeur</small></span><span class="tools"><span>Clair</span><span>Plein écran</span><span>Quitter</span></span></div><div class="intro">${withLogo ? `<div>${LOGO_DARK}</div>` : `<div class="big">Agence Horizon Côte d’Azur</div>`}<div><div class="k">Rendez-vous du 10 novembre</div><h2>Ensemble, regardons votre bien face au marché.</h2><div style="margin-top:8px;color:rgb(255 255 255 / .8)">Mme Garcia · Maison · Vence</div></div><span class="go">Démarrer la présentation →</span></div></div>`;
  if (dev === 'phone') {
    const bar = `<div class="topbar">${withLogo ? logoSvg({ ink: C.brandDeep, sun: C.sun, sub: C.brand, width: 150, height: 41 }) : 'AGENCE HORIZON C…'}<span>☰</span></div>`;
    return `<div class="small" style="padding:6px 10px;background:#fff">Barre du haut de l’application</div>${bar}<div class="small" style="padding:6px 10px;background:#fff;border-top:6px solid #d4d4d8">Accueil du Live</div>${stage}`;
  }
  return stage;
}
const notesLogo = `<div class="note"><b>Avant</b> : l’agence de démo n’a pas de logo ; l’accueil du Live met le nom en grand dans la carte (M146 A), le téléphone le tronque (C5).</div>
<div class="note"><b>Après</b> : un logo dessiné pour la démo — un soleil posé sur l’horizon, trois lignes de mer, « HORIZON / CÔTE D’AZUR » — en version claire (barre de gauche, documents, courriers) et sombre (Live). L’accueil du Live prend la forme « avec logo » de la M146 A.</div>
<div class="note"><b>Les fichiers</b> : <code>M147-logo-clair.svg</code> et <code>M147-logo-sombre.svg</code>, à côté de cette planche ; la mission les trace en chemins (sans police) et les range dans <code>public/demo/</code>. Déposés par « Préparer » et « Remettre à zéro » seulement si l’agence n’a pas de logo : celui d’un manager n’est jamais remplacé.</div>
<div class="note">Aucune ressemblance voulue avec une enseigne réelle ; rien n’y dit « démo » (Jean-Guy, 23/10).</div>
<div class="note" style="background:#fff;border-color:#d4d4d8"><b>Les deux versions</b><div style="margin-top:8px;padding:10px;background:#fff;border:1px solid #e4e4e7;border-radius:8px">${LOGO_LIGHT}</div><div style="margin-top:8px;padding:10px;background:#062b44;border-radius:8px">${LOGO_DARK}</div></div>`;

// ================================================================================================
// 6 bis · Option B : le lien client « Vivre ici » collé sur le mandat
// ================================================================================================
function renderOptionB(dev, state) {
  const head = `<div><div class="kicker">Dossier · M. et Mme Lopez · mandat signé</div><div class="title">Bien vendeur</div></div>`;
  const base = `<div class="row"><span class="btn sm">Dossier d’adresse ↗</span><span class="btn sm">Vivre ici ↗</span></div><div class="small">Adresse copiée en un toucher : <span class="addr">…, 06140 Vence</span></div>`;
  let field = '';
  if (state !== 'avant') {
    if (dev === 'desk') {
      field = `<div class="field">Lien « Vivre ici » montré aux acquéreurs ${p(1)}<span>https://app.myacademia.ai/l/7Hq2…</span></div><div class="row"><span class="toast">✓ Lien enregistré</span><span class="lnk">Retirer</span><span class="small">Montré sur le lien de chaque acquéreur qui visite ce bien, et dans « Confirmer la visite ».</span></div>`;
    } else if (dev === 'tab') {
      field = `<div class="field">Lien « Vivre ici » à montrer aux acquéreurs (facultatif) ${p(2)}<span style="border-color:${C.red}">https://www.seloger.com/annonces/…</span></div><div style="font-size:12.5px;color:${C.red};font-weight:600">Collez le lien « Vivre ici » donné par Academia : il commence par https://app.myacademia.ai/l/</div><div class="row"><span class="btn sm">Enregistrer le lien</span></div>`;
    } else {
      field = `<div class="field">Lien « Vivre ici » à montrer aux acquéreurs (facultatif) ${p(3)}<span class="empty">Collez le lien donné par Academia</span></div><div class="small">Montré aux acquéreurs une fois le mandat signé.</div><div class="row"><span class="btn sm">Enregistrer le lien</span></div>`;
    }
    field = `<div style="border-top:1px solid ${C.line};padding-top:9px;display:flex;flex-direction:column;gap:6px">${field}</div>`;
  }
  return `<div class="zone">${head}<div class="card"><div class="h2">Le bien dans Academia</div><div class="hint">Pour vous seul.</div>${base}${field}</div></div>`;
}
const notesOptionB = `<div class="note"><b>Avant</b> : le bloc du dossier d’adresse (planche 1). <b>Après</b> : sous les deux liens, le lien client « Vivre ici » qu’Academia donne au conseiller, collé une fois. Trois états, un par appareil :
<ol>
<li>${p(1)} <b>Ordinateur</b> : enregistré, montré tronqué, « Retirer » à côté ; ce qu’il fera, dit en une ligne.</li>
<li>${p(2)} <b>Tablette</b> : refusé — tout ce qui n’est pas <code>https://app.myacademia.ai/l/…</code> (un autre site, <code>http</code>, une autre page d’Academia). Le même refus au serveur et en base.</li>
<li>${p(3)} <b>Téléphone</b> : vide ; sur un dossier pas encore signé, la ligne dit qu’il servira une fois le mandat signé.</li>
</ol></div>
<div class="note">Une colonne, <code>projects.academia_living_here_url</code> : la seule migration de la mission, montrée à Jean-Guy avant d’être appliquée.</div>
<div class="note">Démo : aucun lien semé (ce serait une fausse source) ; un closer peut en coller un vrai.</div>`;

// ================================================================================================
// 7 · I8 : une démo qui fait vrai
// ================================================================================================
const STREETS = [
  ['allée des Trois Cadrans', 'allée des Cistes Blancs'],
  ['impasse de l’Essai', 'impasse des Arbousiers'],
  ['rue de la Maquette', 'rue du Vieux Pressoir'],
  ['avenue du Prototype', 'avenue des Caroubiers'],
  ['traverse des Exemples', 'traverse des Lentisques'],
  ['montée de la Répétition', 'montée des Oliviers Bas'],
  ['boulevard du Scénario', 'boulevard des Agaves'],
  ['chemin des Figurants', 'chemin de la Source Haute'],
  ['allée du Décor', 'allée des Bigaradiers'],
  ['rue du Brouillon', 'rue des Jarres'],
  ['place de la Fiction', 'placette du Lavoir Neuf'],
  ['sentier de l’Exercice', 'sentier des Genêts d’Or'],
  ['avenue de l’Entraînement', 'avenue des Tilleuls Hauts'],
];
function renderI8(dev, state) {
  const before = state === 'avant';
  const photo = (kind) =>
    kind === 'grey'
      ? `<div class="photo" style="background:#e4e4e7"></div>`
      : kind === 'us'
        ? `<div class="photo" style="background:linear-gradient(180deg,#9cc3e6 0 45%,#b8865c 45% 75%,#6aa84f 75%);display:flex;align-items:flex-end;padding:4px;font-size:9.5px;color:#fff;font-weight:700">bardage · pelouse</div>`
        : `<div class="photo" style="background:linear-gradient(180deg,#7fb6e0 0 40%,#e9c9a0 40% 72%,#6f8f4e 72%);display:flex;align-items:flex-end;padding:4px;font-size:9.5px;color:#fff;font-weight:700">villa · tuiles · oliviers</div>`;
  const comp = (ph, label, street, agency) =>
    `<div class="card"><div class="row" style="flex-wrap:nowrap;align-items:flex-start">${ph}<div style="min-width:0"><div style="font-weight:800;font-size:13.5px">${label}</div><div class="hint">${street}</div><div class="small">${agency}</div></div></div></div>`;
  const comps = before
    ? comp(photo('us'), 'Maison · 5 pièces · 130 m² · Vence', '30 allée du Décor ' + p(1), 'Azur Horizon Immobilier · exclusivité ' + p(4)) +
      comp(photo('grey'), 'Maison · 5 pièces · 128 m² · Saint-Paul-de-Vence', '42 chemin des Figurants', 'Agence Littoral &amp; Pins ' + p(3))
    : comp(photo('ok'), 'Maison · 5 pièces · 130 m² · Vence', '30 allée des Bigaradiers ' + p(1), 'Calanques &amp; Restanques Immobilier · exclusivité ' + p(4)) +
      comp(photo('ok'), 'Maison · 5 pièces · 128 m² · Saint-Paul-de-Vence', '42 chemin de la Source Haute', 'Agence Littoral &amp; Pins ' + p(3));
  const phone = `<div class="card"><div class="small" style="font-weight:700">Lien de l’acquéreur · votre conseiller ${p(2)}</div><div style="font-weight:800">Jean</div><div class="lnk">${before ? '06 00 00 00 01' : '06 39 98 00 01'}</div></div>`;
  return `<div class="zone"><div><div class="kicker">Prospection · démo</div><div class="title">Concurrents à prospecter</div></div>${comps}${phone}</div>`;
}
const notesI8 = `<div class="note"><b>I8, partie B</b> (décision du 09/11) — ce qui change, c’est la donnée de la démo, pas la disposition des écrans.</div>
<div class="note"><b>Photos</b> : des maisons, villas et appartements de la Côte d’Azur (tuiles, crépi, oliviers, pins, vue mer), libres de droits, sources et licences dans <code>docs/DEMO.md</code>, mêmes noms de fichiers. Les dessins ci-contre ne sont que des repères : les vraies photos seront montrées avant d’être livrées.</div>
<div class="note">${p(1)} <b>Rues</b> : les treize rues-jeux de mots → des noms crédibles mais inventés, chacun vérifié absent de sa commune dans la Base Adresse Nationale (vérification consignée) ; « chemin des Restanques Hautes » reste. Propositions :<ul>${STREETS.map(([a, b]) => `<li><span class="strike">${a}</span> → ${b}</li>`).join('')}</ul></div>
<div class="note">${p(2)} <b>Téléphones</b> : 06 39 98 … partout ; le « 06 00 00 00 01 » posé par l’e2e sur le compte de démo devient « 06 39 98 00 01 » ; le vrai numéro d’un closer n’est jamais touché.</div>
<div class="note">${p(3)} <b>Concurrents avec photo</b> : mesurer d’abord pourquoi certains s’affichent gris, puis chaque concurrent semé a au moins une photo qui se charge (e2e : Concurrents, Prospection, lien de l’acquéreur).</div>
<div class="note">${p(4)} <b>Question</b> : l’agence concurrente « Azur Horizon Immobilier » est trop proche de la nôtre, « Agence Horizon Côte d’Azur » : la renommer, par exemple « Calanques &amp; Restanques Immobilier » (après vérification qu’aucune enseigne réelle ne le porte) ?</div>`;

const SHEETS = {
  'M147-1-bien-vendeur.html': {
    title: 'M147 · 1 — Bien vendeur : le dossier d’adresse d’ACM devient deux liens vers Academia',
    sub: 'Démo : Mme Garcia, Vence. Trois états, un par appareil : adresse connue (ordinateur), juste touché (tablette), sans adresse (téléphone).',
    render: renderProperty,
    notes: notesProperty,
  },
  'M147-2-avant-le-rendez-vous.html': {
    title: 'M147 · 2 — Avant le rendez-vous : « Ventes réelles dans Academia ↗ » à la place de la ligne',
    sub: 'Démo : Mme Garcia, analyse de valeur 735 000 € pour 135 m².',
    render: renderBefore,
    notes: notesBefore,
  },
  'M147-3-la-vente.html': {
    title: 'M147 · 3 — Fiche acquéreur, « La vente » : Dossier d’adresse et Vivre ici',
    sub: 'Démo : la famille Keller, offre acceptée sur le mandat de Mougins (M. Lefebvre).',
    render: renderSale,
    notes: notesSale,
  },
  'M147-4-le-lien-de-l-acquereur.html': {
    title: 'M147 · 4 — Le lien de l’acquéreur et « Confirmer la visite » : le lien Vivre ici d’Academia',
    sub: 'La famille Keller et le mandat de Mougins (forme seulement). Le lien du dossier, pensé pour le téléphone, ouvert sur trois écrans.',
    render: renderBuyerLink,
    notes: notesBuyerLink,
    states: ['avant', 'apres', 'apres-b'],
    labels: { apres: 'sans lien collé', 'apres-b': 'avec le lien collé sur le mandat' },
  },
  'M147-5-ma-demo.html': {
    title: 'M147 · 5 — Ma démo : la remise à zéro en étapes, « prête » seulement sur preuve',
    sub: 'Trois états, un par appareil : pendant (ordinateur), prête (tablette), pas aboutie (téléphone).',
    render: renderDemo,
    notes: notesDemo,
  },
  'M147-6-le-logo.html': {
    title: 'M147 · 6 — Un logo pour l’agence de démo',
    sub: 'L’accueil du Live (et, sur téléphone, la barre du haut) de Mme Garcia, sans puis avec le logo.',
    render: renderLogo,
    notes: notesLogo,
  },
  'M147-7-une-demo-qui-fait-vrai.html': {
    title: 'M147 · 7 — Partie B, I8 : une démo qui fait vrai (photos, rues, téléphones, concurrents avec photo)',
    sub: 'Démo : deux concurrents de Mme Garcia (Vence) vus dans Prospection, et le conseiller sur le lien de l’acquéreur.',
    render: renderI8,
    notes: notesI8,
  },
  'M147-6bis-lien-vivre-ici.html': {
    title: 'M147 · 6 bis — Le lien client « Vivre ici » d’Academia, collé une fois sur le mandat',
    sub: 'Le mandat de M. et Mme Lopez, Vence (forme seulement). Enregistré (ordinateur), refusé (tablette), vide (téléphone).',
    render: renderOptionB,
    notes: notesOptionB,
  },
};

const files = {};
for (const [name, def] of Object.entries(SHEETS)) files[name] = sheet(def);
for (const [name, html] of Object.entries(files)) writeFileSync(join(here, name), html);

if (process.argv.includes('--png')) {
  writeFileSync(join(here, 'M147-logo-clair.svg'), LOGO_LIGHT);
  writeFileSync(join(here, 'M147-logo-sombre.svg'), LOGO_DARK);
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
