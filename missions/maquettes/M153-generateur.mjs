// Mission 153 — générateur des maquettes « Le bon de visite et l'offre d'achat hors mandat »
// (demande de Jean-Guy, 12/11). `node missions/maquettes/M153-generateur.mjs --png` écrit M153-1 à
// M153-3, en HTML et en PNG (Chromium du dépôt). Chaque planche : ordinateur (1280), tablette
// (820), téléphone (390), et les notes avant / après. Tout est inventé : la famille Keller et la
// villa de Mougins viennent de la démo (M114), l'agence du confrère « Agence Littoral & Pins »
// aussi (M120 B) ; les numéros de mandat sont inventés.
//
// AVANT = `main` au 12/11 (d95236b) + la ligne grise du 12/11 : une annonce du marché n'a ni bon de
// visite ni offre d'achat tant qu'elle n'est pas « Collaboration obtenue » ou « Mandat rentré » sur
// sa carte de Prospection.

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

// ---------------------------------------------------------------------------------------------
// Le cadre : menu de gauche (ordinateur, tablette) ou barre compacte (téléphone), comme la M151.

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
      ['Acquéreurs', 'Ce que chacun cherche'],
      ['Visites', 'À planifier, faites, retours', null, 'visits'],
    ],
  ],
  ['Les deux', [['Prospection', 'Courriers et passages']]],
];

const logo = `<span class="logo"><svg width="30" height="20" viewBox="6 20 52 34"><path d="M18 34a14 14 0 0 1 28 0z" fill="#e8a33d"/><path d="M8 36h48" stroke="${C.deep}" stroke-width="3.2" stroke-linecap="round"/><path d="M12 43c4-2.6 8-2.6 12 0s8 2.6 12 0 8-2.6 12 0" fill="none" stroke="${C.deep}" stroke-width="2.6" stroke-linecap="round"/></svg><span><b>HORIZON</b><i>CÔTE D’AZUR</i></span></span>`;

const side = (on) =>
  `<aside class="side">${logo}<nav>${GROUPS.map(
    ([label, items], i) =>
      `<div class="grp${i ? ' sep' : ''}">${label ? `<span class="gt">${label}</span>` : ''}${items
        .map(
          ([l, h, b, key]) =>
            `<a class="it${key === on || l === on ? ' on' : ''}"><span class="il">${l}${b ? `<span class="pb">${b}</span>` : ''}</span><span class="ih">${h}</span></a>`,
        )
        .join('')}</div>`,
  ).join('')}</nav><div class="acc"><span class="av">CM</span><span><b>Claire Martin</b><br>Agence Horizon Côte d’Azur</span></div></aside>`;

const frame = (device, body, on, { bar = '' } = {}) =>
  device === 'phone'
    ? `<div class="frame phone"><div class="topbar">${logo}<span class="pb">3</span><span class="burger">☰</span></div><div class="main">${body}</div>${bar}</div>`
    : `<div class="frame ${device}">${side(on)}<div class="main">${body}</div>${bar}</div>`;

const DEVICE = { desk: 'Ordinateur · 1280', tab: 'Tablette · 820', phone: 'Téléphone · 390' };
const titled = (device, html, extra = '', state = 'APRÈS') =>
  `<div class="col"><div class="ftitle"><span class="st${state === 'AVANT' ? ' before' : ''}">${state}</span>${DEVICE[device]}${extra}</div>${html}</div>`;

// ---------------------------------------------------------------------------------------------
// Planche 1 — Visites : une visite sur une annonce du marché.

const track = (steps) =>
  `<ol class="track">${steps
    .map(([label, state]) => `<li class="${state}"><i></i>${label}</li>`)
    .join('')}</ol>`;

const visitHead = `
  <div class="vh"><b class="vt">Maison · 6 pièces · 220 m² · Mougins</b><span class="price">1 720 000 €</span><span class="badge">Annonce du marché</span></div>
  <p class="meta">Demandée il y a 3 jours pendant la présentation · ses créneaux : samedi matin</p>`;

const visitBefore = `
  <li class="visit">
    ${visitHead}
    ${track([
      ['Écrire au confrère', 'now'],
      ['Réponse du confrère', 'later'],
      ['Confirmer la visite', 'later'],
      ['Visite faite', 'later'],
    ])}
    <div class="vact"><span class="ph">Préparez le dossier de collaboration pour l’agence qui détient le mandat.</span><button class="btn sm">Préparer le dossier de collaboration au confrère</button></div>
    <div class="vlinks"><a>Confirmer la visite</a><a>Visite faite</a></div>
    <p class="grey">Pas de bon de visite ni d’offre d’achat ici pour l’instant : ce bien n’est pas sous mandat de l’agence. Ils viennent avec la collaboration du confrère ou un mandat rentré, sur sa carte de Prospection.</p>
  </li>`;

