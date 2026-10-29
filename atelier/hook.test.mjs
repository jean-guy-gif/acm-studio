import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  dureesE2e,
  ecrireCetteLigne,
  ligneDeHook,
  phraseDurees,
  regleDeCommande,
  sansHeredocs,
} from './hook.mjs';

// Mission 126 — le hook, joué sur une session factice : chaque événement documenté arrive sur
// stdin, et l'on relit ce qui est écrit dans un journal à part (`ATELIER_HOME`).
const HOOK = resolve(import.meta.dirname, 'hook.mjs');
const JETON = 'Ab3dEfGh1jKlMnOpQrStUvWxYz012345';
let home;
let depot;

const git = (...args) =>
  execFileSync('git', args, { cwd: depot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), 'atelier-'));
  depot = mkdtempSync(join(tmpdir(), 'depot-'));
  git('init', '-q', '-b', 'main');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'x');
});
afterAll(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(depot, { recursive: true, force: true });
});

const jouer = (evenement, sessionId = 'session-1') => {
  const resultat = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ session_id: sessionId, cwd: depot, ...evenement }),
    env: { ...process.env, ATELIER_HOME: home, CLAUDE_PROJECT_DIR: depot },
    encoding: 'utf8',
  });
  expect(resultat.status, resultat.stderr).toBe(0);
};
const journal = () => {
  const chemin = join(home, 'journal.jsonl');
  return existsSync(chemin)
    ? readFileSync(chemin, 'utf8')
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l))
    : [];
};

describe('le hook de l’atelier, sur une session factice', () => {
  it('sur main, seul « /mission NN » tapé s’écrit ; la mission est retenue pour la session', () => {
    jouer({ hook_event_name: 'SubagentStart', agent_id: 'a1', agent_type: 'architecte' });
    expect(journal()).toEqual([]);
    jouer({ hook_event_name: 'UserPromptSubmit', prompt: '/mission 126' });
    const lignes = journal();
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({
      branche: 'main',
      mission: '126',
      agent: 'chef',
      etat: 'en cours',
      phrase: 'Mission 126 lancée par Jean-Guy',
      etape: 'architecte',
      dossier: depot,
    });
    jouer({ hook_event_name: 'UserPromptSubmit', prompt: 'reprend' });
    expect(journal()).toHaveLength(1);
  });

  it('sur une branche mission-, chaque agent passe en cours puis terminé, avec sa première phrase masquée', () => {
    git('switch', '-q', '-c', 'mission-126-atelier');
    jouer({ hook_event_name: 'SubagentStart', agent_id: 'a1', agent_type: 'architecte' });
    jouer({
      hook_event_name: 'SubagentStop',
      agent_id: 'a1',
      agent_type: 'architecte',
      last_assistant_message: `**Plan** : six questions. Jeton vu : ${JETON}\nDétail long…`,
    });
    const [, debut, fin] = journal();
    expect(debut).toMatchObject({
      agent: 'architecte',
      etat: 'en cours',
      mission: '126',
      branche: 'mission-126-atelier',
    });
    expect(fin).toMatchObject({ agent: 'architecte', etat: 'terminé', mission: '126' });
    expect(fin.phrase).toBe('Plan : six questions. Jeton vu : [masqué]');
    expect(JSON.stringify(journal())).not.toContain(JETON);
  });

  it('git push, npm run e2e et gh run du chef s’écrivent, jamais la commande entière ni sa sortie', () => {
    jouer({
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: {
        command: `git push -u origin mission-126-atelier && curl -H "x-vercel-protection-bypass: ${JETON}" https://essai/api/version`,
      },
      tool_response: { stdout: 'ok' },
    });
    jouer({
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'npm run e2e' },
      tool_response: {
        stdout: `  ✓  1 [chromium] › demo.spec.ts:81:1 › la démo (7.1m)\n  ✓  2 [chromium] › parcours.spec.ts:40:1 › le parcours (5.9m)\n  ✓  3 bienvenue.spec.ts (40.2s)\n  6 passed (14.4m)\nE2E_VERCEL_BYPASS=${JETON}`,
      },
    });
    jouer({
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: {
        command: 'gh run list --branch mission-126-atelier -L 1 --json headSha,status,conclusion',
      },
      tool_response: {
        stdout: '[{"headSha":"7767501abc","status":"completed","conclusion":"success"}]',
      },
    });
    jouer({
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'ls -la' },
      tool_response: { stdout: 'rien' },
    });
    const lignes = journal().slice(-3);
    expect(lignes.map((l) => l.evenement)).toEqual(['push', 'e2e', 'ci']);
    expect(lignes[0].phrase).toBe('Poussé : git push -u origin mission-126-atelier');
    expect(lignes[0].etape).toBe('push');
    expect(lignes[1].phrase).toBe('E2E joué : demo 7,1 min · parcours 5,9 min · bienvenue 40 s');
    expect(lignes[1].donnees).toEqual({
      durees: [
        { suite: 'demo', secondes: 426 },
        { suite: 'parcours', secondes: 354 },
        { suite: 'bienvenue', secondes: 40.2 },
      ],
    });
    expect(lignes[2].phrase).toBe('CI lue : verte');
    expect(JSON.stringify(journal())).not.toContain(JETON);
    expect(JSON.stringify(journal())).not.toContain('curl');
  });

  it('un heredoc qui mentionne « git push » n’a rien poussé ; un jeton coupé reste masqué', () => {
    const avant = journal().length;
    jouer({
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: {
        command: `python3 - <<'EOF'\nprint("git push est une chaîne")\nEOF\necho fini`,
      },
      tool_response: { stdout: 'ok' },
    });
    expect(journal()).toHaveLength(avant);
    jouer({
      hook_event_name: 'PostToolUse',
      tool_name: 'Bash',
      tool_input: {
        command: `git commit -q -m "$(cat <<'EOF'\nMission 126 — x\nEOF\n)" && git push -q https://u:${JETON}@github.com/x/y.git mission-126-atelier --force-with-lease=mission-126-atelier:abcdef`,
      },
      tool_response: { stdout: 'ok' },
    });
    const ligne = journal().at(-1);
    expect(ligne.evenement).toBe('push');
    expect(ligne.phrase.startsWith('Poussé : git push -q https://u:[masqué]')).toBe(true);
    expect(JSON.stringify(journal())).not.toContain(JETON);
  });

  it('une notification : « attend Jean-Guy », le type seulement ; le Stop ne l’efface pas', () => {
    jouer({
      hook_event_name: 'Notification',
      notification_type: 'permission_prompt',
      message: `secret ${JETON}`,
    });
    const avant = journal().length;
    jouer({ hook_event_name: 'Stop', last_assistant_message: 'rapport…' });
    expect(journal()).toHaveLength(avant);
    expect(journal().at(-1)).toMatchObject({
      agent: 'chef',
      etat: 'attend Jean-Guy',
      phrase: 'Une permission attend Jean-Guy',
    });
    // Jean-Guy répond : la ligne lève l'orange, sans son texte.
    jouer({ hook_event_name: 'UserPromptSubmit', prompt: `oui, et le jeton ${JETON}` });
    expect(journal().at(-1)).toMatchObject({
      agent: 'chef',
      etat: 'en cours',
      phrase: 'Jean-Guy a répondu',
      evenement: 'reponse',
    });
    // Le chef s'arrête sans question posée : « Au repos », en cours.
    jouer({ hook_event_name: 'Stop', last_assistant_message: 'fin' });
    expect(journal().at(-1)).toMatchObject({ agent: 'chef', etat: 'en cours', phrase: 'Au repos' });
    // `/valide` ferme la mission.
    jouer({ hook_event_name: 'UserPromptSubmit', prompt: '/valide 126' });
    expect(journal().at(-1)).toMatchObject({ evenement: 'valide', mission: '126' });
    expect(JSON.stringify(journal())).not.toContain(JETON);
  });

  it('un stdin illisible ne casse rien et n’écrit rien', () => {
    const avant = journal().length;
    const resultat = spawnSync(process.execPath, [HOOK], {
      input: 'pas du json',
      env: { ...process.env, ATELIER_HOME: home, CLAUDE_PROJECT_DIR: depot },
      encoding: 'utf8',
    });
    expect(resultat.status).toBe(0);
    expect(journal()).toHaveLength(avant);
  });
});

