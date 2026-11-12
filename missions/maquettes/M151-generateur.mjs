// Mission 151 — générateur des maquettes « L'acquéreur depuis mes notes » (demande de Jean-Guy, 10/11).
// `node missions/maquettes/M151-generateur.mjs --png` écrit M151-1 à M151-4, en HTML et en PNG
// (Chromium du dépôt). Chaque planche : ordinateur (1280), tablette (820), téléphone (390), et les
// notes avant / après. Tout est inventé : les notes manuscrites, M. et Mme Arnaud (06 39 98, plage
// réservée à la fiction), les annonces et leurs citations ; les photos sont celles de la démo (CC0).
//
// AVANT = `main` au 10/11 (3b45ea9) : « Nouvel acquéreur » ouvre la saisie rapide (M132) ; la fiche
// acquéreur suit la M130 B / M143 ; les biens idéaux rangent par catégorie (M118), puis par % (M71),
// puis par prix. Menu en trois groupes (M145 B, M149). Charte par défaut (brand-deep #00527a).

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fonts = pathToFileURL(join(here, '../../src/features/branding/fonts')).href;
const photos = pathToFileURL(join(here, '../../public/demo/photos')).href;

const C = {
  deep: '#00527a',
  soft: '#eaf5ff',
  ink: '#18181b',
  z700: '#3f3f46',
  z600: '#52525b',
  z500: '#71717a',
  z200: '#e4e4e7',
  z100: '#f4f4f5',
  page: '#f7f8fb',
  green: '#12875a',
  greenSoft: '#e7f6ee',
  orange: '#c2410c',
  orangeSoft: '#fff1e6',
  verify: '#8a5a00',
  verifySoft: '#fff4d6',
  star: '#fdf0c4',
  note: '#fef6c7',
  noteLine: '#e8cf5a',
  noteInk: '#5b4a00',
  ink2: '#1d3d8f',
};

// ---------------------------------------------------------------------------------------------
// Le cadre de l'application : menu de gauche (ordinateur, tablette) ou barre compacte (téléphone).

const GROUPS = [
  [null, [['Aujourd’hui', 'Ce qu’il y a à faire', '3']]],
  [
    'Vendeurs',
    [
      ['Préparation', 'Dossiers vendeurs'],
      ['Live', 'Rendez-vous vendeur'],
      ['Suivi', 'Après le rendez-vous'],
    ],
  ],
  [
    'Acquéreurs',
    [
      ['Acquéreurs', 'Ce que chacun cherche', null, true],
      ['Visites', 'À planifier, faites, retours'],
    ],
  ],
  ['Les deux', [['Prospection', 'Courriers et passages']]],
];

const logo = `<span class="logo"><svg width="30" height="20" viewBox="6 20 52 34"><path d="M18 34a14 14 0 0 1 28 0z" fill="#e8a33d"/><path d="M8 36h48" stroke="${C.deep}" stroke-width="3.2" stroke-linecap="round"/><path d="M12 43c4-2.6 8-2.6 12 0s8 2.6 12 0 8-2.6 12 0" fill="none" stroke="${C.deep}" stroke-width="2.6" stroke-linecap="round"/></svg><span><b>HORIZON</b><i>CÔTE D’AZUR</i></span></span>`;

const side = `<aside class="side">${logo}<nav>${GROUPS.map(
  ([label, items], i) =>
    `<div class="grp${i ? ' sep' : ''}">${label ? `<span class="gt">${label}</span>` : ''}${items
      .map(
        ([l, h, b, a]) =>
          `<a class="it${a ? ' on' : ''}"><span class="il">${l}${b ? `<span class="pb">${b}</span>` : ''}</span><span class="ih">${h}</span></a>`,
      )
      .join('')}</div>`,
).join('')}</nav><div class="acc"><span class="av">CM</span><span><b>Claire Martin</b><br>Agence Horizon Côte d’Azur</span></div></aside>`;

const frame = (device, body, { bar = '' } = {}) =>
  device === 'phone'
    ? `<div class="frame phone"><div class="topbar">${logo}<span class="pb">3</span><span class="burger">☰</span></div><div class="main">${body}</div>${bar}</div>`
    : `<div class="frame ${device}">${side}<div class="main">${body}</div>${bar}</div>`;

const DEVICE = { desk: 'Ordinateur · 1280', tab: 'Tablette · 820', phone: 'Téléphone · 390' };
const titled = (device, html, extra = '') =>
  `<div class="col"><div class="ftitle"><span class="st">APRÈS</span>${DEVICE[device]}${extra}</div>${html}</div>`;

// ---------------------------------------------------------------------------------------------
// Les notes manuscrites inventées (une photo prise au téléphone, en biais).

const NOTES_LINES = [
  ['<u>ARNAUD</u> (M. et Mme)  06 39 98 27 14', ''],
  ['Maison 4-5 p — 3 ch mini', ''],
  ['Vence / St-Paul / Tourrettes', ''],
  ['750 max (idéal 700)', ''],
  ['Jardin +++  piscine pas obligatoire', ''],
  ['<b>AU CALME</b> — pas de route, pas de vis-à-vis', 'em'],
  ['maison de caractère, du cachet', 'em'],
  ['(pierres, poutres…)', ''],
  ['Mme enceinte → plain-pied', 'sens'],
  ['pas de gros travaux', ''],
  ['accord banque OK', ''],
  ['M. très pressé, un peu difficile', 'sens'],
  ['visites le samedi', ''],
];

const notesPhoto = (size = 'l', marks = false) =>
  `<div class="photo ${size}"><div class="paper">${NOTES_LINES.map(
    ([t, k]) => `<div class="hl${marks && k === 'sens' ? ' sens' : ''}">${t}</div>`,
  ).join('')}</div></div>`;

// ---------------------------------------------------------------------------------------------
// Planche 1 — « Nouvel acquéreur » : depuis mes notes, et la lecture.

const ICON = {
  photo:
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/></svg>',
  file: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
  text: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 6h14M5 10h14M5 14h9M5 18h6"/></svg>',
};

const tile = (icon, label, hint) =>
  `<button class="tile">${ICON[icon]}<span><b>${label}</b><small>${hint}</small></span></button>`;