const visitAfter = `
  <li class="visit">
    ${visitHead}
    ${track([
      ['Écrire au confrère', 'done'],
      ['Réponse du confrère', 'done'],
      ['Confirmer la visite', 'done'],
      ['Bon de visite', 'now'],
      ['Visite faite', 'later'],
    ])}
    <p class="ok">Visite planifiée samedi à 10 h</p>
    <div class="vact"><span class="ph">Le jour de la visite, faites signer le bon au visiteur. Il dira à quel titre vous intervenez.</span><button class="btn sm">Signer le bon de visite</button></div>
    <div class="vlinks"><a>Changer la date</a><a>Ouvrir le dossier de collaboration</a><a>Visite faite</a></div>
  </li>`;

const visitAfterRecherche = `
  <li class="visit">
    ${visitHead.replace('220 m² · Mougins</b>', '220 m² · Mougins</b>')}
    ${track([
      ['Confirmer la visite', 'now'],
      ['Bon de visite', 'later'],
      ['Visite faite', 'later'],
    ])}
    <div class="vact"><span class="ph">Le jour et l’heure : un message prêt pour l’acquéreur.</span><button class="btn sm">Confirmer la visite</button></div>
    <div class="vlinks"><a>Écrire au confrère</a><a>Écrire au propriétaire</a><a>Visite faite</a></div>
    <p class="grey">Hors mandat de l’agence : le bon de visite et l’offre d’achat demandent votre mandat de recherche avec la famille Keller, ou la collaboration du confrère.</p>
  </li>`;

const visitsPage = (rows) => `
  <h1 class="h1">Visites</h1>
  <section class="card">
    <div class="gh"><h2 class="h2">Famille Keller</h2><a class="lnk">Voir sa fiche</a></div>
    <ul class="visits">${rows}</ul>
  </section>`;

const sheet1 = {
  title: 'M153 · 1 — Visites : une annonce du marché',
  sub: 'La visite des Keller sur une annonce du marché (mou-02, en exclusivité chez « Agence Littoral & Pins », démo M120 B). Avant : la ligne grise du 12/11, ni bon ni offre. Après (fonction ouverte, derrière sa constante) : l’étape « Bon de visite » existe aussi hors mandat ; c’est le bon qui demande à quel titre le conseiller intervient (planche 2).',
  rows: [
    [
      titled('desk', frame('desk', visitsPage(visitBefore), 'visits'), ' · aujourd’hui', 'AVANT'),
      titled('phone', frame('phone', visitsPage(visitBefore)), ' · aujourd’hui', 'AVANT'),
    ],
    [titled('desk', frame('desk', visitsPage(visitAfter + visitAfterRecherche), 'visits'))],
    [
      titled('tab', frame('tab', visitsPage(visitAfter + visitAfterRecherche), 'visits')),
      titled('phone', frame('phone', visitsPage(visitAfter)), ' · collaboration obtenue'),
      titled('phone', frame('phone', visitsPage(visitAfterRecherche)), ' · sans courrier'),
    ],
  ],
  notes: [
    [
      'Avant',
      'Une annonce du marché n’a l’étape « Bon de visite » qu’après « Collaboration obtenue » ou « Mandat rentré » sur sa carte de Prospection. Sinon, la ligne grise du 12/11 dit pourquoi.',
    ],
    [
      'Après, avec un courrier',
      'Le chemin d’hier, plus l’étape <b>Bon de visite</b> entre « Confirmer la visite » et « Visite faite », comme pour un bien de l’agence. Le bouton reste en contour : Visites n’a aucun bouton plein (M120 B).',
    ],
    [
      'Après, sans courrier',
      'Un conseiller qui a déjà un mandat de recherche avec l’acquéreur n’a pas à écrire d’abord : le chemin court (« Confirmer la visite → Bon de visite → Visite faite ») ; « Écrire au confrère » et « Écrire au propriétaire » restent en liens. La ligne grise change : elle dit ce que le bon demandera.',
    ],
    [
      'Quel chemin ?',
      'Le chemin court s’affiche tant qu’aucun courrier n’est préparé ; dès qu’un courrier existe, le chemin avec courrier, comme aujourd’hui. Rien ne présume du titre : c’est le bon qui le demande.',
    ],
    [
      'Constante éteinte',
      'Tant que la juriste n’a pas validé les phrases, la constante reste éteinte : Visites montre l’« Avant », ligne grise comprise.',
    ],
  ],
};

