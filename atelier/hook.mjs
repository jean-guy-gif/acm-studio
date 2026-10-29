#!/usr/bin/env node
// Mission 126 — le hook de l'atelier, un seul script pour tous les événements de Claude Code
// (`.claude/settings.json`). Il lit l'événement sur stdin, écrit au plus UNE ligne dans le journal,
// et sort toujours en 0 : un journal ne bloque jamais rien. Il n'écrit jamais une commande, un
// rapport ou un message bruts — seulement une phrase courte, masquée (`secrets.mjs`).
//
// Ce qu'il écrit (décision de Jean-Guy du 29/10) : si la branche du dossier commence par
// « mission- », ou si la ligne vient d'un `/mission NN` ou d'un `/valide NN` tapé (le `/mission`
// part de `main`, le `/valide` se joue sur `essai` et `main`). Le reste est ignoré.
//   - UserPromptSubmit  : « /mission 126 » → chef, en cours, la mission est retenue pour la session ;
//                         « /valide 126 » → la mission se ferme ; une autre ligne tapée sur une
//                         branche de mission → « Jean-Guy a répondu » (ce qui lève l'orange).
//   - SubagentStart     : l'agent passe « en cours ».
//   - SubagentStop      : l'agent passe « terminé », avec la première phrase de son rapport.
//   - PostToolUse (Bash): git push → « poussé » ; npm run e2e → les durées ; gh run → la CI.
//   - Notification      : le type seulement (jamais le texte) → chef « attend Jean-Guy ».
//   - Stop              : le chef au repos ; rien si sa dernière ligne attend déjà Jean-Guy.
import {
  brancheCourante,
  cheminJournal,
  ecrireLigne,
  ligneJournal,
  lireJournal,
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

// « 120B » → « 120 B », pour les phrases.
export function missionLisible(mission) {
  return String(mission ?? '').replace(/^(\d+)([A-Z])$/, '$1 $2');
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

// Le corps d'un heredoc (« <<'EOF' … EOF ») n'est pas une commande : un script qui MENTIONNE
// « git push » n'a rien poussé (relecteur, 29/10).
export function sansHeredocs(commande) {
  const gardees = [];
  let marqueur = null;
  for (const ligne of String(commande ?? '').split('\n')) {
    if (marqueur) {
      if (ligne.trim() === marqueur) marqueur = null;
      continue;
    }
    const m = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/.exec(ligne);
    if (m) marqueur = m[2];
    gardees.push(ligne);
  }
  return gardees.join('\n');
}

// Les segments d'une commande (séparés par &&, ||, ;, | ou un retour à la ligne), débarrassés d'une
// parenthèse ou d'une variable en tête : le motif se teste en TÊTE de segment, jamais au milieu.
export function segmentsDeCommande(commande) {
  return sansHeredocs(commande)
    .split(/\n|&&|\|\||;|\|/)
    .map((s) =>
      s
        .replace(/^[\s({]+/, '')
        .replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, '')
        .trim(),
    )
    .filter((s) => s !== '');
}

const COMMANDES = [
  { motif: /^git\s+push\b/, evenement: 'push', etape: 'push', phrase: (c) => `Poussé : ${c}` },
  {
    motif: /^npm\s+run\s+e2e\b|^npx\s+playwright\s+test\b/,
    evenement: 'e2e',
    etape: null,
    phrase: (_c, reponse) => {
      const durees = dureesE2e(reponse);
      const rouge = /\b\d+\s+failed\b/.test(String(reponse ?? ''));
      return `E2E ${rouge ? 'rouge' : 'joué'}${durees.length ? ` : ${phraseDurees(durees)}` : ''}`;
    },
  },
  {
    motif: /^gh\s+run\b/,
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

// La règle et le segment qui la déclenche, ou null.
export function regleDeCommande(commande) {
  for (const segment of segmentsDeCommande(commande)) {
    const regle = COMMANDES.find(({ motif }) => motif.test(segment));
    if (regle) return { regle, segment };
  }
  return null;
}

// Le segment, réduit à ce qui le nomme : masqué D'ABORD, coupé ensuite — un jeton à cheval sur la
// coupe échapperait au masque (relecteur, 29/10).
function nomDeCommande(segment) {
  return masquerSecrets(String(segment ?? '').replace(/\s+/g, ' ')).slice(0, 80);
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

// `contexte.dernierChef` : la dernière ligne du chef sur cette mission, pour le Stop.
export function ligneDeHook(evenement, contexte) {
  const { dossier, branche, mission } = contexte;
  const base = { dossier, branche, mission };
  switch (evenement.hook_event_name) {
    case 'UserPromptSubmit': {
      const lu = missionDePrompt(evenement.prompt);
      if (!lu) {
        // Une réponse de Jean-Guy sur une branche de mission : elle lève l'orange, sans son texte.
        return missionDeBranche(branche)
          ? ligneJournal({
              ...base,
              agent: 'chef',
              etat: 'en cours',
              phrase: 'Jean-Guy a répondu',
              evenement: 'reponse',
            })
          : null;
      }
      return ligneJournal({
        ...base,
        mission: lu.mission,
        agent: 'chef',
        etat: 'en cours',
        phrase:
          lu.commande === 'mission'
            ? `Mission ${missionLisible(lu.mission)} lancée par Jean-Guy`
            : `Validation de la mission ${missionLisible(lu.mission)} lancée par Jean-Guy`,
        etape: lu.commande === 'mission' ? 'architecte' : null,
        evenement: lu.commande === 'mission' ? 'prompt' : 'valide',
      });
    }
    case 'SubagentStart':
      return ligneJournal({
        ...base,
        agent: evenement.agent_type || 'agent',
        etat: 'en cours',
        phrase: 'Lancé par le chef',
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
      const trouve = regleDeCommande(evenement.tool_input?.command);
      if (!trouve) return null;
      const { regle, segment } = trouve;
      const reponse = texteDeReponse(evenement.tool_response);
      return ligneJournal({
        ...base,
        agent: evenement.agent_type || 'chef',
        etat: 'en cours',
        phrase: regle.phrase(nomDeCommande(segment), reponse),
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
      // Le chef attend déjà Jean-Guy (note ou notification) : sa phrase utile reste, rien de plus.
      if (contexte.dernierChef?.etat === 'attend Jean-Guy') return null;
      return ligneJournal({
        ...base,
        agent: 'chef',
        etat: 'en cours',
        phrase: 'Au repos',
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

function dernierChefDe(mission, branche) {
  try {
    return (
      lireJournal(cheminJournal())
        .filter(
          (l) =>
            l.agent === 'chef' &&
            (mission ? l.mission === mission : l.branche === branche && branche !== ''),
        )
        .at(-1) ?? null
    );
  } catch {
    return null;
  }
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
  const dernierChef = evenement.hook_event_name === 'Stop' ? dernierChefDe(mission, branche) : null;
  const ligne = ligneDeHook(evenement, { dossier, branche, mission, dernierChef });
  if (ligne) ecrireLigne(ligne);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  principal()
    .catch(() => undefined)
    .finally(() => process.exit(0));
}