const intake = `
  <a class="back">← Acquéreurs</a>
  <h1 class="h1">Nouvel acquéreur</h1>
  <section class="card">
    <h2 class="h2">Depuis mes notes</h2>
    <p class="lead">Vos notes papier, la fiche de votre logiciel ou un texte : l’outil propose la fiche, vous la vérifiez.</p>
    <div class="tiles">
      ${tile('photo', 'Prendre une photo', 'de vos notes')}
      ${tile('file', 'Déposer un fichier', 'PDF, image, capture')}
      ${tile('text', 'Coller un texte', 'e-mail, message, CRM')}
    </div>
    <p class="warn">Vos notes sont lues par un service d’intelligence artificielle, qui propose une fiche : vous la vérifiez avant de l’enregistrer. La photo n’est pas gardée. Ne photographiez pas d’information sur la santé, la religion ou la vie privée de vos clients.</p>
  </section>
  <div class="or"><span>ou saisissez-le en 30 secondes</span></div>
  <section class="card quick">
    <label class="f"><span>Nom</span><i class="in">M. et Mme …</i></label>
    <label class="f"><span>Téléphone</span><i class="in">06 …</i></label>
    <div class="f"><span>Type</span><div class="seg"><b>Maison</b><b>Appartement</b></div></div>
    <div class="f"><span>Secteur</span><div class="chips"><b>Vence</b><b>Saint-Paul-de-Vence</b><b>Antibes</b><b>+ 5</b></div></div>
    <div class="actions"><button class="btn fill">Enregistrer</button></div>
  </section>`;

const reading = `
  <a class="back">← Acquéreurs</a>
  <h1 class="h1">Nouvel acquéreur</h1>
  <section class="card center">
    ${notesPhoto('m')}
    <div class="progress"><span></span></div>
    <p class="big">Lecture de vos notes…</p>
    <p class="muted">Quelques secondes. Rien n’est enregistré avant votre accord.</p>
    <button class="btn link">Annuler</button>
  </section>`;

const sheet1 = {
  title: 'M151 · 1 — « Nouvel acquéreur » depuis mes notes',
  sub: 'En tête de la page « Nouvel acquéreur » (M132), trois façons d’apporter ses notes ; la saisie rapide reste dessous, inchangée. Puis la lecture. Sur une fiche existante, « Compléter depuis mes notes » ouvre le même écran.',
  rows: [
    [titled('desk', frame('desk', intake))],
    [
      titled('tab', frame('tab', intake)),
      titled('phone', frame('phone', intake)),
      titled('phone', frame('phone', reading), ' · pendant la lecture'),
    ],
  ],
  notes: [
    [
      'Avant',
      '« Nouvel acquéreur » n’ouvre que la saisie rapide (M132) : le conseiller recopie à la main ce qu’il a déjà écrit sur son carnet ou dans son logiciel, et « au calme », « du cachet » n’ont aucune place.',
    ],
    [
      'Après',
      '« Depuis mes notes » en tête : <b>Prendre une photo</b> (l’appareil du téléphone ou de la tablette s’ouvre), <b>Déposer un fichier</b> (le PDF d’un CRM est lu dans le navigateur, seul son texte part, M43 ; une image ou un PDF scanné part comme image), <b>Coller un texte</b>.',
    ],
    [
      'Un seul plein',
      'Les trois tuiles sont en contour ; le seul bouton plein reste « Enregistrer » de la saisie rapide (M146). Sur ordinateur, « Prendre une photo » ouvre le choix de fichier.',
    ],
    [
      'L’avertissement',
      'La phrase sous les tuiles est celle proposée au juriste (<code>M151-confidentialite-pour-le-juriste.md</code>) : elle attend son accord.',
    ],
    [
      'La lecture',
      'Un seul appel, quelques secondes, la photo à l’écran. « Annuler » n’écrit rien. Budget du mois atteint : « Budget de lecture du mois atteint : saisissez la fiche à la main », et la saisie rapide reste là.',
    ],
  ],
};

// ---------------------------------------------------------------------------------------------
// Planche 2 — la fiche pré-remplie à vérifier.

const pill = '<span class="pill">À vérifier</span>';
const field = (label, value, from, opts = {}) =>
  `<div class="pf${opts.star ? ' star' : ''}${opts.empty ? ' empty' : ''}"><div class="pfh"><span class="pl">${label}</span>${opts.empty ? '' : pill}</div><div class="pv">${opts.star ? '<span class="st2">★</span>' : ''}${value}</div>${from ? `<div class="from">d’après : « ${from} »</div>` : ''}</div>`;

const soft = (label, words, verify = true) =>
  `<div class="soft"><div class="sh"><b>${label}</b>${verify ? pill : ''}</div><div class="words">« ${words} »</div></div>`;

const proposal = (device) => `
  <a class="back">← Acquéreurs</a>
  <div class="ph"><h1 class="h1">Vérifiez la fiche proposée</h1><span class="count">15 champs proposés · tous à vérifier</span></div>
  <p class="keep"><span class="ki">i</span>Cette proposition n’est pas gardée : si vous quittez ou rechargez la page, elle sera perdue.</p>
  <div class="two">
    <aside class="src">${device === 'phone' ? '<button class="btn ghost wide">Voir vos notes</button>' : `${notesPhoto('s')}<p class="muted sm">Vos notes · la photo n’est pas gardée</p>`}</aside>
    <div class="form">
      <section class="card">
        <h2 class="h3">Qui</h2>
        <div class="grid">
          ${field('Nom', 'M. et Mme Arnaud', 'ARNAUD (M. et Mme)')}
          ${field('Téléphone', '06 39 98 27 14', '06 39 98 27 14')}
          ${field('E-mail', '—', null, { empty: true })}
          ${field('Financement', 'Validé', 'accord banque OK')}
        </div>
      </section>
      <section class="card">
        <h2 class="h3">Ce qu’ils cherchent</h2>
        <div class="grid">
          ${field('Type', 'Maison', 'Maison 4-5 p')}
          ${field('Communes', 'Vence · Saint-Paul-de-Vence · Tourrettes-sur-Loup', 'Vence / St-Paul / Tourrettes')}
          ${field('Budget', 'idéal 700 000 € · plafond 750 000 €', '750 max (idéal 700)')}
          ${field('Pièces · chambres', '4 pièces · 3 chambres au moins', '4-5 p — 3 ch mini')}
          ${field('Extérieur', 'Oui', 'Jardin +++', { star: true })}
          ${field('Piscine', 'Souhaitée, pas indispensable', 'piscine pas obligatoire')}
          ${field('Copropriété acceptée', '—', null, { empty: true })}
          ${field('Notes', 'Disponibles pour visiter le samedi', 'visites le samedi')}
        </div>
      </section>
      <section class="card">
        <h2 class="h3">Ce qui compte pour eux</h2>
        <p class="muted sm">Leurs mots. Ces critères rangent les biens trouvés et disent pourquoi ; ils n’en écartent aucun.</p>
        <div class="softs">
          ${soft('Au calme', 'AU CALME — pas de route')}
          ${soft('Sans vis-à-vis', 'pas de vis-à-vis')}
          ${soft('Du cachet, de caractère', 'maison de caractère, du cachet (pierres, poutres…)')}
          ${soft('De plain-pied', 'plain-pied')}
          ${soft('Prêt à vivre, sans travaux', 'pas de gros travaux')}
        </div>
        <p class="skipped">2 mentions personnelles n’ont pas été relevées.</p>
      </section>
    </div>
  </div>`;

