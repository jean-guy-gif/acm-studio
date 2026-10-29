// Mission 126 — ce que la page montre, calculé depuis le journal. Pur : rien n'est lu ici, tout
// vient des lignes. Une mission = une branche (ou, avant la branche, le numéro retenu au `/mission`).
import { AGENTS, ETAPES, missionDeBranche } from './journal.mjs';

const FIL_MAXIMUM = 50;
// Une mission se ferme à la ligne `/valide NN`, ou après 24 h sans ligne (décision de Jean-Guy,
// 29/10) : elle quitte la page, ses lignes restent dans le fil.
export const FERMETURE_MS = 24 * 60 * 60 * 1000;
const ACTEURS = new Set(['chef', 'Jean-Guy']);

function cleMission(ligne) {
  return ligne.mission ?? missionDeBranche(ligne.branche) ?? null;
}

// Les lignes, groupées par mission, dans l'ordre d'apparition ; la plus récente d'abord.
function parMission(lignes) {
  const groupes = new Map();
  for (const ligne of lignes) {
    const cle = cleMission(ligne);
    if (!cle) continue;
    const groupe = groupes.get(cle) ?? { mission: cle, lignes: [] };
    groupe.lignes.push(ligne);
    groupes.set(cle, groupe);
  }
  return [...groupes.values()].sort((a, b) =>
    (b.lignes.at(-1)?.heure ?? '').localeCompare(a.lignes.at(-1)?.heure ?? ''),
  );
}

export function missionFermee(lignes, maintenant) {
  if (lignes.some((l) => l.evenement === 'valide')) return true;
  const derniere = lignes.at(-1)?.heure;
  if (!derniere) return true;
  return Date.parse(maintenant) - Date.parse(derniere) > FERMETURE_MS;
}

// L'état de chaque agent : sa dernière ligne. Un agent jamais vu est « à venir ».
// Le chef (règle de Jean-Guy, 29/10) : un agent en cours → « attend ses agents », en bleu ; orange
// seulement si aucun agent ne travaille et qu'une question ou une permission est posée (sa dernière
// ligne est « attend Jean-Guy » : une note du chef ou une notification).
function etatsDesAgents(lignes) {
  const dernier = new Map();
  for (const ligne of lignes) {
    dernier.set(ligne.agent, ligne);
  }
  const enCours = [...dernier.values()]
    .filter((l) => !ACTEURS.has(l.agent) && l.etat === 'en cours')
    .map((l) => l.agent);
  const ligneChef = dernier.get('chef') ?? null;
  const questionPosee = ligneChef?.etat === 'attend Jean-Guy';
  const attendJeanGuy = questionPosee && enCours.length === 0;
  let chef;
  if (!ligneChef) {
    chef = { nom: 'chef', etat: 'à venir', mot: 'à venir', phrase: '', heure: null };
  } else if (enCours.length > 0) {
    chef = {
      nom: 'chef',
      etat: 'en cours',
      mot: `attend ses agents : ${enCours.join(', ')}`,
      phrase: ligneChef.phrase,
      heure: ligneChef.heure,
    };
  } else if (attendJeanGuy) {
    chef = {
      nom: 'chef',
      etat: 'attend Jean-Guy',
      mot: 'attend Jean-Guy',
      phrase: ligneChef.phrase,
      heure: ligneChef.heure,
    };
  } else if (ligneChef.etat === 'bloqué') {
    chef = {
      nom: 'chef',
      etat: 'bloqué',
      mot: 'bloqué',
      phrase: ligneChef.phrase,
      heure: ligneChef.heure,
    };
  } else {
    chef = {
      nom: 'chef',
      etat: 'en cours',
      mot: ligneChef.evenement === 'stop' ? 'au repos' : 'en cours',
      phrase: ligneChef.phrase,
      heure: ligneChef.heure,
    };
  }
  const agents = AGENTS.map((nom) => {
    if (nom === 'Jean-Guy') {
      return {
        nom,
        etat: attendJeanGuy ? 'attend Jean-Guy' : 'rien en attente',
        phrase: attendJeanGuy ? ligneChef.phrase : '',
        heure: attendJeanGuy ? ligneChef.heure : null,
      };
    }
    const ligne = dernier.get(nom);
    return ligne
      ? { nom, etat: ligne.etat, phrase: ligne.phrase, heure: ligne.heure }
      : { nom, etat: 'à venir', phrase: '', heure: null };
  });
  // Les agents hors liste (un agent général qui joue un rôle avant le redémarrage) se voient aussi.
  const autres = [...dernier.entries()]
    .filter(([nom]) => !ACTEURS.has(nom) && !AGENTS.includes(nom))
    .map(([nom, l]) => ({ nom, etat: l.etat, phrase: l.phrase, heure: l.heure }));
  return { chef, agents, autres, agentsEnCours: enCours };
}

