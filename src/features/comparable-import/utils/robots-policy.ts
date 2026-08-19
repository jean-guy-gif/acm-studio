// Lecture du fichier robots.txt d'un portail.
//
// Pourquoi ce module existe : ACM Studio se présente aux portails sous une
// identité de robot honnête, avec son nom et une adresse de contact. Cette
// honnêteté n'a de sens que si l'on respecte aussi ce que le portail publie
// comme règles. Mesuré le 19/08 : SeLoger et Green Acres autorisent les pages
// d'annonces ; Belles Demeures les interdit. On lit donc, et on obéit.
//
// Implémentation volontairement stricte et courte : groupes `User-agent`,
// directives `Allow` / `Disallow`, la règle la plus longue l'emporte — c'est la
// convention respectée par les moteurs.

export type RobotsPolicy = {
  isAllowed: (path: string) => boolean;
};

export const ALLOW_ALL: RobotsPolicy = { isAllowed: () => true };
export const DENY_ALL: RobotsPolicy = { isAllowed: () => false };

type Rule = { pattern: string; allow: boolean };

// Un motif robots.txt accepte `*` (n'importe quelle suite) et `$` (fin d'URL).
function matches(pattern: string, path: string): boolean {
  if (pattern === '') {
    return false;
  }
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const parts = body.split('*');

  let index = 0;
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part === '') {
      continue;
    }
    if (i === 0) {
      if (!path.startsWith(part)) {
        return false;
      }
      index = part.length;
      continue;
    }
    const found = path.indexOf(part, index);
    if (found === -1) {
      return false;
    }
    index = found + part.length;
  }

  if (anchored) {
    const last = parts[parts.length - 1];
    return last === '' ? true : path.endsWith(last);
  }
  return true;
}

// Longueur du motif hors caractères spéciaux : sert à départager deux règles
// qui correspondent toutes les deux (la plus précise gagne).
function specificity(pattern: string): number {
  return pattern.replace(/[*$]/g, '').length;
}

export function parseRobots(text: string, userAgentToken: string): RobotsPolicy {
  const token = userAgentToken.toLowerCase();
  const groups = new Map<string, Rule[]>();
  let currentAgents: string[] = [];
  let previousWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim();
    if (line === '') {
      continue;
    }
    const separator = line.indexOf(':');
    if (separator === -1) {
      continue;
    }
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === 'user-agent') {
      // Plusieurs `User-agent` d'affilée partagent le même groupe de règles.
      if (!previousWasAgent) {
        currentAgents = [];
      }
      currentAgents.push(value.toLowerCase());
      for (const agent of currentAgents) {
        if (!groups.has(agent)) {
          groups.set(agent, []);
        }
      }
      previousWasAgent = true;
      continue;
    }

    previousWasAgent = false;
    if (field !== 'allow' && field !== 'disallow') {
      continue;
    }
    for (const agent of currentAgents) {
      groups.get(agent)?.push({ pattern: value, allow: field === 'allow' });
    }
  }

  // Notre robot d'abord, le groupe générique ensuite. Aucun des deux → tout est
  // autorisé, c'est la règle par défaut du protocole.
  const rules = groups.get(token) ?? groups.get('*');
  if (!rules || rules.length === 0) {
    return ALLOW_ALL;
  }

  return {
    isAllowed(path) {
      let best: Rule | null = null;
      for (const rule of rules) {
        // `Disallow:` vide signifie « rien n'est interdit » : ce n'est pas une règle.
        if (rule.pattern === '' && !rule.allow) {
          continue;
        }
        if (!matches(rule.pattern, path)) {
          continue;
        }
        if (
          best == null ||
          specificity(rule.pattern) > specificity(best.pattern) ||
          (specificity(rule.pattern) === specificity(best.pattern) && rule.allow)
        ) {
          best = rule;
        }
      }
      return best == null ? true : best.allow;
    },
  };
}
