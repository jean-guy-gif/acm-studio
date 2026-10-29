#!/usr/bin/env node
// Mission 126 — le hook de l'atelier, un seul script pour tous les événements de Claude Code
// (`.claude/settings.json`). Il lit l'événement sur stdin, écrit au plus UNE ligne dans le journal,
// et sort toujours en 0 : un journal ne bloque jamais rien. Il n'écrit jamais une commande, un
// rapport ou un message bruts — seulement une phrase courte, masquée (`secrets.mjs`).
//
// Ce qu'il écrit (décision de Jean-Guy du 29/10) : si la branche du dossier commence par
// « mission- », ou si la ligne vient d'un `/mission NN` ou d'un `/valide NN` tapé (le `/mission`
// part de `main`, le `/valide` se joue sur `essai` et `main`). Le reste est ignoré.
//   - UserPromptSubmit  : « /mission 126 » → chef, en cours ; la mission est retenue pour la session.
//   - SubagentStart     : l'agent passe « en cours ».
//   - SubagentStop      : l'agent passe « terminé », avec la première phrase de son rapport.
//   - PostToolUse (Bash): git push → « poussé » ; npm run e2e → les durées ; gh run → la CI.
//   - Notification      : le type seulement (jamais le texte) → chef « attend Jean-Guy ».
//   - Stop              : le chef au repos → « attend Jean-Guy ».
import {
  brancheCourante,
  ecrireLigne,
  ligneJournal,
  missionDeBranche,
  missionDePrompt,
  missionDeSession,
  retenirMissionDeSession,
} from './journal.mjs';
import { masquerSecrets } from './secrets.mjs';

function lireStdin() {
  return new Promise((resolve) => {
    let brut = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (morceau) => {
      brut += morceau;
    });
    process.stdin.on('end', () => resolve(brut));
    process.stdin.on('error', () => resolve(brut));
  });
}

// Les durées de la suite e2e dans la sortie de Playwright : « demo.spec.ts … (6.7m) ».
export function dureesE2e(sortie) {
  const trouvees = [];
  for (const m of String(sortie ?? '').matchAll(
    /(bienvenue|demo|live-tablette|parcours)[^\n]*?\((\d+(?:\.\d+)?)(m|s)\)/g,
  )) {
    const secondes = m[3] === 'm' ? Number(m[2]) * 60 : Number(m[2]);
    trouvees.push({ suite: m[1], secondes });
  }
  return trouvees;
}

export function phraseDurees(durees) {
  const parSuite = new Map();
  for (const { suite, secondes } of durees) {
    parSuite.set(suite, Math.max(parSuite.get(suite) ?? 0, secondes));
  }
  return [...parSuite]
    .map(
      ([suite, s]) =>
        `${suite} ${s >= 60 ? `${(s / 60).toFixed(1).replace('.', ',')} min` : `${Math.round(s)} s`}`,
    )
    .join(' · ');
}

const COMMANDES = [
  { motif: /\bgit\s+push\b/, evenement: 'push', etape: 'push', phrase: (c) => `Poussé : ${c}` },
  {
    motif: /\bnpm\s+run\s+e2e\b|\bnpx\s+playwright\s+test\b/,
    evenement: 'e2e',
    etape: null,
    phrase: (_c, reponse) => {
      const durees = dureesE2e(reponse);
      const rouge = /\b\d+\s+failed\b/.test(String(reponse ?? ''));
      return `E2E ${rouge ? 'rouge' : 'joué'}${durees.length ? ` : ${phraseDurees(durees)}` : ''}`;
    },
  },
  {
    motif: /\bgh\s+run\b/,
    evenement: 'ci',
    etape: null,
    phrase: (_c, reponse) => {
      const texte = String(reponse ?? '');
      const conclusion =
        /"conclusion"\s*:\s*"([a-z_]+)"/.exec(texte)?.[1] ??
        /\b(success|failure)\b/.exec(texte)?.[1];
      return `CI lue${conclusion ? ` : ${conclusion === 'success' ? 'verte' : conclusion === 'failure' ? 'rouge' : conclusion}` : ''}`;
    },
  },
];

// La commande, réduite à ce qui la nomme : « git push origin mission-126-atelier » devient
// « git push origin mission-126-atelier » ; une commande longue est coupée après son premier
// segment, jamais recopiée entière.
function nomDeCommande(commande) {
  const premiere = String(commande ?? '')
    .split(/&&|\|\||;|\|/)
    .map((s) => s.trim())
    .find((s) => COMMANDES.some(({ motif }) => motif.test(s)));
  return masquerSecrets((premiere ?? '').replace(/\s+/g, ' ').slice(0, 80));
}

