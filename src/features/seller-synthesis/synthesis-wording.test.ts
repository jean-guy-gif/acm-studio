import { describe, expect, it } from 'vitest';

import { clientTexts } from '@/lib/client-texts';

// Mission 148 B (Jean-Guy, 08/11) — les phrases de la synthèse, dans les deux langues : le prix des
// concurrents calculé avant le rendez-vous, la position du prix convenu face aux concurrents vus
// (singulier, pluriel, rangs), la ligne d'un « Non » dans les prix au m².
const FR = clientTexts('fr').documents.synthesis;
const EN = clientTexts('en').documents.synthesis;
const plain = (text: string) => text.replace(/ /g, ' ');

describe('les phrases de la synthèse (mission 148 B)', () => {
  it('dit que le prix des concurrents a été calculé avant le rendez-vous', () => {
    expect(FR.basisCalculated('5 concurrents')).toBe(
      'Calculé par votre conseiller avant notre rendez-vous, sur 5 concurrents',
    );
    expect(FR.basisAdvisor('5 concurrents')).toBe(
      'Prix retenu par votre conseiller avant notre rendez-vous, à partir de 5 concurrents',
    );
    expect(EN.basisCalculated('5 competing properties')).toBe(
      'Calculated by your adviser before our meeting, on 5 competing properties',
    );
    expect(EN.basisAdvisor('5 competing properties')).toBe(
      'Price set by your adviser before our meeting, based on 5 competing properties',
    );
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