const proposalBar = `<div class="bar"><span class="bstate">Rien n’est enregistré avant votre accord</span><button class="btn link">Annuler</button><button class="btn ghost">Recommencer la lecture</button><button class="btn fill">Créer la fiche</button></div>`;
const proposalBarPhone = `<div class="bar"><button class="btn link">Annuler</button><button class="btn fill">Créer la fiche</button></div>`;

// La confirmation avant de quitter (Jean-Guy, 12/11), par-dessus la proposition.
const leaveDialog = `<div class="ovl"><div class="dlg" role="dialog"><h2 class="dt">Quitter sans créer la fiche ?</h2><p class="dx">La proposition sera perdue : rien n’a été enregistré. Pour la retrouver, il faudra relancer la lecture de vos notes.</p><div class="da"><button class="btn focus">Rester</button><button class="btn danger">Quitter</button></div></div></div>`;
const withDialog = (device) =>
  frame(device, proposal(device), { bar: (device === 'phone' ? proposalBarPhone : proposalBar) + leaveDialog });

const sheet2 = {
  title: 'M151 · 2 — La fiche pré-remplie à vérifier',
  sub: 'Ce que l’outil a lu dans les notes de la planche 1. Chaque champ porte « À vérifier » et la ligne des notes d’où il vient ; « Ce qui compte pour eux » garde leurs mots ; ce qui touche la vie privée n’est pas relevé, et l’écran le dit sans le répéter.',
  rows: [
    [titled('desk', frame('desk', proposal('desk'), { bar: proposalBar }))],
    [
      titled('tab', frame('tab', proposal('tab'), { bar: proposalBar })),
      titled('phone', frame('phone', proposal('phone'), { bar: proposalBarPhone })),
    ],
    [
      titled('desk', withDialog('desk'), ' · un lien du menu touché'),
      titled('phone', withDialog('phone'), ' · « Annuler » touché'),
    ],
  ],
  notes: [
    [
      'Avant',
      'Rien : la fiche se saisit à la main (M117, M132), et ce qui ne rentre dans aucun champ va dans « Notes » ou se perd.',
    ],
    [
      'Après — les champs',
      'Les champs de la fiche d’aujourd’hui, plus un : <b>Copropriété acceptée</b> (oui / non / non renseigné, ★ possible), un vrai critère (Jean-Guy, 10/11). Chacun : sa valeur, « À vérifier » et « d’après : « … » », la ligne de ses notes. Un champ que les notes ne disent pas reste vide (l’e-mail, la copropriété), jamais deviné (M38). Le ★ proposé (« Jardin +++ » → extérieur indispensable) est à vérifier comme le reste. Le financement « Validé » n’est proposé que si les notes le disent clairement (« accord banque OK »), et passe par l’action de la M132 au moment de créer la fiche.',
    ],
    [
      'Ce qui compte pour eux',
      'Cinq critères doux reconnus dans la liste fermée de Jean-Guy (10/11) — au calme, sans vis-à-vis, du cachet, lumineux, une vue, de plain-pied, traversant, commerces et écoles à pied, un jardin sans gros entretien, prêt à vivre (sans travaux) —, chacun avec leurs mots tels qu’écrits. Ils ne filtrent pas la recherche : ils rangent (planche 4). « pas de gros travaux » donne <b>Prêt à vivre</b>, un critère doux ; « Travaux acceptés : non », qui écarte avec un ★, n’est proposé que si les notes le disent sans nuance (« aucun travaux »).',
    ],
    [
      'Notes',
      'Seulement des faits pratiques — disponibilités pour visiter, contraintes —, « À vérifier » (Jean-Guy, 10/11) : « visites le samedi » devient « Disponibles pour visiter le samedi ». Jamais une remarque sur la personne.',
    ],
    [
      'Ce qui n’est pas relevé',
      '« Mme enceinte → plain-pied » donne <b>De plain-pied</b>, jamais la raison ; « M. très pressé, un peu difficile » n’est pas relevé : c’est un jugement. La ligne grise dit seulement « 2 mentions personnelles n’ont pas été relevées », sans les répéter.',
    ],
    [
      'Valider',
      '« Créer la fiche », le seul plein (M146), dans une barre fixée à la fenêtre (comme la fiche du bien, M77). Après : les champs gardent « À vérifier » sur la fiche jusqu’à ce que le conseiller les touche ou dise « Tout est juste » (M97). « Recommencer la lecture » refait l’appel (budget). Sur une fiche existante, une valeur différente se lit « 650 000 € → 750 000 € », décochée par défaut (Jean-Guy, 10/11).',
    ],
    [
      'Nouveau (12/11) — l’avertissement',
      'Rien de la proposition n’est gardé, sources comprises (principe 2, Jean-Guy, 12/11) : sous le titre, une ligne discrète, toujours visible à l’arrivée, « Cette proposition n’est pas gardée : si vous quittez ou rechargez la page, elle sera perdue. » La barre garde « Rien n’est enregistré avant votre accord ».',
    ],
    [
      'Nouveau (12/11) — quitter',
      'Tout départ sans « Créer la fiche » demande confirmation : un lien de l’application (menu compris), « ← Acquéreurs » et « Annuler » ouvrent la confirmation dans l’écran (`confirm-dialog`, M146 A, jamais la boîte du navigateur) — « Quitter sans créer la fiche ? », « La proposition sera perdue : rien n’a été enregistré. Pour la retrouver, il faudra relancer la lecture de vos notes. », <b>Rester</b> (le focus, Échap) et <b>Quitter</b> en contour rouge, aucun plein. L’actualisation et la fermeture de l’onglet passent par la confirmation du navigateur, la seule possible (M93) ; le bouton « Précédent » du navigateur n’est pas couvert (M93). « Créer la fiche » ne demande rien. <b>À valider</b> : la fiche du 12/11 disait que « Annuler » ne demandait pas ; je propose qu’il demande aussi, puisqu’il fait perdre la proposition et qu’une nouvelle lecture se repaie.',
    ],
    [
      'Téléphone et tablette',
      'Sur téléphone, « Voir vos notes » ouvre la photo par-dessus ; les champs passent sur une colonne. Sur tablette, la photo reste à gauche, plus petite.',
    ],
  ],
};