// ---------------------------------------------------------------------------------------------
// Planche 2 — le bon de visite : « À quel titre intervenez-vous ? ».

const titleChoice = (picked, { compact = false, offer = false } = {}) => `
  <div class="title-box${picked ? '' : ' missing'}">
    <span class="tl">À quel titre intervenez-vous ? <em>obligatoire</em></span>
    <div class="radios${compact ? ' col' : ''}">
      <label class="radio${picked === 'search' ? ' on' : ''}"><i></i><span><b>Mon mandat de recherche</b><small>signé avec l’acquéreur</small></span></label>
      <label class="radio${picked === 'colleague' ? ' on' : ''}"><i></i><span><b>Collaboration avec le confrère</b><small>délégation de son mandat de vente</small></span></label>
    </div>
    ${
      picked === 'search'
        ? `<div class="g2"><label class="f"><span>N° du mandat de recherche</span><i class="in on">R-2026-031</i></label><label class="f"><span>Signé le</span><i class="in on">04/11/2026</i></label></div><p class="hint">Repris du dernier bon de la famille Keller.</p>`
        : picked === 'colleague'
          ? `<div class="g2"><label class="f"><span>Agence du confrère</span><i class="in on">Agence Littoral &amp; Pins</i></label><label class="f"><span>N° de son mandat de vente</span><i class="in on">V-4471</i></label></div><p class="hint">Collaboration obtenue le 10/11, sur sa carte de Prospection.</p>`
          : `<p class="err">Choisissez à quel titre vous intervenez : sans lui, ${offer ? 'l’offre ne se prépare pas' : 'le bon ne se signe pas'}.</p>`
    }
  </div>`;

const voucherBien = (picked, opts) => `
  <li class="vb">
    <label class="check"><i class="box on">✓</i><b>Maison · 6 pièces · 220 m² · Mougins</b></label>
    <span class="hint">Visite demandée il y a 3 jours · Annonce du marché, hors mandat de l’agence</span>
    ${titleChoice(picked, opts)}
    <div class="g2"><label class="f"><span>Prix affiché (€)</span><i class="in on">1 720 000</i></label><label class="f"><span>Adresse du bien</span><i class="in">À saisir</i></label></div>
  </li>`;

const voucherAgencyBien = `
  <li class="vb">
    <label class="check"><i class="box">&nbsp;</i><b>Villa · 7 pièces · 240 m² · Mougins</b></label>
    <span class="hint">Visité il y a 5 jours · Mandat signé</span>
  </li>`;

const preview = (picked) =>
  picked === 'colleague'
    ? `<div class="preview"><span class="tl">Sur le bon</span><p>« En collaboration avec Agence Littoral &amp; Pins, mandat de vente n° V-4471 · Prix affiché : 1 720 000 € · Adresse du bien : … »</p></div>`
    : `<div class="preview"><span class="tl">Sur le bon</span><p>« Mandat de recherche n° R-2026-031 du 04/11/2026 · Prix affiché : 1 720 000 € · Adresse du bien : … »</p></div>`;

const voucherPage = (picked, opts = {}) => `
  <a class="back">← Famille Keller</a>
  <h1 class="h1">Bon de visite</h1>
  <section class="card">
    <h2 class="h2">Les biens visités</h2>
    <ul class="vbs">${voucherBien(picked, opts)}${opts.phone ? '' : voucherAgencyBien}</ul>
    ${picked ? preview(picked) : ''}
  </section>
  <section class="card stub"><h2 class="h2">Le visiteur</h2><p class="hint">Inchangé : civilité, prénom et nom, adresse, pièce d’identité (le type seul), « Fait à ».</p></section>`;

const voucherBar = (picked) =>
  `<div class="bar"><span class="bstate">${picked ? '' : 'Il manque : le titre pour la maison de Mougins'}</span><button class="btn fill${picked ? '' : ' off'}">Signer le bon de visite</button></div>`;

