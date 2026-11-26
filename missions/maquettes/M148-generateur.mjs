// Mission 148 — « Le Live d'un coup d'œil » : générateur des maquettes (08/11/2026).
// `node missions/maquettes/M148-generateur.mjs` écrit les HTML M148-1 à M148-7 à côté de lui ;
// `--png` les rend aussi en PNG (Chromium du dépôt) ET vérifie que chaque écran APRÈS tient dans
// son cadre sans défiler (un écran qui déborde est signalé dans la console et en rouge sur la
// planche).
//
// AVANT : les captures réelles de la mesure du 08/11 (`M148-avant/`, essai c967018, démo de
// Vence, Live interactif de Mme Garcia et présentation directe des Bernard), réduites de moitié ;
// la ligne rouge marque le haut de la barre du bas : tout ce qui est dessous demande de défiler.
// APRÈS : chaque écran à sa taille réelle (1024 × 768, 1180 × 820, 820 × 1180, téléphone
// 390 × 844), données de la démo. Les pastilles jaunes renvoient aux notes.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FONTS = '../../src/features/branding/fonts';
const PH = (n) => `../../public/demo/photos/maison-0${n}.jpg`;

const css = `
@font-face{font-family:Rajdhani;font-weight:600;src:url(${FONTS}/rajdhani/rajdhani-latin-600.woff2)}
@font-face{font-family:Rajdhani;font-weight:700;src:url(${FONTS}/rajdhani/rajdhani-latin-700.woff2)}
@font-face{font-family:Montserrat;font-weight:100 900;src:url(${FONTS}/montserrat/montserrat-latin.woff2)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,Arial,sans-serif;color:#18181b;background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:20px;align-items:flex-start}
h1.sheet{font-size:22px;color:#27272a}
.sub{font-size:13px;color:#3f3f46;max-width:1700px;line-height:1.5}
.layout{display:flex;gap:28px;align-items:flex-start}
.col{display:flex;flex-direction:column;gap:22px}
.rowf{display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap}
.ft{font-size:13px;font-weight:800;color:#3f3f46;margin-bottom:6px;display:flex;gap:8px;align-items:center}
.st{font-size:11px;font-weight:800;letter-spacing:.1em;border-radius:6px;padding:2px 7px;color:#fff}
.st.av{background:#71717a}.st.ap{background:#12875a}
.notes{width:430px;display:flex;flex-direction:column;gap:12px;flex:none}
.note{background:#fef6c7;border:1px solid #e8cf5a;border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.5;color:#3a3000}
.note b{color:#5b4a00}.note ol,.note ul{padding-left:18px;display:flex;flex-direction:column;gap:4px}
.note code{font-size:11.5px;background:#fff8d6;padding:0 3px;border-radius:3px}
.pin{display:inline-flex;width:18px;height:18px;border-radius:50%;background:#e8cf5a;color:#5b4a00;font-size:10.5px;font-weight:800;align-items:center;justify-content:center;flex:none;font-style:normal;font-family:Montserrat}
.avant{position:relative;width:512px;border:1px solid #a1a1aa;background:#1c4a72}
.avant img{display:block;width:512px}
.fold{position:absolute;left:0;right:0;border-top:3px solid #ef4444}
.fold span{position:absolute;right:4px;top:-22px;background:#ef4444;color:#fff;font-size:11px;font-weight:800;padding:1px 6px;border-radius:4px}
.over{position:absolute;left:4px;bottom:6px;background:#ef4444;color:#fff;font-size:12px;font-weight:800;padding:3px 8px;border-radius:5px}
/* La scène du Live */
.scene{position:relative;overflow:hidden;color:#fff;background:linear-gradient(135deg,#2a6596 0%,#1f5683 45%,#173f63 100%);font-family:Montserrat,Arial,sans-serif;display:flex;flex-direction:column;border:1px solid #52525b}
.scene.overflowing{outline:6px solid #ef4444}
.hdr{flex:none;display:flex;align-items:center;gap:14px;padding:12px 28px 0;height:46px;font-size:13px}
.hdr .ag{font-family:Rajdhani;font-weight:700;letter-spacing:.02em;font-size:14px}
.hdr .k{color:#5ab4ff;font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase}
.hdr .sp{flex:1}.hdr .n{color:rgba(255,255,255,.5);font-size:12px}
.hdr .ch{color:rgba(255,255,255,.8);font-size:12.5px}
.prog{flex:none;margin:6px 28px 0;height:3px;border-radius:2px;background:rgba(255,255,255,.12)}
.prog i{display:block;height:3px;border-radius:2px;background:#3aa0ff}
.screen{flex:1;min-height:0;overflow:hidden;padding:14px 28px 12px;display:flex;flex-direction:column;gap:12px}
.bar{flex:none;height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:rgba(31,86,131,.96);border-top:1px solid rgba(255,255,255,.12)}
.prev{border:1px solid rgba(255,255,255,.35);border-radius:10px;padding:9px 16px;font-size:13.5px}
.cta{background:#fff;color:#0f3a5c;border-radius:12px;padding:12px 26px;font-family:Rajdhani;font-weight:700;font-size:17px}
.q{font-family:Rajdhani;font-weight:700;font-size:38px;line-height:1.02;letter-spacing:-.01em}
.hint{font-size:15px;color:rgba(255,255,255,.72);line-height:1.35}
.g2{display:grid;grid-template-columns:1.1fr 1fr;gap:20px;min-height:0}
.photo{position:relative;border-radius:16px;background-size:cover;background-position:center;min-height:0}
.thumbs{position:absolute;left:10px;bottom:10px;display:flex;gap:6px}
.thumbs i{width:46px;height:34px;border-radius:6px;border:2px solid rgba(255,255,255,.85);background-size:cover;background-position:center}
.thumbs i.on{border-color:#fff;box-shadow:0 0 0 2px #3aa0ff}
.lbl{font-family:Rajdhani;font-weight:600;font-size:19px;line-height:1.15}
.lbl small{display:block;font-family:Montserrat;font-weight:400;font-size:13px;color:rgba(255,255,255,.6)}
.panel{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:9px}
.fl{font-size:12.5px;color:rgba(255,255,255,.72)}
.choice{border:2px solid rgba(255,255,255,.25);border-radius:12px;min-height:46px;display:flex;align-items:center;justify-content:center;font-family:Rajdhani;font-weight:600;font-size:18px;color:rgba(255,255,255,.85);text-align:center;padding:4px 10px;line-height:1.1}
.choice.on{background:#fff;color:#0f3a5c;border-color:#fff}
.choice.sm{min-height:40px;font-size:16px}
.addc{font-size:13px;color:rgba(255,255,255,.7);text-decoration:underline;text-underline-offset:3px}
.chg{display:grid;gap:7px}
.chip{border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);padding:6px 10px;display:flex;flex-direction:column;justify-content:center;min-width:0}
.chip .l{font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.6)}
.chip .v{font-family:Rajdhani;font-weight:600;font-size:16px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chip.g{border-color:rgba(52,211,153,.6);background:rgba(16,185,129,.16)}.chip.g .v{color:#6ee7b7}
.chip.o{border-color:rgba(251,191,36,.6);background:rgba(245,158,11,.16)}.chip.o .v{color:#fcd34d}
.legend{font-size:11px;color:rgba(255,255,255,.6);display:flex;justify-content:space-between;gap:10px}
.legend b{font-weight:700}.legend .gk{color:#6ee7b7}.legend .ok{color:#fcd34d}
.stl{font-size:10px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:rgba(255,255,255,.55)}
.big{font-family:Rajdhani;font-weight:700;font-size:54px;line-height:.95;letter-spacing:-.01em}
.mid{font-family:Rajdhani;font-weight:700;font-size:28px;line-height:1}
.sv{font-family:Rajdhani;font-weight:600;font-size:18px}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:1px}
.tone-g{color:#6ee7b7}.tone-o{color:#fcd34d}.tone-r{color:#fca5a5}
.bg-g{background:#34d399}.bg-o{background:#fbbf24}.bg-r{background:#f87171}
.guess{border-left:5px solid;padding:4px 0 4px 12px;display:flex;flex-direction:column;gap:2px}
.guess.g{border-color:#34d399}.guess.o{border-color:#fbbf24}.guess.r{border-color:#f87171}
.gap{font-size:14px;font-weight:600}
.dcard{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
.dcard.sel{border:2px solid #fff}
.dcard .ph{height:84px;background-size:cover;background-position:center}
.dcard .tx{padding:7px 10px;display:flex;flex-direction:column;gap:2px;font-size:12px}
.wire{border:2px dashed rgba(255,255,255,.35);border-radius:12px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:12.5px;color:rgba(255,255,255,.8);padding:6px}
/* Documents (synthèse) */
.doc{background:#fff;color:#27272a;font-family:Montserrat,Arial,sans-serif;border:1px solid #a1a1aa}
.dk{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#64748b}
.dcardw{border:1px solid #e4e4e7;background:#fafafa;padding:12px 14px;display:flex;flex-direction:column;gap:4px}
.pair{display:flex;justify-content:space-between;gap:12px;font-size:13px}
.pair b{font-family:Rajdhani;font-size:17px}
.gt-g{color:#047857}.gt-o{color:#b45309}.gt-r{color:#b91c1c}
.gb-g{border-left:5px solid #10b981}.gb-o{border-left:5px solid #f59e0b}.gb-r{border-left:5px solid #ef4444}
/* La frise */
.band{position:relative}
.band .line{position:absolute;left:0;right:0;height:3px;background:#e4e4e7}
.band .pd{position:absolute;width:12px;height:12px;border-radius:50%;background:#a1a1aa;transform:translate(-50%,-50%)}
.band .mk{position:absolute;display:flex;flex-direction:column;align-items:center;font-size:10.5px;line-height:1.15;white-space:nowrap;text-align:center}
.band .mk b{font-size:11px}
.band .tick{position:absolute;width:2px}
.band .lab{position:absolute;font-size:10.5px;line-height:1.15;white-space:nowrap;text-align:center;padding:1px 3px;background:#fff}
.band .lab b{display:block;font-size:11px}
.ends{display:flex;justify-content:space-between;font-size:11.5px;color:#71717a;margin-top:2px}
.clash{outline:2px solid #ef4444;background:#fee2e2 !important}
`;

