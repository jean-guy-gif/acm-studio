import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Mission 107 — une recherche payée n'est jamais perdue. Le panneau de recherche est un composant
// client de 1 300 lignes, sans navigateur simulé dans les tests : on vérifie l'ORDRE du code.
const read = (...parts: string[]) => readFileSync(join(process.cwd(), 'src', ...parts), 'utf8');
const panel = read('features', 'competitor-search', 'components', 'competitor-search-panel.tsx');

function searchBody(): string {
  const start = panel.indexOf('async function searchViaStreamEstate(');
  const end = panel.indexOf('\n  }\n', start);
  return panel.slice(start, end);
}

describe('une relance de recherche qui échoue ne fait rien perdre', () => {
  it('l’ancien résultat n’est ni effacé ni oublié avant une recherche réussie', () => {
    const body = searchBody();
    expect(body).not.toContain('forgetStreamEstateResult');
    expect(body).not.toContain('setStreamNote(null)');
    // L'échec (budget atteint, communes en panne, refus du fournisseur) s'arrête avant tout
    // remplacement ; le nouveau résultat n'est gardé qu'après.
    const failure = body.indexOf('if (!result.ok)');
    expect(failure).toBeGreaterThan(-1);
    expect(body.indexOf('keepStreamEstateResult(')).toBeGreaterThan(failure);
    expect(body.indexOf('setStreamNote(note)')).toBeGreaterThan(failure);
  });

  it('budget atteint : le résultat gardé se rouvre quand même', () => {
    const recall = panel.slice(
      panel.indexOf('const recalled = useRef(false);'),
      panel.indexOf('recallStreamEstateResult(projectId)'),
    );
    expect(recall).toContain('!keptResultAvailable');
    expect(recall).not.toContain('!streamEstateAction');
    const page = read(
      'app',
      '(protected)',
      'builder',
      '[projectId]',
      'comparables',
      'find',
      'page.tsx',
    );
    // La réouverture dépend de la clé et du dossier (pas un exemple), jamais du budget du mois.
    expect(page).toContain('keptResultAvailable={streamEstateAvailable}');
    expect(page).toMatch(
      /const streamEstateAvailable =[\s\S]*?streamEstateApiKey\(\) != null && !project\.is_example;/,
    );
  });
});
