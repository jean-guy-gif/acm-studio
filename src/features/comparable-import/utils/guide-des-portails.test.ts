import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { EXTENSION_HOST_SUFFIXES } from '@/features/comparable-import/utils/extension-hosts';
import { FORBIDDEN_PORTAL_NAMES } from '@/features/comparable-import/utils/forbidden-portals';
import { BUDGET_REACHED_LABEL } from '@/features/search-budget/services/budget';

// Lancement, mission 13 — le guide de prise en main dit ce que le code fait, comme la page de
// confidentialité (M73). Sa ligne des portails (demande de Jean-Guy, 25/11) nomme chaque site que
// l'extension lit, et chaque site dont la lecture est interdite : Belles Demeures se saisit à la
// main. Un site ajouté dans le code sans sa ligne dans le guide fait échouer ce test.
const SITE_NAMES: Record<string, string> = {
  'seloger.com': 'SeLoger',
  'bienici.com': 'Bien’ici',
  'green-acres.fr': 'Green-Acres',
  'immobilier.lefigaro.fr': 'Figaro Immobilier',
  'maisonsetappartements.fr': 'Maisons et Appartements',
};

const guide = readFileSync(
  join(process.cwd(), 'docs', 'guide', 'guide-de-prise-en-main.html'),
  'utf8',
)
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#x202f;/g, ' ')
  .replace(/\s+/g, ' ')
  // Une balise fermée devant un point laisse une espace : « se lisent . » redevient « se lisent. ».
  .replace(/ ([.,])/g, '$1');

// La ligne des portails : de son nom à la ligne suivante.
const line = guide.slice(guide.indexOf('Les portails'), guide.indexOf('Le forfait du mois'));
const [read = '', rest = ''] = line.split(' se lisent. ');
const unread = rest.split(' ne se lisent pas')[0] ?? '';

describe('le guide de prise en main : la ligne des portails', () => {
  it('existe, avec ses deux phrases', () => {
    expect(line).toContain('Collez l’adresse de l’annonce');
    expect(read).not.toBe('');
    expect(rest).toContain('ne se lisent pas');
    expect(rest).toContain('se saisit à la main');
  });

  it('nomme chaque site que l’extension lit', () => {
    for (const suffix of EXTENSION_HOST_SUFFIXES) {
      const name = SITE_NAMES[suffix];
      expect(name, `site sans nom dans le guide\u00a0: ${suffix}`).toBeDefined();
      expect(read).toContain(name);
    }
  });

  it('dit de chaque site interdit qu’il ne se lit pas : Belles Demeures se saisit à la main', () => {
    expect(FORBIDDEN_PORTAL_NAMES).toContain('Belles Demeures');
    for (const name of FORBIDDEN_PORTAL_NAMES) {
      expect(unread).toContain(name);
      expect(read).not.toContain(name);
    }
  });

  it('cite le message du forfait tel que l’écran le dit', () => {
    expect(guide).toContain(`« ${BUDGET_REACHED_LABEL.replace(/\s+/g, ' ')} »`);
  });
});
