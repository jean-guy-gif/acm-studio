// M158 et M159 — générateur des maquettes du dossier d'adresse d'Academia, dessinées sur les vraies
// réponses de l'API d'essai (dossier de démonstration, maison de 5 pièces et 135 m², 17/11).
// `node missions/maquettes/M158-M159-generateur.mjs --png` écrit quatre planches, en HTML et en PNG :
//   M158-1 « Avant le rendez-vous » : le dossier d'adresse pour le conseiller (ordinateur) ;
//   M158-2 le même sur tablette et téléphone ;
//   M159-1 « Ce que verra le vendeur » : les pièces cochées bloc par bloc ;
//   M159-2 les écrans du Live : un bloc du quartier après la valeur perçue, les ventes avec l'analyse.
// Tout est fictif : l'adresse, la copropriété et les ventes viennent du dossier de démonstration.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FONTS = pathToFileURL(join(here, '../../src/features/branding/fonts')).href;

const SALES = [
  ['06/11/2025', 'Boulevard Maréchal Juin', 5, 118, 628, 876800, 7431, 120],
  ['13/04/2024', 'Chemin du Val Fleuri', 5, 119, 1266, 945575, 7946, 135],
  ['07/07/2023', 'Boulevard Maréchal Juin', 5, 134, 1079, 783266, 5845, 248],
  ['10/03/2023', 'Boulevard Maréchal Juin', 5, 114, 1065, 615551, 5400, 101],
  ['02/03/2023', 'Avenue de Nice', 5, 121, 1520, 663830, 5486, 226],
  ['24/10/2022', 'Rue des Oliviers', 5, 133, 1063, 847604, 6373, 26],
  ['11/04/2022', 'Avenue de Nice', 5, 125, 1228, 640615, 5125, 102],
  ['12/01/2022', 'Chemin des Collettes', 5, 132, 1013, 754667, 5717, 164],
];
const euro = (n) => `${n.toLocaleString('fr-FR').replace(/ /g, ' ')} €`;
const src = (text) => `<p class="src">${text}</p>`;

const indicative = (compact = false) => `
  <section class="card indicative${compact ? ' compact' : ''}">
    <div class="head"><h3>Valeur indicative d’Academia</h3><span class="tag">Pour vous seul</span></div>
    <div class="value"><b>955 000 € à 1 060 000 €</b><span>milieu 980 000 € · 7 263 €/m² · fiabilité moyenne</span></div>
    <p class="mention">« Valeur indicative : elle ne remplace pas un avis de valeur. » Calculée par Academia sur des ventes DVF autour du bien.</p>
    <p class="never">Jamais montrée au vendeur.</p>
    <div class="row"><span class="btn">Reprendre comme point de départ de votre fourchette</span></div>
    <div class="yours"><span class="lbl">Votre fourchette</span><span class="field empty">—</span><span>à</span><span class="field empty">—</span></div>
    <p class="hint">Modifiable, c’est la seule enregistrée.</p>
    ${src('Academia · calcul sur les ventes DVF · 17/11/2026')}
  </section>`;

const salesTable = (rows = SALES) => `
  <section class="card">
    <div class="head"><h3>Ventes réelles autour du bien</h3><span class="muted">maisons de 5 pièces · depuis 2021</span></div>
    <p class="atAddress">À l’adresse même : maison de 3 pièces, 65 m², vendue 524 950 € le 28/04/2022 (8 076 €/m²).</p>
    <div class="rings"><span class="rlbl">Maisons de 5 pièces vendues depuis 2021, à moins de</span>${[
      ['50 m', 1],
      ['100 m', 1],
      ['250 m', 11, true],
      ['300 m', 14],
      ['500 m', 27],
      ['800 m', 77],
    ]
      .map(([r, n, on]) => `<span class="ring${on ? ' on' : ''}">${r} · <b>${n}</b></span>`)
      .join('')}<span class="rlbl">la liste ci-dessous : celles à moins de 250 m</span></div>
    <table><tr><th>Date</th><th>Rue</th><th>Pièces</th><th>Surface</th><th>Terrain</th><th>Prix</th><th>€/m²</th><th>Distance</th></tr>
    ${rows.map(([d, r, p, s, t, prix, m2, dist]) => `<tr><td>${d}</td><td>${r}</td><td>${p}</td><td>${s} m²</td><td>${t} m²</td><td><b>${euro(prix)}</b></td><td>${euro(m2)}</td><td>${dist} m</td></tr>`).join('')}
    </table>
    <p class="more">+ 3 autres ventes · Voir tout</p>
    ${src('DVF (DGFiP), ventes de logements anciens · données du 07/10/2026')}
  </section>`;

