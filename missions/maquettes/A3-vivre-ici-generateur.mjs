// A3 — générateur des maquettes « Le lien « Vivre ici » sur tout bien d'une sélection acquéreur »
// (demande de Jean-Guy, 15/11). `node missions/maquettes/A3-vivre-ici-generateur.mjs --png` écrit
// A3-1 à A3-3, en HTML et en PNG (Chromium du dépôt). Chaque planche : ordinateur (1280), tablette
// (820), téléphone (390), et les notes avant / après. Tout est inventé : la famille Keller, la villa
// de Mougins (mandat signé), mou-02 (Mougins, en exclusivité chez « Agence Littoral & Pins ») et
// mou-07 (Mouans-Sartoux) viennent de la démo (M114, M120 B, M122 B) ; les liens d'Academia aussi.
//
// AVANT = `main` au 15/11 (73be3053) : le lien « Vivre ici » ne se colle que sur un mandat (onglet
// Bien vendeur, M147 A) et ne part vers l'acquéreur que pour un mandat signé.

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
  amber: '#b45309',
  amberSoft: '#fff7e6',
  note: '#fef6c7',
  noteLine: '#e8cf5a',
  noteInk: '#5b4a00',
};

const INFO = 'Ce lien montre la rue (sans numéro) et un repère à environ 100 m.';
const LINK_B = 'https://app.myacademia.ai/l/k7Qx2mRv9a';

const BIENS = {
  A: { label: 'Villa · 7 pièces · 240 m² · Mougins', origin: 'Mandat signé', photo: 'mandat-mougins-villa/01-facade.jpg' },
  B: { label: 'Maison · 6 pièces · 220 m² · Mougins', origin: 'Annonce du marché', photo: 'villa-03.jpg' },
  C: { label: 'Maison · 5 pièces · 180 m² · Mouans-Sartoux', origin: 'Annonce du marché', photo: 'maison-04.jpg' },
};

// ---------------------------------------------------------------------------------------------
// Le cadre : menu de gauche (ordinateur, tablette) ou barre compacte (téléphone), comme la M153.

const GROUPS = [
  [null, [['Aujourd’hui', 'Ce qu’il y a à faire', '3']]],
  ['Vendeurs', [['Préparation', 'Dossiers vendeurs'], ['Live', 'Rendez-vous vendeur'], ['Suivi', 'Après le rendez-vous']]],
  ['Acquéreurs', [['Acquéreurs', 'Ce que chacun cherche'], ['Visites', 'À planifier, faites, retours']]],
  ['Les deux', [['Prospection', 'Courriers et passages']]],
];

const logo = `<span class="logo"><svg width="30" height="20" viewBox="6 20 52 34"><path d="M18 34a14 14 0 0 1 28 0z" fill="#e8a33d"/><path d="M8 36h48" stroke="${C.deep}" stroke-width="3.2" stroke-linecap="round"/><path d="M12 43c4-2.6 8-2.6 12 0s8 2.6 12 0 8-2.6 12 0" fill="none" stroke="${C.deep}" stroke-width="2.6" stroke-linecap="round"/></svg><span><b>HORIZON</b><i>CÔTE D’AZUR</i></span></span>`;

const side = (on) =>
  `<aside class="side">${logo}<nav>${GROUPS.map(
    ([label, items], i) =>
      `<div class="grp${i ? ' sep' : ''}">${label ? `<span class="gt">${label}</span>` : ''}${items
        .map(
          ([l, h, b]) =>
            `<a class="it${l === on ? ' on' : ''}"><span class="il">${l}${b ? `<span class="pb">${b}</span>` : ''}</span><span class="ih">${h}</span></a>`,
        )
        .join('')}</div>`,
  ).join('')}</nav><div class="acc"><span class="av">CM</span><span><b>Claire Martin</b><br>Agence Horizon Côte d’Azur</span></div></aside>`;

const frame = (device, body, on) =>
  device === 'phone'
    ? `<div class="frame phone"><div class="topbar">${logo}<span class="pb">3</span><span class="burger">☰</span></div><div class="main">${body}</div></div>`
    : `<div class="frame ${device}">${side(on)}<div class="main">${body}</div></div>`;

// La page du dossier acquéreur est une page d'impression (sans menu) : son en-tête conseiller
// au-dessus de la feuille A4.
const printFrame = (device, body) =>
  `<div class="frame ${device} print"><div class="main">${body}<div class="a4">Le dossier imprimé (A4), inchangé : ni « Vivre ici », ni adresse, ni lien.</div></div></div>`;

