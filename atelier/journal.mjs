// Mission 126 — le journal de l'atelier : une ligne par événement, hors du dépôt
// (`~/acm-studio-atelier/journal.jsonl`, décision de Jean-Guy du 29/10 : un seul journal, chaque
// ligne porte le dossier et la branche, pour que deux missions en parallèle se distinguent). Les
// tests le déplacent par `ATELIER_HOME`. Sans dépendance.
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { masquerSecrets, premierePhrase } from './secrets.mjs';

export const ETATS = ['en cours', 'terminé', 'bloqué', 'attend Jean-Guy'];
export const AGENTS = [
  'architecte',
  'designer',
  'gardien-sql',
  'relecteur',
  'testeur',
  'parcoureur',
  'Jean-Guy',
];
// Les étapes de `/mission`, dans l'ordre (fiche, point 1).
export const ETAPES = [
  ['architecte', 'Architecte'],
  ['designer', 'Designer'],
  ['questions', 'Questions à Jean-Guy'],
  ['code', 'Code'],
  ['gardien-sql', 'Gardien SQL'],
  ['accord', 'Accord et migration'],
  ['relecteur', 'Relecteur'],
  ['push', 'Poussé, essai'],
  ['testeur', 'Testeur'],
  ['parcoureur', 'Parcoureur'],
  ['rendus', 'Designer sur les rendus'],
  ['rapport', 'Rapport'],
];

export function dossierAtelier() {
  return process.env.ATELIER_HOME || join(homedir(), 'acm-studio-atelier');
}

export function cheminJournal() {
  return join(dossierAtelier(), 'journal.jsonl');
}

// « mission-120B-confrere » → « 120B » ; sinon null.
export function missionDeBranche(branche) {
  const m = /^mission-([0-9]+[A-Za-z]?)(?:-|$)/.exec(String(branche ?? ''));
  return m ? m[1].toUpperCase() : null;
}

// « /mission 120B », « /mission 120B --parallele », « /valide 120B » → { commande, mission }.
export function missionDePrompt(prompt) {
  const m = /^\s*\/(mission|valide)\s+([0-9]+[A-Za-z]?)\b/i.exec(String(prompt ?? ''));
  return m ? { commande: m[1].toLowerCase(), mission: m[2].toUpperCase() } : null;
}

export function brancheCourante(dossier) {
  try {
    return execFileSync('git', ['branch', '--show-current'], {
      cwd: dossier,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

// La mission qu'une session a lancée, retenue au `/mission NN` pour les lignes d'avant la branche.
function cheminSession(sessionId) {
  return join(
    dossierAtelier(),
    'sessions',
    `${String(sessionId).replace(/[^A-Za-z0-9_-]/g, '')}.json`,
  );
}

export function retenirMissionDeSession(sessionId, mission, dossier) {
  if (!sessionId || !mission) return;
  mkdirSync(join(dossierAtelier(), 'sessions'), { recursive: true });
  writeFileSync(cheminSession(sessionId), JSON.stringify({ mission, dossier }));
}

export function missionDeSession(sessionId) {
  if (!sessionId) return null;
  try {
    const lu = JSON.parse(readFileSync(cheminSession(sessionId), 'utf8'));
    return typeof lu.mission === 'string' ? lu.mission : null;
  } catch {
    return null;
  }
}

// Une ligne du journal : heure, dossier, branche, mission, agent, état, phrase, étape, événement.
// Tout texte libre est masqué ; une valeur hors liste devient absente.
export function ligneJournal({
  dossier,
  branche,
  mission,
  agent,
  etat,
  phrase,
  etape = null,
  evenement = null,
  donnees = null,
  heure = new Date().toISOString(),
}) {
  // Des chiffres seulement (durées des e2e) : jamais un texte libre par ce champ.
  const chiffres =
    donnees && typeof donnees === 'object' && Array.isArray(donnees.durees)
      ? {
          durees: donnees.durees
            .filter((d) => d && typeof d.suite === 'string' && Number.isFinite(d.secondes))
            .map((d) => ({
              suite: d.suite.replace(/[^a-z-]/g, '').slice(0, 20),
              secondes: d.secondes,
            })),
        }
      : null;
  return {
    heure,
    dossier: typeof dossier === 'string' ? dossier : '',
    branche: typeof branche === 'string' ? branche : '',
    mission: typeof mission === 'string' ? mission : null,
    agent: typeof agent === 'string' && agent !== '' ? masquerSecrets(agent).slice(0, 40) : 'chef',
    etat: ETATS.includes(etat) ? etat : 'en cours',
    phrase: premierePhrase(phrase),
    etape: ETAPES.some(([cle]) => cle === etape) ? etape : null,
    evenement: typeof evenement === 'string' ? evenement.slice(0, 40) : null,
    donnees: chiffres,
  };
}

export function ecrireLigne(ligne) {
  mkdirSync(dossierAtelier(), { recursive: true });
  appendFileSync(cheminJournal(), `${JSON.stringify(ligne)}\n`);
}

export function lireJournal(chemin = cheminJournal()) {
  if (!existsSync(chemin)) return [];
  return readFileSync(chemin, 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '')
    .flatMap((l) => {
      try {
        return [JSON.parse(l)];
      } catch {
        return [];
      }
    });
}