const smallBlocks = `
  <div class="grid">
    <section class="card s"><h4>DPE de l’adresse</h4><p><span class="dpe e">E</span> le 07/12/2021, maison de 82,6 m² (1960)</p><p class="warn">Ne correspond pas au bien : surface à −39 %.</p>${src('ADEME · 07/10/2026')}</section>
    <section class="card s"><h4>Urbanisme</h4><p>Rien de relevé sur la parcelle ni à moins de 40 m. 3 emplacements réservés de voirie entre 40 et 300 m, le plus proche à 153 m.</p><p class="muted">Parcelle 06027000BA0100 · zone UFb4, pavillonnaire</p>${src('Géoportail de l’urbanisme · 07/10/2026')}</section>
    <section class="card s"><h4>Permis autour</h4><p>2 permis de construire à moins de 300 m depuis 2022 : 2 logements, 17 chemin du Val Fleuri (terminé) ; 1 logement, 12 rue des Oliviers (autorisé).</p><p class="warn">Permis de démolir non vérifiés.</p>${src('Sitadel (SDES) · 07/10/2026')}</section>
    <section class="card s"><h4>Risques</h4><p>Argile : exposition moyenne · Séisme : 4, moyen · Radon : 1 · TRI Nice Cannes Mandelieu · 2 catastrophes naturelles, la dernière le 31/03/2023.</p>${src('Géorisques · 07/10/2026')}</section>
    <section class="card s"><h4>Population à 300 m</h4><p>1 120 habitants · 500 ménages · 2,2 personnes par ménage.</p><p class="muted">Valeurs arrondies (secret statistique).</p>${src('Insee, Filosofi · 07/10/2026')}</section>
    <section class="card s"><h4>Copropriété</h4><p>6 lots d’habitation, construite entre 1975 et 1993 · mandat de syndic terminé le 17/01/2026.</p>${src('Registre des copropriétés (Anah) · 07/10/2026')}</section>
  </div>`;

const desktop158 = `
  <div class="page desk">
    <div class="crumb">Dossier · M. et Mme Lopez · <b>Avant le rendez-vous</b></div>
    <h2>Dossier d’adresse <span class="tag">Pour vous seul</span></h2>
    <p class="lead">Ce qu’Academia sait de l’adresse du bien, calculé pour une maison de 5 pièces et 135 m². Rien de ce bloc ne part vers le vendeur sans que vous le cochiez (« Ce que verra le vendeur »).</p>
    <div class="two">${indicative()}<div>${smallBlocks.replace('<div class="grid">', '<div class="grid g2">')}</div></div>
    ${salesTable()}
  </div>`;

const tablet158 = `<div class="page tab"><h2>Dossier d’adresse <span class="tag">Pour vous seul</span></h2>${indicative(true)}${salesTable(SALES.slice(0, 5))}</div>`;
const phone158 = `<div class="page phone"><h2>Dossier d’adresse</h2>${indicative(true)}
  <section class="card"><h3>Ventes réelles autour du bien</h3>${SALES.slice(0, 4).map(([d, r, p, s, , prix, m2, dist]) => `<div class="saleRow"><b>${euro(prix)}</b><span>${d} · ${r}</span><span>${p} p. · ${s} m² · ${euro(m2)}/m² · ${dist} m</span></div>`).join('')}<p class="more">Voir les 11 ventes</p>${src('DVF · 07/10/2026')}</section>
  <section class="card s"><h4>Urbanisme · Risques · Permis · Population · Copropriété</h4><p class="muted">Repliés, un toucher les ouvre.</p></section></div>`;