const p = (n) => `<i class="pin">${n}</i>`;
const page = (title, body) =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${body}</body></html>`;

const DEV = {
  L: { w: 1024, h: 768, label: 'Tablette paysage · 1024 × 768', kind: 'tab' },
  L2: { w: 1180, h: 820, label: 'Tablette paysage · 1180 × 820', kind: 'tab' },
  P: { w: 820, h: 1180, label: 'Tablette portrait · 820 × 1180', kind: 'tab' },
  T: { w: 390, h: 844, label: 'Téléphone · 390 × 844', kind: 'phone' },
};

function scene(devKey, { kicker, count, progress, cta = 'Valider et continuer →', body }) {
  const d = DEV[devKey];
  const phone = d.kind === 'phone';
  const hdr = phone
    ? `<div class="hdr" style="padding:10px 14px 0;height:38px"><span class="k" style="font-size:9.5px;letter-spacing:.16em">${kicker}</span><span class="sp"></span><span class="n">${count}</span><span class="ch">☰</span></div><div class="prog" style="margin:6px 14px 0"><i style="width:${progress}%"></i></div>`
    : `<div class="hdr"><span class="ag">AGENCE HORIZON CÔTE D’AZUR</span><span class="k">${kicker}</span><span class="n">${count}</span><span class="sp"></span><span class="ch">Réglages</span><span class="ch">Clair</span><span class="ch">Plein écran</span><span class="ch">Quitter</span></div><div class="prog"><i style="width:${progress}%"></i></div>`;
  const bar = phone
    ? `<div class="bar" style="height:64px;padding:0 14px"><span class="prev">←</span><span class="cta" style="padding:11px 18px;font-size:16px">${cta}</span></div>`
    : `<div class="bar"><span class="prev">← Précédent</span><span class="cta">${cta}</span></div>`;
  const pad = phone ? ' style="padding:10px 14px;gap:10px"' : '';
  return `<div class="scene" data-frame style="width:${d.w}px;height:${d.h}px">${hdr}<div class="screen"${pad}>${body}</div>${bar}</div>`;
}

const framed = (devKey, html, extra = '') =>
  `<div><div class="ft"><span class="st ap">APRÈS</span>${DEV[devKey].label}${extra}</div>${html}</div>`;

function avant(file, { w, h, over, label }) {
  const scale = 512 / w;
  const fold = Math.round((h - 85) * scale);
  return `<div><div class="ft"><span class="st av">AVANT</span>${label}</div><div class="avant"><img src="M148-avant/${file}.jpg"><div class="fold" style="top:${fold}px"><span>barre du bas : tout ce qui est dessous défile</span></div><div class="over">dépasse de ${over} px</div></div></div>`;
}

const photo = (n, h, thumbs = 3, extra = '') =>
  `<div class="photo" style="height:${h}px;background-image:url(${PH(n)})${extra}"><div class="thumbs">${Array.from({ length: thumbs }, (_, i) => `<i class="${i === 0 ? 'on' : ''}" style="background-image:url(${PH(((n + i) % 8) + 1)})"></i>`).join('')}</div></div>`;

// La grille « Face à votre bien » de la démo (concurrent 1 de Vence : tout équivalent, exposition
// à l'avantage du vendeur), en pastilles compactes : la couleur porte le statut, la légende le dit.
const GRID = [
  ['Surface', '135 m²', ''],
  ['DPE', 'C', ''],
  ['Pièces', '5', ''],
  ['Chambres', '4', ''],
  ['État', 'Bon', ''],
  ['GES', 'C', ''],
  ['Extérieur', 'Terrasse, Jardin', ''],
  ['Stationnement', 'Garage', ''],
  ['Exposition', 'Sud-Est', 'g'],
];
const chips = (cols, list = GRID) =>
  `<div class="chg" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${list.map(([l, v, s]) => `<div class="chip ${s}"><span class="l">${l}${s === 'g' ? ' · pour vous' : s === 'o' ? ' · pour lui' : ''}</span><span class="v">${v}</span></div>`).join('')}</div>`;
const legend = (pin = '') =>
  `<div class="legend"><span class="stl">Face à votre bien, critère par critère${pin}</span><span><b class="gk">vert</b> = avantage pour vous · <b>gris</b> = équivalent · <b class="ok">orange</b> = avantage pour lui</span></div>`;
const legendPhone = `<div class="legend" style="flex-direction:column;gap:2px"><span class="stl">Face à votre bien</span><span><b class="gk">vert</b> pour vous · <b>gris</b> équivalent · <b class="ok">orange</b> pour lui</span></div>`;

function sheet(file, title, sub, columns, notes) {
  const body = `<h1 class="sheet">${title}</h1><p class="sub">${sub}</p><div class="layout"><div class="col">${columns}</div><div class="notes">${notes}</div></div>`;
  writeFileSync(join(here, file), page(title, body));
  return file;
}

const files = [];

// ================================================================================================
// 1 · Votre bien
// ================================================================================================
const STATS = [
  ['Type', 'Maison'], ['Surface', '135 m²'], ['Pièces', '5'], ['Chambres', '4'],
  ['Étage', '—'], ['Exposition', 'Sud'], ['État', 'Bon'], ['Construction', '1998'],
  ['Chauffage', 'Pompe à chaleur'], ['DPE', 'C'], ['GES', 'C'], ['Extérieurs', 'Terrasse, Jardin'],
  ['Stationnement', 'Garage'], ['Quartier', 'Les Collines'], ['Ville', 'Vence'], ['Adresse', '4 chemin des Restanques Hautes'],
].filter(([, v]) => v !== '—');
const statsGrid = (cols, list = STATS) =>
  `<div class="chg" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${list.map(([l, v]) => `<div class="chip"><span class="l">${l}</span><span class="v">${v}</span></div>`).join('')}</div>`;
const strengths = `<div class="fl"><span class="stl">Points forts</span>&nbsp; Terrain de 900 m² · Quatre chambres · Pompe à chaleur · Garage</div>`;
const answersProperty = (dir = 'column') =>
  `<div class="panel"><span class="fl">Est-ce que cette présentation correspond bien à votre bien ?</span><div style="display:flex;flex-direction:${dir};gap:8px"><div class="choice on" style="flex:1">Oui, c’est bien mon bien</div><div class="choice" style="flex:1">Non, il y a des choses à corriger</div></div><span class="addc">+ Ajouter un commentaire</span></div>`;
const headProperty = (q = 38) =>
  `<div><div class="q" style="font-size:${q}px">Votre bien</div><div class="hint">Reconnaissez-vous votre bien dans cette présentation ?</div></div>`;

const propL = (dev) => {
  const h = DEV[dev].h;
  const ph = h - 46 - 9 - 72 - 26 - 80; // le reste de la hauteur, pour la photo
  return scene(dev, {
    kicker: 'Votre bien', count: '2 / 25', progress: 8,
    body: `${headProperty()}<div class="g2" style="flex:1"><div style="display:flex;flex-direction:column;gap:8px;min-height:0">${photo(2, ph, 3)}</div><div style="display:flex;flex-direction:column;gap:10px;min-height:0">${answersProperty()}${statsGrid(3)}${strengths}</div></div>`,
  });
};
const propP = scene('P', {
  kicker: 'Votre bien', count: '2 / 25', progress: 8,
  body: `${headProperty()}${photo(2, 470, 3)}${answersProperty('row')}${statsGrid(4)}${strengths}`,
});
const propT = scene('T', {
  kicker: 'Votre bien', count: '2/25', progress: 8, cta: 'Valider →',
  body: `${headProperty(30)}${photo(2, 200, 3)}${answersProperty('column').replace(/min-height:46px/g, '')}${statsGrid(3, STATS.filter(([l]) => !['Adresse', 'Construction', 'Chauffage', 'GES'].includes(l)))}`,
});
files.push(
  sheet(
    'M148-1-votre-bien.html',
    'M148 · 1 — « Votre bien » tient sur un écran',
    'Mesuré le 08/11 sur l’essai (démo, maison de Mme Garcia à Vence) : l’écran dépasse de 626 px en 1024 × 768, 574 px en 1180 × 820, 484 px en 820 × 1180. Ce qui passe sous la barre : 13 des 16 caractéristiques, la description, les points forts.',
    `<div class="rowf">${avant('I01-subject_property-1024x768', { w: 1024, h: 768, over: 626, label: 'Tablette paysage · 1024 × 768 (essai, 08/11)' })}${framed('L', propL('L'))}</div>
     <div class="rowf">${framed('L2', propL('L2'))}${framed('P', propP)}${framed('T', propT, ' — voir la question 1')}</div>`,
    `<div class="note"><b>Avant</b> (<code>live-page-property.tsx</code>) : photo de 352 px de haut, vignettes dessous, les 16 caractéristiques en grandes valeurs sur 3 colonnes (≈ 400 px), la description en entier, les points forts, et un champ de commentaire toujours ouvert.</div>
     <div class="note"><b>Après</b>, la même information, compactée :<ol>
     <li>${p(1)} L’en-tête et la progression sur une seule bande (≈ 40 px gagnés sur chaque écran du Live) ; la barre du bas passe de 85 à 72 px.</li>
     <li>${p(2)} La photo prend toute la hauteur qui reste ; les vignettes passent DANS la photo, en bas à gauche (au toucher, comme aujourd’hui).</li>
     <li>${p(3)} Les caractéristiques en pastilles compactes (libellé petit, valeur sur une ligne, coupée par « … » si elle est trop longue) : 3 colonnes en paysage, 4 en portrait.</li>
     <li>${p(4)} « Commentaire (facultatif) » devient un lien « + Ajouter un commentaire » qui ouvre le champ sur place — question 3.</li>
     <li>${p(5)} La description n’est plus sur l’écran (c’est le texte de la fiche, que le vendeur connaît) — question 4. Les points forts tiennent sur une ligne.</li></ol></div>
     <div class="note"><b>Téléphone</b> : il tient aussi, à condition d’y retirer quatre caractéristiques secondaires (adresse, construction, chauffage, GES). Mais d’autres écrans ne tiennent pas sur un téléphone sans perdre de l’information : question 1.</div>
     <div class="note"><b>1180 × 820</b> : même disposition, la photo gagne 52 px.</div>`,
  ),
);

// ================================================================================================
// 2 · Un concurrent, avant son prix (écran 1 sur 4, et l'écran 1 sur 2 du rythme accéléré)
// ================================================================================================
const compLabel = `<div class="lbl">Maison · 5 pièces · 135 m² · Saint-Paul-de-Vence<small>Saint-Paul-de-Vence</small></div>`;
const seriousChoices = (dir) =>
  `<div style="display:flex;flex-direction:${dir};gap:8px"><div class="choice on" style="flex:1">Oui, un concurrent sérieux</div><div class="choice" style="flex:1">Non</div><div class="choice" style="flex:1">Incertain</div></div>`;
const compHead = (q = 38) =>
  `<div><div class="q" style="font-size:${q}px">Est-il un sérieux concurrent pour votre bien ?</div><div class="hint">Observez le bien comme le ferait un acheteur — son prix viendra ensuite.</div></div>`;
const compL = (dev) => {
  const ph = DEV[dev].h - 46 - 9 - 72 - 26 - 74 - 34 - 128;
  return scene(dev, {
    kicker: 'Concurrent 1 sur 5 · étape 1 sur 4', count: '4 / 25', progress: 16,
    body: `${compHead()}<div class="g2"><div style="display:flex;flex-direction:column;gap:6px">${photo(3, ph, 2)}${compLabel}</div><div class="panel" style="height:fit-content"><span class="fl">Votre réponse</span>${seriousChoices('column')}<span class="addc">+ Ajouter un commentaire</span></div></div>${legend(' ' + p(3))}${chips(5)}`,
  });
};
const compP = scene('P', {
  kicker: 'Concurrent 1 sur 5 · étape 1 sur 4', count: '4 / 25', progress: 16,
  body: `${compHead()}${photo(3, 470, 2)}${compLabel}<div class="panel"><span class="fl">Votre réponse</span>${seriousChoices('row')}<span class="addc">+ Ajouter un commentaire</span></div>${legend()}${chips(3)}`,
});
const compT = scene('T', {
  kicker: 'Concurrent 1/5 · étape 1/4', count: '4/25', progress: 16, cta: 'Valider →',
  body: `${compHead(28)}${photo(3, 190, 2)}<div class="lbl" style="font-size:17px">Maison · 5 pièces · 135 m² · Saint-Paul-de-Vence</div>${seriousChoices('column').replace(/class="choice/g, 'class="choice sm')}${legendPhone}${chips(3)}`,
});
const quickL = scene('L', {
  kicker: 'Concurrent 4 sur 5 · étape 1 sur 2', count: '16 / 25', progress: 64,
  body: `<div><div class="q">Un sérieux concurrent ? Et à quel prix, selon vous ?</div><div class="hint">Regardez ce bien comme le ferait un acheteur, puis donnez le prix que vous imaginez.</div></div><div class="g2"><div style="display:flex;flex-direction:column;gap:6px">${photo(4, 256, 2)}<div class="lbl">Maison · 5 pièces · 130 m² · Les Collines<small>Les Collines, Vence</small></div></div><div class="panel" style="height:fit-content"><span class="fl">Est-il un sérieux concurrent pour votre bien ?</span><div style="display:flex;gap:8px"><div class="choice on sm" style="flex:1.6">Oui, sérieux</div><div class="choice sm" style="flex:1">Non</div><div class="choice sm" style="flex:1.2">Incertain</div></div><span class="stl">Le prix que vous imaginez</span><div style="display:flex;align-items:center;gap:10px"><div class="choice" style="flex:1;min-height:58px;font-size:38px;font-weight:700;border-color:#5ab4ff;color:#fff">640 000</div><span class="mid" style="color:rgba(255,255,255,.6)">€</span></div><span class="fl">Le prix réel s’affichera à l’écran suivant.</span></div></div>${legend()}${chips(5, GRID.map(([l, v, s]) => [l, l === 'Surface' ? '130 m²' : v, s]))}`,
});
files.push(
  sheet(
    'M148-2-un-concurrent-avant-son-prix.html',
    'M148 · 2 — Un concurrent, avant son prix : photo, réponses et grille sur un seul écran',
    'Mesuré le 08/11 : « Un sérieux concurrent ? » dépasse de 414 px (1024 × 768), 362 px (1180 × 820), 450 px (820 × 1180) ; « À quel prix ? » de 135, 83, et tient en portrait ; l’écran 1 du rythme accéléré de 468, 416, 89. Toute la grille « Face à votre bien » est sous la barre.',
    `<div class="rowf">${avant('I04-comparable_competition-1024x768', { w: 1024, h: 768, over: 414, label: 'Un sérieux concurrent ? · 1024 × 768 (essai)' })}${framed('L', compL('L'))}</div>
     <div class="rowf">${avant('I19-comparable_quick_guess-820x1180', { w: 820, h: 1180, over: 89, label: 'Rythme accéléré, écran 1 · 820 × 1180 (essai)' })}${framed('P', compP)}${framed('T', compT, ' — question 1')}</div>
     <div class="rowf">${framed('L', quickL, ' — rythme accéléré, écran 1 sur 2')}</div>`,
    `<div class="note"><b>Avant</b> (<code>live-page-competition.tsx</code>, <code>live-feature-comparison.tsx</code>) : la grille est une rangée de cartes de 85 px (libellé, valeur, statut en toutes lettres), placée SOUS la photo et les réponses : sur tablette en paysage elle est entièrement cachée par la barre. En portrait, photo et réponses s’empilent.</div>
     <div class="note"><b>Après</b> :<ol>
     <li>${p(1)} Même bande d’en-tête et même barre que la planche 1.</li>
     <li>${p(2)} La photo prend la hauteur qui reste ; le libellé neutre (M107) dessous, sur une ligne.</li>
     <li>${p(3)} La grille devient une bande de pastilles : 5 colonnes en paysage, 3 en portrait et sur téléphone. Le statut n’est plus une troisième ligne sous chaque valeur : la couleur de la pastille le porte, avec deux mots dans son libellé, « · pour vous » (vert) ou « · pour lui » (orange) ; « équivalent » reste gris, sans mot ; la légende de la bande redit le code (correctif M129). Jamais la couleur seule.</li>
     <li>${p(4)} Les choix gardent leur taille au doigt (46 px, 40 px sur téléphone) ; « + Ajouter un commentaire » (question 3).</li>
     <li>${p(5)} Ordre en portrait : photo, réponses, grille — le vendeur répond sans descendre.</li></ol></div>
     <div class="note"><b>« À quel prix ? »</b> (étape 2 sur 4) suit la même disposition : la photo, le libellé, le grand champ du prix à droite, la grille en bande.</div>`,
  ),
);