// ---------------------------------------------------------------------------------------------
// Planche 3 — « Ce qui compte pour eux » sur la fiche acquéreur.

const steps = `<div class="steps"><div class="step now"><b>1 · Sélection</b><small>à faire</small></div><div class="step"><b>2 · Présentée</b><small>—</small></div><div class="step"><b>3 · Visite</b><small>—</small></div><div class="step"><b>4 · Offre</b><small>—</small></div><div class="step"><b>5 · Compromis</b><small>—</small></div></div>`;

const softRow = (label, words) =>
  `<li><span class="sl"><b>${label}</b>${pill}</span><span class="words">« ${words} »</span></li>`;

const buyerFiche = `
  <a class="back">← Acquéreurs</a>
  <section class="card head">
    <div class="hl1"><h1 class="h1">M. et Mme Arnaud</h1><span class="badge g">Prêt à visiter</span><span class="badge y">À vérifier · 15 <u>Tout est juste</u></span></div>
    <p class="said">« Une maison de <b>4 pièces</b> à <b>Vence, Saint-Paul-de-Vence ou Tourrettes-sur-Loup</b>, avec un <b>extérieur</b>, jusqu’à <b>750 000 €</b>. »</p>
    <div class="chips"><b class="s">★ Extérieur</b><b>Maison</b><b>3 chambres+</b><b>Piscine souhaitée</b><b class="lnk">Modifier</b></div>
    <div class="contact"><button class="btn ghost">☎ 06 39 98 27 14</button><span class="muted sm">Fiche du 10/11 · depuis vos notes</span></div>
    <p class="sm"><b>Notes :</b> Disponibles pour visiter le samedi ${pill}</p>
  </section>
  ${steps}
  <div class="two r">
    <div class="form">
      <section class="card">
        <div class="ch"><h2 class="h2">Ce qui compte pour eux</h2><a class="lnk">Modifier</a></div>
        <p class="muted sm">Leurs mots. Les biens trouvés sont rangés d’après eux, avec la raison ; aucun bien n’est écarté pour eux.</p>
        <ul class="softlist">
          ${softRow('Au calme', 'AU CALME — pas de route')}
          ${softRow('Sans vis-à-vis', 'pas de vis-à-vis')}
          ${softRow('Du cachet, de caractère', 'maison de caractère, du cachet (pierres, poutres…)')}
          ${softRow('De plain-pied', 'plain-pied')}
          ${softRow('Prêt à vivre, sans travaux', 'pas de gros travaux')}
        </ul>
      </section>
      <section class="card">
        <h2 class="h2">Ce qui s’est passé</h2>
        <ul class="log"><li><span>aujourd’hui</span>Fiche créée depuis vos notes (photo) · 15 champs proposés, 15 gardés</li></ul>
      </section>
    </div>
    <aside class="nextc">
      <span class="kick">Prochaine étape</span>
      <h2>Trouver leurs biens idéaux</h2>
      <p>Ce que l’agence a déjà, puis le marché, rangés par ce qui compte pour eux.</p>
      <button class="btn white">Trouver leurs biens idéaux</button>
    </aside>
  </div>`;

const sheet3 = {
  title: 'M151 · 3 — « Ce qui compte pour eux » sur la fiche acquéreur',
  sub: 'La fiche des Arnaud juste après « Créer la fiche ». Un bloc de plus, sous l’en-tête de la M130 B / M143 ; le reste de la fiche ne change pas.',
  rows: [
    [titled('desk', frame('desk', buyerFiche))],
    [titled('tab', frame('tab', buyerFiche)), titled('phone', frame('phone', buyerFiche))],
  ],
  notes: [
    [
      'Avant',
      'La fiche n’a que ses champs et ses ★ (M117) ; « au calme », « du cachet » finissent dans « Notes », que rien ne lit. (« Ce qui compte pour lui » de la M142, ★ du secteur, a été retiré par la M147 A ; ses colonnes partent avec leur migration : on ne les reprend pas.)',
    ],
    [
      'Après',
      '« Ce qui compte pour eux » : chaque critère doux, son libellé de la liste fermée (dix, Jean-Guy, 10/11) et leurs mots. « Modifier » ouvre la liste : cocher, décocher, corriger leurs mots (80 caractères). Un critère saisi à la main n’a pas de pastille. Les « Notes » proposées (faits pratiques seulement) gardent leur pastille sous l’en-tête.',
    ],
    [
      'À vérifier',
      'Le compteur « À vérifier · 15 » et « Tout est juste », comme les fiches importées (M97) ; la pastille d’un champ part quand le conseiller le modifie.',
    ],
    [
      'Ce qui s’est passé',
      '« Fiche créée depuis vos notes (photo) · 15 champs proposés, 15 gardés » : la trace de la lecture, sans le contenu des notes.',
    ],
    [
      'Un seul plein',
      'La prochaine étape (M130 B), inchangée. Les critères doux ne changent ni le statut ni « Prêt à visiter » (M132).',
    ],
  ],
};

