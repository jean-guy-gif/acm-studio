import { describe, expect, it } from 'vitest';

import { dpeMarket } from '@/features/dpe/services/dpe';
import { PRICE_ALIGNMENT_LABELS } from '@/features/price-positioning/services/price-alignment';
import { CLIENT_TEXTS, clientTexts, textLanguage } from '@/lib/client-texts';
import { ENGLISH_TEXTS } from '@/lib/client-texts/en';
import { FRENCH_TEXTS } from '@/lib/client-texts/fr';

// Mission 140 — les textes du client, un fichier par langue, mêmes clés : le typecheck refuse une
// clé manquante ; ce test parcourt toutes les clés, vérifie qu'aucun texte n'est vide et que les
// phrases variables prennent les mêmes arguments partout.

type Tree = Record<string, unknown>;

function shape(tree: Tree, path = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const here = path ? `${path}.${key}` : key;
    if (typeof value === 'function') return [`${here}()${value.length}`];
    if (value != null && typeof value === 'object') return shape(value as Tree, here);
    return [here];
  });
}

// La légende du classement a des parties vides par construction (« dernier tiers » n'a ni chiffre
// ni exposant) : elles ne sont pas des textes.
function strings(tree: Tree): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    if (key === 'legendTiers') return [];
    if (typeof value === 'string') return [value];
    if (value != null && typeof value === 'object') return strings(value as Tree);
    return [];
  });
}

// Les phrases variables, appelées avec des valeurs d'exemple : tout ce que le client peut lire.
function rendered(tree: Tree): string[] {
  return Object.values(tree).flatMap((value) => {
    if (typeof value === 'string') return [value];
    if (typeof value === 'function') {
      const fn = value as (...args: unknown[]) => unknown;
      const call = (sample: unknown) => {
        try {
          return fn(...Array.from({ length: fn.length }, () => sample));
        } catch {
          return fn(...Array.from({ length: fn.length }, () => `${String(sample)} pièces`));
        }
      };
      return [1, 3].map(call).filter((out): out is string => typeof out === 'string');
    }
    if (value != null && typeof value === 'object') return rendered(value as Tree);
    return [];
  });
}

describe('les textes du client', () => {
  it('ont les mêmes clés dans chaque langue, et les mêmes arguments', () => {
    const french = shape(FRENCH_TEXTS).sort();
    for (const texts of Object.values(CLIENT_TEXTS)) {
      expect(shape(texts).sort()).toEqual(french);
    }
  });

  it('n’ont aucun texte vide', () => {
    for (const texts of Object.values(CLIENT_TEXTS)) {
      expect(strings(texts).filter((text) => text.trim() === '')).toEqual([]);
    }
  });

  it('une langue sans textes écrits retombe sur le français', () => {
    expect(textLanguage('it')).toBe('fr');
    expect(clientTexts('ru')).toBe(FRENCH_TEXTS);
    expect(clientTexts('en')).toBe(ENGLISH_TEXTS);
  });

  // L'outil n'estime pas le bien (CLAUDE.md, M105) : jamais le nom, « an estimate » ni
  // « valuation » ; « estimated » dit, comme « estimée » en français, la négociation déduite d'une
  // annonce disparue (M127). Le Live parle au vendeur à la 2e personne (M89). « Disponible » n'est
  // refusé que pour un bien proposé à un acquéreur (M118, partie B).
  it('l’anglais ne dit jamais « estimate » ni « valuation », ni « the seller »', () => {
    const offenders = rendered(ENGLISH_TEXTS).filter((text) =>
      /\bestimates?\b|estimation|valuation|valued|the seller|\bvendor/i.test(text),
    );
    expect(offenders).toEqual([]);
  });

  it('le français ne dit jamais « estimation »', () => {
    const offenders = rendered(FRENCH_TEXTS).filter((text) => /estimation/i.test(text));
    expect(offenders).toEqual([]);
  });

  it('l’anglais n’a laissé aucun mot français', () => {
    const offenders = rendered(ENGLISH_TEXTS).filter((text) =>
      /\b(votre|vous|concurrents?|prix|bien|écart|réponse|jours?)\b/i.test(text),
    );
    expect(offenders).toEqual([]);
  });

  it('le DPE : le français est mot pour mot celui du Live d’avant', () => {
    const dpe = FRENCH_TEXTS.live.dpe;
    expect(dpe.better).toBe(dpeMarket('B', ['D', 'D', 'E'])!.message);
    expect(dpe.equal).toBe(dpeMarket('D', ['D', 'D', 'E'])!.message);
    expect(dpe.worse).toBe(dpeMarket('F', ['D', 'D', 'E'])!.message);
    expect(dpe.unknown('D')).toBe(dpeMarket(null, ['D', 'D', 'E'])!.message);
    expect(dpe.unknown('A')).toBe(dpeMarket(null, ['A', 'A'])!.message);
    expect(ENGLISH_TEXTS.live.dpe.unknown('A')).toContain('rated A to stay');
    expect(ENGLISH_TEXTS.live.dpe.unknown('C')).toContain('rated C or better');
  });

  it('la couleur du prix garde ses libellés français, et en a d’anglais', () => {
    expect(FRENCH_TEXTS.common.alignment).toBe(PRICE_ALIGNMENT_LABELS);
    expect(ENGLISH_TEXTS.common.alignment.green).toBe('Price in line with the market');
  });

  it('les rangs anglais : 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st', () => {
    const rank = ENGLISH_TEXTS.common.pricePosition.rank;
    expect([1, 2, 3, 4, 11, 12, 13, 21].map((n) => rank(n, 30).split(' ')[1])).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
    ]);
    expect(FRENCH_TEXTS.common.pricePosition.rank(1, 7)).toBe('le 1er moins cher sur 7');
    expect(FRENCH_TEXTS.common.pricePosition.rank(3, 7)).toBe('le 3e moins cher sur 7');
  });
});
