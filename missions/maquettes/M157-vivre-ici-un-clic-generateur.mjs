// M157 — générateur des maquettes « « Vivre ici » en un clic » (lot 1 du plan Academia par API,
// demande de Jean-Guy, 16/11). `node missions/maquettes/M157-vivre-ici-un-clic-generateur.mjs --png`
// écrit M157-1, en HTML et en PNG (Chromium du dépôt). Chaque planche : ordinateur (1280), tablette
// (820), téléphone (390), et les notes avant / après. Tout est inventé : la famille Keller, la villa
// de Mougins (mandat signé), mou-02 (Mougins, en exclusivité chez « Agence Littoral & Pins ») et
// mou-07 (Mouans-Sartoux) viennent de la démo (M114, M120 B, M122 B) ; les liens d'Academia aussi.
//
// AVANT = le lien « Vivre ici » du mandat se colle à la main, après un passage par Mon secteur
// (M147 A). APRÈS = un bouton, sur le bien vendeur seulement, crée le lien par l'API de Laurent
// (POST /dossiers, puis POST /dossiers/{id}/liens-client) ; le champ à coller ne reste que comme
// repli (sans clé, Academia en panne). Aucun « Vivre ici » pour un bien hors mandat (Jean-Guy,
// 16/11).

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
// Planche 1 — Bien vendeur : « Le bien dans Academia », le lien « Vivre ici » en un clic.

const LINK_V = 'https://app.myacademia.ai/l/Vb4nT8wLp2';
const cardTop = `
  <h2 class="h2">Le bien dans Academia</h2>
  <p class="hint">Pour vous seul. Le dossier d’adresse (ventes réelles, DPE, risques, urbanisme, cadastre, copropriété) et « Vivre ici » s’ouvrent dans Academia, dans un nouvel onglet.</p>
  <div class="btns"><button class="btn sm">Dossier d’adresse ↗</button><button class="btn sm">Vivre ici ↗</button></div>`;

const livingBefore = `
  <div class="sep"><span class="f">Lien « Vivre ici » à montrer aux acquéreurs (facultatif)</span>
  <i class="in">Collez le lien donné par Academia</i>
  <p class="hint">Montré sur le lien de chaque acquéreur qui a ce bien dans sa sélection, et dans « Confirmer la visite ».</p>
  <div class="btns"><button class="btn sm">Enregistrer le lien</button></div></div>`;

const livingState = (state) => {
  const head = '<div class="sep"><span class="f">Lien « Vivre ici » pour les acquéreurs</span>';
  if (state === 'idle')
    return `${head}<p class="hint">Academia prépare la page du quartier de <b>4 chemin des Restanques Hautes, 06140 Vence</b> : les écoles, les commerces, les transports. Montrée au vendeur et à chaque acquéreur à qui ce bien est proposé.</p>
      <div class="btns"><button class="btn sm">Créer le lien « Vivre ici »</button></div></div>`;
  if (state === 'wait')
    return `${head}<p class="wait"><span class="spin"></span>Academia prépare le dossier de l’adresse… jusqu’à 2 minutes. Vous pouvez quitter la page : le lien vous attendra.</p></div>`;
  if (state === 'ready')
    return `${head}<div class="url"><span class="u">${LINK_V}</span><a class="lnk">Ouvrir ↗</a><a class="lnk">Copier</a></div>
      <p class="hint">Créé aujourd’hui · valable jusqu’au 16/12 · montré au vendeur et à chaque acquéreur à qui ce bien est proposé</p>
      <div class="btns"><a class="lnk">Retirer</a></div></div>`;
  if (state === 'soon')
    return `${head}<div class="url"><span class="u">${LINK_V}</span><a class="lnk">Ouvrir ↗</a><a class="lnk">Copier</a></div>
      <p class="warn">Valable jusqu’au 19/11, dans 3 jours. <a class="lnk">Créer un lien neuf</a></p></div>`;
  if (state === 'expired')
    return `${head}<p class="warn">Le lien a expiré le 14/11 : il n’est plus montré, ni au vendeur ni aux acquéreurs.</p>
      <div class="btns"><button class="btn sm">Créer un lien neuf</button></div></div>`;
  if (state === 'ambiguous')
    return `${head}<p class="warn">Academia ne reconnaît pas l’adresse avec certitude. Laquelle est la bonne ?</p>
      <ul class="props"><li>4 chemin des Restanques Hautes, 06140 Vence</li><li>4 chemin des Restanques, 06140 Vence</li></ul>
      <div class="btns"><button class="btn sm">Créer le lien avec cette adresse</button><a class="lnk">Corriger l’adresse du bien</a></div></div>`;
  if (state === 'down')
    return `${head}<p class="err">Academia ne répond pas pour l’instant. Réessayez dans un moment, ou collez le lien vous-même.</p>
      <div class="btns"><button class="btn sm">Réessayer</button></div>
      <details class="fallback"><summary>Coller le lien à la main</summary><i class="in">Collez le lien donné par Academia</i></details></div>`;
  if (state === 'noaddress')
    return `${head}<p class="hint">Il faut l’adresse du bien pour créer le lien. <a class="lnk">Ajoutez l’adresse du bien</a></p></div>`;
  return '';
};

const propertyPage = (state, device) => `
  <h1 class="h1">M. et Mme Lopez</h1>
  ${device === 'phone' ? '' : '<div class="tabs"><span>Vue d’ensemble</span><b>Bien vendeur</b><span>Concurrents</span><span>Avant le rendez-vous</span><span>Live</span></div>'}
  <section class="card">${cardTop}${state === 'before' ? livingBefore : livingState(state)}</section>`;