const DEVICE = { desk: 'Ordinateur · 1280', tab: 'Tablette · 820', phone: 'Téléphone · 390' };
const titled = (device, html, extra = '', state = 'APRÈS') =>
  `<div class="col"><div class="ftitle"><span class="st${state === 'AVANT' ? ' before' : ''}">${state}</span>${DEVICE[device]}${extra}</div>${html}</div>`;

// ---------------------------------------------------------------------------------------------
// Planche 1 — le dossier acquéreur, côté conseiller : « Vivre ici » de chaque bien.

const photoChoices = `
  <fieldset class="fs"><legend>Photos des biens</legend>
    <p class="hint">Chaque photo est celle de l’annonce ou du bien, telle que montrée à l’acquéreur. Cochez « Sans photo » pour la retirer du document et du lien.</p>
    ${['A', 'B', 'C'].map((k) => `<label class="chk"><i class="box"></i>Sans photo — Bien ${k} · ${BIENS[k].label}</label>`).join('')}
  </fieldset>`;

const infoLine = `<p class="info"><span class="ico">i</span>${INFO}</p>`;

// Une ligne par bien de la sélection. `state` : mandat | filled | soon (25 à 29 jours) | old
// (30 jours et plus) | empty. Le lien reste montré à l'acquéreur dans tous les cas (Jean-Guy, 16/11).
const AGE = {
  filled: '<p class="hint">Collé il y a 2 jours · montré à chaque acquéreur de l’agence qui a ce bien dans sa sélection</p>',
  soon: '<p class="warn">Collé il y a 26 jours : un lien d’Academia vaut 30 jours. Collez bientôt un lien neuf.</p>',
  old: '<p class="warn">Collé il y a 34 jours : un lien d’Academia vaut 30 jours, il ne s’ouvre peut-être plus. Collez un lien neuf.</p>',
};
const livingRow = (k, state, { phone = false, address = false } = {}) => {
  const head = `<div class="lrh"><b>Bien ${k} · ${BIENS[k].label}</b><span class="badge${state === 'mandat' ? ' agency' : ''}">${BIENS[k].origin}</span></div>`;
  if (state === 'mandat')
    return `<li class="lr">${head}<p class="lead"><span class="okdot"></span>Le lien du mandat, collé le 09/11. <a class="lnk">Le changer sur le bien vendeur</a></p></li>`;
  if (AGE[state])
    return `<li class="lr">${head}
      <div class="url"><span class="u">${LINK_B}</span><a class="lnk">Ouvrir ↗</a><a class="lnk">Retirer</a></div>
      ${AGE[state]}</li>`;
  return `<li class="lr">${head}
    <div class="paste${phone ? ' col' : ''}"><i class="in">Collez le lien « Vivre ici » donné par Academia</i><button class="btn sm">Enregistrer le lien</button></div>
    <p class="hint">${address ? '<a class="lnk">Ouvrir Academia ↗</a> · l’adresse du bien est copiée, collez-la dans Academia.' : '<a class="lnk">Ouvrir Academia ↗</a> · ACM ne connaît pas l’adresse de cette annonce : cherchez le bien dans Academia.'}</p></li>`;
};

const livingChoices = (states, opts = {}) => `
  <fieldset class="fs new"><legend>« Vivre ici » de chaque bien <span class="newtag">nouveau</span></legend>
    <p class="hint">Le lien client d’Academia : le quartier, les écoles, les commerces. Il s’affiche sous le bien, sur le lien de l’acquéreur et dans « Confirmer la visite ». Rien dans le dossier imprimé ni dans la présentation.</p>
    ${infoLine}
    <ul class="lrs">${['A', 'B', 'C'].map((k) => livingRow(k, states[k], opts)).join('')}</ul>
  </fieldset>`;

const share = `
  <div class="share">
    <span class="tl">Le message pour la famille Keller</span>
    <p class="msg">Bonjour, voici les biens que j’ai sélectionnés pour vous : https://acm-studio-henna.vercel.app/dossier/Xy3…<br>Dites-moi lesquels vous voulez visiter.<br>Claire</p>
    <p class="info"><span class="ico">i</span><span>« Vivre ici » du bien B, sur ce lien : ${INFO}</span></p>
    <div class="btns"><button class="btn">Copier</button><button class="btn">SMS</button><button class="btn">WhatsApp</button><button class="btn">E-mail</button></div>
    <p class="hint">Le lien ne s’affichera plus. Il expire dans 30 jours ; l’outil n’envoie rien.</p>
  </div>`;

const dossierHead = (inner) => `
  <section class="card">
    <div class="gh"><a class="back">← Retour à la fiche</a><button class="btn sm">Imprimer</button></div>
    <p class="hint">Ce dossier suit sa recherche : ses mots, la grille de ses critères, un bien par page… Il ne contient ni adresse, ni titre, ni lien d’annonce.</p>
    ${inner}
  </section>`;