const checklist = `
  <div class="page desk">
    <div class="crumb">Dossier · M. et Mme Lopez · <b>Avant le rendez-vous</b></div>
    <h2>Ce que verra le vendeur : le quartier</h2>
    <p class="lead">Rien n’est montré par défaut : cochez bloc par bloc. Chaque bloc coché devient un écran du Live et une page de l’Étude de marché et de la synthèse. Jamais la valeur indicative, jamais le DPE.</p>
    <div class="checks">
      ${[
        ['Urbanisme', 'après « Votre valeur perçue »', 'Rien sur la parcelle ; 3 emplacements de voirie entre 40 et 300 m'],
        ['Risques', 'après « Votre valeur perçue »', 'Argile moyenne, séisme 4, 2 catastrophes naturelles'],
        ['Population', 'après « Votre valeur perçue »', '1 120 habitants à 300 m, 2,2 personnes par ménage'],
        ['Copropriété', 'après « Votre valeur perçue »', '6 lots d’habitation, construite entre 1975 et 1993'],
        ['Permis autour', 'après « Votre valeur perçue »', '2 permis de construire à moins de 300 m, sans numéro de permis'],
        ['Ventes réelles autour du bien', 'à la fin, avec « Analyse des prix »', '11 ventes de maisons de 5 pièces depuis 2021, au mois, rue sans numéro'],
      ]
        .map(
          ([t, w, d], i) =>
            `<label class="check${[0, 1, 5].includes(i) ? ' on' : ''}"><span class="box">${[0, 1, 5].includes(i) ? '✓' : ''}</span><span class="ct"><b>${t}</b><small>${d}</small></span><span class="where">${w}</span></label>`,
        )
        .join('')}
    </div>
    <p class="counter"><b>3 écrans ajoutés au Live</b> · environ 4 minutes de plus</p>
    <p class="lead">Ordre au Live : Introduction → Votre bien → Votre valeur perçue → <b>les blocs du quartier cochés</b> → les concurrents → … → <b>Ventes réelles</b> → Analyse des prix → Conclusion.</p>
  </div>`;