// ---------------------------------------------------------------------------------------------
// Planche 4 — un bien idéal avec la raison de son rang.

const why = (rows) =>
  `<ul class="why">${rows.map(([k, label, text]) => `<li class="${k}"><span class="mk">${{ y: '✓', r: '≈', n: '?', x: '✗' }[k]}</span><b>${label}</b><span>${text}</span></li>`).join('')}</ul>`;

const idealCard = ({ rank, img, title, price, priceNote, crit, rows, open = true }) => `
  <article class="ic">
    <div class="ich"><span class="rank">${rank}</span><img src="${photos}/${img}" alt=""><div class="it2"><b>${title}</b><small>${crit} · affiché le 10/11 · Marché</small></div><div class="pr"><b>${price}</b><small class="${priceNote[0]}">${priceNote[1]}</small></div><label class="cb"><i></i>Retenir</label></div>
    ${open ? `<div class="whyb"><span class="wt">Pourquoi ${rank === '1' ? '1<sup>er</sup>' : `${rank}<sup>e</sup>`}</span>${why(rows)}</div>` : `<div class="whyb short"><span class="wt">Pourquoi ${rank}<sup>e</sup></span><span class="muted sm">${rows}</span></div>`}
  </article>`;

const ideal = `
  <a class="back">← M. et Mme Arnaud</a>
  <div class="ph"><h1 class="h1">Leurs biens idéaux</h1><span class="count">Maison · Vence, Saint-Paul-de-Vence, Tourrettes-sur-Loup · jusqu’à 750 000 €</span></div>
  <div class="order">Rangés par <b>ce qui compte pour eux</b> — au calme, sans vis-à-vis, du cachet, de plain-pied, prêt à vivre —, puis par ressemblance, puis par prix. <b>Aucun bien n’est écarté pour ces critères.</b></div>
  <h2 class="cat">Correspondance forte · 3</h2>
  ${idealCard({
    rank: '1',
    img: 'maison-03.jpg',
    title: 'Maison · 5 pièces · 150 m² · Vence',
    price: '735 000 €',
    priceNote: ['g', '15 000 € sous le budget'],
    crit: '8 critères sur 8',
    rows: [
      ['y', 'Au calme', 'l’annonce dit « calme absolu, aucun passage »'],
      ['y', 'Du cachet', '« plafond aux poutres apparentes, belle cheminée en pierre »'],
      ['y', 'De plain-pied', '« entièrement de plain-pied »'],
      ['y', 'Prêt à vivre', '« aucuns travaux à prévoir »'],
      ['n', 'Sans vis-à-vis', 'l’annonce n’en dit rien'],
    ],
  })}
  ${idealCard({
    rank: '2',
    img: 'maison-06.jpg',
    title: 'Maison · 4 pièces · 128 m² · Saint-Paul-de-Vence',
    price: '710 000 €',
    priceNote: ['g', '40 000 € sous le budget'],
    crit: '8 critères sur 8',
    rows: [
      ['r', 'Au calme', 'avec réserve : « quartier résidentiel calme » mais « à deux pas de la route de La Colle »'],
      ['y', 'Sans vis-à-vis', '« sans aucun vis-à-vis »'],
      ['x', 'Du cachet', 'le contraire : « villa contemporaine achevée en 2024 »'],
      ['n', 'De plain-pied', 'l’annonce n’en dit rien'],
      ['n', 'Prêt à vivre', 'l’annonce n’en dit rien'],
    ],
  })}
  ${idealCard({ rank: '3', img: 'maison-02.jpg', title: 'Maison · 4 pièces · 135 m² · Vence', price: '745 000 €', priceNote: ['g', '5 000 € sous le budget'], crit: '8 critères sur 8', rows: 'L’annonce ne dit rien de ce qui compte pour eux · Voir', open: false })}
  <h2 class="cat">Bon compromis · 4</h2>
  <div class="stubc"></div>`;

const sheet4 = {
  title: 'M151 · 4 — Un bien idéal, et la raison de son rang',
  sub: '« Trouver leurs biens idéaux » (M118) pour les Arnaud. Les catégories ne changent pas ; à l’intérieur de chacune, ce qui compte pour eux range les biens, et chaque carte dit pourquoi, avec les mots de l’annonce. Annonces et citations inventées pour la maquette.',
  rows: [
    [titled('desk', frame('desk', ideal))],
    [titled('tab', frame('tab', ideal)), titled('phone', frame('phone', ideal))],
  ],
  notes: [
    [
      'Avant',
      'Dans une catégorie, l’ordre est le % de ressemblance (M71), puis le prix : deux maisons à 8 critères sur 8 se départagent au prix, et rien ne dit laquelle est au calme.',
    ],
    [
      'Après — le rang',
      'La catégorie d’abord (les indispensables, M118, inchangés) ; puis ce qui compte pour eux ; puis le %, puis le prix. « Dit le contraire » descend un bien dans sa catégorie, jamais hors d’elle ; « n’en dit rien » ne pénalise pas.',
    ],
    [
      'Après — la raison',
      'Par critère : ✓ dit clairement, ≈ avec réserve (le contre-signal cité : la route, le boulevard, la gare), ? n’en dit rien, ✗ le contraire. Toujours <b>les mots exacts de l’annonce</b>, vérifiés au serveur : une citation qui ne s’y trouve pas mot pour mot fait tomber le jugement à « n’en dit rien ».',
    ],
    [
      'Pour qui',
      'Le conseiller seul pendant la bêta (Jean-Guy, 10/11) ; le lien de l’acquéreur se décidera ensuite. La présentation et le lien ne changent pas (M122 B).',
    ],
    [
      'Ce qui est lu',
      'La description et les étiquettes des biens déjà reçus : Stream Estate les envoie avec chaque annonce, sans coût de plus ; la requête ne change pas (elle ne sait pas chercher par mots, mesure §1). Pas les photos (hors périmètre).',
    ],
    [
      'Sans budget d’IA',
      'Bandeau « Classement simplifié : budget de lecture du mois atteint » ; la liste de mots dit seulement « l’annonce mentionne « calme » », sans ≈ ni ✗.',
    ],
  ],
};