// ================================================================================================
// 3 · La révélation du prix, et la couleur de la devinette (point 2)
// ================================================================================================
// Démo du 08/11 : 740 000 € affiché, 700 000 € imaginé : +5,7 % (orange) ; 749 000 € pour 760 000 € :
// −1,4 % (vert) ; 729 000 € pour 820 000 € : −11,1 % (rouge). L'écart est celui du Live (M96) :
// (prix affiché − réponse) / réponse.
const tones = {
  o: { listed: '740 000 €', guess: '700 000 €', words: 'Prix affiché 5,7 % au-dessus de votre réponse', eur: '+40 000 €' },
  g: { listed: '749 000 €', guess: '760 000 €', words: 'Prix affiché 1,4 % en dessous de votre réponse', eur: '−11 000 €' },
  r: { listed: '729 000 €', guess: '820 000 €', words: 'Prix affiché 11,1 % en dessous de votre réponse', eur: '−91 000 €' },
};
const guessBlock = (t, size = 'mid') =>
  `<div class="guess ${t}"><span class="stl">Votre réponse</span><span class="${size} tone-${t}">${tones[t].guess}</span><span class="gap tone-${t}"><span class="dot bg-${t}"></span>${tones[t].words}</span><span class="fl">${tones[t].eur}</span></div>`;