const sheet2 = {
  title: 'M153 · 2 — Le bon de visite hors mandat : « À quel titre intervenez-vous ? »',
  sub: 'Dans « Les biens visités » du bon (M137 A), un bien hors mandat de l’agence demande son titre, obligatoire : mon mandat de recherche (n° et date) ou la collaboration avec le confrère (son agence, le n° de son mandat). La phrase imprimée se lit dessous. Sans titre, le bon ne se signe pas, à l’écran comme au serveur.',
  rows: [
    [titled('desk', frame('desk', voucherPage('search'), 'Acquéreurs', { bar: voucherBar('search') }))],
    [
      titled('tab', frame('tab', voucherPage('colleague'), 'Acquéreurs', { bar: voucherBar('colleague') }), ' · collaboration'),
      titled('phone', frame('phone', voucherPage(null, { phone: true, compact: true }), null, { bar: voucherBar(null) }), ' · pas encore choisi'),
      titled('phone', frame('phone', voucherPage('search', { phone: true, compact: true }), null, { bar: voucherBar('search') }), ' · mandat de recherche'),
    ],
  ],
  notes: [
    [
      'Avant',
      'Une annonce du marché ne se coche pas (« Bon de visite : seulement pour un bien de l’agence… ») sauf après « Collaboration obtenue » ; elle reçoit alors un « N° de mandat » sans dire lequel, et le bon imprime « Numéro du mandat : … ».',
    ],
    [
      'Le titre',
      'Deux choix, rien de coché d’avance : <b>Mon mandat de recherche</b> (n° et date de signature) ou <b>Collaboration avec le confrère</b> (son agence, le n° de son mandat de vente). Un bien de l’agence (mandat signé, mandat rentré) ne le demande pas : il garde « N° de mandat » comme aujourd’hui.',
    ],
    [
      'Ce qui se remplit seul',
      'Le mandat de recherche se reprend du dernier bon ou de la dernière offre de la fiche (jamais gardé sur la fiche, M137 A). Après « Collaboration obtenue », le choix « Collaboration » est proposé d’avance, à vérifier ; l’agence du confrère et son n° se saisissent une fois.',
    ],
    [
      'Sans titre',
      'La barre dit « Il manque : le titre pour la maison de Mougins » et « Signer le bon de visite » reste grisé ; le serveur refuse de même. Un bon peut réunir un bien de l’agence et une annonce : chacun porte sa ligne.',
    ],
    [
      'Le prix',
      '« Prix affiché » remplace « Prix de commercialisation » pour un bien hors mandat : c’est le prix de l’annonce.',
    ],
    [
      'À valider',
      'Les phrases imprimées attendent la juriste (<code>M153-hors-mandat-pour-le-juriste.md</code>).',
    ],
  ],
};

// ---------------------------------------------------------------------------------------------
// Planche 3 — l'offre d'achat hors mandat.

const offerPage = (picked, { phone = false } = {}) => `
  <a class="back">← Famille Keller</a>
  <h1 class="h1">Offre d’achat</h1>
  <section class="card">
    <h2 class="h2">Le bien</h2>
    <p class="hint">Maison · 6 pièces · 220 m² · Mougins · visitée il y a 2 jours · « Offre envisagée » · hors mandat de l’agence</p>
    ${titleChoice(picked, { compact: phone, offer: true })}
    <div class="g2"><label class="f"><span>Adresse du bien</span><i class="in">À saisir</i></label><label class="f"><span>Cadastre</span><i class="in">Section, numéro, contenance</i></label></div>
  </section>
  <section class="card">
    <h2 class="h2">Le prix et les honoraires</h2>
    <div class="g2"><label class="f"><span>Prix offert (€)</span><i class="in on">1 650 000</i></label><label class="f"><span>Prix affiché de l’annonce</span><i class="in ro">1 720 000 €</i></label></div>
    <div class="g2"><label class="f"><span>Honoraires (€)</span><i class="in">À saisir</i></label><div class="f"><span>À la charge</span><div class="seg"><b>du vendeur</b><b class="on">de l’acquéreur</b></div></div></div>
    <p class="pending">À trancher avec la juriste : en collaboration, quels honoraires écrire (ceux du mandat du confrère, la part de l’agence ?).</p>
  </section>
  <section class="card">
    <h2 class="h2">La réponse du vendeur</h2>
    ${
      picked === 'colleague'
        ? '<p class="lead">Le lien de réponse est remis à <b>Agence Littoral &amp; Pins</b>, qui le transmet au vendeur.</p><p class="pending">À trancher avec la juriste : le lien passe-t-il par le confrère, ou l’agence note-t-elle seulement « acceptée » ou « refusée » ?</p>'
        : '<p class="lead">Le lien de réponse part au vendeur, comme aujourd’hui.</p>'
    }
  </section>`;