// ---------------------------------------------------------------------------------------------

const css = `
@font-face{font-family:Inter;src:url('${fonts}/inter/inter-latin.woff2') format('woff2');font-weight:100 900}
@font-face{font-family:Montserrat;src:url('${fonts}/montserrat/montserrat-latin.woff2') format('woff2');font-weight:100 900}
@font-face{font-family:Rajdhani;src:url('${fonts}/rajdhani/rajdhani-latin-600.woff2') format('woff2');font-weight:600}
@font-face{font-family:Rajdhani;src:url('${fonts}/rajdhani/rajdhani-latin-700.woff2') format('woff2');font-weight:700}
@font-face{font-family:Nunito;src:url('${fonts}/nunito-sans/nunito-sans-latin.woff2') format('woff2');font-weight:200 1000;font-style:normal}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,Arial,sans-serif;color:${C.ink};background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:18px;align-items:flex-start}
h1.sheet{font-size:22px;color:#27272a}.sheet-sub{font-size:13px;color:#3f3f46;max-width:1720px;line-height:1.5}
.layout{display:flex;gap:26px;align-items:flex-start}.rows{display:flex;flex-direction:column;gap:26px}.row{display:flex;gap:22px;align-items:flex-start}
.col{display:flex;flex-direction:column}
.ftitle{font-size:13px;font-weight:700;color:#3f3f46;margin-bottom:6px;display:flex;gap:8px;align-items:center}
.st{font-size:11px;font-weight:800;letter-spacing:.1em;border-radius:6px;padding:2px 7px;color:#fff;background:${C.green}}
.notes{width:400px;display:flex;flex-direction:column;gap:12px;position:sticky;top:0}
.note{background:${C.note};border:1px solid ${C.noteLine};border-radius:10px;padding:12px 14px;font-size:13px;line-height:1.5;color:#3d3200}.note b.t{color:${C.noteInk}}
code{font-size:12px;background:rgba(0,0,0,.06);padding:0 3px;border-radius:3px}
.frame{background:${C.page};border:1px solid #a1a1aa;overflow:hidden;position:relative;display:flex}
.frame.desk{width:1280px;min-height:800px}.frame.tab{width:820px;min-height:1100px}.frame.phone{width:390px;min-height:844px;flex-direction:column}
.side{width:256px;flex:none;background:#fff;border-right:1px solid ${C.z200};padding:22px 18px;display:flex;flex-direction:column;gap:26px}
.tab .side{width:220px}
.logo{display:flex;align-items:center;gap:6px;color:${C.deep}}.logo span{display:flex;flex-direction:column;line-height:1}
.logo b{font-family:Montserrat;font-size:15px;font-weight:800;letter-spacing:.08em}.logo i{font-style:normal;font-family:Montserrat;font-size:7px;font-weight:600;letter-spacing:.2em;margin-top:2px}
nav{display:flex;flex-direction:column;gap:4px;flex:1}.grp{display:flex;flex-direction:column;gap:2px}.grp.sep{border-top:1px solid ${C.z200};margin-top:10px;padding-top:12px}
.gt{font-family:Montserrat;font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.deep};padding:0 12px 4px}
.it{display:flex;flex-direction:column;border-radius:12px;padding:7px 12px}.il{display:flex;justify-content:space-between;font-family:Rajdhani,Montserrat;font-size:16px;font-weight:600;color:${C.z600}}.ih{font-size:11.5px;color:${C.z500}}
.it.on{background:${C.soft}}.it.on .il{color:${C.deep}}
.pb{border-radius:999px;background:#ea580c;color:#fff;font-family:Inter;font-size:11px;font-weight:700;padding:1px 7px;align-self:center}
.acc{display:flex;gap:9px;align-items:center;border:1px solid ${C.z200};border-radius:12px;padding:9px;font-size:11px;color:${C.z500}}.acc b{color:${C.ink};font-size:12px}
.av{width:30px;height:30px;border-radius:99px;background:${C.soft};color:${C.deep};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;flex:none}
.topbar{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid ${C.z200};background:#fff}.topbar .logo{flex:1}
.burger{width:38px;height:38px;border:1px solid ${C.z200};border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px}
.main{flex:1;min-width:0;padding:30px 36px 110px;display:flex;flex-direction:column;gap:16px;container-type:inline-size;overflow:hidden}
.tab .main{padding:24px 24px 110px}.phone .main{padding:16px 14px 96px;gap:12px}
.back{font-size:13px;color:${C.z500}}
.h1{font-family:Rajdhani,Montserrat;font-weight:700;font-size:36px;line-height:1.05;color:${C.deep}}.phone .h1{font-size:28px}
.h2{font-family:Rajdhani,Montserrat;font-weight:700;font-size:23px;color:${C.deep}}.h3{font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${C.z600}}
.card{background:#fff;border:1px solid ${C.z200};border-radius:16px;padding:20px 22px;display:flex;flex-direction:column;gap:12px}.phone .card{padding:14px;border-radius:14px}
.lead{font-size:14.5px;color:${C.z700};line-height:1.45}.muted{color:${C.z500};font-size:13.5px}.sm{font-size:12.5px;line-height:1.45}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@container (max-width:520px){.tiles{grid-template-columns:1fr}}
.tile{display:flex;align-items:center;gap:12px;border:1.5px solid ${C.deep};color:${C.deep};background:#fff;border-radius:14px;padding:16px;text-align:left;font-family:inherit;min-height:64px}
.tile span{display:flex;flex-direction:column}.tile b{font-size:15.5px}.tile small{font-size:12.5px;color:${C.z500};margin-top:2px}
.warn{font-size:12.5px;line-height:1.5;color:${C.z600};background:${C.z100};border-radius:10px;padding:10px 12px}
.or{display:flex;align-items:center;gap:12px;color:${C.z500};font-size:13px}.or::before,.or::after{content:'';flex:1;height:1px;background:${C.z200}}
.f{display:flex;flex-direction:column;gap:5px;font-size:12.5px;font-weight:600;color:${C.z600}}.in{font-style:normal;font-weight:400;border:1px solid ${C.z200};border-radius:10px;padding:10px 12px;color:${C.z500};font-size:14px}
.seg,.chips{display:flex;gap:8px;flex-wrap:wrap}.seg b,.chips b{font-size:13px;font-weight:600;background:${C.z100};border-radius:9px;padding:7px 11px;color:${C.z700}}
.chips b.s{background:${C.star};color:#6b4b00}.chips b.lnk{background:${C.soft};color:${C.deep}}
.quick{display:grid;grid-template-columns:1fr 1fr;gap:14px}@container (max-width:520px){.quick{grid-template-columns:1fr}}
.actions{grid-column:1/-1;display:flex;justify-content:flex-end}
.btn{font-family:inherit;font-size:14.5px;font-weight:700;border-radius:12px;padding:11px 18px;border:1.5px solid ${C.deep};background:#fff;color:${C.deep}}
.btn.fill{background:${C.deep};color:#fff}.btn.link{border:none;background:none;text-decoration:underline;font-weight:600;padding:11px 8px}.btn.ghost{background:#fff}.btn.wide{width:100%}.btn.white{background:#fff;color:${C.deep};border-color:#fff;width:100%}
.center{align-items:center;text-align:center;padding:28px}
.progress{width:70%;height:6px;border-radius:9px;background:${C.z200};overflow:hidden}.progress span{display:block;width:55%;height:100%;background:${C.deep}}
.big{font-size:18px;font-weight:700;color:${C.deep}}
.photo{background:#5b5348;border-radius:12px;padding:14px;display:flex;justify-content:center;overflow:hidden;container-type:inline-size}
.photo.l{width:100%}.photo.m{width:250px;height:250px}.photo.s{width:100%}
.paper{font-size:min(13.5px,calc((100cqw - 44px) / 21.5));background:repeating-linear-gradient(#fbfaf3 0 1.6em,#c7d6ee 1.6em calc(1.6em + 1px));transform:rotate(-2.2deg);padding:12px 14px 14px 26px;border-left:2px solid #e9a3a3;box-shadow:0 6px 16px rgba(0,0,0,.35);width:100%}
.hl{font-family:Nunito;font-style:italic;font-weight:600;color:${C.ink2};font-size:1em;line-height:calc(1.6em + 1px);white-space:nowrap;letter-spacing:.01em;transform:skewX(-6deg)}
.hl.sens{background:rgba(220,38,38,.12);outline:1.5px dashed #dc2626}
.ph{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}.count{font-size:13px;color:${C.z500}}
.two{display:grid;grid-template-columns:280px 1fr;gap:18px;align-items:start}.two.r{grid-template-columns:1fr 330px}
@container (max-width:760px){.two{grid-template-columns:200px 1fr}.two.r{grid-template-columns:1fr}.two.r .nextc{order:-1}.softs{grid-template-columns:1fr}}
@container (max-width:520px){.two{grid-template-columns:1fr}}
.src{display:flex;flex-direction:column;gap:8px;position:sticky;top:0}
.form{display:flex;flex-direction:column;gap:14px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}@container (max-width:760px){.grid{grid-template-columns:1fr}}
.pf{border:1px solid ${C.z200};border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:3px;background:#fff}
.pf:not(.empty){border-color:#efd58f;background:#fffdf6}
.pfh{display:flex;justify-content:space-between;align-items:center}.pl{font-size:12px;font-weight:700;color:${C.z600}}
.pv{font-size:15px;font-weight:600}.pf.empty .pv{color:${C.z500};font-weight:400}.st2{color:#b8892b;margin-right:4px}
.from{font-size:12px;color:${C.z500};font-style:italic}
.pill{font-size:11px;font-weight:700;color:${C.verify};background:${C.verifySoft};border-radius:999px;padding:2px 8px;white-space:nowrap}
.softs{display:grid;grid-template-columns:1fr 1fr;gap:10px}@container (max-width:520px){.softs{grid-template-columns:1fr}}
.soft{border:1px solid #efd58f;background:#fffdf6;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:4px}
.sh{display:flex;justify-content:space-between;align-items:center;gap:8px}.sh b{font-size:14.5px}
.words{font-family:Nunito;font-style:italic;font-size:13.5px;color:${C.ink2}}
.skipped{font-size:12.5px;color:${C.z500};border-top:1px dashed ${C.z200};padding-top:10px}
.bar{position:absolute;left:0;right:0;bottom:0;background:#fff;border-top:1px solid ${C.z200};display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:12px 24px;box-shadow:0 -4px 12px rgba(0,0,0,.05)}
.desk .bar{left:256px}.tab .bar{left:220px}.phone .bar{padding:10px 14px}.phone .bar .btn.fill{flex:1}
.bstate{margin-right:auto;font-size:13px;color:${C.z500}}
.keep{display:flex;gap:10px;align-items:center;font-size:13.5px;line-height:1.4;color:${C.z700};background:${C.z100};border-radius:10px;padding:9px 12px;margin:-4px 0 2px}
.ki{flex:none;width:20px;height:20px;border-radius:99px;border:1.5px solid ${C.z500};color:${C.z600};font:italic 700 12px/17px Georgia,serif;text-align:center}
.ovl{position:absolute;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;z-index:5}
.dlg{background:#fff;border-radius:18px;padding:24px;max-width:420px;width:100%;display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 50px rgba(0,0,0,.3)}
.dt{font-family:Rajdhani,Montserrat;font-size:22px;font-weight:700;color:${C.deep};line-height:1.15}.dx{font-size:14px;line-height:1.45;color:${C.z600}}
.da{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}.btn.focus{box-shadow:0 0 0 3px #fff,0 0 0 5px ${C.deep}}.btn.danger{border-color:#b91c1c;color:#b91c1c}
.head{gap:10px}.hl1{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.badge{font-size:12px;font-weight:700;border-radius:999px;padding:4px 10px}.badge.g{background:${C.greenSoft};color:${C.green}}.badge.y{background:${C.verifySoft};color:${C.verify}}.badge u{margin-left:6px}
.said{font-size:16px;line-height:1.45;color:${C.z700}}.said b{color:${C.deep}}
.contact{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.steps{display:grid;grid-template-columns:repeat(5,1fr);background:#fff;border:1px solid ${C.z200};border-radius:14px;overflow:hidden}
.step{padding:12px 14px;border-top:4px solid ${C.z200};display:flex;flex-direction:column;font-size:13.5px}.step small{color:${C.z500}}.step.now{border-top-color:${C.deep};background:${C.soft};color:${C.deep}}
@container (max-width:520px){.steps{grid-template-columns:1fr 1fr 1fr}.step:nth-child(n+4){display:none}}
.ch{display:flex;justify-content:space-between;align-items:baseline}.lnk{color:${C.deep};font-weight:700;font-size:13.5px}
.softlist{list-style:none;display:flex;flex-direction:column}.softlist li{display:flex;flex-direction:column;gap:3px;padding:10px 0;border-top:1px solid ${C.z100}}
.sl{display:flex;gap:10px;align-items:center}.sl b{font-size:15px}
.log{list-style:none;font-size:13.5px}.log li{display:flex;gap:14px}.log span{color:${C.z500};width:84px;flex:none}
.nextc{background:#1f4b8a;color:#fff;border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:10px}.nextc h2{font-family:Rajdhani,Montserrat;font-size:24px}.nextc p{font-size:14px;line-height:1.45;opacity:.92}
.kick{text-transform:uppercase;font-size:11.5px;font-weight:800;letter-spacing:.14em;opacity:.85}
.order{font-size:13.5px;line-height:1.5;color:${C.z700};background:#fff;border:1px solid ${C.z200};border-left:4px solid ${C.deep};border-radius:10px;padding:10px 14px}
.cat{font-family:Rajdhani,Montserrat;font-size:20px;font-weight:700;color:${C.green};margin-top:4px}
.ic{background:#fff;border:1px solid ${C.z200};border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:12px}
.ich{display:grid;grid-template-columns:34px 120px 1fr auto auto;gap:14px;align-items:center}
.rank{width:34px;height:34px;border-radius:99px;background:${C.deep};color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:15px}
.ich img{width:120px;height:80px;object-fit:cover;border-radius:10px}
.it2{display:flex;flex-direction:column;gap:3px}.it2 b{font-size:15.5px}.it2 small{font-size:12.5px;color:${C.z500}}
.pr{display:flex;flex-direction:column;align-items:flex-end}.pr b{font-size:17px}.pr small{font-size:12.5px}.pr .g{color:${C.green}}
.cb{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:${C.deep}}.cb i{width:20px;height:20px;border:2px solid ${C.deep};border-radius:5px}
@container (max-width:760px){.ich{grid-template-columns:30px 96px 1fr}.ich img{width:96px;height:68px}.pr{grid-column:3;align-items:flex-start}.cb{grid-column:1/-1;justify-self:end;margin-top:-30px}}
@container (max-width:520px){.ich{grid-template-columns:28px 1fr}.ich img{grid-column:1/-1;width:100%;height:150px;order:-1}.it2,.pr{grid-column:2}.cb{grid-column:1/-1;margin-top:0}.rank{width:28px;height:28px;font-size:13px}}
.whyb{background:#f8fafc;border:1px solid ${C.z200};border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:6px}.whyb.short{flex-direction:row;gap:10px;align-items:baseline;flex-wrap:wrap}
.wt sup{text-transform:none}.wt{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${C.deep}}
.why{list-style:none;display:flex;flex-direction:column;gap:5px}.why li{display:grid;grid-template-columns:20px 150px 1fr;gap:8px;font-size:13.5px;line-height:1.4;align-items:baseline}
@container (max-width:520px){.why li{grid-template-columns:20px 1fr}.why li span:last-child{grid-column:2}}
.why .mk{font-weight:800;text-align:center;border-radius:6px}.why b{font-weight:700}
.why .y .mk{color:${C.green}}.why .r .mk{color:${C.orange}}.why .n .mk{color:${C.z500}}.why .x .mk{color:#b91c1c}
.why .n span:last-child{color:${C.z500}}
.stubc{height:60px;border-radius:16px;background:#fff;border:1px dashed ${C.z200}}
`;