// Les étapes de `/mission` : faite quand son agent a terminé ou que le chef l'a notée, active = la
// dernière commencée non terminée, sinon la première à venir.
function etapes(lignes) {
  const faites = new Set();
  const commencees = new Set();
  for (const ligne of lignes) {
    const cle = ligne.etape ?? (ETAPES.some(([k]) => k === ligne.agent) ? ligne.agent : null);
    if (!cle) continue;
    if (ligne.etat === 'terminé') faites.add(cle);
    else commencees.add(cle);
    // Une note du chef sur une étape la dit commencée ; la suivante commencée la dit faite.
    if (ligne.evenement === 'note' && ligne.etape) {
      for (const [k] of ETAPES) {
        if (k === ligne.etape) break;
        if (commencees.has(k)) faites.add(k);
      }
    }
  }
  const liste = ETAPES.map(([cle, titre]) => ({
    cle,
    titre,
    etat: faites.has(cle) ? 'faite' : commencees.has(cle) ? 'active' : 'à venir',
  }));
  if (!liste.some((e) => e.etat === 'active')) {
    const premiere = liste.find((e) => e.etat === 'à venir');
    if (premiere && liste.some((e) => e.etat === 'faite')) premiere.etat = 'active';
  }
  // Une étape sautée — ni faite ni commencée, alors qu'une suivante l'est — est « non jouée »
  // (Jean-Guy, 29/10) : le designer sans écran, le gardien et l'accord sans migration.
  const derniereAtteinte = liste.map((e) => e.etat).lastIndexOf('faite');
  const active = liste.findIndex((e) => e.etat === 'active');
  const borne = Math.max(derniereAtteinte, active);
  liste.forEach((e, i) => {
    if (i < borne && e.etat === 'à venir') e.etat = 'non jouée';
  });
  return liste;
}

// Les dernières durées e2e connues, par suite.
function dureesE2e(lignes) {
  const parSuite = new Map();
  for (const ligne of lignes) {
    for (const d of ligne.donnees?.durees ?? []) parSuite.set(d.suite, d.secondes);
  }
  return [...parSuite].map(([suite, secondes]) => ({ suite, secondes }));
}

export function etatDeMission(groupe, maintenant = new Date().toISOString()) {
  const { lignes, mission } = groupe;
  const derniere = lignes.at(-1);
  return {
    mission,
    titre: `Mission ${mission}`,
    branche:
      lignes
        .map((l) => l.branche)
        .filter((b) => missionDeBranche(b))
        .at(-1) ?? '',
    dossier: derniere?.dossier ?? '',
    ouverteA: lignes[0]?.heure ?? null,
    derniereHeure: derniere?.heure ?? null,
    fermee: missionFermee(lignes, maintenant),
    etapes: etapes(lignes),
    ...etatsDesAgents(lignes),
    dureesE2e: dureesE2e(lignes),
    fil: lignes.slice(-FIL_MAXIMUM).reverse(),
  };
}

// Les missions ouvertes (dossier, branche), pour les cartes du serveur : la plus récente en premier.
export function missionsOuvertes(lignes, maintenant = new Date().toISOString()) {
  return parMission(lignes)
    .map((g) => etatDeMission(g, maintenant))
    .filter((m) => !m.fermee)
    .map(({ mission, dossier, branche }) => ({ mission, dossier, branche }));
}

// Tout ce que la page affiche : les missions ouvertes (la plus récente en premier), le fil global.
export function etatDeLaPage(lignes, cartes = null, maintenant = new Date().toISOString()) {
  const missions = parMission(lignes)
    .map((g) => etatDeMission(g, maintenant))
    .filter((m) => !m.fermee);
  return {
    maintenant,
    missions,
    fil: lignes.slice(-FIL_MAXIMUM).reverse(),
    cartes: cartes ?? { base: null, essai: null, production: null },
  };
}