const coherence = (cols) =>
  `<div class="panel" style="gap:7px"><span class="fl">Selon vous, ce prix est…</span><div class="chg" style="grid-template-columns:repeat(${cols},1fr)"><div class="choice sm on">Oui, cohérent</div><div class="choice sm">Trop élevé</div><div class="choice sm">Trop bas</div><div class="choice sm">Je ne sais pas</div></div><span class="addc">+ Ajouter un commentaire</span></div>`;
const revealPanel = (t, compact = false) =>
  `<div class="panel" style="gap:${compact ? 8 : 12}px"><div><span class="stl">Prix affiché sur le marché</span><div class="big"${compact ? ' style="font-size:44px"' : ''}>${tones[t].listed}</div></div>${guessBlock(t)}<div style="display:flex;gap:24px"><div><span class="stl">Prix au m²</span><div class="sv">5 481 €/m²</div></div><div><span class="stl">Position (prix/m²)</span><div class="sv">1 / 1</div></div></div></div>`;
const revealHead = (q = 38) =>
  `<div><div class="q" style="font-size:${q}px">Ce prix vous paraît-il cohérent ?</div><div class="hint">Voici le prix réellement affiché, face au prix que vous imaginiez.</div></div>`;
const revL = (t) =>
  scene('L', {
    kicker: 'Concurrent 1 sur 5 · étape 3 sur 4', count: '6 / 25', progress: 24,
    body: `${revealHead()}<div class="g2" style="flex:1"><div style="display:flex;flex-direction:column;gap:6px">${photo(3, 420, 2)}${compLabel}</div><div style="display:flex;flex-direction:column;gap:10px">${revealPanel(t)}${coherence(2)}</div></div>`,
  });
const revP = (t) =>
  scene('P', {
    kicker: 'Concurrent 2 sur 5 · étape 3 sur 4', count: '11 / 25', progress: 44,
    body: `${revealHead()}${photo(5, 420, 2)}<div class="lbl">Maison · 5 pièces · 132 m² · La Colle-sur-Loup<small>La Colle-sur-Loup</small></div>${revealPanel(t)}${coherence(4)}`,
  });
const revT = (t) =>
  scene('T', {
    kicker: 'Concurrent 3/5 · étape 3/4', count: '16/25', progress: 64, cta: 'Valider →',
    body: `${revealHead(28)}${photo(6, 150, 2)}<div class="lbl" style="font-size:16px">Maison · 5 pièces · 142 m² · Les Collines</div>${revealPanel(t, true)}${coherence(2)}`,
  });
const quickRev = scene('L', {
  kicker: 'Concurrent 4 sur 5 · étape 2 sur 2', count: '17 / 25', progress: 68,
  body: `<div><div class="q">Voici son prix.</div><div class="hint">Et selon vous, depuis combien de temps est-il en vente ?</div></div><div class="g2" style="flex:1"><div style="display:flex;flex-direction:column;gap:6px">${photo(4, 400, 2)}<div class="lbl">Maison · 5 pièces · 130 m² · Les Collines<small>Les Collines, Vence</small></div></div><div style="display:flex;flex-direction:column;gap:10px"><div class="panel"><div><span class="stl">Prix affiché sur le marché</span><div class="big">715 000 €</div></div><div class="guess r"><span class="stl">Votre réponse</span><span class="mid tone-r">640 000 €</span><span class="gap tone-r"><span class="dot bg-r"></span>Prix affiché 11,7 % au-dessus de votre réponse</span><span class="fl">+75 000 €</span></div></div><div class="panel"><span class="stl">Depuis combien de temps, selon vous ?</span><div style="display:flex;align-items:center;gap:10px"><div class="choice" style="flex:1;min-height:56px;font-size:34px;font-weight:700">90</div><span class="sv" style="color:rgba(255,255,255,.6)">jours</span></div></div></div></div>`,
});
const directL = scene('L', {
  kicker: 'Concurrent 1 sur 5', count: '3 / 11', progress: 27, cta: 'Continuer →',
  body: `<div><div class="q">Un bien en vente près du vôtre</div><div class="hint">Ce qui le rapproche du vôtre, ce qui l’en distingue, et son prix.</div></div><div class="g2"><div style="display:flex;flex-direction:column;gap:6px">${photo(3, 254, 2)}${compLabel}</div><div class="panel" style="height:fit-content"><div><span class="stl">Prix affiché sur le marché</span><div class="big">740 000 €</div></div><div style="display:flex;gap:24px"><div><span class="stl">Prix au m²</span><div class="sv">5 481 €/m²</div></div><div><span class="stl">En vente depuis</span><div class="sv">35 jours</div></div></div><span class="fl">Historique de prix non disponible.</span><span class="fl" style="opacity:.75">Aucune réponse du vendeur : aucune couleur ${p(6)}</span></div></div>${legend()}${chips(5)}`,
});
files.push(
  sheet(
    'M148-3-la-revelation-et-la-couleur.html',
    'M148 · 3 — La révélation : le prix affiché, la réponse du vendeur en couleur, l’écart écrit',
    'Mesuré le 08/11 : « Ce prix vous paraît-il cohérent ? » dépasse de 246 px (1024 × 768), 194, 317 (portrait) ; « Voici son prix. » (accéléré) de 68 et 16 ; la présentation directe de 390, 338 et 35. Les trois couleurs sont montrées sur les vraies devinettes du Live de démo.',
    `<div class="rowf">${avant('I06-comparable_price_reveal-1024x768', { w: 1024, h: 768, over: 246, label: 'Ce prix vous paraît-il cohérent ? · 1024 × 768 (essai)' })}${framed('L', revL('o'), ' — orange : 5,7 %')}</div>
     <div class="rowf">${framed('P', revP('g'), ' — vert : 1,4 %')}${framed('T', revT('r'), ' — rouge : 11,1 %')}</div>
     <div class="rowf">${framed('L', quickRev, ' — rythme accéléré, écran 2 sur 2')}${avant('D02-comparable_direct-1024x768', { w: 1024, h: 768, over: 390, label: 'Présentation directe · 1024 × 768 (essai, dossier en anglais)' })}</div>
     <div class="rowf">${framed('L', directL, ' — présentation directe')}</div>`,
    `<div class="note"><b>La règle (point 2)</b> ${p(1)} : l’écart est celui que le Live calcule déjà (M96) — (prix affiché − réponse) ÷ réponse —, comparé SANS son signe et SANS arrondi (comme M116) :<ul><li><span class="dot bg-g"></span><b>vert</b> : moins de 5 % ;</li><li><span class="dot bg-o"></span><b>orange</b> : de 5 % inclus à moins de 10 % ;</li><li><span class="dot bg-r"></span><b>rouge</b> : 10 % et au-delà (question 6).</li></ul>Un seul service pur, ses deux seuils nommés, à côté de <code>price-alignment.ts</code>.</div>
     <div class="note"><b>Ce que voit le vendeur</b> ${p(2)} : sous le grand prix affiché, « Votre réponse » en couleur, un trait de la même couleur à gauche, et l’écart en mots : « Prix affiché 5,7 % au-dessus de votre réponse » / « … en dessous de votre réponse » (question 2), le montant en euros dessous. La couleur ne parle jamais seule. La colonne « Écart » d’aujourd’hui disparaît, remplacée par cette ligne.</div>
     <div class="note"><b>Où</b> ${p(3)} : « Ce prix vous paraît-il cohérent ? » (4 écrans), « Voici son prix. » (accéléré), et la carte de chaque concurrent sur « Le concurrent le plus dangereux » et dans « Revoir » (planche 5) — partout où la réponse est à côté du prix affiché. Jamais sur un « Non » (il n’a ni réponse ni prix révélé, M41, M104), ni sur une réponse à 0 € (M96), ni en présentation directe ${p(6)}, où le vendeur n’a rien deviné.</div>
     <div class="note"><b>Disposition</b> ${p(4)} : la révélation garde la photo à gauche et le panneau à droite ; les quatre choix « Selon vous, ce prix est… » passent en 2 × 2 compacts (4 en ligne en portrait), libellés raccourcis — question 7.</div>`,
  ),
);