describe('les règles du hook, pures', () => {
  it('écrit sur mission-, ou pour /mission et /valide tapés, et rien d’autre', () => {
    expect(ecrireCetteLigne({ hook_event_name: 'SubagentStart' }, 'mission-120B-confrere')).toBe(
      true,
    );
    expect(ecrireCetteLigne({ hook_event_name: 'SubagentStart' }, 'main')).toBe(false);
    expect(
      ecrireCetteLigne({ hook_event_name: 'UserPromptSubmit', prompt: '/valide 120B' }, 'essai'),
    ).toBe(true);
    expect(
      ecrireCetteLigne({ hook_event_name: 'UserPromptSubmit', prompt: 'bonjour' }, 'main'),
    ).toBe(false);
  });

  it('un événement inconnu ou un autre outil ne donne pas de ligne', () => {
    const contexte = { dossier: '/x', branche: 'mission-126-atelier', mission: '126' };
    expect(ligneDeHook({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }, contexte)).toBeNull();
    expect(
      ligneDeHook({ hook_event_name: 'PostToolUse', tool_name: 'Write' }, contexte),
    ).toBeNull();
    // Sur une branche de mission, une ligne tapée est une réponse de Jean-Guy ; sur main, rien.
    expect(
      ligneDeHook({ hook_event_name: 'UserPromptSubmit', prompt: 'reprend' }, contexte),
    ).toMatchObject({ phrase: 'Jean-Guy a répondu', evenement: 'reponse' });
    expect(
      ligneDeHook(
        { hook_event_name: 'UserPromptSubmit', prompt: 'reprend' },
        { dossier: '/x', branche: 'main', mission: null },
      ),
    ).toBeNull();
  });

  it('le motif se teste en tête de segment, hors des heredocs', () => {
    expect(sansHeredocs("a <<'EOF'\ngit push\nEOF\nb")).toBe("a <<'EOF'\nb");
    expect(regleDeCommande('cd /x && CI=1 git push -u origin b')?.segment).toBe(
      'git push -u origin b',
    );
    expect(regleDeCommande('(npm run e2e > log 2>&1 &)')?.regle.evenement).toBe('e2e');
    expect(regleDeCommande('echo "git push" ; grep "gh run" fichier')).toBeNull();
    expect(regleDeCommande("python3 - <<'EOF'\ngit push\nEOF")).toBeNull();
  });

  it('les durées e2e se lisent dans la sortie de Playwright', () => {
    expect(dureesE2e('demo.spec.ts (7.1m)\nlive-tablette … (25.8s)')).toEqual([
      { suite: 'demo', secondes: 426 },
      { suite: 'live-tablette', secondes: 25.8 },
    ]);
    expect(
      phraseDurees([
        { suite: 'demo', secondes: 426 },
        { suite: 'demo', secondes: 300 },
      ]),
    ).toBe('demo 7,1 min');
  });
});