const dossierBefore = dossierHead(`${photoChoices}<button class="btn fill">Créer un lien pour l’acquéreur (30 jours)</button>`);
const dossierAfter = (states, opts = {}, withShare = false) =>
  dossierHead(
    `${photoChoices}${livingChoices(states, opts)}${withShare ? share : '<button class="btn fill">Créer un lien pour l’acquéreur (30 jours)</button>'}`,
  );

// La fiche acquéreur : un lien discret sous « Sa sélection », vers le bloc ci-dessus.
const ficheSelection = `
  <h1 class="h1">Famille Keller</h1>
  <section class="card">
    <div class="gh"><h2 class="h2">Sa sélection</h2><span class="hint">3 biens sélectionnés</span></div>
    <ul class="sel">${['A', 'B', 'C']
      .map((k) => `<li><span class="sp" style="background-image:url('${photos}/${BIENS[k].photo}')"></span><span><b>${k} · ${BIENS[k].label}</b><small>${BIENS[k].origin}</small></span></li>`)
      .join('')}</ul>
    <p class="hint"><a class="lnk">Changer la sélection</a> · <a class="lnk">Dossier acquéreur et lien</a></p>
    <p class="discreet"><a class="lnk soft">Ajouter « Vivre ici »</a> <span class="newtag">nouveau</span></p>
  </section>`;

// La carte « Le bien dans Academia » du mandat (M147 A), avec le même avertissement.
const mandateCard = `
  <section class="card">
    <h2 class="h2">Le bien dans Academia</h2>
    <p class="hint">Le dossier d’adresse (ventes réelles, DPE, copropriété) et « Vivre ici » s’ouvrent dans Academia, dans un nouvel onglet.</p>
    <div class="btns"><button class="btn sm">Dossier d’adresse ↗</button><button class="btn sm">Vivre ici ↗</button></div>
    <span class="f">Lien « Vivre ici » montré aux acquéreurs</span>
    <i class="in on">https://app.myacademia.ai/l/Vb4nT8wLp2</i>
    <p class="warn">Collé il y a 34 jours : un lien d’Academia vaut 30 jours, il ne s’ouvre peut-être plus. Collez un lien neuf.</p>
    <div class="btns"><button class="btn sm">Enregistrer le lien</button><a class="lnk">Retirer</a></div>
  </section>`;

