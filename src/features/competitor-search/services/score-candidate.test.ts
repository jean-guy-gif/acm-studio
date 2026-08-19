import { describe, expect, it } from 'vitest';

import {
  scoreCandidate,
  type CandidateFacts,
  type ScoringCriteria,
} from '@/features/competitor-search/services/score-candidate';

const SUBJECT: ScoringCriteria = {
  city: 'Antibes',
  district: 'Fontmerle',
  propertyType: 'apartment',
  surfaceArea: 52,
  roomsCount: 3,
  advisorPriceMin: 280_000,
  advisorPriceMax: 320_000,
};

const facts = (overrides: Partial<CandidateFacts> = {}): CandidateFacts => ({
  price: 300_000,
  surfaceArea: 53,
  roomsCount: 3,
  city: 'Antibes',
  district: 'Fontmerle',
  propertyType: 'apartment',
  ...overrides,
});

describe('scoreCandidate', () => {
  it('donne 100 à un bien qui coche tout', () => {
    const result = scoreCandidate(SUBJECT, facts());
    expect(result.score).toBe(100);
    expect(result.weaknesses).toEqual([]);
    expect(result.strengths).toContain('Dans la fourchette');
    expect(result.strengths).toContain('Même quartier');
  });

  // On classe, on ne filtre pas : le bien reste dans la liste, plus bas.
  it('fait descendre un bien hors fourchette sans l’écarter', () => {
    const result = scoreCandidate(SUBJECT, facts({ price: 520_000 }));
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
    expect(result.weaknesses).toContain('Au-dessus de la fourchette');
  });

  it('reste indulgent juste au bord de la fourchette', () => {
    // 330 000 € pour une fourchette qui s'arrête à 320 000 : 3 % au-dessus.
    const near = scoreCandidate(SUBJECT, facts({ price: 330_000 }));
    const far = scoreCandidate(SUBJECT, facts({ price: 520_000 }));
    expect(near.score).toBeGreaterThan(far.score);
    expect(near.strengths).toContain('Proche de la fourchette');
  });

  it('classe la surface par paliers', () => {
    expect(scoreCandidate(SUBJECT, facts({ surfaceArea: 55 })).strengths).toContain(
      'Surface très proche',
    );
    expect(scoreCandidate(SUBJECT, facts({ surfaceArea: 63 })).strengths).toContain(
      'Surface proche',
    );
    expect(scoreCandidate(SUBJECT, facts({ surfaceArea: 90 })).weaknesses).toContain(
      'Surface très différente',
    );
  });

  // Une donnée absente n'est pas une faute : on ne la compte pas du tout.
  it('n’est pas pénalisé pour une donnée que l’annonce ne publie pas', () => {
    const complet = scoreCandidate(SUBJECT, facts());
    const sansSurface = scoreCandidate(SUBJECT, facts({ surfaceArea: null }));
    expect(sansSurface.score).toBe(complet.score);
    expect(sansSurface.comparedFacets).toBe(complet.comparedFacets - 1);
    expect(sansSurface.weaknesses).not.toContain('Surface très différente');
  });

  it('se rabat sur la commune quand le quartier est inconnu', () => {
    const result = scoreCandidate(SUBJECT, facts({ district: null }));
    expect(result.strengths).toContain('Même commune');
    expect(result.score).toBe(100);
  });

  it('ne compare rien quand le bien vendeur n’est pas renseigné', () => {
    const vide: ScoringCriteria = {
      city: null,
      district: null,
      propertyType: null,
      surfaceArea: null,
      roomsCount: null,
      advisorPriceMin: null,
      advisorPriceMax: null,
    };
    const result = scoreCandidate(vide, facts());
    expect(result.score).toBe(0);
    expect(result.comparedFacets).toBe(0);
  });

  it('mesure l’écart de pièces', () => {
    expect(scoreCandidate(SUBJECT, facts({ roomsCount: 4 })).strengths).toContain(
      'Une pièce d’écart',
    );
    expect(scoreCandidate(SUBJECT, facts({ roomsCount: 6 })).weaknesses).toContain(
      '3 pièces d’écart',
    );
  });
});