// ================================================================================================
// 4 · La durée révélée — l'écran qui déborde le plus
// ================================================================================================
const reasons = ['Prix trop élevé', 'État du bien', 'Travaux à prévoir', 'Forte concurrence', 'Manque de visibilité', 'Je ne sais pas', 'Autre'];
const durL = scene('L', {
  kicker: 'Concurrent 1 sur 5 · étape 4 sur 4', count: '7 / 25', progress: 28,
  body: `<div><div class="q">Pourquoi est-il toujours sur le marché ?</div><div class="hint">La durée observée est révélée — qu’est-ce qui retient ce bien sur le marché ?</div></div><div class="g2" style="flex:1"><div style="display:flex;flex-direction:column;gap:7px">${photo(3, 236, 2)}${compLabel}<div class="fl" style="font-size:13.5px">740 000 € · 5 481 €/m² · votre réponse <b class="tone-o">700 000 €</b> <span class="tone-o">(prix affiché 5,7 % au-dessus)</span> · sérieux : oui ${p(3)}</div>${chips(3)}</div><div style="display:flex;flex-direction:column;gap:10px"><div class="panel"><div style="display:flex;gap:28px"><div><span class="stl">Votre réponse</span><div class="mid">60 jours</div></div><div><span class="stl">Sur le marché depuis</span><div class="big" style="font-size:44px">35 jours</div></div></div><span class="fl">Soit 25 jours de moins que votre réponse. Historique de prix non disponible.</span></div><div class="panel" style="gap:7px"><span class="fl">Selon vous, pourquoi ?</span><div class="chg" style="grid-template-columns:repeat(2,1fr)">${reasons.map((r, i) => `<div class="choice sm${i === 0 ? ' on' : ''}">${r}</div>`).join('')}</div><span class="addc">+ Ajouter un commentaire</span></div></div></div>`,
});
const durP = scene('P', {
  kicker: 'Concurrent 1 sur 5 · étape 4 sur 4', count: '7 / 25', progress: 28,
  body: `<div><div class="q">Pourquoi est-il toujours sur le marché ?</div><div class="hint">La durée observée est révélée — qu’est-ce qui retient ce bien sur le marché ?</div></div><div class="g2" style="grid-template-columns:1fr 1fr"><div style="display:flex;flex-direction:column;gap:6px">${photo(3, 250, 2)}<div class="lbl" style="font-size:17px">Maison · 5 pièces · 135 m² · Saint-Paul-de-Vence</div></div><div class="panel" style="height:fit-content"><div><span class="stl">Votre réponse</span><div class="mid">60 jours</div></div><div><span class="stl">Sur le marché depuis</span><div class="big" style="font-size:46px">35 jours</div></div><span class="fl">Soit 25 jours de moins que votre réponse. Historique de prix non disponible.</span></div></div><div class="fl" style="font-size:13.5px">740 000 € · 5 481 €/m² · votre réponse <b class="tone-o">700 000 €</b> <span class="tone-o">(prix affiché 5,7 % au-dessus)</span> · sérieux : oui</div><div class="panel" style="gap:7px"><span class="fl">Selon vous, pourquoi ?</span><div class="chg" style="grid-template-columns:repeat(4,1fr)">${reasons.map((r, i) => `<div class="choice sm${i === 0 ? ' on' : ''}">${r}</div>`).join('')}</div><span class="addc">+ Ajouter un commentaire</span></div>${legend()}${chips(3)}`,
});
files.push(
  sheet(
    'M148-4-la-duree-revelee.html',
    'M148 · 4 — « Pourquoi est-il toujours sur le marché ? » : l’écran le plus long du Live',
    'Mesuré le 08/11 : avant la révélation de la durée, l’écran dépasse de 578 px (1024 × 768), 526, 398 ; une fois la durée révélée (même écran), de 783, 731 et 989 px en portrait. Sept raisons en grands boutons, un rappel des prix, la grille, un commentaire ouvert.',
    `<div class="rowf">${avant('I08-comparable_duration-1024x768', { w: 1024, h: 768, over: 783, label: 'Durée révélée · 1024 × 768 (essai)' })}${framed('L', durL)}</div>
     <div class="rowf">${framed('P', durP)}</div>`,
    `<div class="note"><b>Avant</b> (<code>live-page-duration.tsx</code>) : « Votre réponse 60 jours » et « 35 jours » l’un sous l’autre en très grand, les 7 raisons en boutons de 56 à 80 px sur 2 colonnes, un panneau de rappel (prix affiché, prix au m², votre réponse, sérieux), puis la grille en cartes.</div>
     <div class="note"><b>Après</b> :<ol>
     <li>${p(1)} Les deux durées côte à côte, la révélée plus grande.</li>
     <li>${p(2)} Les 7 raisons en boutons compacts de 40 px (2 colonnes en paysage, 4 en portrait), libellés sur une ligne.</li>
     <li>${p(3)} Le panneau de rappel devient une ligne sous le libellé, et la réponse au prix y garde sa couleur (point 2).</li>
     <li>${p(4)} La grille en pastilles, 3 colonnes sous la photo en paysage.</li></ol></div>
     <div class="note"><b>Avant la révélation</b> (le champ « depuis combien de temps ? » à la place des deux durées) : même disposition, le champ prend la place des deux durées.</div>`,
  ),
);

// ================================================================================================
// 5 · Les autres écrans qui défilent aujourd'hui (le plus dangereux, l'analyse, la conclusion)
// ================================================================================================
const DANGER = [
  [3, 'Maison · 5 p. · 135 m² · Saint-Paul-de-Vence', '740 000 €', '700 000 €', 'o', '5,7 % au-dessus'],
  [5, 'Maison · 5 p. · 142 m² · Les Collines', '729 000 €', '820 000 €', 'r', '11,1 % en dessous'],
  [6, 'Maison · 5 p. · 132 m² · La Colle-sur-Loup', '749 000 €', '760 000 €', 'g', '1,4 % en dessous'],
  [4, 'Maison · 5 p. · 130 m² · Les Collines', '715 000 €', '640 000 €', 'r', '11,7 % au-dessus'],
  [7, 'Maison · 5 p. · 150 m² · Les Collines', '760 000 €', '790 000 €', 'g', '3,8 % en dessous'],
];
const dangerL = scene('L', {
  kicker: 'Le concurrent le plus dangereux', count: '21 / 25', progress: 84,
  body: `<div><div class="q">Quel concurrent vous paraît le plus dangereux ?</div><div class="hint">Les biens que vous avez jugés sérieux, avec leur prix révélé.</div></div><div class="chg" style="grid-template-columns:repeat(3,1fr);gap:10px">${DANGER.map(([n, l, pr, g, t, w], i) => `<div class="dcard${i === 0 ? ' sel' : ''}"><div class="ph" style="background-image:url(${PH(n)})"></div><div class="tx"><b style="font-family:Rajdhani;font-size:14.5px">${l}</b><span><b class="sv">${pr}</b> · 35 j</span><span class="tone-${t}"><span class="dot bg-${t}"></span>Vous : ${g} · ${w}</span><span class="addc" style="font-size:12px">Revoir</span></div></div>`).join('')}</div><div class="panel" style="gap:7px"><span class="fl">Pourquoi celui-là ? ${p(2)}</span><div class="chg" style="grid-template-columns:repeat(4,1fr)">${['Rapport qualité/prix', 'Meilleur état', 'Localisation', 'Plus grande surface', 'Meilleur extérieur', 'Prestations', 'Prix plus attractif', 'Autre'].map((r, i) => `<div class="choice sm${i === 0 ? ' on' : ''}">${r}</div>`).join('')}</div></div>`,
});
const statMini = (l, v, s = '') =>
  `<div class="panel" style="padding:8px 12px;gap:2px"><span class="stl">${l}</span><span class="sv" style="font-size:20px">${v}</span>${s ? `<span class="fl" style="font-size:11px">${s}</span>` : ''}</div>`;