const sheet1 = {
  title: 'A3 · 1 — Le dossier acquéreur : « Vivre ici » de chaque bien',
  sub: 'L’écran du conseiller au-dessus du dossier de la famille Keller (`/acquereurs/[id]/dossier`), là où il règle déjà ce que voit l’acquéreur (« Sans photo ») et crée son lien. Un bloc nouveau, une ligne par bien de la sélection : le mandat garde son lien (collé sur le bien vendeur, M147 A) ; un bien hors mandat reçoit le sien, collé ici. La ligne d’information se lit une fois en tête du bloc et une fois au partage. En bas : le lien discret de la fiche, et la carte du mandat avec le même avertissement.',
  rows: [
    [titled('desk', printFrame('desk', dossierBefore), ' · aujourd’hui', 'AVANT')],
    [titled('desk', printFrame('desk', dossierAfter({ A: 'mandat', B: 'filled', C: 'empty' }, {}, true)), ' · B collé, C vide, le lien créé')],
    [
      titled('tab', printFrame('tab', dossierAfter({ A: 'mandat', B: 'soon', C: 'empty' }, { address: true })), ' · B collé il y a 26 jours, C avec son adresse'),
      titled('phone', printFrame('phone', dossierAfter({ A: 'mandat', B: 'old', C: 'empty' }, { phone: true })), ' · B collé il y a 34 jours'),
    ],
    [
      titled('tab', frame('tab', ficheSelection, 'Acquéreurs'), ' · la fiche des Keller'),
      titled('phone', frame('phone', mandateCard), ' · le mandat, onglet Bien vendeur'),
    ],
  ],
  notes: [
    ['Avant', 'Le lien « Vivre ici » se colle seulement sur un mandat, sur l’onglet Bien vendeur (M147 A). Un bien hors mandat d’une sélection n’en a jamais.'],
    ['Où le coller', 'Sur la page du dossier acquéreur, entre « Photos des biens » et le lien : c’est déjà là que le conseiller règle ce qui part vers l’acquéreur. Un seul endroit ; « Confirmer la visite » (planche 2) le lit. Sur la fiche, sous « Sa sélection », un lien discret « Ajouter « Vivre ici » » mène à ce bloc ; il se montre tant qu’un bien hors mandat de la sélection n’a pas de lien, ou un lien collé depuis plus de 30 jours (Jean-Guy, 16/11).'],
    ['Un mandat', 'Son lien reste celui du mandat : la ligne le dit et mène au bien vendeur pour le changer. Sans lien sur le mandat : « Aucun lien sur le mandat · Le coller sur le bien vendeur ».'],
    ['Un bien hors mandat', 'Un concurrent, un bien démarché ou une annonce du marché : le champ, « Enregistrer le lien » en contour (le seul plein reste « Créer un lien »), « Ouvrir Academia ↗ » qui copie l’adresse confirmée si ACM la connaît (Localisateur ou conseiller), et « Ouvrir ↗ » / « Retirer » une fois collé.'],
    ['La ligne d’information', 'Deux fois, jamais sous chaque bien : en tête du bloc (« ' + INFO + ' ») et au moment du partage, au-dessus de Copier / SMS / WhatsApp / E-mail.'],
    ['Le même bien partout', 'Le lien vaut pour le bien, chez tous les acquéreurs de l’agence qui l’ont dans leur sélection, comme celui d’un mandat. Seul un lien d’Academia est accepté (`https://app.myacademia.ai/l/…`), à l’écran, au serveur et en base, avec le message de M147 A.'],
    ['25 et 30 jours', 'Un lien client d’Academia vaut 30 jours (Laurent, 15/11). Dès le 25e jour depuis qu’il a été collé, la ligne prévient en orange (« Collez bientôt un lien neuf ») ; à 30 jours et au-delà, « il ne s’ouvre peut-être plus ». Le lien reste montré à l’acquéreur (Jean-Guy, 15/11).'],
    ['Pas de vérification', 'ACM ne vérifie pas auprès d’Academia qu’un lien collé est expiré (Jean-Guy, 16/11) : il compte seulement les jours depuis qu’il a été collé. La date d’expiration viendra de l’API.'],
    ['Le mandat', 'La carte « Le bien dans Academia » de l’onglet Bien vendeur prévient de même, à 25 et 30 jours, sans cacher le lien. Il faut pour cela la date où le lien a été collé : les liens collés avant la mission n’en ont pas et ne sont pas avertis, rien n’est inventé (M56).'],
    ['Au partage', 'Une ligne, une fois, pour les biens hors mandat qui ont leur lien (« « Vivre ici » du bien B, sur ce lien : … »), au-dessus de Copier / SMS / WhatsApp / E-mail. La même dans la relance d’une sélection (M135) et dans « Confirmer la visite ».'],
    ['Démo', 'Rien n’est semé (ce serait une fausse source, M147 A). « Ouvrir Academia » ouvre la page de présentation sans rien copier.'],
  ],
};

// ---------------------------------------------------------------------------------------------
// Planche 2 — Visites : « Confirmer la visite » d'un bien hors mandat.

const track = (steps) => `<ol class="track">${steps.map(([label, s]) => `<li class="${s}"><i></i>${label}</li>`).join('')}</ol>`;

const confirmBefore = `
  <li class="visit">
    <div class="vh"><b class="vt">${BIENS.B.label}</b><span class="price">1 720 000 €</span><span class="badge">Annonce du marché</span></div>
    ${track([['Confirmer la visite', 'now'], ['Bon de visite', 'later'], ['Visite faite', 'later']])}
    <div class="form">
      <div class="g2"><label class="f"><span>Le jour</span><i class="in on">samedi 21/11</i></label><label class="f"><span>L’heure</span><i class="in on">10 h 00</i></label></div>
      <p class="msg">Je vous confirme la visite de la maison à Mougins le samedi 21 novembre à 10 h.<br>Votre sélection : https://acm-studio-henna.vercel.app/dossier/Pq8…<br>À bientôt,</p>
      <div class="btns"><button class="btn">Copier</button><button class="btn">SMS</button><button class="btn">WhatsApp</button><button class="btn">E-mail</button></div>
    </div>
  </li>`;

// `mode` : link | old (collé depuis plus de 30 jours) | none.
const confirmAfter = (mode) => {
  const withLink = mode === 'link' || mode === 'old';
  return `
  <li class="visit">
    <div class="vh"><b class="vt">${BIENS.B.label}</b><span class="price">1 720 000 €</span><span class="badge">Annonce du marché</span></div>
    ${track([['Confirmer la visite', 'now'], ['Bon de visite', 'later'], ['Visite faite', 'later']])}
    <div class="form">
      <div class="g2"><label class="f"><span>Le jour</span><i class="in on">samedi 21/11</i></label><label class="f"><span>L’heure</span><i class="in on">10 h 00</i></label></div>
      <p class="msg">Je vous confirme la visite de la maison à Mougins le samedi 21 novembre à 10 h.<br>Votre sélection : https://acm-studio-henna.vercel.app/dossier/Pq8…${withLink ? `<br><mark>Vivre ici, autour du bien : ${LINK_B}</mark>` : ''}<br>À bientôt,</p>
      ${
        withLink
          ? `${mode === 'old' ? '<p class="warn">Lien « Vivre ici » collé il y a 34 jours : un lien d’Academia vaut 30 jours, il ne s’ouvre peut-être plus. <a class="lnk">Coller un lien neuf sur le dossier acquéreur</a></p>' : ''}${infoLine}`
          : '<p class="hint">Ce bien n’a pas de lien « Vivre ici ». <a class="lnk">Le coller sur le dossier acquéreur</a></p>'
      }
      <div class="btns"><button class="btn">Copier</button><button class="btn">SMS</button><button class="btn">WhatsApp</button><button class="btn">E-mail</button></div>
    </div>
  </li>`;
};

