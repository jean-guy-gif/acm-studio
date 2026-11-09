import { describe, expect, it } from 'vitest';

import { clientTexts } from '@/lib/client-texts';

// Mission 148 B (Jean-Guy, 08/11) — les phrases de la synthèse, dans les deux langues : le prix des
// concurrents calculé avant le rendez-vous, la position du prix convenu face aux concurrents vus
// (singulier, pluriel, rangs), la ligne d'un « Non » dans les prix au m².
const FR = clientTexts('fr').documents.synthesis;
const EN = clientTexts('en').documents.synthesis;
const plain = (text: string) => text.replace(/ /g, ' ');

describe('les phrases de la synthèse (mission 148 B)', () => {
  // Jean-Guy, 09/11 — aucune référence au moment : une décision reste modifiable jusqu'à la
  // conclusion (M111), la phrase doit rester vraie.
  it('dit sur quels concurrents porte le prix, sans dire quand il a été fixé', () => {
    expect(FR.basisCalculated(5, null)).toBe(
      'Calculé par votre conseiller sur les 5 concurrents qu’il a retenus',
    );
    expect(FR.basisAdvisor(5, null)).toBe(
      'Prix choisi par votre conseiller, à partir des 5 concurrents qu’il a retenus',
    );
    expect(FR.basisCalculated(1, null)).toBe(
      'Calculé par votre conseiller sur le concurrent qu’il a retenu',
    );
    expect(FR.basisAdvisor(1, null)).toBe(
      'Prix choisi par votre conseiller, à partir du concurrent qu’il a retenu',
    );
    expect(FR.basisCalculated(8, 6)).toBe(
      'Calculé par votre conseiller sur les 8 concurrents qu’il a retenus, dont 6 vus ensemble',
    );
    expect(EN.basisCalculated(5, null)).toBe(
      'Calculated by your adviser on the 5 competing properties they selected',
    );
    expect(EN.basisAdvisor(1, null)).toBe(
      'Price chosen by your adviser, based on the competing property they selected',
    );
    expect(EN.basisAdvisor(8, 6)).toBe(
      'Price chosen by your adviser, based on the 8 competing properties they selected, 6 of which we viewed together',
    );
    for (const text of [FR.basisCalculated(5, null), FR.basisAdvisor(5, null)]) {
      expect(text).not.toMatch(/rendez-vous|avant|après/);
    }
    for (const text of [EN.basisCalculated(5, null), EN.basisAdvisor(5, null)]) {
      expect(text).not.toMatch(/meeting|before|after/);
    }
  });

  it('titre la case de la position « Votre prix face aux concurrents »', () => {
    expect(FR.amongCompared).toBe('Votre prix face aux concurrents');
    expect(EN.amongCompared).toBe('Your price against the competing properties');
  });

  it('situe le prix convenu face aux concurrents vus, au singulier comme au pluriel', () => {
    const fr = FR.positionAmongSeen;
    const en = EN.positionAmongSeen;
    expect(plain(fr.sentence(fr.cheapest, 4))).toBe(
      'Le moins cher : votre bien face aux 4 concurrents dont vous avez vu le prix',
    );
    expect(plain(fr.sentence(fr.mostExpensive, 1))).toBe(
      'Le plus cher : votre bien face au concurrent dont vous avez vu le prix',
    );
    expect(en.sentence(en.cheapest, 4)).toBe(
      'The cheapest: your property against the 4 competing properties whose price you saw',
    );
    expect(en.sentence(en.mostExpensive, 1)).toBe(
      'The most expensive: your property against the competing property whose price you saw',
    );
  });

  it('dit le rang en toutes lettres, ordinaux anglais compris', () => {
    expect(FR.positionAmongSeen.rank(3)).toBe('Le 3e moins cher');
    expect(
      [2, 3, 4, 11, 12, 13, 21, 22, 23].map((rank) => EN.positionAmongSeen.rank(rank)),
    ).toEqual([
      'The 2nd cheapest',
      'The 3rd cheapest',
      'The 4th cheapest',
      'The 11th cheapest',
      'The 12th cheapest',
      'The 13th cheapest',
      'The 21st cheapest',
      'The 22nd cheapest',
      'The 23rd cheapest',
    ]);
  });

  it('garde la ligne d’un « Non », dans les deux langues', () => {
    expect(FR.notConsideredRow('Concurrent 2')).toBe('Concurrent 2 · pas un concurrent pour vous');
    expect(EN.notConsideredRow('Competing property 2')).toBe(
      'Competing property 2 · not competition for you',
    );
  });
});