const analysisL = scene('L', {
  kicker: 'Analyse des prix', count: '23 / 25', progress: 92,
  body: `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px"><div><div class="q">Analyse des prix</div><div class="hint">Voici le marché, face au prix que vous aviez en tête.</div></div><div class="sv" style="font-size:20px">Au début : 745 000 € → Après le marché : 745 000 €</div></div><div class="chg" style="grid-template-columns:repeat(6,1fr)">${statMini('Votre valeur perçue', '745 000 €')}${statMini('Prix des concurrents', '740 000 €', 'retenu à partir de 5')}${statMini('Analyse du conseiller', '740 000 €')}${statMini('Prix affichés', '715 – 760 k€')}${statMini('Prix médian', '740 000 €')}${statMini('En vente depuis', '72 jours', 'médiane')}</div><div class="wire" style="height:150px">La bande des prix (M94, M115), sa légende sur une ligne ${p(3)}</div><div class="panel" style="gap:5px"><span class="stl">Écarts observés</span>${[['Votre valeur perçue vs prix des concurrents', '+5 000 € (+0,7 %)'], ['Votre valeur perçue vs analyse du conseiller', '+5 000 € (+0,7 %)'], ['Prix des concurrents vs analyse du conseiller', '0 € (0 %)']].map(([a, b]) => `<div style="display:flex;justify-content:space-between;font-size:14px;color:rgba(255,255,255,.8)"><span>${a}</span><b>${b}</b></div>`).join('')}</div>`,
});
const conclusionL = scene('L', {
  kicker: 'Conclusion', count: '24 / 25', progress: 96,
  body: `<div><div class="q">Conclusion</div><div class="hint">Ce que le rendez-vous a construit, noir sur blanc — la décision vous appartient.</div></div><div class="chg" style="grid-template-columns:repeat(3,1fr)">${statMini('Votre valeur perçue', '745 000 €')}${statMini('Prix des concurrents', '740 000 €')}${statMini('Analyse du conseiller', '740 000 €')}</div><div class="g2" style="grid-template-columns:1fr 1fr"><div class="panel" style="flex-direction:row;gap:12px;align-items:center"><div class="photo" style="width:120px;height:84px;flex:none;background-image:url(${PH(3)})"></div><div style="display:flex;flex-direction:column;gap:2px"><span class="stl">Le concurrent qui vous fait le plus réfléchir</span><b class="lbl" style="font-size:16px">Maison · 5 p. · 135 m² · Saint-Paul-de-Vence</b><span class="sv">740 000 €</span></div></div><div class="panel"><span class="stl">Justification du conseiller</span><span class="fl" style="font-size:13px">Prix retenu à partir des biens comparables en vente dans le secteur, ajusté à l’exposition et à l’étage.</span></div></div><div class="panel"><div class="q" style="font-size:30px">Sur quel prix partons-nous ?</div><span class="fl">Le prix que nous retenons ensemble. Rien n’est pré-rempli.</span><div style="display:flex;gap:10px;align-items:center"><div class="choice" style="flex:1;min-height:56px;font-size:34px;font-weight:700">760 000</div><span class="mid" style="color:rgba(255,255,255,.6)">€</span><div class="choice sm" style="flex:none;background:rgba(255,255,255,.9);color:#0f3a5c">Enregistrer le prix</div></div><span class="fl">À 760 000 €, votre bien serait parmi les plus chers des 6 biens comparés.</span></div>`,
});
files.push(
  sheet(
    'M148-5-les-autres-ecrans.html',
    'M148 · 5 — Les autres écrans qui défilent aujourd’hui : le plus dangereux, l’analyse des prix, la conclusion',
    'Le contrôle e2e demandé (« aucun écran du Live traversé ne défile ») les couvre aussi. Mesuré le 08/11 en 1024 × 768 / 1180 × 820 / 820 × 1180 : le plus dangereux 1 236 / 1 184 / 974 px ; l’analyse des prix 389 / 337 / 87 ; la conclusion 487 / 435 / 240 ; « Le concurrent le plus proche » (directe) 384 / 332 / tient ; « Votre valeur perçue », le prix reformulé, le DPE et la note de 1 à 10 tiennent déjà partout.',
    `<div class="rowf">${avant('I27-dangerous_competitor-1024x768', { w: 1024, h: 768, over: 1236, label: 'Le plus dangereux · 1024 × 768 (essai)' })}${framed('L', dangerL)}</div>
     <div class="rowf">${avant('I30-price_analysis-1024x768', { w: 1024, h: 768, over: 389, label: 'Analyse des prix · 1024 × 768 (essai)' })}${framed('L', analysisL)}</div>
     <div class="rowf">${avant('I31-conclusion-1024x768', { w: 1024, h: 768, over: 487, label: 'Conclusion · 1024 × 768 (essai)' })}${framed('L', conclusionL)}</div>`,
    `<div class="note"><b>Le plus dangereux</b> ${p(1)} : cinq grandes cartes (photo de 160 px) l’une sous l’autre sur deux colonnes, puis les raisons. Après : trois colonnes, photo de 84 px, le prix révélé et la réponse du vendeur EN COULEUR (point 2), « Revoir » en lien. Six concurrents (le maximum montré, M110) tiennent sur deux rangées de trois. ${p(2)} « Pourquoi celui-là ? » : 8 raisons en 4 colonnes compactes, libellés raccourcis (question 7). Le « plus proche » de la présentation directe suit la même grille.</div>
     <div class="note"><b>Analyse des prix</b> ${p(3)} : les six chiffres sur une rangée, le chemin du vendeur à droite du titre, la bande des prix inchangée (M94, M104, M115), sa légende sur une ligne, les écarts en lignes serrées.</div>
     <div class="note"><b>Conclusion</b> ${p(4)} : les trois prix sur une rangée basse, le concurrent qui fait réfléchir en carte horizontale à côté de la justification, et « Sur quel prix partons-nous ? » en entier, champ vide (M85) — le prix tapé reste visible avec sa phrase de position (M94) et « Enregistrer le prix ».</div>
     <div class="note"><b>Hors de la mesure</b> : « Revoir » (plein écran, M113), l’écran des acquéreurs montrés (M133), la pause et « Merci » : le contrôle e2e les traverse aussi s’ils sont sur son chemin.</div>`,
  ),
);

// ================================================================================================
// 6 · La synthèse : la couleur de la devinette (point 2)
// ================================================================================================
const synthCard = (n, label, guess, listed, t, words, perSqm, serious = 'oui') =>
  `<div class="dcardw" style="background:#fff;gap:8px"><div style="display:flex;gap:12px"><div class="photo" style="width:150px;height:100px;flex:none;border-radius:0;background-image:url(${PH(n)})"></div><div style="display:flex;flex-direction:column;gap:3px;flex:1"><b style="font-family:Rajdhani;font-size:17px">${label}</b><span style="font-size:12px;color:#52525b">Un sérieux concurrent ? <b>${serious === 'oui' ? 'Oui, un concurrent sérieux' : 'Non'}</b></span></div></div>${
    t
      ? `<div class="dcardw ${'gb-' + t}" style="gap:3px"><span class="dk">Le prix</span><div class="pair"><span>Vous imaginiez</span><b class="gt-${t}">${guess}</b></div><div class="pair"><span>Prix affiché</span><b>${listed}</b></div><div class="gt-${t}" style="font-size:12.5px;font-weight:700"><span class="dot" style="background:currentColor"></span>${words} · ${perSqm}</div></div>`
      : `<div style="background:#f4f4f5;padding:8px 10px;font-size:12.5px;color:#52525b">Pas un concurrent pour vous : son prix n’a pas été regardé. ${p(4)}</div>`
  }</div>`;