const visitsPage = (rows) => `
  <h1 class="h1">Visites</h1>
  <section class="card">
    <div class="gh"><h2 class="h2">Famille Keller</h2><a class="lnk">Voir sa fiche</a></div>
    <ul class="visits">${rows}</ul>
  </section>`;

const sheet2 = {
  title: 'A3 · 2 — Visites : « Confirmer la visite » d’un bien hors mandat',
  sub: 'La visite des Keller sur mou-02 (Mougins, annonce du marché). Le message de « Confirmer la visite » (M142, M147 A) porte déjà le lien « Vivre ici » d’un mandat signé ; il porte maintenant celui d’un bien hors mandat, avec la ligne d’information au-dessus des boutons de partage.',
  rows: [
    [
      titled('desk', frame('desk', visitsPage(confirmBefore), 'Visites'), ' · aujourd’hui', 'AVANT'),
    ],
    [titled('desk', frame('desk', visitsPage(confirmAfter('link')), 'Visites'), ' · le lien collé')],
    [
      titled('tab', frame('tab', visitsPage(confirmAfter('none')), 'Visites'), ' · sans lien collé'),
      titled('phone', frame('phone', visitsPage(confirmAfter('old'))), ' · le lien collé il y a 34 jours'),
    ],
  ],
  notes: [
    ['Avant', 'Hors mandat, le message ne porte que « Votre sélection : … ». Le lien « Vivre ici » n’y entre que pour un mandat signé.'],
    ['Après', 'Le lien collé sur le dossier acquéreur (planche 1) entre dans le message, à la même ligne qu’un mandat : « Vivre ici, autour du bien : … ». La ligne d’information se lit juste au-dessus de Copier / SMS / WhatsApp / E-mail, avant que le conseiller partage.'],
    ['Sans lien', 'Une ligne discrète, « Ce bien n’a pas de lien « Vivre ici ». Le coller sur le dossier acquéreur », qui mène à la planche 1. Rien ne bloque.'],
    ['25 et 30 jours', 'Un lien collé depuis 25 jours ou plus reste dans le message ; la ligne orange de la planche 1 s’affiche sous le message, au-dessus des boutons.'],
    ['Lecture en échec', 'Comme aujourd’hui (M147 A) : « Le lien « Vivre ici » du bien n’a pas pu être lu. Réessayez, ou préparez le message sans lui. » Jamais lu comme « pas de lien » (M98).'],
    ['Un seul plein', 'Inchangé : le formulaire ouvert porte le seul bouton plein, « Préparer le message » (M147 A), qui fait apparaître le message dessiné ici ; les boutons de partage restent en contour.'],
  ],
};

// ---------------------------------------------------------------------------------------------
// Planche 3 — le lien de l'acquéreur, sur son téléphone.

const phoneLink = (k, withLiving, lang = 'fr') => `
  <div class="frame phone client">
    <div class="ctop"><span class="cag">Agence Horizon Côte d’Azur</span><span class="cstep">${lang === 'en' ? 'Property' : 'Bien'} ${k} · 2 / 3</span></div>
    <div class="main">
      <div class="cphoto" style="background-image:url('${photos}/${BIENS[k].photo}')"></div>
      <b class="ct">${lang === 'en' ? 'House · 6 rooms · 220 m² · Mougins' : BIENS[k].label}</b>
      <p class="cprice">${lang === 'en' ? '€1,720,000' : '1 720 000 €'}<span>${lang === 'en' ? 'Asking price · €70,000 above your budget, negotiable' : 'Prix affiché · 70 000 € au-dessus du budget, à négocier'}</span></p>
      <ul class="crit"><li class="y">✓ ${lang === 'en' ? '220 m², as requested' : '220 m², comme demandé'}</li><li class="y">✓ ${lang === 'en' ? 'A garden' : 'Un jardin'}</li><li class="q">? ${lang === 'en' ? 'Pool: to be checked' : 'Piscine : à vérifier'}</li></ul>
      ${
        withLiving
          ? `<a class="living"><span><small>${k} · ${lang === 'en' ? 'House · 6 rooms · 220 m² · Mougins' : BIENS[k].label}</small><b>${lang === 'en' ? 'Living here' : 'Vivre ici'}</b><small>${lang === 'en' ? 'The neighbourhood, schools and shops' : 'Le quartier, les écoles, les commerces'}</small></span><i>↗</i></a>`
          : ''
      }
      <div class="answers"><span>${lang === 'en' ? 'I want to visit it' : 'Je veux le visiter'}</span><span>${lang === 'en' ? 'Maybe' : 'Peut-être'}</span><span>${lang === 'en' ? 'Not for me' : 'Pas pour moi'}</span></div>
    </div>
    <div class="cbar"><span>← ${lang === 'en' ? 'Previous' : 'Précédent'}</span><b>${lang === 'en' ? 'Next' : 'Suivant'} →</b></div>
  </div>`;