const offerBar = (picked) =>
  `<div class="bar"><span class="bstate${picked ? ' ok' : ''}">${picked ? 'Les offrants signent après relecture' : 'Il manque : le titre, l’adresse, le cadastre, les honoraires'}</span><button class="btn fill${picked ? '' : ' off'}">Relire l’offre</button></div>`;

const sheet3 = {
  title: 'M153 · 3 — L’offre d’achat hors mandat',
  sub: 'Depuis une visite « Offre envisagée » sur une annonce du marché. Le formulaire d’aujourd’hui (M137 B) garde l’offrant, l’état civil, le financement comptant, la validité ; ce qui venait du mandat de l’agence se saisit ici : le titre (le même bloc que le bon), l’adresse, le cadastre, le prix offert et les honoraires.',
  rows: [
    [titled('desk', frame('desk', offerPage('search'), 'Acquéreurs', { bar: offerBar('search') }))],
    [
      titled('tab', frame('tab', offerPage('colleague'), 'Acquéreurs', { bar: offerBar('colleague') }), ' · collaboration'),
      titled('phone', frame('phone', offerPage(null, { phone: true }), null, { bar: offerBar(null) }), ' · pas encore choisi'),
    ],
  ],
  notes: [
    [
      'Avant',
      '« Offre d’achat : seulement pour un bien en mandat signé de l’agence, après une visite « Offre envisagée ». » Sur une annonce du marché, aucune offre.',
    ],
    [
      'Ce qui vient du mandat aujourd’hui',
      'Le n° de mandat, l’adresse du bien, le prix de commercialisation proposé et les honoraires, gardés sur la conclusion du mandat. Hors mandat, il n’y a pas de conclusion : tout se saisit dans l’offre et se fige avec elle (pas de migration).',
    ],
    [
      'Le titre',
      'Le même bloc que le bon (planche 2), repris du bon de la visite quand il existe. Sans titre, « Relire l’offre » reste grisé ; le serveur refuse de même.',
    ],
    [
      'Les points de la juriste',
      'Les deux encadrés orange (honoraires, lien du vendeur) et le mot « Mandataire » en collaboration attendent sa réponse ; l’écran suivra sa formule.',
    ],
    [
      'Un seul plein',
      '« Relire l’offre » dans la barre, comme aujourd’hui (M146).',
    ],
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
.frame.desk{width:1280px;min-height:760px}.frame.tab{width:820px;min-height:1000px}.frame.phone{width:390px;min-height:844px;flex-direction:column}
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
.h2{font-family:Rajdhani,Montserrat;font-weight:700;font-size:23px;color:${C.deep}}
.card{background:#fff;border:1px solid ${C.z200};border-radius:16px;padding:20px 22px;display:flex;flex-direction:column;gap:12px}.phone .card{padding:14px;border-radius:14px}
.card.stub{opacity:.7}
.gh{display:flex;justify-content:space-between;align-items:baseline}.lnk{color:${C.deep};font-weight:700;font-size:13.5px}
.lead{font-size:14.5px;color:${C.z700};line-height:1.45}
.visits{list-style:none;display:flex;flex-direction:column;gap:12px}
.visit{border:1px solid ${C.z200};border-radius:12px;padding:12px 16px;display:flex;flex-direction:column;gap:8px}
.vh{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.vt{font-family:Rajdhani,Montserrat;font-size:17px}.price{font-size:14px;color:${C.z600}}
.badge{font-size:12px;font-weight:600;border-radius:999px;padding:3px 10px;background:${C.z100};color:${C.z700}}
.meta{font-size:12px;color:${C.z500}}
.track{list-style:none;display:flex;flex-wrap:wrap;gap:6px}
.track li{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;border-radius:999px;padding:4px 10px;background:${C.z100};color:${C.z500}}
.track li i{width:8px;height:8px;border-radius:99px;background:currentColor}
.track li.done{background:${C.greenSoft};color:${C.green}}.track li.now{background:${C.soft};color:${C.deep}}
.vact{display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:space-between}.ph{font-size:13.5px;color:${C.z700}}
.vlinks{display:flex;flex-wrap:wrap;gap:14px;font-size:13px;font-weight:600;color:${C.deep};text-decoration:underline}
.grey{font-size:12px;color:${C.z500};line-height:1.45}
.ok{font-size:13.5px;font-weight:700;color:${C.green}}
.btn{font-family:inherit;font-size:14.5px;font-weight:700;border-radius:12px;padding:11px 18px;border:1.5px solid ${C.deep};background:#fff;color:${C.deep}}
.btn.sm{font-size:13px;padding:7px 12px;border-radius:10px}
.btn.fill{background:${C.deep};color:#fff}.btn.fill.off{background:#a1a1aa;border-color:#a1a1aa}
.vbs{list-style:none;display:flex;flex-direction:column;gap:12px}
.vb{border:1px solid ${C.z200};border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px}
.check{display:flex;align-items:center;gap:10px;font-size:15px}.box{width:22px;height:22px;border:2px solid ${C.deep};border-radius:6px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:13px;color:#fff}.box.on{background:${C.deep}}
.hint{font-size:12.5px;color:${C.z500};line-height:1.45}
.title-box{border:1.5px solid ${C.deep};background:${C.soft};border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px}
.title-box.missing{border-color:${C.amber};background:${C.amberSoft}}
.tl{font-size:13px;font-weight:800;color:${C.deep}}.tl em{font-style:normal;font-weight:600;color:${C.z500};margin-left:6px}
.radios{display:grid;grid-template-columns:1fr 1fr;gap:8px}.radios.col{grid-template-columns:1fr}
.radio{display:flex;gap:10px;align-items:flex-start;background:#fff;border:1.5px solid ${C.z200};border-radius:10px;padding:10px}
.radio i{flex:none;width:18px;height:18px;border-radius:99px;border:2px solid ${C.z500};margin-top:2px}
.radio.on{border-color:${C.deep}}.radio.on i{border:5px solid ${C.deep}}
.radio span{display:flex;flex-direction:column}.radio b{font-size:14px}.radio small{font-size:12px;color:${C.z500}}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}@container (max-width:520px){.g2{grid-template-columns:1fr}}
.f{display:flex;flex-direction:column;gap:5px;font-size:12.5px;font-weight:600;color:${C.z600}}
.in{font-style:normal;font-weight:400;border:1px solid ${C.z200};border-radius:10px;padding:10px 12px;color:${C.z500};font-size:14px;background:#fff}
.in.on{color:${C.ink}}.in.ro{background:${C.z100};color:${C.z700}}
.seg{display:flex;gap:8px}.seg b{font-size:13px;font-weight:600;background:${C.z100};border-radius:9px;padding:8px 11px;color:${C.z700}}.seg b.on{background:${C.deep};color:#fff}
.err{font-size:13px;font-weight:600;color:${C.amber}}
.preview{border-left:4px solid ${C.deep};background:#fff;border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:4px;border:1px solid ${C.z200};border-left-width:4px;border-left-color:${C.deep}}
.preview p{font-size:13px;color:${C.z700};font-family:Georgia,serif;line-height:1.45}
.pending{font-size:12.5px;line-height:1.45;color:${C.amber};background:${C.amberSoft};border:1px dashed ${C.amber};border-radius:10px;padding:8px 10px}
.bar{position:absolute;left:0;right:0;bottom:0;background:#fff;border-top:1px solid ${C.z200};display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:12px 24px;box-shadow:0 -4px 12px rgba(0,0,0,.05)}
.desk .bar{left:256px}.tab .bar{left:220px}.phone .bar{padding:10px 14px;flex-wrap:wrap}.phone .bar .btn.fill{flex:1}
.bstate{margin-right:auto;font-size:13px;color:${C.amber};font-weight:600}.bstate.ok{color:${C.z500};font-weight:400}
`;

const sheetHtml = ({ title, sub, rows, notes }) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>
<h1 class="sheet">${title}</h1><p class="sheet-sub">${sub}</p>
<div class="layout"><div class="rows">${rows.map((r) => `<div class="row">${r.join('')}</div>`).join('')}</div>
<div class="notes">${notes.map(([t, b]) => `<div class="note"><b class="t">${t} :</b> ${b}</div>`).join('')}</div></div></body></html>`;

const SHEETS = {
  'M153-1-visites.html': sheet1,
  'M153-2-le-bon-hors-mandat.html': sheet2,
  'M153-3-l-offre-hors-mandat.html': sheet3,
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
console.log(`${Object.keys(SHEETS).length} planches écrites (${photos ? 'photos de la démo disponibles' : ''})`);