function texteDeReponse(reponse) {
  if (typeof reponse === 'string') return reponse;
  if (reponse && typeof reponse === 'object') {
    return [reponse.stdout, reponse.stderr, reponse.output, reponse.content]
      .filter((v) => typeof v === 'string')
      .join('\n');
  }
  return '';
}

export function ligneDeHook(evenement, contexte) {
  const { dossier, branche, mission } = contexte;
  const base = { dossier, branche, mission };
  switch (evenement.hook_event_name) {
    case 'UserPromptSubmit': {
      const lu = missionDePrompt(evenement.prompt);
      if (!lu) return null;
      return ligneJournal({
        ...base,
        mission: lu.mission,
        agent: 'chef',
        etat: 'en cours',
        phrase:
          lu.commande === 'mission'
            ? `/mission ${lu.mission} lancé`
            : `/valide ${lu.mission} lancé`,
        etape: lu.commande === 'mission' ? 'architecte' : null,
        evenement: 'prompt',
      });
    }
    case 'SubagentStart':
      return ligneJournal({
        ...base,
        agent: evenement.agent_type || 'agent',
        etat: 'en cours',
        phrase: 'Lancé',
        evenement: 'agent-start',
      });
    case 'SubagentStop':
      return ligneJournal({
        ...base,
        agent: evenement.agent_type || 'agent',
        etat: 'terminé',
        phrase: evenement.last_assistant_message || 'Terminé',
        evenement: 'agent-stop',
      });
    case 'PostToolUse': {
      if (evenement.tool_name !== 'Bash') return null;
      const commande = evenement.tool_input?.command;
      const regle = COMMANDES.find(({ motif }) => motif.test(String(commande ?? '')));
      if (!regle) return null;
      const reponse = texteDeReponse(evenement.tool_response);
      return ligneJournal({
        ...base,
        agent: evenement.agent_type || 'chef',
        etat: 'en cours',
        phrase: regle.phrase(nomDeCommande(commande), reponse),
        etape: regle.etape,
        evenement: regle.evenement,
        donnees: regle.evenement === 'e2e' ? { durees: dureesE2e(reponse) } : null,
      });
    }
    case 'Notification': {
      const type = String(evenement.notification_type ?? evenement.type ?? 'notification').replace(
        /[^a-z_]/gi,
        '',
      );
      return ligneJournal({
        ...base,
        agent: 'chef',
        etat: 'attend Jean-Guy',
        phrase:
          type === 'permission_prompt'
            ? 'Une permission attend Jean-Guy'
            : type === 'agent_needs_input'
              ? 'Une question attend Jean-Guy'
              : 'Attend Jean-Guy',
        evenement: `notification:${type}`.slice(0, 40),
      });
    }
    case 'Stop':
      return ligneJournal({
        ...base,
        agent: 'chef',
        etat: 'attend Jean-Guy',
        phrase: 'Au repos : attend Jean-Guy',
        evenement: 'stop',
      });
    default:
      return null;
  }
}

// Décide si la ligne s'écrit (décision de Jean-Guy du 29/10).
export function ecrireCetteLigne(evenement, branche) {
  if (missionDeBranche(branche)) return true;
  return (
    evenement.hook_event_name === 'UserPromptSubmit' && missionDePrompt(evenement.prompt) != null
  );
}

async function principal() {
  let evenement;
  try {
    evenement = JSON.parse(await lireStdin());
  } catch {
    return;
  }
  if (!evenement || typeof evenement !== 'object') return;
  const dossier = process.env.CLAUDE_PROJECT_DIR || evenement.cwd || process.cwd();
  const branche = brancheCourante(evenement.cwd || dossier);
  if (!ecrireCetteLigne(evenement, branche)) return;
  if (evenement.hook_event_name === 'UserPromptSubmit') {
    const lu = missionDePrompt(evenement.prompt);
    if (lu) retenirMissionDeSession(evenement.session_id, lu.mission, dossier);
  }
  const mission = missionDeBranche(branche) ?? missionDeSession(evenement.session_id);
  const ligne = ligneDeHook(evenement, { dossier, branche, mission });
  if (ligne) ecrireLigne(ligne);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  principal()
    .catch(() => undefined)
    .finally(() => process.exit(0));
}
