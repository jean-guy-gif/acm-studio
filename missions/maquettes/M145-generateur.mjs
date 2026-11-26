// Mission 145 — générateur des maquettes « Aujourd'hui » (point de départ : AUDIT-aujourdhui.png).
// `node missions/maquettes/M145-generateur.mjs` écrit les HTML M145-1 à M145-5 à côté de lui ;
// `node missions/maquettes/M145-generateur.mjs --png` les rend aussi en PNG (Chromium du dépôt).
//
// Données : les tâches RÉELLES que l'application calcule pour l'agence de démonstration, relevées
// en lecture seule sur l'essai le samedi 07/11/2026 à 21 h 40 (Suivi → « À faire aujourd'hui · 17 »).
// Version 7 (réponses de Jean-Guy, 07/11) : « Mes tâches | Toute l'agence » pour un manager (un
// dossier et un acquéreur ont un conseiller attitré) ; « Fait aujourd'hui » porte le prénom de qui
// l'a fait dans « Toute l'agence », « Visite faite » comprise ; « Démarcher » reçoit aussi une carte
// « Adresse à confirmer », « Confirmer l'adresse » d'abord.
// Version 6 (réponses de Jean-Guy, 07/11) : « Relancer plus tôt ? » quand des acquéreurs prêts
// correspondent avant la date de relance, « Garder la date » ; la phrase anonyme dans le message ;
// « À vérifier » : rien dans Aujourd'hui, « précisez le mandat » sur la carte ; libellés du dossier.
// Version 5 (Jean-Guy, 07/11, après le /valide de la partie A) : un bien sans mandat qui correspond à
// des acquéreurs prêts devient une alerte pour rentrer le mandat, jamais une proposition — la relance
// du vendeur à relancer porte l'argument, les concurrents en mandat simple ou chez un particulier
// font « Démarcher : N acquéreurs prêts correspondent » (M145-6) ; la carte du Suivi d'un mandat
// sous offre acceptée dit « Offre acceptée · famille Keller » ; « Proposer ce bien » compte comme la
// tâche. Données : la démo réelle après la partie A, M. et Mme Rossi rendus prêts (décision du 07/11).
// Version 4 (Jean-Guy, 07/11) : la 145 en deux parties (A les règles et le dossier de Vence, B la
// page, le menu, « Fait aujourd'hui », le Suivi) ; « Martin » retiré avant (ligne Prospection : 4).
// Version 3 : seul un bien sous mandat signé, sans offre acceptée, est proposé à un acquéreur ;
// la boucle se voit dans la démo par un mandat signé à Vence (M. et Mme Lopez, à semer, question 2) ;
// plus de repère des mandats ; le point de la semaine est retiré le mercredi soir (absent le samedi
// 07/11, montré le lundi 09/11 dans M145-5) ; « Fait aujourd'hui » ; le Suivi perd son bloc.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const C = {
  brand: '#00527a',
  brandDarker: '#013a58',
  brandSoft: '#eaf5ff',
  ink: '#18181b',
  muted: '#52525b',
  soft: '#71717a',
  line: '#e4e4e7',
  orange: '#c2410c',
  orangeDot: '#ea7a1a',
  green: '#12875a',
  note: '#fef6c7',
  noteLine: '#e8cf5a',
  noteInk: '#5b4a00',
};