const sheet3 = {
  title: 'A3 · 3 — Le lien de l’acquéreur, sur son téléphone',
  sub: 'L’écran du bien B sur le lien du dossier acquéreur (M122 B). Le bloc « Vivre ici » (M147 A), jusqu’ici réservé aux mandats signés, s’affiche sous tout bien de sa sélection qui a son lien. L’acquéreur ne voit pas la ligne d’information : elle est pour le conseiller, au moment de partager.',
  rows: [
    [
      `<div class="col"><div class="ftitle"><span class="st before">AVANT</span>Téléphone · 390 · bien hors mandat</div>${phoneLink('B', false)}</div>`,
      `<div class="col"><div class="ftitle"><span class="st">APRÈS</span>Téléphone · 390 · le lien collé</div>${phoneLink('B', true)}</div>`,
      `<div class="col"><div class="ftitle"><span class="st">APRÈS</span>Téléphone · 390 · en anglais (les Wilson)</div>${phoneLink('B', true, 'en')}</div>`,
    ],
  ],
  notes: [
    ['Avant', 'Sous un bien hors mandat, rien. Le bloc « Vivre ici » n’existe que pour un mandat signé qui a son lien collé.'],
    ['Après', 'Le même bloc, mêmes mots (« Vivre ici — Le quartier, les écoles, les commerces ↗ », « Living here » en anglais, M140 B), sous l’écran du bien et après sa réponse, comme pour un mandat. Il ouvre Academia dans un nouvel onglet.'],
    ['25 et 30 jours', 'Le bloc reste montré, même pour un lien collé depuis plus de 30 jours : ACM ne vérifie pas son expiration (Jean-Guy, 16/11). Le conseiller est prévenu de son côté.'],
    ['Ce qui ne change pas', 'Ni la présentation plein cadre ni le PDF du dossier ne le montrent (M147 A). Le lien passe par la même liste d’autorisation : un lien d’Academia relu, jamais l’adresse, titre piège M107 prouvé.'],
    ['L’exception à M119', 'En ouvrant le lien, l’acquéreur lit chez Academia la rue du bien, sans numéro, et un repère à environ 100 m : c’est l’exception assumée de Jean-Guy (15/11), écrite dans DECISIONS.md avec son test avant le code. ACM, lui, ne montre toujours ni adresse ni rue.'],
  ],
};

// ---------------------------------------------------------------------------------------------