const sheetHtml = ({ title, sub, rows, notes }) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>
<h1 class="sheet">${title}</h1><p class="sheet-sub">${sub}</p>
<div class="layout"><div class="rows">${rows.map((r) => `<div class="row">${r.join('')}</div>`).join('')}</div>
<div class="notes">${notes.map(([t, b]) => `<div class="note"><b class="t">${t} :</b> ${b}</div>`).join('')}</div></div></body></html>`;

const SHEETS = {
  'M151-1-depuis-mes-notes.html': sheet1,
  'M151-2-la-fiche-a-verifier.html': sheet2,
  'M151-3-ce-qui-compte-pour-eux.html': sheet3,
  'M151-4-la-raison-du-rang.html': sheet4,
};

for (const [name, def] of Object.entries(SHEETS)) writeFileSync(join(here, name), sheetHtml(def));

if (process.argv.includes('--png')) {
  const { chromium } = await import(
    pathToFileURL(join(here, '../../node_modules/playwright/index.mjs')).href
  );
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  for (const name of Object.keys(SHEETS)) {
    await tab.goto(pathToFileURL(join(here, name)).href);
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: join(here, name.replace('.html', '.png')), fullPage: true });
  }
  await browser.close();
}
console.log(`${Object.keys(SHEETS).length} planches écrites`);

// Mission 151 — `--photo-notes` : la photo inventée des notes de M. et Mme Arnaud pour l'agence de
// démonstration (décision de Jean-Guy, 12/11), le même dessin que la planche 1, en JPEG, rangée
// avec les photos de la démo. Tout est inventé ; aucune écriture réelle n'est photographiée.
if (process.argv.includes('--photo-notes')) {
  const { chromium } = await import(
    pathToFileURL(join(here, '../../node_modules/playwright/index.mjs')).href
  );
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });
  await tab.setContent(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${css}</style></head><body>${notesPhoto('l')}</body></html>`,
  );
  await tab.evaluate(() => document.fonts.ready);
  await tab.locator('.photo').first().screenshot({
    path: join(here, '../../public/demo/notes-arnaud.jpg'),
    type: 'jpeg',
    quality: 82,
  });
  await browser.close();
  console.log('photo des notes écrite : public/demo/notes-arnaud.jpg');
}
