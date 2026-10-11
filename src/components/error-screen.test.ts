import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { HOME_LABEL, HOME_PATH } from '@/components/error-screen';

const read = (...path: string[]) => readFileSync(join(process.cwd(), 'src', ...path), 'utf8');
const PAGES = [
  ['app', 'error.tsx'],
  ['app', 'not-found.tsx'],
  ['app', 'global-error.tsx'],
];

describe('pages d’erreur (mission 88)', () => {
  it('existent toutes les trois et passent par le même écran', () => {
    for (const page of PAGES) {
      expect(read(...page)).toContain('<ErrorScreen');
    }
  });

  it('proposent « Revenir à mes dossiers »', () => {
    expect(HOME_LABEL).toBe('Revenir à mes dossiers');
    expect(HOME_PATH).toBe('/builder');
    expect(read('components', 'error-screen.tsx')).toContain('href={HOME_PATH}');
  });

  it('ne montrent aucun détail technique : ni message, ni pile, ni identifiant d’erreur', () => {
    for (const page of PAGES) {
      // Tout ce qui est rendu : le JSX après « return ( ».
      const rendered = read(...page)
        .split('return (')
        .slice(1)
        .join('return (');
      expect(rendered).not.toMatch(/error\b|digest|stack|\{.*message.*\}/);
    }
    // L'écran ne reçoit que deux phrases écrites dans le dépôt.
    expect(read('components', 'error-screen.tsx')).toMatch(
      /ErrorScreen\(\{ title, message \}: \{ title: string; message: string \}\)/,
    );
  });

  it('ne lisent rien du dossier : ni requête, ni prix, ni donnée du Live', () => {
    for (const page of [...PAGES, ['components', 'error-screen.tsx']]) {
      expect(read(...page)).not.toMatch(
        /supabase|features\/|formatEuro|useParams|useSearchParams|usePathname|projectId/,
      );
    }
  });

  it('sont en français', () => {
    for (const page of PAGES) {
      expect(read(...page)).not.toMatch(/Something went wrong|Not Found|Try again|Go back/i);
    }
  });
});