const sheets = {
  'M158-1-avant-le-rendez-vous': {
    title: 'M158 · 1 — Le dossier d’adresse, pour le conseiller (ordinateur, 1280)',
    sub: '« Avant le rendez-vous » de M. et Mme Lopez, sur les vraies réponses de l’API d’essai (vue « bien »). Un bloc « Dossier d’adresse », pour le conseiller seul.',
    body: desktop158,
    notes: [
      ['Où', 'Sur « Avant le rendez-vous », au-dessus de « Votre décision de prix » : le conseiller a les ventes et la valeur indicative sous les yeux au moment de décider. Sur Bien vendeur, la carte « Le bien dans Academia » garde ses liens et le lien « Vivre ici ».'],
      ['Valeur indicative d’Academia', 'Sa fourchette, son milieu, son prix au m², sa fiabilité et sa mention, mot pour mot ; dessous, « Jamais montrée au vendeur ». Le nombre de ventes de son calcul n’est pas dit : la réponse donne « 11 à 300 m » quand 14 ventes y tombent (question à Laurent).'],
      ['Votre fourchette', 'Vide tant que le conseiller n’a pas touché « Reprendre comme point de départ de votre fourchette » ou saisi lui-même ; jamais remplie seule. C’est la même valeur que la fourchette de Bien vendeur (M38), affichée aux deux endroits, jamais une copie ; « Modifiable, c’est la seule enregistrée ».'],
      ['Ventes', 'La vente à l’adresse même ; les rayons en étiquettes : des ventes cumulées, du seul type et du seul nombre de pièces du bien, depuis 2021 ; la liste est celle du rayon retenu par Academia (ici 250 m, surligné) ; triée de la plus récente à la plus ancienne (8 visibles, « Voir tout »).'],
      ['Les autres blocs', 'DPE, urbanisme, permis, risques, population, copropriété : chacun avec sa source et sa date, sa note (« Ne correspond pas au bien », « Permis de démolir non vérifiés ») ; un bloc en échec chez Academia le dit, jamais « rien ».'],
      ['Quand il n’y est pas', 'Sans dossier d’adresse (pas de lien créé, accès fermé) ou sans type, pièces et surface : une ligne, « Créez le dossier d’adresse depuis Bien vendeur », jamais un bloc vide.'],
      ['Fraîcheur', 'Lu à chaque ouverture de la page (calculé le jour par Academia), rien n’est gardé dans ACM, sauf ce que le conseiller enregistre : sa fourchette.'],
    ],
  },
  'M158-2-tablette-telephone': {
    title: 'M158 · 2 — Le dossier d’adresse sur tablette et téléphone',
    sub: 'Tablette en portrait (820) et téléphone (390) : la valeur indicative d’abord, puis les ventes ; les autres blocs repliés sur téléphone.',
    body: `<div class="row2">${tablet158}${phone158}</div>`,
    notes: [
      ['Tablette', 'Une colonne : la valeur indicative, puis les ventes en tableau (5 lignes, « Voir tout »), puis les autres blocs.'],
      ['Téléphone', 'Les ventes en lignes de deux étages (prix en gras, date et rue, faits) ; urbanisme, risques, permis, population et copropriété repliés.'],
    ],
  },
  'M159-1-ce-que-verra-le-vendeur': {
    title: 'M159 · 1 — Ce que verra le vendeur : le quartier, coché bloc par bloc',
    sub: 'Sur « Avant le rendez-vous », sous le dossier d’adresse. Vue « bien-client » d’Academia : jamais la valeur indicative ni le DPE.',
    body: checklist,
    notes: [
      ['Rien par défaut', 'Toutes les cases décochées ; le choix est gardé sur le dossier et ne change plus une fois le Live commencé (comme le rythme, M95).'],
      ['Ordre décidé', 'Urbanisme, risques, population, copropriété (et permis) après « Votre valeur perçue » ; les ventes à la fin, juste avant « Analyse des prix ».'],
      ['Ce qui part', 'Seulement la vue « bien-client » : le mois de chaque vente, la rue sans numéro, la distance arrondie à 50 m ; jamais la valeur indicative, le DPE, la parcelle, le numéro d’un permis.'],
      ['Le compteur', '« 3 écrans ajoutés au Live » suit les cases cochées, avec la durée en plus (1,5 min par écran, M95). Planche dessinée avec trois cases cochées ; par défaut, aucune et « Aucun écran ajouté au Live ».'],
      ['Permis', 'Dans la liste du vendeur, sans numéro de permis ; la note « Permis de démolir non vérifiés » reste au conseiller seul.'],
    ],
  },
  // M159-2 et M159-3 : refaites en dessins par M159-dessins-generateur.mjs (17/11).
};