const synthDoc = (w, title) =>
  `<div><div class="ft"><span class="st ap">APRÈS</span>${title}</div><div class="doc" style="width:${w}px;padding:${w > 600 ? 28 : 14}px;display:flex;flex-direction:column;gap:12px"><div><span class="dk">02 · Les biens que nous avons regardés ensemble</span></div>${synthCard(3, 'Maison · 5 pièces · 135 m² · Saint-Paul-de-Vence', '700 000 €', '740 000 €', 'o', 'Prix affiché 5,7 % au-dessus de votre réponse', '5 481 €/m²')}${synthCard(6, 'Maison · 5 pièces · 132 m² · La Colle-sur-Loup', '760 000 €', '749 000 €', 'g', 'Prix affiché 1,4 % en dessous de votre réponse', '5 674 €/m²')}${synthCard(5, 'Maison · 5 pièces · 142 m² · Les Collines', '820 000 €', '729 000 €', 'r', 'Prix affiché 11,1 % en dessous de votre réponse', '5 134 €/m²')}${synthCard(8, 'Maison · 5 pièces · 128 m² · Vence', '', '', null, '', '', 'non')}</div></div>`;
const synthBefore = `<div><div class="ft"><span class="st av">AVANT</span>Synthèse, fiche d’un concurrent (le code de main)</div><div class="doc" style="width:420px;padding:16px;display:flex;flex-direction:column;gap:8px"><div class="dcardw"><span class="dk">Le prix</span><div class="pair"><span>Vous imaginiez</span><b>700 000 €</b></div><div class="pair"><span>Prix affiché</span><b>740 000 €</b></div><div style="font-size:12.5px;font-weight:700;color:#013a58">+5,7 % par rapport à votre réponse · 5 481 €/m²</div></div></div></div>`;
files.push(
  sheet(
    'M148-6-synthese-la-couleur.html',
    'M148 · 6 — La synthèse au vendeur : le même code couleur sur chaque concurrent deviné',
    'Section « Les biens que nous avons regardés ensemble » (M113), à l’écran (lien public, 794 px = A4) et sur téléphone ; le PDF est l’impression de la même page. Démo de Vence, devinettes du Live du 08/11.',
    `<div class="rowf">${synthBefore}</div><div class="rowf">${synthDoc(794, 'Écran et PDF (A4, 794 px)')}${synthDoc(390, 'Téléphone · 390 px (lien public)')}</div>`,
    `<div class="note"><b>Avant</b> (<code>seller-synthesis-document.tsx</code>) : « Vous imaginiez », « Prix affiché », puis « +5,7 % par rapport à votre réponse » dans la couleur de l’agence, quel que soit l’écart.</div>
     <div class="note"><b>Après</b> :<ol><li>${p(1)} « Vous imaginiez » prend la couleur (vert, orange, rouge) et le bloc un trait de la même couleur à gauche.</li>
     <li>${p(2)} L’écart est écrit avec les mots du Live : « Prix affiché 5,7 % au-dessus de votre réponse » (question 2) — la couleur ne parle jamais seule, et la synthèse se lit en noir et blanc.</li>
     <li>${p(3)} Même règle, même service que le Live, sur les montants figés au Live (M96, M111) : la synthèse ne recalcule rien.</li>
     <li>${p(4)} Un « Non » : aucune couleur, aucun prix (M41, M104). Une réponse à 0 € ou une présentation directe : aucune couleur.</li></ol></div>
     <div class="note"><b>Aussi</b> : la fiche du « plus dangereux, selon vous » (même bloc). Le bilan « Vous avez sous-estimé 4 concurrents sur 6, de 6 % en moyenne » (M96) n’est pas coloré : la règle porte sur chaque réponse.</div>
     <div class="note"><b>Encre</b> : vert #047857, orange #b45309, rouge #b91c1c sur fond blanc (contraste ≥ 4,5 : 1, M143) ; à l’impression, <code>print-color-adjust: exact</code> comme le reste du document.</div>`,
  ),
);

// ================================================================================================
// 7 · La synthèse : la frise de « L'analyse des prix » (point 3) — prototype qui place vraiment
// ================================================================================================
// Les valeurs : le dossier 868af175 de l'essai (agence Start Academy, 08/11). Prix révélés au
// Live : 129 900, 134 000, 139 000, 149 000 € ; repères : Au début 149 000 €, Après le marché
// 129 000 €, Le plus dangereux selon vous 134 000 €, Prix des concurrents 127 992 €.
// Le « chemin de votre prix » : Au début 149 000 €, Après le marché 129 000 €, Convenu ensemble
// 129 000 €.
const CASES = {
  thouvenin: {
    prices: [129900, 134000, 139000, 149000],
    markers: [
      ['Au début', 149000, '#71717a'],
      ['Après le marché', 129000, '#0369a1'],
      ['Le plus dangereux selon vous', 134000, '#013a58'],
      ['Prix des concurrents', 127992, '#1e293b'],
    ],
  },
  chemin: {
    prices: [129900, 134000, 139000, 149000],
    markers: [
      ['Au début', 149000, '#71717a'],
      ['Après le marché', 129000, '#0369a1'],
      ['Convenu ensemble', 129000, '#1e293b'],
    ],
  },
  serre: {
    prices: [140000, 140500, 141000, 152000],
    markers: [
      ['Au début', 140200, '#71717a'],
      ['Après le marché', 140600, '#0369a1'],
      ['Le plus dangereux selon vous', 140500, '#013a58'],
      ['Prix des concurrents', 140900, '#1e293b'],
    ],
  },
};
const bandJs = `
const euro = (v) => new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(v).replace(/\\u202f/g,'\\u00a0') + '\\u00a0€';
function drawBand(el){
  const c = JSON.parse(el.dataset.case); const mode = el.dataset.mode;
  const W = el.clientWidth; const inner = mode === 'avant' ? W*0.76 : W; const off = mode === 'avant' ? W*0.12 : 0;
  const values = [...c.prices, ...c.markers.map(m=>m[1])];
  const lo = Math.min(...values), hi = Math.max(...values);
  const x = (v) => off + (hi>lo ? (v-lo)/(hi-lo) : .5) * inner;
  const line = 46 + (mode==='apres' ? 24 : 0);
  el.innerHTML = '';
  const add = (cls, style, html='') => { const d = document.createElement('div'); d.className = cls; Object.assign(d.style, style); d.innerHTML = html; el.appendChild(d); return d; };
  add('line', {top: line+'px', left: off+'px', width: inner+'px'});
  c.prices.forEach(v => add('pd', {left: x(v)+'px', top: (line+1)+'px'}));
  const boxes = [];
  if (mode === 'avant') {
    // Le code de main : au-dessus, au-dessous, au-dessus… dans l'ordre des repères, centrés.
    c.markers.forEach(([l,v,col],i) => { const below = i%2===1;
      const d = add('lab', {top: below ? (line+14)+'px' : (line-44)+'px', left: x(v)+'px', transform:'translateX(-50%)', color: col}, '<span>'+l+'</span><b>'+euro(v)+'</b>');
      add('tick', {left: x(v)+'px', top: below ? (line+2)+'px' : (line-12)+'px', height:'12px', background: col});
      boxes.push(d); });
    el.style.height = (line+50)+'px';
  } else {
    // Après : repères de même valeur fondus en un seul ; triés par valeur ; chaque étiquette prend
    // la première voie libre (au-dessus 1, au-dessous 1, au-dessus 2, au-dessous 2) ; près d'un
    // bord, elle s'ancre du côté où elle a la place (M115).
    const groups = [];
    [...c.markers].sort((a,b)=>a[1]-b[1]).forEach(m => { const g = groups.find(g => g.v === m[1]); if (g) { g.l.push(m[0]); } else groups.push({v:m[1], l:[m[0]], col:m[2]}); });
    const lanes = [[],[]]; const laneTop = [line-40, line+14];
    const placed = []; let crowded = false;
    groups.forEach(g => {
      const d = add('lab', {color: g.col, top:'0px', left:'0px'}, '<span>'+g.l.join(' · ')+'</span><b>'+euro(g.v)+'</b>');
      const w = d.offsetWidth; let left = x(g.v) - w/2; left = Math.max(0, Math.min(W - w, left));
      const lane = lanes.findIndex(bx => bx.every(b => left >= b.r + 8 || left + w <= b.l - 8));
      if (lane < 0) crowded = true; else lanes[lane].push({l:left, r:left+w});
      placed.push({d, g, left, lane});
    });
    if (!crowded) {
      placed.forEach(({d, g, left, lane}) => { d.style.left = left+'px'; d.style.top = laneTop[lane]+'px';
        const above = lane === 0; const t1 = above ? laneTop[lane]+30 : line+3; const t2 = above ? line-1 : laneTop[lane];
        add('tick', {left: (x(g.v)-1)+'px', top: t1+'px', height: Math.max(4, t2-t1)+'px', background: g.col}); boxes.push(d); });
    } else {
      // Trop serré pour écrire chaque étiquette sur la frise : des repères numérotés, et la légende
      // dessous, une ligne par repère. Deux numéros trop proches montent l'un au-dessus de l'autre.
      placed.forEach(({d}) => d.remove());
      const circles = [];
      placed.forEach(({g}, i) => { let top = line-28; while (circles.some(c => Math.abs(c.x - x(g.v)) < 20 && c.top === top)) top -= 22;
        circles.push({x: x(g.v), top});
        const c = add('lab', {left: (x(g.v)-10)+'px', top: top+'px', width:'20px', height:'20px', borderRadius:'50%', background: g.col, color:'#fff', fontWeight:'800', fontSize:'11px', lineHeight:'18px', padding:'0'}, String(i+1));
        boxes.push(c);
        add('tick', {left: (x(g.v)-1)+'px', top: (top+20)+'px', height: Math.max(3, line-top-20)+'px', background: g.col}); });
      const lg = add('lab', {left:'0px', top:(line+16)+'px', textAlign:'left', display:'flex', flexWrap:'wrap', gap:'4px 16px', width: W+'px', whiteSpace:'normal'},
        placed.map(({g},i) => '<span style="color:'+g.col+'"><b style="display:inline-block;width:16px;height:16px;border-radius:50%;background:'+g.col+';color:#fff;text-align:center;font-size:10px;line-height:16px;margin-right:4px">'+(i+1)+'</b>'+g.l.join(' · ')+' : <b style="display:inline">'+euro(g.v)+'</b></span>').join(''));
    }
    el.style.height = (line+64)+'px';
  }
  // Contrôle : deux étiquettes qui se touchent sont entourées de rouge.
  for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) { const a = boxes[i].getBoundingClientRect(), b = boxes[j].getBoundingClientRect();
    if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) { boxes[i].classList.add('clash'); boxes[j].classList.add('clash'); el.dataset.clash = '1'; } }
  const ends = el.nextElementSibling; ends.innerHTML = '<span>'+euro(mode==='avant' ? Math.min(...c.prices) : lo)+'</span><span>'+euro(mode==='avant' ? Math.max(...c.prices) : hi)+'</span>';
  if (mode==='avant') { ends.style.margin = '2px 12% 0'; }
}
document.fonts.ready.then(() => document.querySelectorAll('.band').forEach(drawBand));
`;
const bandBlock = (w, mode, key, title, kick) =>
  `<div><div class="ft"><span class="st ${mode === 'avant' ? 'av' : 'ap'}">${mode === 'avant' ? 'AVANT' : 'APRÈS'}</span>${title}</div><div class="doc" style="width:${w}px;padding:${w > 500 ? 28 : 14}px"><div class="dcardw" style="background:#fff"><span class="dk">${kick}</span><div class="band" data-mode="${mode}" data-case='${JSON.stringify(CASES[key])}'></div><div class="ends"></div></div></div></div>`;
