#!/usr/bin/env node
// Mission 126 — la note du chef, à chaque étape de `/mission` et de `/valide` :
//   node atelier/note.mjs --etape code "Le plan est rendu, je code"
//   node atelier/note.mjs --etat "attend Jean-Guy" --etape accord "Migration soumise"
//   node atelier/note.mjs --agent "Jean-Guy" --etat "attend Jean-Guy" "Essai à faire"
// Options : --etape <clé> (voir ETAPES), --etat <état> (en cours par défaut), --agent <nom> (chef
// par défaut), --mission <NN> (sinon la branche). Sort toujours en 0.
import { brancheCourante, ecrireLigne, ligneJournal, missionDeBranche } from './journal.mjs';

export function lireArguments(argv) {
  const options = { etape: null, etat: 'en cours', agent: 'chef', mission: null, phrase: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--etape') options.etape = argv[++i] ?? null;
    else if (a === '--etat') options.etat = argv[++i] ?? 'en cours';
    else if (a === '--agent') options.agent = argv[++i] ?? 'chef';
    else if (a === '--mission') options.mission = argv[++i] ?? null;
    else options.phrase.push(a);
  }
  return { ...options, phrase: options.phrase.join(' ') };
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  try {
    const options = lireArguments(process.argv.slice(2));
    const dossier = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const branche = brancheCourante(dossier);
    ecrireLigne(
      ligneJournal({
        dossier,
        branche,
        mission: options.mission ?? missionDeBranche(branche),
        agent: options.agent,
        etat: options.etat,
        phrase: options.phrase,
        etape: options.etape,
        evenement: 'note',
      }),
    );
  } catch {
    // Une note qui échoue ne retient rien.
  }
  process.exit(0);
}