const css = `
@font-face{font-family:Inter;src:url('${fonts}/inter/inter-latin.woff2') format('woff2');font-weight:100 900}
@font-face{font-family:Montserrat;src:url('${fonts}/montserrat/montserrat-latin.woff2') format('woff2');font-weight:100 900}
@font-face{font-family:Rajdhani;src:url('${fonts}/rajdhani/rajdhani-latin-600.woff2') format('woff2');font-weight:600}
@font-face{font-family:Rajdhani;src:url('${fonts}/rajdhani/rajdhani-latin-700.woff2') format('woff2');font-weight:700}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,Arial,sans-serif;color:${C.ink};background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:18px;align-items:flex-start}
h1.sheet{font-size:22px;color:#27272a}.sheet-sub{font-size:13px;color:#3f3f46;max-width:1720px;line-height:1.5}
.layout{display:flex;gap:26px;align-items:flex-start}.rows{display:flex;flex-direction:column;gap:26px}.row{display:flex;gap:22px;align-items:flex-start}
.col{display:flex;flex-direction:column}
.ftitle{font-size:13px;font-weight:700;color:#3f3f46;margin-bottom:6px;display:flex;gap:8px;align-items:center}
.st{font-size:11px;font-weight:800;letter-spacing:.1em;border-radius:6px;padding:2px 7px;color:#fff;background:${C.green}}.st.before{background:#71717a}
.notes{width:400px;display:flex;flex-direction:column;gap:12px;position:sticky;top:0}
.note{background:${C.note};border:1px solid ${C.noteLine};border-radius:10px;padding:12px 14px;font-size:13px;line-height:1.5;color:#3d3200}.note b.t{color:${C.noteInk}}
code{font-size:12px;background:rgba(0,0,0,.06);padding:0 3px;border-radius:3px}
.frame{background:${C.page};border:1px solid #a1a1aa;overflow:hidden;position:relative;display:flex}
.frame.desk{width:1280px;min-height:640px}.frame.tab{width:820px;min-height:900px}.frame.phone{width:390px;min-height:844px;flex-direction:column}
.frame.print{background:#f4f4f5}
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
.main{flex:1;min-width:0;padding:30px 36px 40px;display:flex;flex-direction:column;gap:16px;container-type:inline-size;overflow:hidden}
.print .main{align-items:center}.print .card{width:100%;max-width:794px}
.tab .main{padding:24px 24px 40px}.phone .main{padding:16px 14px 40px;gap:12px}
.a4{width:100%;max-width:794px;height:160px;border:1px dashed #a1a1aa;border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;color:${C.z500};padding:0 16px;text-align:center}
.back{font-size:13px;color:${C.z500}}
.h1{font-family:Rajdhani,Montserrat;font-weight:700;font-size:36px;line-height:1.05;color:${C.deep}}.phone .h1{font-size:28px}
.h2{font-family:Rajdhani,Montserrat;font-weight:700;font-size:23px;color:${C.deep}}
.card{background:#fff;border:1px solid ${C.z200};border-radius:16px;padding:20px 22px;display:flex;flex-direction:column;gap:14px}.phone .card{padding:14px;border-radius:14px}
.gh{display:flex;justify-content:space-between;align-items:center;gap:10px}.lnk{color:${C.deep};font-weight:700;font-size:13px;text-decoration:underline}
.lead{font-size:14px;color:${C.z700};line-height:1.45;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.hint{font-size:12.5px;color:${C.z500};line-height:1.45}
.fs{border:none;display:flex;flex-direction:column;gap:8px}.fs legend{font-size:14px;font-weight:700;color:${C.z700};margin-bottom:6px}
.fs.new{border:2px solid ${C.deep};border-radius:14px;padding:12px 14px;background:#fbfdff}
.newtag{font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;background:${C.green};color:#fff;border-radius:5px;padding:1px 6px;margin-left:6px;vertical-align:2px}
.chk{display:flex;gap:8px;align-items:center;font-size:13.5px;color:${C.z700}}.box{width:16px;height:16px;border:1.5px solid ${C.z500};border-radius:4px;flex:none}
.lrs{list-style:none;display:flex;flex-direction:column;gap:10px}
.lr{border:1px solid ${C.z200};border-radius:12px;padding:11px 13px;display:flex;flex-direction:column;gap:8px;background:#fff}
.lrh{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:14px}
.badge{font-size:12px;font-weight:600;border-radius:7px;padding:2px 8px;background:${C.soft};color:${C.deep}}.badge.agency{background:#ecfdf5;color:#047857}
.okdot{width:9px;height:9px;border-radius:99px;background:${C.green};display:inline-block}
.url{display:flex;flex-wrap:wrap;gap:12px;align-items:center;font-size:13px}.u{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;color:${C.ink};background:${C.z100};border-radius:8px;padding:6px 9px;word-break:break-all}
.paste{display:flex;gap:8px;align-items:stretch}.paste .in{flex:1}.paste.col{flex-direction:column}
.in{font-style:normal;font-weight:400;border:1px solid ${C.z200};border-radius:10px;padding:9px 12px;color:${C.z500};font-size:13.5px;background:#fff;display:block}.in.on{color:${C.ink}}
.info{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:${C.z700};background:${C.soft};border-radius:9px;padding:7px 10px;line-height:1.4}
.ico{flex:none;width:17px;height:17px;border-radius:99px;background:${C.deep};color:#fff;font-size:11px;font-weight:800;font-style:italic;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;margin-top:1px}
.warn{font-size:13px;font-weight:600;color:${C.amber};background:${C.amberSoft};border-radius:9px;padding:7px 10px;line-height:1.4}
.err{font-size:13px;font-weight:600;color:#b91c1c;background:#fef2f2;border-radius:9px;padding:7px 10px;line-height:1.4}
.sel{list-style:none;display:flex;flex-direction:column;gap:8px}.sel li{display:flex;gap:10px;align-items:center;font-size:13.5px}.sel small{display:block;font-size:12px;color:${C.z500}}
.sp{width:56px;height:42px;border-radius:8px;background:${C.z200} center/cover;flex:none}
.discreet{font-size:13px}.lnk.soft{font-weight:600;color:${C.z600}}
.share{border:1px solid ${C.z200};border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
.tl{font-size:13px;font-weight:800;color:${C.deep}}
.msg{font-size:13.5px;line-height:1.55;color:${C.ink};background:${C.z100};border-radius:10px;padding:10px 12px;word-break:break-word}
.msg mark{background:#dff3e8;color:${C.ink};padding:0 2px;border-radius:3px}
.btns{display:flex;flex-wrap:wrap;gap:8px}
.btn{font-family:inherit;font-size:14px;font-weight:700;border-radius:12px;padding:10px 16px;border:1.5px solid ${C.deep};background:#fff;color:${C.deep};white-space:nowrap}
.btn.sm{font-size:13px;padding:7px 12px;border-radius:10px}.btn.fill{background:${C.deep};color:#fff;align-self:flex-start}
.visits{list-style:none;display:flex;flex-direction:column;gap:12px}
.visit{border:1px solid ${C.z200};border-radius:12px;padding:12px 16px;display:flex;flex-direction:column;gap:10px}
.vh{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.vt{font-family:Rajdhani,Montserrat;font-size:17px}.price{font-size:14px;color:${C.z600}}
.track{list-style:none;display:flex;flex-wrap:wrap;gap:6px}
.track li{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;border-radius:999px;padding:4px 10px;background:${C.z100};color:${C.z500}}
.track li i{width:8px;height:8px;border-radius:99px;background:currentColor}.track li.now{background:${C.soft};color:${C.deep}}
.form{display:flex;flex-direction:column;gap:10px;border-top:1px solid ${C.z200};padding-top:10px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}@container (max-width:520px){.g2{grid-template-columns:1fr}}
.f{display:flex;flex-direction:column;gap:5px;font-size:12.5px;font-weight:600;color:${C.z600}}
.client{background:#fff}.ctop{display:flex;justify-content:space-between;padding:12px 16px;border-bottom:1px solid ${C.z200};font-size:12.5px}.cag{font-weight:800;color:${C.deep}}.cstep{color:${C.z500}}
.client .main{padding:14px 16px 90px;gap:12px}
.cphoto{height:220px;border-radius:14px;background:${C.z200} center/cover}
.ct{font-family:Rajdhani,Montserrat;font-size:21px;color:${C.ink}}
.cprice{font-family:Rajdhani,Montserrat;font-size:22px;font-weight:700;display:flex;flex-direction:column}.cprice span{font-family:Inter;font-size:12.5px;font-weight:600;color:${C.amber}}
.crit{list-style:none;display:flex;flex-direction:column;gap:5px;font-size:14px}.crit .y{color:${C.green}}.crit .q{color:${C.z500}}
.living{display:flex;justify-content:space-between;align-items:center;gap:10px;border:1px solid ${C.soft};background:#f2f9ff;border-radius:16px;padding:13px 15px}
.living span{display:flex;flex-direction:column;gap:2px}.living small{font-size:13px;color:${C.z600}}.living b{font-family:Rajdhani,Montserrat;font-size:17px;color:${C.deep}}.living i{font-style:normal;font-size:20px;color:${C.deep}}
.answers{display:flex;flex-direction:column;gap:8px}.answers span{border:1.5px solid ${C.deep};border-radius:12px;padding:11px;text-align:center;font-weight:700;font-size:14.5px;color:${C.deep}}
.cbar{position:absolute;left:0;right:0;bottom:0;display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-top:1px solid ${C.z200};background:#fff;font-size:14px;color:${C.z600}}.cbar b{color:${C.deep}}
`;

const sheetHtml = ({ title, sub, rows, notes }) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>
<h1 class="sheet">${title}</h1><p class="sheet-sub">${sub}</p>
<div class="layout"><div class="rows">${rows.map((r) => `<div class="row">${r.join('')}</div>`).join('')}</div>
<div class="notes">${notes.map(([t, b]) => `<div class="note"><b class="t">${t} :</b> ${b}</div>`).join('')}</div></div></body></html>`;

const SHEETS = {
  'A3-1-le-dossier-acquereur.html': sheet1,
  'A3-2-confirmer-la-visite.html': sheet2,
  'A3-3-le-lien-de-l-acquereur.html': sheet3,
};

for (const [name, def] of Object.entries(SHEETS)) writeFileSync(join(here, name), sheetHtml(def));

if (process.argv.includes('--png')) {
  const { chromium } = await import(pathToFileURL(join(here, '../../node_modules/playwright/index.mjs')).href);
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