const bandSheet = `<h1 class="sheet">M148 · 7 — La synthèse : la frise de « L’analyse des prix » sans chevauchement, l’échelle couvre tout</h1><p class="sub">Le dossier 868af175 de l’essai (08/11, M. Thouvenin) : prix révélés 129 900, 134 000, 139 000 et 149 000 € ; repères Au début 149 000 €, Après le marché 129 000 €, Le plus dangereux 134 000 €, Prix des concurrents 127 992 €. Les frises ci-dessous sont dessinées par le navigateur avec les vraies largeurs de texte : à gauche le calcul de main, à droite la proposition. Une étiquette qui en touche une autre est entourée de rouge.</p>
<div class="layout"><div class="col">
<div class="rowf">${bandBlock(794, 'avant', 'thouvenin', 'Écran et PDF (A4) — le dossier 868af175', 'Les prix affichés des biens que vous avez vus')}${bandBlock(794, 'apres', 'thouvenin', 'Écran et PDF (A4) — le dossier 868af175', 'Les prix affichés des biens que vous avez vus')}</div>
<div class="rowf">${bandBlock(794, 'avant', 'serre', 'Prix très proches (le cas du test)', 'Les prix affichés des biens que vous avez vus')}${bandBlock(794, 'apres', 'serre', 'Prix très proches (le cas du test)', 'Les prix affichés des biens que vous avez vus')}</div>
<div class="rowf">${bandBlock(794, 'apres', 'chemin', '« Le chemin de votre prix » — deux repères au même prix', 'Les étapes de votre prix')}${bandBlock(390, 'apres', 'thouvenin', 'Téléphone · 390 px (lien public)', 'Les prix affichés')}${bandBlock(390, 'avant', 'thouvenin', 'Téléphone, avant', 'Les prix affichés')}</div>
</div><div class="notes">
<div class="note"><b>Ce qui casse aujourd’hui</b> (<code>PriceBand</code>, <code>seller-synthesis-document.tsx</code>) :<ol><li>Les repères sont placés sur l’échelle de TOUS les prix (repères compris), mais les bornes écrites dessous ne lisent que les prix des concurrents : « 129 900 € … 149 000 € » alors que deux repères sont à 127 992 et 129 000 € — ils paraissent hors de l’échelle.</li><li>Les étiquettes alternent dessus / dessous selon leur RANG dans la liste, jamais selon leur place : deux prix proches du même côté se recouvrent, et une étiquette près d’un bord sort de la frise (les 12 % de marge ne suffisent pas à « Le plus dangereux selon vous »).</li></ol></div>
<div class="note"><b>Après</b> :<ol><li>${p(1)} L’échelle va du plus petit au plus grand de TOUT ce qui est montré (prix et repères), et ses bornes écrites sont ces deux montants : rien ne sort.</li><li>${p(2)} Deux repères au même montant n’ont qu’une étiquette : « Après le marché · Convenu ensemble 129 000 € ».</li><li>${p(3)} Chaque étiquette, rangée par montant, prend la première place libre : au-dessus de la frise, sinon au-dessous ; un trait la relie à son repère ; près d’un bord, elle s’ancre du côté où elle a la place (comme M115 au Live).</li><li>${p(4)} Si les étiquettes ne tiennent pas sur ces deux rangées (prix très proches), la frise porte des repères numérotés ①②③④ et la légende dessous dit chacun avec son montant — jamais deux textes l’un sur l’autre.</li><li>${p(6)} La frise ne coupe jamais une page (M113) ; la même règle vaut pour la frise du « chemin de votre prix ».</li></ol></div>
<div class="note"><b>Le test</b> : un service pur (<code>band-labels</code>) range les étiquettes à partir de leur largeur estimée et de la largeur de la frise ; le test, avec des prix à 100 € les uns des autres et quatre repères, vérifie qu’aucune boîte n’en touche une autre à 390 px et à 794 px, et que l’échelle contient chaque prix et chaque repère. Les e2e lisent la synthèse de la démo et mesurent les boîtes dans le navigateur.</div>
<div class="note"><b>Le Live</b> (« Analyse des prix ») n’a pas ce défaut : son échelle couvre déjà tous les repères et seul « Le plus dangereux » y est écrit, les autres dans la légende. Il ne change pas.</div>
<div class="note"><b>125 000 €</b> : sur ce dossier, c’est l’« Analyse du conseiller », dans sa carte sous la frise ; ce n’est pas un repère de la frise — question 8.</div>
</div></div><script>${bandJs}</script>`;
writeFileSync(join(here, 'M148-7-synthese-la-frise.html'), page('M148 · 7 — la frise', bandSheet));
files.push('M148-7-synthese-la-frise.html');

// ================================================================================================
if (process.argv.includes('--png')) {
  const { chromium } = await import(
    pathToFileURL(join(here, '../../node_modules/playwright/index.mjs')).href
  );
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  for (const name of files) {
    await tab.goto(pathToFileURL(join(here, name)).href);
    await tab.evaluate(() => document.fonts.ready);
    await tab.waitForTimeout(300);
    const problems = await tab.evaluate(() => {
      const out = [];
      document.querySelectorAll('[data-frame]').forEach((frame, i) => {
        const s = frame.querySelector('.screen');
        if (s.scrollHeight > s.clientHeight + 1) {
          frame.classList.add('overflowing');
          out.push(`écran ${i + 1} : ${s.scrollHeight - s.clientHeight} px de trop`);
        }
      });
      document.querySelectorAll('.band[data-mode="apres"][data-clash]').forEach(() => out.push('frise : étiquettes qui se touchent'));
      return out;
    });
    console.log(`${name} : ${problems.length ? problems.join(' ; ') : 'tout tient'}`);
    await tab.screenshot({ path: join(here, name.replace('.html', '.png')), fullPage: true });
  }
  await browser.close();
}