const css2 = `
.never{font-size:12px;font-weight:600;color:#3730a3}.field.empty{color:#a1a1aa}
.rings{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.rlbl{font-size:12px;color:#52525b}.ring{font-size:12px;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:999px;padding:2px 9px}.ring.on{background:#e0e7ff;border-color:#c7d2fe}
.check.on{border-color:#a5b4fc;background:#f5f7ff}.check.on .box{background:#4338ca;border-color:#4338ca;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}
.counter{font-size:14px;color:#3730a3}
.live .lbody{flex:1;display:flex;flex-direction:column;gap:22px;margin-top:22px}
.fact{display:flex;gap:18px;align-items:center}.ico{width:64px;height:64px;flex:none;border-radius:18px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center}
.ico svg,.dico svg,.street svg{fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.ico svg{width:36px;height:36px}
.kick{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#7cc4ff;font-weight:700}.live h2.big{font-size:42px;line-height:1.1;margin:4px 0 0;color:#fff}.phone h2.big{font-size:26px}
.fcards{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.fcard{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:28px 26px;display:flex;flex-direction:column;justify-content:center;gap:18px}
.fcard b{font-family:Rajdhani;font-size:68px;line-height:1}.fcard span{font-size:23px;line-height:1.35;opacity:.94}
.lsrc{font-size:12px;opacity:.7;margin-bottom:6px}
.sales{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:14px}.sales.one{grid-template-columns:1fr;flex:none}
.sale{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);border-radius:16px;padding:14px 20px;display:flex;flex-direction:column;justify-content:center;gap:5px}
.sale b{font-family:Rajdhani;font-size:38px;line-height:1}.sale .when{font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#7cc4ff;font-weight:700}
.sale .street{font-size:18px;display:flex;align-items:center;gap:7px}.street svg{width:17px;height:17px}.sale .facts{font-size:16px;opacity:.85}
.sale .top2{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.phone .sale b{font-size:28px}.phone .sale .street{font-size:14px}.phone .sale .facts{font-size:13px}
.doc{width:640px;background:#fff;border:1px solid #a1a1aa;padding:30px 34px;display:flex;flex-direction:column;gap:16px}.kicker{font-family:Rajdhani;font-weight:700;color:#00527a;letter-spacing:.12em;font-size:15px}
.dblock{border-top:2px solid #00527a;padding-top:10px;display:flex;flex-direction:column;gap:8px}.dhead{display:flex;align-items:center;gap:8px}.dico svg{width:22px;height:22px;color:#00527a}.dhead h4{font-family:Rajdhani;font-size:18px}
.dfact{font-family:Rajdhani;font-size:21px;font-weight:700}.dcards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.dcards div{background:#f4f6f8;border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:3px}.dcards b{font-family:Rajdhani;font-size:20px}.dcards span{font-size:11.5px;color:#3f3f46}
.dsrc{font-size:10.5px;color:#71717a}.frozen{font-size:11px;color:#52525b;border-top:1px solid #e4e4e7;padding-top:8px}.dlead{font-size:13.5px}
.dsales{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.dsales div{border:1px solid #e4e4e7;border-radius:8px;padding:9px 10px;display:flex;flex-direction:column;gap:2px;font-size:11.5px;color:#3f3f46}.dsales b{font-family:Rajdhani;font-size:20px;color:#18181b}
`;
const css = `
@font-face{font-family:Rajdhani;font-weight:700;src:url(${FONTS}/rajdhani/rajdhani-latin-700.woff2)}
@font-face{font-family:Montserrat;font-weight:100 900;src:url(${FONTS}/montserrat/montserrat-latin.woff2)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,Arial,sans-serif;color:#18181b;background:#d4d4d8;padding:24px;display:flex;flex-direction:column;gap:16px;align-items:flex-start}
h1.sheet{font-size:22px}.sheet-sub{font-size:13px;color:#3f3f46;max-width:1500px}
.layout{display:flex;gap:24px;align-items:flex-start}.row2{display:flex;gap:22px;align-items:flex-start;margin-bottom:22px}
.notes{width:400px;display:flex;flex-direction:column;gap:10px}.note{background:#fef6c7;border:1px solid #e8cf5a;border-radius:10px;padding:11px 13px;font-size:12.5px;line-height:1.5;color:#3d3200}
.page{background:#f8fafc;border:1px solid #a1a1aa;padding:22px;display:flex;flex-direction:column;gap:14px}.page.desk{width:1280px}.page.tab{width:820px}.page.phone{width:390px;padding:14px}
.crumb{font-size:12px;color:#71717a}h2{font-family:Rajdhani;font-size:26px;display:flex;gap:10px;align-items:center}.lead{font-size:13px;color:#52525b;max-width:900px}
.tag{font-family:Montserrat;font-size:11px;font-weight:700;background:#e0e7ff;color:#3730a3;border-radius:999px;padding:2px 9px}
.card{background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:8px}.card.s{padding:12px;gap:5px}
.card h3{font-family:Rajdhani;font-size:19px}.card h4{font-family:Rajdhani;font-size:16px}.head{display:flex;justify-content:space-between;align-items:center;gap:10px}
.two{display:grid;grid-template-columns:420px 1fr;gap:14px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.grid.g2{grid-template-columns:repeat(2,1fr)}
.indicative{border-color:#c7d2fe;background:#f5f7ff}.value b{font-family:Rajdhani;font-size:26px;display:block}.value span{font-size:12.5px;color:#52525b}
.mention{font-size:12px;color:#3f3f46}.btn{display:inline-block;border:1px solid #a1a1aa;border-radius:10px;padding:7px 12px;font-size:13px;font-weight:600;background:#fff}
.yours{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13px;border-top:1px solid #e4e4e7;padding-top:9px}.lbl{font-weight:700}.field{border:1px solid #d4d4d8;border-radius:8px;padding:5px 10px;background:#fff;min-width:96px}.hint{font-size:11px;color:#71717a;width:100%}
.src{font-size:10.5px;color:#71717a}.muted{font-size:12px;color:#71717a}.warn{font-size:12px;color:#b45309;font-weight:600}
.card p{font-size:12.5px;line-height:1.45}.atAddress{background:#f4f4f5;border-radius:8px;padding:6px 9px}.rings{color:#52525b}
table{border-collapse:collapse;font-size:12.5px;width:100%}th{text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#71717a;border-bottom:1px solid #e4e4e7;padding:5px}td{padding:5px;border-bottom:1px solid #f4f4f5}
.more{font-size:12.5px;color:#1d4ed8;font-weight:600}.dpe{display:inline-block;width:20px;text-align:center;color:#fff;border-radius:4px;font-weight:700}.dpe.e{background:#f59e0b}
.saleRow{display:flex;flex-direction:column;border-bottom:1px solid #f4f4f5;padding:6px 0;font-size:12.5px}
.checks{display:flex;flex-direction:column;gap:8px;max-width:980px}.check{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:10px 14px}
.box{width:20px;height:20px;border:2px solid #a1a1aa;border-radius:5px;flex:none}.ct{display:flex;flex-direction:column;flex:1}.ct small{font-size:12px;color:#71717a}.where{font-size:11.5px;color:#3730a3;background:#eef2ff;border-radius:999px;padding:2px 9px}
.live{background:linear-gradient(160deg,#1f5f99,#0f3a66);color:#fff;display:flex;flex-direction:column}.live.tab{width:1024px;height:768px;padding:18px 28px 0}.live.phone{width:390px;height:844px;padding:14px 16px 0}
.top{display:flex;gap:14px;font-size:11px;letter-spacing:.06em;border-bottom:1px solid rgba(255,255,255,.2);padding-bottom:10px}.top .step{color:#7cc4ff;font-weight:700}.top .n{opacity:.7}
.live h2{font-size:34px;margin-top:16px;color:#fff}.phone h2{font-size:26px}.sub{font-size:14px;opacity:.85}.lbody{flex:1;display:flex;flex-direction:column;gap:12px;margin-top:16px}
.panel{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:16px;font-size:16px}.panel.big{font-family:Rajdhani;font-size:26px}.muted2{opacity:.8}
.lsrc{font-size:11.5px;opacity:.75}.ltab{color:#fff;font-size:14px}.ltab th{color:rgba(255,255,255,.7);border-color:rgba(255,255,255,.2)}.ltab td{border-color:rgba(255,255,255,.1)}.ltab.small{font-size:11px}
.bar{margin:12px -28px 0;border-top:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.18);height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;font-size:14px}.phone .bar{margin:10px -16px 0;padding:0 16px}
.lrow{display:flex;flex-direction:column;border-bottom:1px solid rgba(255,255,255,.15);padding:7px 0;font-size:13px}.lrow b{font-family:Rajdhani;font-size:19px}
.bar b{background:#fff;color:#0f3a66;border-radius:10px;padding:10px 16px;font-family:Rajdhani;font-size:15px}
`;

for (const [name, sheet] of Object.entries(sheets)) {
  writeFileSync(
    join(here, `${name}.html`),
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${css}${css2}</style></head><body>
<h1 class="sheet">${sheet.title}</h1><p class="sheet-sub">${sheet.sub}</p>
<div class="layout"><div>${sheet.body}</div><div class="notes">${sheet.notes.map(([t, b]) => `<div class="note"><b>${t} :</b> ${b}</div>`).join('')}</div></div></body></html>`,
  );
}

if (process.argv.includes('--png')) {
  const { chromium } = await import(
    pathToFileURL(join(here, '../../node_modules/playwright/index.mjs')).href
  );
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  for (const name of Object.keys(sheets)) {
    await tab.goto(pathToFileURL(join(here, `${name}.html`)).href);
    await tab.evaluate(() => document.fonts.ready);
    await tab.screenshot({ path: join(here, `${name}.png`), fullPage: true });
  }
  await browser.close();
}
console.log(`${Object.keys(sheets).length} planches écrites`);