const sheet1 = {
  title: 'M157 · 1 — Bien vendeur : le lien « Vivre ici » en un clic',
  sub: 'L’onglet Bien vendeur d’un mandat (M. et Mme Lopez, Vence, dans la démo). Le champ à coller (M147 A) laisse la place à un bouton : ACM demande le dossier de l’adresse à Academia, puis son lien client, et le range sur le mandat. Le conseiller n’ouvre jamais Mon secteur.',
  rows: [
    [titled('desk', frame('desk', propertyPage('before', 'desk'), 'Préparation'), ' · aujourd’hui (M147 A)', 'AVANT'), ],
    [titled('desk', frame('desk', propertyPage('idle', 'desk'), 'Préparation'), ' · le bouton')],
    [
      titled('tab', frame('tab', propertyPage('wait', 'tab'), 'Préparation'), ' · Academia prépare le dossier'),
      titled('phone', frame('phone', propertyPage('ready', 'phone')), ' · le lien créé'),
    ],
    [
      titled('tab', frame('tab', propertyPage('ambiguous', 'tab'), 'Préparation'), ' · adresse ambiguë (422)'),
      titled('phone', frame('phone', propertyPage('down', 'phone')), ' · Academia ne répond pas'),
    ],
    [
      titled('tab', frame('tab', propertyPage('expired', 'tab'), 'Préparation'), ' · le lien a expiré'),
      titled('phone', frame('phone', propertyPage('soon', 'phone')), ' · bientôt expiré'),
    ],
  ],
  notes: [
    ['Avant', 'Le conseiller ouvre Mon secteur, crée le lien client, revient et le colle (M147 A, M156).'],
    ['Le bouton', '« Créer le lien « Vivre ici » », en contour (le seul plein de la page reste « Enregistrer » de la fiche, M146 A). Un geste, un bien : jamais pour plusieurs biens d’un coup (le plafond commun de 200 dossiers par jour).'],
    ['Ce qui part', 'L’adresse enregistrée du bien, son type, ses pièces, sa surface et une référence sans signification (l’identifiant du bien vendeur) ; jamais un nom. Sans adresse : « Ajoutez l’adresse du bien », aucun appel.'],
    ['L’attente', 'Academia répond tout de suite (dossier de moins de 30 jours) ou prépare le dossier (2 minutes au plus) : ACM le suit, et le lien attend le conseiller s’il quitte la page.'],
    ['Le lien créé', 'Rangé sur le mandat, avec sa date d’expiration donnée par Academia (« valable jusqu’au 16/12 »). Il sert au vendeur (la présentation et le document final, décision du 14/11 ; leur place se décide à part) et à chaque acquéreur à qui ce bien est proposé, comme le lien d’un mandat aujourd’hui. Trois jours avant l’expiration, en orange ; expiré, il n’est plus montré et « Créer un lien neuf » le remplace.'],
    ['Seulement le bien vendeur', 'Aucun « Vivre ici » pour un bien hors mandat : ni bouton, ni champ à coller, ni adresse envoyée à Academia (Jean-Guy, 16/11).'],
    ['Adresse ambiguë', 'Academia propose des adresses : le conseiller choisit, ACM ne devine jamais et ne réécrit pas la fiche sans son geste (« Corriger l’adresse du bien »).'],
    ['Repli', 'Sans clé, clé refusée, Academia en panne ou au plafond du jour : le message, « Réessayer », et le champ à coller d’aujourd’hui, replié ; un lien collé y garde ses avertissements aux 25e et 30e jours (M156). Sans clé du tout, la carte reste celle d’aujourd’hui. Jamais lu comme « pas de lien » (M98).'],
    ['Démo', 'Le bouton passe par le dossier de démonstration fixe d’Academia (clé d’essai, A2), jamais une autre adresse. Tant que Laurent n’a pas donné la clé d’essai, la démo garde la carte d’aujourd’hui : aucun lien inventé.'],
  ],
};

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

.tabs{display:flex;gap:18px;font-size:13px;color:${C.z500};border-bottom:1px solid ${C.z200};padding-bottom:8px}.tabs b{color:${C.deep}}
.sep{border-top:1px solid ${C.z100};padding-top:12px;display:flex;flex-direction:column;gap:8px}
.f{font-size:13px;font-weight:600;color:${C.z600}}
.wait{display:flex;gap:10px;align-items:center;font-size:13.5px;color:${C.z700};background:${C.z100};border-radius:9px;padding:9px 12px}
.spin{width:14px;height:14px;border:2px solid ${C.z200};border-top-color:${C.deep};border-radius:99px;display:inline-block;flex:none}
.err{font-size:13px;font-weight:600;color:#b91c1c;background:#fef2f2;border-radius:9px;padding:7px 10px;line-height:1.4}
.props{list-style:none;display:flex;flex-direction:column;gap:6px}.props li{border:1px solid ${C.z200};border-radius:9px;padding:7px 10px;font-size:13.5px}.props li:first-child{border-color:${C.deep};background:${C.soft}}
.fallback{font-size:13px;color:${C.z600}}.fallback summary{cursor:pointer;margin-bottom:6px}
`;


const sheetHtml = ({ title, sub, rows, notes }) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>
<h1 class="sheet">${title}</h1><p class="sheet-sub">${sub}</p>
<div class="layout"><div class="rows">${rows.map((r) => `<div class="row">${r.join('')}</div>`).join('')}</div>
<div class="notes">${notes.map(([t, b]) => `<div class="note"><b class="t">${t} :</b> ${b}</div>`).join('')}</div></div></body></html>`;

const SHEETS = {
  'M157-1-bien-vendeur.html': sheet1,
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
