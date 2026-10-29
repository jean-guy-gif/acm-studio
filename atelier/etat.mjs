// Mission 126 — ce que la page montre, calculé depuis le journal. Pur : rien n'est lu ici, tout
// vient des lignes. Une mission = une branche (ou, avant la branche, le numéro retenu au `/mission`).
import { AGENTS, ETAPES, missionDeBranche } from './journal.mjs';

const FIL_MAXIMUM = 50;

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

// L'état de chaque agent : sa dernière ligne. Un agent jamais vu est « à venir ».
function etatsDesAgents(lignes) {
  const dernier = new Map();
  for (const ligne of lignes) {
    dernier.set(ligne.agent, ligne);
  }
  const attendJeanGuy = [...dernier.values()].some((l) => l.etat === 'attend Jean-Guy');
  const agents = AGENTS.map((nom) => {
    if (nom === 'Jean-Guy') {
      return {
        nom,
        etat: attendJeanGuy ? 'attend Jean-Guy' : 'à venir',
        phrase: attendJeanGuy
          ? ([...dernier.values()].filter((l) => l.etat === 'attend Jean-Guy').at(-1)?.phrase ?? '')
          : '',
        heure: null,
      };
    }
    const ligne = dernier.get(nom);
    return ligne
      ? { nom, etat: ligne.etat, phrase: ligne.phrase, heure: ligne.heure }
      : { nom, etat: 'à venir', phrase: '', heure: null };
  });
  const chef = dernier.get('chef') ?? null;
  // Les agents hors liste (un agent général qui joue un rôle avant le redémarrage) se voient aussi.
  const autres = [...dernier.entries()]
    .filter(([nom]) => nom !== 'chef' && !AGENTS.includes(nom))
    .map(([nom, l]) => ({ nom, etat: l.etat, phrase: l.phrase, heure: l.heure }));
  return {
    chef: chef
      ? { nom: 'chef', etat: chef.etat, phrase: chef.phrase, heure: chef.heure }
      : { nom: 'chef', etat: 'à venir', phrase: '', heure: null },
    agents,
    autres,
  };
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
  // Une étape sautée — ni faite ni commencée, alors qu'une suivante l'est — est « sans objet » :
  // le designer sans écran, le gardien et l'accord sans migration (texte du designer).
  const derniereAtteinte = liste.map((e) => e.etat).lastIndexOf('faite');
  const active = liste.findIndex((e) => e.etat === 'active');
  const borne = Math.max(derniereAtteinte, active);
  liste.forEach((e, i) => {
    if (i < borne && e.etat === 'à venir') e.etat = 'sans objet';
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

export function etatDeMission(groupe) {
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
    etapes: etapes(lignes),
    ...etatsDesAgents(lignes),
    dureesE2e: dureesE2e(lignes),
    fil: lignes.slice(-FIL_MAXIMUM).reverse(),
  };
}

// Tout ce que la page affiche : les missions (la plus récente en premier), le fil global.
export function etatDeLaPage(lignes, cartes = null, maintenant = new Date().toISOString()) {
  const missions = parMission(lignes).map(etatDeMission);
  return {
    maintenant,
    missions,
    fil: lignes.slice(-FIL_MAXIMUM).reverse(),
    cartes: cartes ?? { base: null, essai: null, production: null },
  };
}