const css = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,Inter,Arial,sans-serif;color:${C.ink};background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:28px;align-items:flex-start}
h1.sheet{font-size:20px;color:#27272a}
.sheet-sub{font-size:13px;color:#3f3f46;max-width:1700px;line-height:1.5}
.row-wrap{display:flex;gap:24px;align-items:flex-start}
.frame-title{font-size:13px;font-weight:700;color:#3f3f46;margin-bottom:6px}
.frame{background:#f7f8fa;position:relative;overflow:hidden;border:1px solid #a1a1aa}
.desk{width:1280px;min-height:800px;display:flex}
.fold{position:absolute;left:0;right:0;top:800px;border-top:2px dashed #ef4444}
.fold span{position:absolute;right:8px;top:-20px;font-size:11px;font-weight:700;color:#ef4444;background:#f7f8fa;padding:0 4px}
.tab{width:1024px;height:768px;display:flex}
.phone{width:390px;height:844px;display:flex;flex-direction:column}
.side{width:236px;align-self:stretch;background:#fff;border-right:1px solid ${C.line};padding:22px 14px;display:flex;flex-direction:column;gap:2px;flex:none}
.tab .side{width:206px;padding:18px 10px}
.agency{font-size:14px;font-weight:800;letter-spacing:.06em;color:${C.brand};text-transform:uppercase;padding:0 10px 18px;line-height:1.3}
.nav{padding:8px 12px;border-radius:10px;display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.nav b{display:block;font-size:14px;font-weight:600}
.nav small{display:block;font-size:11.5px;color:${C.soft};margin-top:1px}
.nav.on{background:${C.brandSoft}}
.nav.on b{color:${C.brandDarker};font-weight:800}
.badge{background:${C.orangeDot};color:#fff;font-size:11px;font-weight:800;border-radius:10px;padding:2px 7px;flex:none}
.group{font-size:10.5px;font-weight:800;letter-spacing:.12em;color:${C.soft};padding:14px 12px 4px}
.account{margin-top:auto;border-top:1px solid ${C.line};padding:12px 10px 0;font-size:12px;color:${C.muted};line-height:1.45}
.account b{color:${C.ink};font-size:12.5px}
.main{flex:1;padding:22px 36px;overflow:hidden;display:flex;flex-direction:column;gap:12px}
.tab .main{padding:22px 24px;gap:12px}
.phone .main{padding:16px 14px;gap:12px}
.kicker{font-size:11.5px;font-weight:800;letter-spacing:.14em;color:${C.soft};text-transform:uppercase}
.title{font-family:Rajdhani,Montserrat,Arial,sans-serif;font-size:38px;font-weight:800;color:${C.brandDarker};line-height:1.05}
.phone .title{font-size:30px}
.subtitle{font-size:14px;color:${C.muted};margin-top:4px}
.head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px}
.kpis{display:flex;gap:10px}
.kpi{display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid ${C.line};border-radius:12px;padding:8px 14px;min-width:120px}
.kpi b{display:block;font-size:22px;color:${C.brandDarker}}
.kpi span{font-size:12px;color:${C.muted}}
.block{background:#fff;border:1px solid ${C.line};border-radius:14px;padding:10px 20px;box-shadow:0 1px 2px rgb(0 0 0 / .04)}
.tab .block{padding:10px 16px}
.phone .block{padding:10px 12px}
.block h2{font-family:Rajdhani,Montserrat,Arial,sans-serif;font-size:21px;font-weight:800;color:${C.brandDarker};display:flex;align-items:baseline;gap:8px;padding-bottom:2px}
.block h2 small{font-family:Montserrat,Arial,sans-serif;font-size:12.5px;font-weight:600;color:${C.soft}}
.task{display:flex;align-items:center;gap:14px;padding:8px 0;border-top:1px solid #f0f0f2;position:relative}
.task:first-of-type{border-top:0}
.phone .task{flex-wrap:wrap;gap:8px 10px;align-items:flex-start}
.ico{width:30px;height:30px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px}
.ico.urgent{background:${C.green}}
.ico.seller{background:${C.orangeDot}}
.ico.buyer{background:${C.brand}}
.ico.prosp{background:#52525b}
.txt{flex:1;min-width:0}
.txt b{display:block;font-size:14.5px;font-weight:700;line-height:1.3}
.txt span{display:block;font-size:12.5px;color:${C.muted};margin-top:2px;line-height:1.4}
.txt span.late{display:inline;color:${C.orange};font-weight:700}
.txt span.tag,.txt span.chip{display:inline-block}
.txt span.inl{display:inline}
.btn{border-radius:10px;padding:9px 16px;font-size:13.5px;font-weight:700;white-space:nowrap;flex:none;border:1.5px solid ${C.brand};color:${C.brand};background:#fff}
.btn.full{background:${C.brand};color:#fff}
.phone .btn{width:100%;text-align:center;padding:12px;margin-left:40px;width:calc(100% - 40px)}
.links{font-size:12.5px;color:${C.brand};font-weight:600;display:flex;gap:12px;flex:none}
.pin{position:absolute;right:-30px;top:50%;transform:translateY(-50%);width:20px;height:20px;border-radius:50%;background:${C.noteLine};color:${C.noteInk};font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}
.ghost{opacity:.55}
.tag{display:inline-block;font-size:10.5px;font-weight:800;color:${C.noteInk};background:${C.note};border:1px dashed ${C.noteLine};border-radius:6px;padding:1px 6px;margin-left:6px;vertical-align:middle}
.done{font-size:12.5px;color:${C.muted};padding:2px 4px}
.done s{color:${C.soft}}
.txt span.argue{display:inline-block;margin-top:3px;font-size:12px;font-weight:700;color:#0b6b46;background:#e6f4ec;border-radius:999px;padding:1px 9px}
.done-block{background:#fafafa;box-shadow:none}
.done-block .done{padding:4px 0}
.series{margin:0 0 6px 44px;border-left:3px solid ${C.brandSoft};padding-left:14px}
.sub{display:flex;align-items:center;gap:10px;padding:6px 0;font-size:13px;border-top:1px dashed #ececef}
.sub:first-child{border-top:0}
.sub b{flex:1;font-weight:600}
.sub .btn{padding:6px 12px;font-size:12.5px}
.notes{width:430px;display:flex;flex-direction:column;gap:12px;flex:none}
.note{background:${C.note};border:1px solid ${C.noteLine};border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.5;color:#3a3000}
.note b{color:${C.noteInk}}
.note ol{padding-left:18px;display:flex;flex-direction:column;gap:5px}
.note code{font-size:11.5px;background:#fff8d6;padding:0 3px;border-radius:3px}
.topbar{height:52px;background:#fff;border-bottom:1px solid ${C.line};display:flex;align-items:center;justify-content:space-between;padding:0 14px;flex:none}
.topbar .agency{padding:0;font-size:12.5px}
.burger{display:flex;align-items:center;gap:6px;font-size:22px;color:${C.brandDarker}}
.drawer{background:#fff;border-bottom:1px solid ${C.line};padding:8px 10px 12px;display:flex;flex-direction:column;gap:2px;box-shadow:0 8px 20px rgb(0 0 0 / .08)}
.scrim{flex:1;background:rgb(24 24 27 / .25)}
.fiche{width:1280px;height:560px;display:flex}
.nextstep{background:#fff;border:2px solid ${C.brand};border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:8px;width:400px}
.nextstep .k{font-size:11px;font-weight:800;letter-spacing:.12em;color:${C.soft};text-transform:uppercase}
.nextstep h3{font-family:Rajdhani,Montserrat,Arial,sans-serif;font-size:22px;color:${C.brandDarker}}
.nextstep p{font-size:13px;color:${C.muted};line-height:1.45}
.chip{display:inline-block;font-size:11.5px;font-weight:700;border-radius:999px;padding:2px 9px;background:#e7f4ee;color:${C.green};margin-right:6px}
.listrow{background:#fff;border:1px solid ${C.line};border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:14px}
.empty{background:#fff;border:1px solid ${C.line};border-radius:14px;padding:16px 18px;font-size:14px;color:${C.muted};line-height:1.5}
.error{background:#fff;border:1px solid #f1c3bd;border-radius:14px;padding:12px 16px;font-size:13px;color:#a3291f;line-height:1.5}
`;

const page = (title, body) =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${body}</body></html>`;

// --- Le menu en trois groupes ---------------------------------------------------------------
const NAV = [
  { group: null, label: 'Aujourd’hui', hint: 'Ce qu’il y a à faire', badge: '8', on: true },
  { group: 'Vendeurs', label: 'Préparation', hint: 'Dossiers vendeurs' },
  { label: 'Live', hint: 'Rendez-vous vendeur' },
  { label: 'Suivi', hint: 'Après le rendez-vous' },
  { group: 'Acquéreurs', label: 'Acquéreurs', hint: 'Ce que chacun cherche' },
  { label: 'Visites', hint: 'À planifier, faites, retours' },
  { group: 'Les deux', label: 'Prospection', hint: 'Courriers et passages' },
];

const navHtml = (badge = '8') =>
  NAV.map(
    (item) =>
      `${item.group ? `<div class="group">${item.group.toUpperCase()}</div>` : ''}<div class="nav${item.on ? ' on' : ''}"><div><b>${item.label}</b><small>${item.hint}</small></div>${item.badge ? `<span class="badge">${badge}</span>` : ''}</div>`,
  ).join('');

const side = (badge = '8') =>
  `<aside class="side"><div class="agency">Agence Horizon Côte d’Azur</div>${navHtml(badge)}<div class="account"><b>Natacha Start Academia</b><br>demo@start-academy.fr<br>Agence Horizon Côte d’Azur</div></aside>`;

// --- Les lignes, telles que l'application les calcule le 07/11 -------------------------------
// `pin` : le renvoi vers la note « d'où vient la ligne ».
const BLOCKS = [
  {
    title: 'Urgent',
    note: 'une vente en cours',
    tasks: [
      {
        pin: 1,
        ico: ['urgent', '€'],
        title: 'Le vendeur a accepté l’offre de la famille Keller',
        detail: 'acceptée le 07/11 · prévenir l’acquéreur, puis transmettre au notaire',
        button: 'Prévenir la famille Keller',
        full: true,
        links: ['Transmettre au notaire', 'Fait'],
      },
    ],
  },
  {
    title: 'Vendeurs',
    note: '2',
    tasks: [
      {
        pin: 2,
        ico: ['seller', '!'],
        title: 'Relancer M. et Mme Lambert-Duval',
        argue: '1 acquéreur prêt correspond à votre bien',
        detail: 'réfléchit au prix · dernier contact il y a 8 jours · relance prévue aujourd’hui',
        button: 'Relancer',
      },
      {
        pin: 3,
        ico: ['seller', '◷'],
        title: 'Point marché de M. Lefebvre',
        detail: 'mandat signé le 07/10 · premier Point marché dû (tous les mois)',
        button: 'Faire le point',
      },
    ],
  },
  {
    title: 'Acquéreurs',
    note: '3',
    tasks: [
      {
        pin: 4,
        ico: ['buyer', '4'],
        title: '4 acquéreurs pour la maison de Vence (135 m², 713 000 €)',
        detail:
          'mandat signé de M. et Mme Lopez · la famille Moreau, Mme Faure, M. Girard et Mme Chevalier, M. et Mme Roux · prêts à visiter',
        button: 'Proposer ce bien',
      },
      {
        pin: 5,
        ico: ['buyer', '!'],
        title: 'Relancer M. et Mme Lambert',
        detail: 'sélection envoyée le 04/11, pas de réponse · ',
        late: 'en retard d’un jour',
        button: 'Relancer',
      },
      {
        pin: 6,
        ico: ['buyer', '4'],
        title: 'Proposer un point à 4 acquéreurs prêts à visiter',
        detail: 'M. et Mme Roux, M. Girard et Mme Chevalier, Mme Faure, la famille Moreau · à l’agence ou en visio',
        button: 'Voir les 4',
        series: ['M. et Mme Roux', 'M. Girard et Mme Chevalier', 'Mme Faure', 'La famille Moreau'],
        subButton: 'Proposer un point',
      },
    ],
  },
  {
    title: 'Prospection',
    note: 'courriers et passages',
    tasks: [
      {
        pin: 7,
        ico: ['prosp', '3'],
        title: 'Démarcher 3 biens : des acquéreurs prêts y correspondent',
        argue: '4, 4 et 3 acquéreurs prêts correspondent',
        detail: 'mandat simple chez un confrère · par courrier ou passage, jamais par téléphone',
        button: 'Voir les 3',
        series: [
          'Maison · 5 pièces · 130 m² · Vence · 715 000 € — 4 acquéreurs prêts',
          'Maison · 5 pièces · 142 m² · Vence · 729 000 € — 4 acquéreurs prêts',
          'Maison · 5 pièces · 135 m² · Saint-Paul-de-Vence · 740 000 € — 3 acquéreurs prêts',
        ],
        subButton: 'Préparer le courrier',
      },
      {
        pin: 8,
        ico: ['prosp', '✉'],
        title: 'Démarcher 6 autres concurrents de 2 mandats',
        detail: 'M. Lefebvre : 4 · M. et Mme Lopez : 2 · courrier au propriétaire, dossier au confrère',
        button: 'Prospecter',
      },
    ],
  },
];

const taskHtml = (task, { pins = true, open = false, phone = false } = {}) => {
  const btn = `<span class="btn${task.full ? ' full' : ''}">${open && task.series ? 'Fermer ▴' : task.button}</span>`;
  const links =
    task.links && !phone
      ? `<span class="links">${task.links.map((l) => `<span>${l}</span>`).join('')}</span>`
      : '';
  const row = `<div class="task${task.ghost ? ' ghost' : ''}"><span class="ico ${task.ico[0]}">${task.ico[1]}</span><div class="txt"><b>${task.title}${task.tag ? `<span class="tag">${task.tag}</span>` : ''}</b>${task.argue ? `<span class="argue">« ${task.argue} »</span>` : ''}<span>${task.detail}${task.late ? `<span class="late">${task.late}</span>` : ''}${task.links && phone ? ` · <span class="inl" style="color:${C.brand};font-weight:600">${task.links.join(' · ')}</span>` : ''}</span></div>${links}${btn}${pins ? `<span class="pin">${task.pin}</span>` : ''}</div>`;
  if (!open || !task.series) return row;
  const subs = task.series
    .map(
      (name) =>
        typeof name === 'string'
          ? `<div class="sub"><b>${name}</b><span class="btn">${task.subButton ?? 'Préparer le point'}</span></div>`
          : `<div class="sub"><b>${name.label}</b>${name.note ? `<span style="font-size:11.5px;color:${C.orange};font-weight:700">${name.note}</span>` : ''}<span class="btn">${name.button}</span></div>`,
    )
    .join('');
  return `${row}<div class="series">${subs}</div>`;
};

const blocksHtml = (opts = {}) =>
  BLOCKS.map(
    (block) =>
      `<section class="block"><h2>${block.title}<small>· ${block.note}</small></h2>${block.tasks
        .map((t) => taskHtml(t, { ...opts, open: opts.openPin === t.pin }))
        .join('')}</section>`,
  ).join('');

const scopeSwitch = (scope) =>
  scope
    ? `<div style="display:inline-flex;background:#eef0f3;border-radius:999px;padding:3px;margin-top:8px;font-size:12.5px;font-weight:700">${[
        ['mine', 'Mes tâches'],
        ['agency', 'Toute l’agence'],
      ]
        .map(
          ([key, label]) =>
            `<span style="padding:5px 12px;border-radius:999px;${key === scope ? `background:#fff;color:${C.brandDarker};box-shadow:0 1px 2px rgb(0 0 0 / .1)` : `color:${C.muted}`}">${label}</span>`,
        )
        .join('')}</div>`
    : '';
const header = ({ kpis = true, count = 8, scope = null } = {}) =>
  `<div class="head"><div><div class="kicker">Samedi 7 novembre</div><div class="title">Aujourd’hui</div><div class="subtitle">${count} choses à faire, la plus urgente en premier.</div>${scopeSwitch(scope)}</div>${
    kpis
      ? '<div class="kpis"><a class="kpi"><b>6</b><span>acquéreurs prêts à visiter ›</span></a></div>'
      : ''
  }</div>`;

const doneLine = (text = '✓ Fait aujourd’hui : rien encore.') => `<div class="done">${text}</div>`;

// --- Les notes « d'où vient la ligne » -------------------------------------------------------
const SOURCES = `<div class="note"><b>D’où vient chaque ligne</b> (le calcul existe déjà : <code>suivi-tasks.ts</code>, aucune tâche inventée)
<ol>
<li><b>Offre acceptée</b> — <code>offer_answer</code> (M138) : réponse du vendeur dans <code>buyer_document_acceptances</code>, jusqu’au « Fait » (<code>buyer_offer_follow_ups</code>). Les gestes de la M138 sur place.</li>
<li><b>Relancer un vendeur</b> — <code>follow_up</code> (M96, M105, M108) : date de prochaine relance, sinon 8 jours après le dernier contact. Ouvre la relance de la M130 A. <b>Nouveau :</b> si des acquéreurs prêts correspondent à son bien (la règle de la boucle, au prix de la M133), l’argument « N acquéreurs prêts correspondent à votre bien » et la relance passe en tête des vendeurs ; ici M. et Mme Rossi, rendus prêts dans la démo. Une relance pas encore due : « Relancer plus tôt ? » (M145-6, 7).</li>
<li><b>Point marché</b> — <code>market_update</code> (M127, M130 A) : un mois après la signature, puis après le dernier point.</li>
<li><b>Proposer un bien</b> — <code>propose_buyers</code> (M133, M134) : un bien × ses acquéreurs prêts qui ne l’ont pas reçu. <b>Corrigée :</b> un bien <b>sous mandat signé</b> seulement (la M134 laissait passer un vendeur à relancer, un concurrent, un nouveau venu, un bien démarché). Ici la maison de Vence signée, semée par la partie A (M. et Mme Lopez). Un mandat sous offre acceptée n’est plus proposé (la villa de Mougins, offre des Keller).</li>
<li><b>Relancer un acquéreur</b> — <code>buyer_relaunch</code> (M135) : lien sans réponse 48 h après l’envoi. Appel permis : c’est un client.</li>
<li><b>Proposer un point</b> — <code>buyer_meeting</code> (M139) : 4 tâches regroupées, tous les 14 jours par acquéreur prêt.</li>
<li value="7"><b>Démarcher, des acquéreurs prêts</b> — <b>nouveau</b> : un concurrent d’un mandat signé (carte « Prêt à envoyer ») en mandat simple ou chez un particulier, auquel des acquéreurs prêts correspondent (même calcul). Un mandat exclusif ne déclenche rien (ven-05, ven-08). Ici ven-01, ven-12 (4 chacun) et ven-07 (3), concurrents de M. et Mme Lopez.</li>
<li><b>Démarcher</b> (les autres) — <code>prospect</code> (M86, M98, M120 B) : cartes « Prêt à envoyer ». Courrier ou passage chez le propriétaire, dossier au confrère : <b>jamais un appel au propriétaire</b>.</li>
</ol></div>
<div class="note"><b>Le point de la semaine</b> (<code>buyer_weekly_report</code>, M139) n’est pas sur cette page : dû le lundi, retiré le mercredi soir (réponse 3). Le samedi 07/11, celui du 26/10 au 01/11 a disparu ; le lundi 09/11, « Envoyer le point de la semaine à 7 acquéreurs » (M145-5).</div>
<div class="note"><b>Un seul repère</b>, un lien : « 6 acquéreurs prêts à visiter » (le badge de la M132 : les 5 de Vence et M. et Mme Rossi), vers Acquéreurs. Les chiffres de mandats restent au Suivi et dans le tableau du manager.</div>
`;

const RULES = `<div class="note"><b>Avant :</b> on arrive sur Préparation ; « À faire aujourd’hui · 17 » est dans le Suivi, une ligne par tâche (7 « point de la semaine », 4 « proposer un point ») ; la pastille de Suivi dit 17. <b>Après :</b> « Aujourd’hui » est la page d’arrivée ; 8 lignes (14 tâches) ; la pastille dit 8 (le nombre de lignes). Le Suivi n’a plus de bloc « À faire aujourd’hui » (M145-5).</div>
<div class="note"><b>Règles :</b> une ligne par sorte de tâche dès qu’il y en a deux (elle s’ouvre sur place, chaque tâche y garde son bouton d’aujourd’hui) ; l’urgent n’est jamais regroupé ; un seul bouton plein, celui de la première ligne ; « en retard » en orange, jamais en rouge.</div>
<div class="note"><b>Blocs :</b> Urgent (offres) · Vendeurs (relances, Point marché) · Acquéreurs (biens à proposer, visites, veille, relances, points) · Prospection (courriers et passages). Un bloc vide ne s’affiche pas.</div>
<div class="note"><b>Menu :</b> l’interrupteur Vendeur | Acquéreur disparaît (remplace M118) ; trois groupes, Préparation, Live et Suivi restent trois entrées, « Prospection » une seule fois ; rien ne change de mode tout seul. Les adresses ne changent pas.</div>`;

// --- 1. Ordinateur ---------------------------------------------------------------------------
const desk = page(
  'M145-1 Aujourd’hui — ordinateur',
  `<h1 class="sheet">M145-1 · Aujourd’hui — ordinateur 1280 × 800</h1>
<p class="sheet-sub">Version 5 (07/11), partie B : la démo réelle après la partie A et le retrait de « Martin », M. et Mme Rossi rendus prêts (décision du 07/11). Un bien sans mandat que veulent des acquéreurs prêts devient une alerte pour rentrer le mandat (lignes 2 et 7, détail en M145-6).</p>
<div class="row-wrap"><div><div class="frame-title">Page d’arrivée après connexion</div>
<div class="frame desk">${side()}<div class="main" style="padding-right:56px">${header({ scope: 'mine' })}${blocksHtml()}${doneLine()}</div><div class="fold"><span>bas de l’écran 1280 × 800 : la suite défile</span></div></div></div>
<div class="notes">${RULES}${SOURCES}</div></div>`,
);

// --- 2. Tablette : une série ouverte, et une tâche faite -------------------------------------
const tab = page(
  'M145-2 Aujourd’hui — tablette',
  `<h1 class="sheet">M145-2 · Aujourd’hui — tablette 1024 × 768, une série ouverte</h1>
<p class="sheet-sub">« Voir les 4 » ouvre la série sur place : une ligne par acquéreur, chacune avec le geste de la M139 (message dans sa langue, Copier / SMS / WhatsApp / E-mail, « Envoyé »). Une tâche faite quitte la série et passe, barrée, dans « Fait aujourd’hui » jusqu’à minuit.</p>
<div class="row-wrap"><div><div class="frame-title">Acquéreurs · « Proposer un point » ouvert, après une relance et un point proposé</div>
<div class="frame tab">${side('7')}<div class="main">${header({ kpis: false, count: 7, scope: 'agency' })}
<section class="block"><h2>Acquéreurs<small>· 3</small></h2>${BLOCKS[2].tasks
    .map((t) =>
      t.pin === 6
        ? taskHtml(
            { ...t, title: 'Proposer un point à 3 acquéreurs prêts à visiter', detail: 'M. Girard et Mme Chevalier, Mme Faure, la famille Moreau · à l’agence ou en visio', series: t.series.slice(1), ico: ['buyer', '3'] },
            { pins: false, open: true },
          )
        : taskHtml(t, { pins: false }),
    )
    .join('')}</section>
<section class="block done-block"><h2 style="font-size:16px">✓ Fait aujourd’hui<small>· 3 · toute l’agence</small></h2><div class="done"><s>Relancer M. et Mme Lambert-Duval</s> · relance notée à 10 h 12 par Natacha, prochaine le 07/12</div><div class="done"><s>Proposer un point à M. et Mme Roux</s> · envoi noté à 10 h 25 par Natacha</div><div class="done"><s>Visite faite : M. et Mme Rossi</s> · à 11 h 40 · <span style="color:${C.orange}">dossier de Julien (exemple)</span></div></section></div></div></div>
<div class="notes"><div class="note"><b>Avant :</b> 4 lignes « Proposer un point avec … » (et, le lundi, 7 « Envoyer le point de la semaine à … ») dans le Suivi. <b>Après :</b> une ligne par sorte, ouverte sur place ; on enchaîne sans changer de page ; le compte de la ligne baisse à chaque envoi noté (4 → 3).</div>
<div class="note"><b>Mes tâches | Toute l’agence</b> (décision du 07/11) : un dossier vendeur et un acquéreur ont un conseiller attitré (<code>projects.advisor_id</code>, <code>buyers.advisor_id</code>). Par défaut « Mes tâches », celles de ses dossiers et de ses acquéreurs ; le sélecteur n’existe que pour un manager. La pastille suit « Mes tâches ». Ici, la vue « Toute l’agence » d’un manager.</div>
<div class="note"><b>Prénom</b> : dans « Toute l’agence », chaque ligne de « Fait aujourd’hui » dit qui l’a fait (l’auteur en base : relance, Point marché, relance et points d’un acquéreur, réponse à une offre, bien proposé). La visite faite et le courrier remis n’ont pas d’auteur en base : la ligne dit « dossier de … » (question). « Julien » est un collègue inventé pour la maquette.</div>
<div class="note"><b>Fait aujourd’hui</b> (réponse 4, dans la mission) : en bas de page, barré, avec l’heure ; même périmètre que les tâches ; « Visite faite » comprise ; lu dans les faits datés qui existent déjà — relance d’un vendeur (<code>follow_up_contacts</code>), Point marché (<code>project_market_updates</code>), relance, point de la semaine et point proposé (<code>buyer_events</code>), offre « Fait » (<code>buyer_offer_follow_ups</code>), bien proposé (<code>buyer_proposals</code>), courrier remis (dates de prospection). Aucune colonne.</div>
<div class="note"><b>Tablette :</b> le menu de gauche reste (≥ 768 px, M125), rétréci ; le bouton de chaque ligne reste à droite. En 768 × 1024, même disposition, le détail passe sur deux lignes.</div></div></div>`,
);

// --- 3. Téléphone : la page, et le menu ouvert ------------------------------------------------
const phoneTop = (badge = true) =>
  `<div class="topbar"><span class="agency">Agence Horizon Côte d’Azur</span><span class="burger">${badge ? '<span class="badge">8</span>' : ''}☰</span></div>`;
const phoneBlocks = BLOCKS.map(
  (block) =>
    `<section class="block"><h2>${block.title}<small>· ${/^\d+$/.test(block.note) ? block.tasks.filter((t) => !t.ghost).length : block.note}</small></h2>${block.tasks
      .filter((t) => !t.ghost)
      .map((t) => taskHtml(t, { pins: false, phone: true }))
      .join('')}</section>`,
).join('');
const phone = page(
  'M145-3 Aujourd’hui — téléphone',
  `<h1 class="sheet">M145-3 · Aujourd’hui — téléphone 390 × 844</h1>
<p class="sheet-sub">La barre compacte de la M132, sans l’interrupteur. Chaque ligne : le titre, le détail, puis son bouton sur toute la largeur (44 px). La page défile ; rien n’est caché derrière « Voir » : il n’y a plus que 8 lignes.</p>
<div class="row-wrap">
<div><div class="frame-title">La page (haut)</div><div class="frame phone">${phoneTop()}<div class="main">${header({ kpis: false })}<div style="display:flex;gap:8px;font-size:12.5px;font-weight:600;color:${C.brand}"><span class="kpi" style="min-width:0;padding:6px 10px"><b style="display:inline;font-size:15px">6</b> acquéreurs prêts à visiter ›</span></div>${phoneBlocks}</div></div></div>
<div><div class="frame-title">☰ ouvert : les trois groupes</div><div class="frame phone">${phoneTop(false)}<div class="drawer">${navHtml()}<div class="account" style="margin-top:8px"><b>Natacha Start Academia</b> · Mon compte et l’agence ▾</div></div><div class="scrim"></div></div></div>
<div class="notes"><div class="note"><b>Avant :</b> barre compacte avec l’interrupteur Vendeur | Acquéreur et ☰ ; arrivée sur Préparation ; le Suivi montre 3 tâches puis « Voir les 14 autres ». <b>Après :</b> ☰ porte la pastille (7) ; il déplie Aujourd’hui et les trois groupes ; arrivée sur Aujourd’hui.</div>
<div class="note"><b>Relancer M. et Mme Lambert</b> (acquéreur) ouvre la relance de la M135 : message, et « L’appeler » à son numéro. Les seuls appels de la page : les acquéreurs, et le vendeur qui nous a reçus et a donné son numéro (Lambert-Duval, réponse 2). Aucun vers un propriétaire prospecté.</div></div>
</div>`,
);

// --- 4. La boucle côté acquéreur (I2) --------------------------------------------------------
const fiche = page(
  'M145-4 La boucle côté acquéreur',
  `<h1 class="sheet">M145-4 · La boucle se voit côté acquéreur (I2) — fiche et liste, ordinateur</h1>
<p class="sheet-sub">Dès qu’un bien <b>sous mandat signé</b> est à lui proposer (la tâche <code>propose_buyers</code>, corrigée), sa prochaine étape le dit. Partie A. Exemple : la famille Moreau et la maison de Vence signée, semée dans la démo.</p>
<div class="row-wrap"><div><div class="frame-title">Fiche de la famille Moreau · colonne de droite, et les lignes de la liste</div>
<div class="frame fiche"><div class="main" style="flex-direction:row;gap:28px;align-items:flex-start">
<div style="flex:1;display:flex;flex-direction:column;gap:12px"><div class="kicker">Acquéreur</div><div class="title" style="font-size:32px">Famille Moreau</div>
<div><span class="chip">Prêt à visiter</span><span style="font-size:13px;color:${C.muted}">Maison · Vence · Saint-Paul-de-Vence · La Colle-sur-Loup · jusqu’à 800 000 € · 5 pièces ou plus</span></div>
<div style="height:16px"></div><div class="kicker">Dans la liste des acquéreurs</div>
<div class="listrow"><div class="txt"><b>Famille Moreau <span class="chip" style="margin-left:6px">Prêt à visiter</span></b><span>Maison · Vence · Saint-Paul-de-Vence · La Colle-sur-Loup · jusqu’à 800 000 €</span><span>Prochaine étape · <b style="display:inline;font-size:12.5px">Lui proposer la maison de M. et Mme Lopez</b> · depuis le 04/11</span></div><span class="btn">Proposer ce bien →</span></div>
<div class="listrow"><div class="txt"><b>M. et Mme Rossi <span class="chip" style="margin-left:6px">Prêt à visiter</span></b><span>Appartement · Antibes · Juan-les-Pins · 380 000 € – 400 000 €</span><span>Prochaine étape · Trouver ses biens idéaux · depuis aujourd’hui <span class="tag">l’appartement des Lambert-Duval n’a pas de mandat : c’est une relance du vendeur (M145-6)</span></span></div><span class="btn">Trouver les biens idéaux →</span></div>
</div>
<div class="nextstep"><div class="k">Prochaine étape · aujourd’hui</div><h3>Lui proposer la maison de M. et Mme Lopez</h3>
<p>Maison · 5 pièces · 140 m² · Vence · 735 000 €, 65 000 € sous son budget. Mandat signé le 04/11.</p>
<span class="btn full" style="align-self:flex-start">Proposer ce bien</span><span class="links"><span>Trouver d’autres biens</span></span></div>
</div></div></div>
<div class="notes"><div class="note"><b>Avant :</b> l’écran vendeur de Mme Garcia dit « 4 acquéreurs prêts » mais leur fiche dit « Trouver ses biens idéaux ». <b>Après :</b> dès qu’un mandat signé leur correspond, leur fiche et leur ligne disent « Lui proposer [le bien] » ; « Proposer ce bien » ouvre la page de la M134 sur ce bien.</div>
<div class="note"><b>La règle, partout</b> (Aujourd’hui, fiche, liste, page « Proposer ce bien » et son action) : seul un bien sous mandat signé, <b>sans offre acceptée</b>, est proposé — biens idéaux compris (on n’y retient plus un vendeur à relancer ; concurrents et annonces du marché restent, avec le courrier ou le dossier au confrère avant toute visite, M120). Un vendeur à relancer (Lambert-Duval), un dossier sans mandat (Mme Garcia), un concurrent, un nouveau venu ou un bien démarché ne le sont plus ; l’action le refuse au serveur, un test le prouve.</div>
<div class="note"><b>Mme Garcia</b> : côté vendeur, rien ne change ; sa Vue d’ensemble et « Avant le rendez-vous » montrent « Acquéreurs de l’agence pour ce bien » (M133), un argument pour le Live, pas une tâche.</div>
<div class="note"><b>Rang :</b> cette étape ne remplace que « Trouver ses biens idéaux » et « Lui proposer d’autres biens » ; une offre, une visite à organiser, une présentation ou une relance en cours passent avant (M143). Plusieurs mandats : le plus récent, « + 1 autre bien ».</div>
<div class="note"><b>Envoyé :</b> l’envoi noté (<code>buyer_proposals</code>, M134) fait revenir l’étape d’avant. Un bien écarté pour lui (M139) ne revient pas.</div></div></div>`,
);

// --- 5. États : rien à faire, lecture en échec, première connexion -----------------------------
const states = page(
  'M145-5 Aujourd’hui — états',
  `<h1 class="sheet">M145-5 · Aujourd’hui — les états</h1>
<div class="row-wrap" style="flex-wrap:wrap;max-width:1700px">
<div style="width:640px"><div class="frame-title">Rien à faire aujourd’hui</div><div class="empty"><b style="color:${C.brandDarker}">Rien à faire aujourd’hui.</b><br>Prochaine tâche : Point marché de M. Lefebvre le 07/12.<br>✓ Fait aujourd’hui : <s>Relancer M. et Mme Lambert-Duval</s> · <s>Point marché de M. Lefebvre</s></div></div>
<div style="width:640px"><div class="frame-title">Une lecture en échec (M98 : jamais lue comme « rien à faire »)</div><div class="error">Les tâches des acquéreurs n’ont pas pu être lues : rechargez la page.</div><div style="height:8px"></div><section class="block"><h2>Vendeurs<small>· 2</small></h2>${BLOCKS[1].tasks.map((t) => taskHtml(t, { pins: false })).join('')}</section><p style="font-size:12px;color:${C.muted};margin-top:6px">La pastille du menu se tait (M130 A).</p></div>
<div style="width:640px"><div class="frame-title">Conseiller sans aucun dossier</div><div class="empty">Inchangé : la connexion mène à « Bienvenue » (M97) tant qu’il n’a créé aucun dossier, sauf en mode expert. Ensuite, « Aujourd’hui ».</div></div>
<div style="width:640px"><div class="frame-title">Lundi 09/11 : le point de la semaine revient, jusqu’au mercredi 11/11 au soir</div><section class="block"><h2>Acquéreurs<small>· …</small></h2>${taskHtml(
    {
      ico: ['buyer', '7'],
      title: 'Envoyer le point de la semaine à 7 acquéreurs',
      detail: 'semaine du 02/11 au 08/11 · M. et Mme Lambert, la famille Moreau, Mme Faure et 4 autres · jusqu’à mercredi',
      button: 'Voir les 7',
    },
    { pins: false },
  )}</section><p style="font-size:12px;color:${C.muted};margin-top:6px">Les 7 acquéreurs du relevé du 07/11 (M. et Mme Rossi, prêts le jour de la démo, n’y entrent pas : leur fiche est créée après la semaine racontée). Jamais « en retard » : jeudi, il a disparu.</p></div>
<div style="width:640px"><div class="frame-title">Le Suivi, après : plus de bloc « À faire aujourd’hui »</div><div class="empty" style="font-size:13px"><div class="kicker" style="margin-bottom:2px">Après le rendez-vous</div><div class="title" style="font-size:28px">Suivi</div><p style="margin:2px 0 10px">Chaque vendeur, et sa prochaine étape. <span style="color:${C.brand};font-weight:600">Ce que vous avez à faire aujourd’hui : Aujourd’hui ›</span></p><p><b style="color:${C.ink}">Tous · 3 &nbsp; Mandats signés · 2 &nbsp; À relancer · 1 &nbsp; Vendus ailleurs · retirés · 0</b></p><p style="margin-top:8px">puis les cartes, inchangées (M130 A : prochaine étape, bouton, frise).</p></div></div>
<div style="width:640px"><div class="frame-title">Une série avec des tâches en retard</div><section class="block"><h2>Vendeurs<small>· 1</small></h2>${taskHtml(
    {
      ico: ['seller', '3'],
      title: 'Relancer 3 vendeurs',
      detail: 'M. et Mme Lambert-Duval, Mme Petit, M. Durand · ',
      late: 'dont 2 en retard',
      button: 'Voir les 3',
    },
    { pins: false },
  )}</section><p style="font-size:12px;color:${C.muted};margin-top:6px">Exemple de forme seulement (noms fictifs, pas dans la démo) : une série dit combien sont en retard, la plus en retard en tête quand on l’ouvre.</p></div>
</div>`,
);


// --- 6. Rentrer le mandat : les alertes (partie B) ----------------------------------------------
const box = (title, body, width = 640) =>
  `<div style="width:${width}px"><div class="frame-title">${title}</div>${body}</div>`;
const alertsPage = page(
  'M145-6 Rentrer le mandat',
  `<h1 class="sheet">M145-6 · Un bien sans mandat que veulent des acquéreurs prêts : une alerte pour rentrer le mandat, jamais une proposition</h1>
<p class="sheet-sub">Même calcul de correspondance que la boucle (M133, M134, acquéreurs écartés exclus, M139). Les acquéreurs sont nommés sur les écrans du conseiller, jamais dans ce qui part vers le vendeur ou le propriétaire : seulement un nombre. Données : la démo, M. et Mme Rossi rendus prêts (décision du 07/11).</p>
<div class="row-wrap" style="flex-wrap:wrap;max-width:1720px;align-items:flex-start">
${box('1 · Dossier de M. et Mme Lambert-Duval (à relancer), Vue d’ensemble', `<section class="block" style="padding:16px 20px"><h2 style="font-size:19px">Acquéreurs de l’agence pour ce bien</h2>
<div class="txt"><span class="argue" style="font-size:13px">1 acquéreur prêt correspond à ce bien</span></div>
<div class="task"><div class="txt"><b style="font-size:13.5px">M. et Mme Rossi</b><span>Antibes, Juan-les-Pins · jusqu’à 400 000 € · Prêt à visiter</span></div></div>
<p style="font-size:13px;color:${C.muted};margin:6px 0 10px">Rentrez le mandat pour pouvoir le proposer.</p>
<span class="btn full">Relancer M. et Mme Lambert-Duval</span></section>
<p style="font-size:12px;color:${C.muted};margin-top:6px"><b>Avant :</b> « Proposer ce bien aux acquéreurs » (M134), retiré par la partie A. <b>Après :</b> l’argument et le geste de relance de la M130 A (message, SMS, e-mail, appel : un vendeur rencontré est un client en relation).</p>`)}
${box('2 · La relance ouverte : le message au vendeur', `<section class="block" style="padding:16px 20px"><h2 style="font-size:19px">Relancer M. et Mme Lambert-Duval</h2>
<div style="font-size:13px;line-height:1.55;border:1px solid ${C.line};border-radius:10px;padding:10px 12px;margin:8px 0">Bonjour,<br><span style="color:${C.soft}">[le message de relance d’aujourd’hui, inchangé : votre bien, son prix, ce qui lui manquait, le motif (M96, M130 A)]</span><br><mark style="background:#e6f4ec">Depuis notre rendez-vous, un acquéreur prêt à visiter cherche un bien comme le vôtre.</mark><br>Natacha — Agence Horizon Côte d’Azur</div>
<div style="display:flex;gap:8px;flex-wrap:wrap"><span class="btn">Copier</span><span class="btn">SMS</span><span class="btn">WhatsApp</span><span class="btn">E-mail</span><span class="btn">Appeler</span><span class="btn full">J’ai relancé</span></div></section>
<p style="font-size:12px;color:${C.muted};margin-top:6px">La phrase surlignée s’ajoute au message (décision du 07/11) : un nombre, jamais un nom, un budget ni une commune d’acquéreur ; « un acquéreur », « 3 acquéreurs » ; modifiable comme le reste.</p>`)}
${box('3 · Aujourd’hui, Prospection : la série ouverte', `<section class="block"><h2>Prospection<small>· courriers et passages</small></h2>${taskHtml(
    {
      ...BLOCKS[3].tasks[0],
      title: 'Démarcher 4 biens : des acquéreurs prêts y correspondent',
      ico: ['prosp', '4'],
      series: [
        ...BLOCKS[3].tasks[0].series.map((label) => ({ label, button: 'Préparer le courrier' })),
        {
          label: 'Maison · 5 pièces · 128 m² · Vence · 705 000 € — 2 acquéreurs prêts',
          note: 'Adresse à confirmer',
          button: 'Confirmer l’adresse',
        },
      ],
    },
    { pins: false, open: true },
  )}${taskHtml(BLOCKS[3].tasks[1], { pins: false })}</section>
<p style="font-size:12px;color:${C.muted};margin-top:6px">« Préparer le courrier » ouvre le dossier de prospection du bien, version propriétaire (M84 : mandat simple ou particulier). Une carte « Adresse à confirmer » entre aussi dans la série, « Confirmer l’adresse » d’abord (décision du 07/11 ; la 4e ligne est un exemple de forme, la démo n’a pas ce cas). Aucun bouton d’appel. ven-05 et ven-08, en exclusivité, ne déclenchent rien ; un concurrent « à vérifier » non plus : sa carte le dit (4).</p>`, 760)}
${box('4 · La carte de Prospection du bien', `<section class="block" style="padding:14px 18px"><div class="txt"><b>12 chemin des Restanques, 06140 Vence</b><span>Adresse confirmée · Mandat simple · Propriétaire · aller sonner</span></div>
<div class="txt" style="margin:6px 0"><span class="argue">4 acquéreurs prêts correspondent · courrier ou passage</span></div>
<div class="txt"><span>Maison · 5 p · 130 m² · 715 000 €</span></div>
<div style="display:flex;gap:8px;margin-top:8px"><span class="btn">Préparer le dossier</span><span class="btn">Marquer remis</span></div></section>
<section class="block" style="padding:14px 18px;margin-top:10px"><div class="txt"><b>5 chemin du Val, 06250 Mougins</b><span>Adresse confirmée · Vendu par : agence · Exclusivité : à vérifier</span></div>
<div class="txt" style="margin:6px 0"><span class="argue" style="background:#fff3e0;color:#9a4d00">2 acquéreurs prêts correspondent : précisez le mandat</span></div>
<div style="display:flex;gap:6px;align-items:center;font-size:12px">Exclusivité : <span class="btn" style="padding:4px 10px">Oui</span><span class="btn" style="padding:4px 10px">Non</span><span class="btn" style="padding:4px 10px">Inconnu</span></div></section>
<p style="font-size:12px;color:${C.muted};margin-top:6px">En haut, mandat simple : le nombre et « courrier ou passage ». En bas, exclusivité « à vérifier » : rien dans « Aujourd’hui », la carte demande de préciser (les choix de la M83) ; « Non » ou un particulier fait naître l’alerte, « Oui » l’éteint. Les cartes en exclusivité n’ont rien. Adresses et nombre du second exemple inventés pour la maquette (la démo n’a pas ce cas).</p>`, 520)}
${box('5 · « Proposer ce bien » (Lopez) : le même compte que la tâche', `<section class="block" style="padding:16px 20px"><h2 style="font-size:19px">4 acquéreurs prêts à visiter</h2>
${['La famille Moreau', 'Mme Faure', 'M. Girard et Mme Chevalier', 'M. et Mme Roux'].map((n) => `<div class="sub"><b>☑ ${n}</b><span class="chip">Prêt à visiter</span></div>`).join('')}
<h2 style="font-size:15px;margin-top:10px">Correspond aussi, pas encore prêt · 1</h2>
<div class="sub"><b>☐ M. Fontaine</b><span style="font-size:12px;color:${C.muted}">Financement en cours</span></div>
<div style="margin-top:10px"><span class="btn full">Envoyer à 4 acquéreurs</span></div></section>
<p style="font-size:12px;color:${C.muted};margin-top:6px"><b>Avant :</b> « 5 acquéreurs correspondent », tous cochés, M. Fontaine compris, quand la tâche disait 4. <b>Après :</b> les prêts, cochés ; les autres à part, décochés, que le conseiller peut cocher (remplace M134, « tous cochés »).</p>`)}
${box('7 · « Relancer plus tôt ? » : une relance pas encore due', `<section class="block"><h2>Vendeurs<small>· 2</small></h2>${taskHtml(
    {
      ico: ['seller', '!'],
      title: 'Relancer plus tôt ? 1 acquéreur prêt correspond au bien des Lambert-Duval',
      detail: 'relance prévue le 20/11 · réfléchit au prix',
      button: 'Relancer',
      links: ['Garder la date'],
    },
    { pins: false },
  )}${taskHtml(BLOCKS[1].tasks[1], { pins: false })}</section>
<p style="font-size:12px;color:${C.muted};margin-top:6px">La date du conseiller ne change pas (M105). Dès qu’un acquéreur prêt se met à correspondre, la ligne s’affiche ; « Relancer » ouvre la relance (avec la phrase anonyme), « Garder la date » cache la ligne jusqu’au 20/11, où la relance due la remplace, argument compris ; un acquéreur prêt de plus, ou une nouvelle relance, la fait revenir ; le geste vaut pour toute l’agence (décisions du 07/11). Exemple de forme : dans la démo, la relance des Lambert-Duval est due aujourd’hui, c’est elle qui porte l’argument (M145-1, ligne 2).</p>`, 760)}
${box('6 · La carte du Suivi de M. Lefebvre (mandat sous offre acceptée)', `<section class="block" style="padding:14px 18px"><div class="txt"><b>M. Lefebvre</b><span>Mandat signé · exclusif · Maison · 7 pièces · 210 m² · Mougins</span></div>
<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;font-size:12px"><span class="chip">Mandat signé ✓</span><span class="chip">Concurrents · 4 à démarcher</span><span class="chip" style="background:#fff3e0;color:#9a4d00">Point marché · dû</span><span class="chip">Visites acquéreurs · 1 faite</span><span class="chip" style="background:#12875a;color:#fff">Offre acceptée · famille Keller</span></div></section>
<p style="font-size:12px;color:${C.muted};margin-top:6px"><b>Avant :</b> « Acquéreurs · N ». <b>Après :</b> « Offre acceptée · famille Keller » à sa place, un seul libellé ; il mène à la fiche des Keller (« La vente », M143).</p>`)}
</div>`,
);

const files = {
  'M145-1-ordinateur.html': desk,
  'M145-2-tablette-serie.html': tab,
  'M145-3-telephone.html': phone,
  'M145-4-boucle-acquereur.html': fiche,
  'M145-5-etats.html': states,
  'M145-6-alertes-mandat.html': alertsPage,
};
for (const [name, html] of Object.entries(files)) writeFileSync(join(here, name), html);

if (process.argv.includes('--png')) {
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
