import { describe, expect, it } from 'vitest';

import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  matchBuyerAgainstSuivi,
  referencePrice,
  type BuyerCriteria,
} from '@/features/meeting-conclusion/services/buyer-match';
import type { ConclusionOutcome, MeetingConclusion } from '@/features/meeting-conclusion/types';

type Overrides = {
  propertyType?: string | null;
  surfaceArea?: number | null;
  roomsCount?: number | null;
  city?: string | null;
  outcome?: ConclusionOutcome;
  commercializationPrice?: number | null;
  advisorPrice?: number | null;
};

function dossier(id: string, o: Overrides): SuiviDossier {
  const conclusion: MeetingConclusion = {
    marketComputed: null,
    advisorAnalysis: null,
    advisorPrice: o.advisorPrice ?? null,
    commercializationPrice: o.commercializationPrice ?? null,
    outcome: o.outcome ?? 'signed',
    followUpReason: null,
    concludedAt: null,
    outcomeChangedAt: null,
  };
  return {
    project: { id, seller_name: id } as unknown as SuiviDossier['project'],
    property: {
      propertyType: o.propertyType ?? null,
      surfaceArea: o.surfaceArea ?? null,
      roomsCount: o.roomsCount ?? null,
      city: o.city ?? null,
    },
    conclusion,
  };
}

const BUYER: BuyerCriteria = {
  propertyType: 'appartement',
  roomsCount: 3,
  surfaceArea: 80,
  budgetMin: 300000,
  budgetMax: 400000,
  city: 'Nice',
};

describe('buyer-match (§6.5) — la référence de prix est nommée', () => {
  it('un dossier signé prend le prix CONVENU ; sinon le prix CONSEILLÉ ; sinon rien', () => {
    expect(
      referencePrice(dossier('a', { commercializationPrice: 500000, advisorPrice: 510000 })),
    ).toEqual({
      kind: 'convenu',
      value: 500000,
    });
    expect(
      referencePrice(
        dossier('b', { outcome: 'follow_up', commercializationPrice: null, advisorPrice: 510000 }),
      ),
    ).toEqual({ kind: 'conseille', value: 510000 });
    expect(
      referencePrice(dossier('c', { commercializationPrice: null, advisorPrice: null })),
    ).toEqual({ kind: null, value: null });
  });

  it('le rapprochement porte la nature du prix de référence sur chaque carte', () => {
    const matches = matchBuyerAgainstSuivi(BUYER, [
      dossier('signe', { commercializationPrice: 380000 }),
      dossier('relance', { outcome: 'follow_up', advisorPrice: 390000 }),
    ]);
    const byId = Object.fromEntries(matches.map((m) => [m.dossier.project.id, m]));
    expect(byId.signe.reference.kind).toBe('convenu');
    expect(byId.relance.reference.kind).toBe('conseille');
  });
});

describe('buyer-match (§6.4) — un type non normalisable n’est pas écarté en silence', () => {
  it('le dossier apparaît dans les résultats, avec sa mention « type non reconnu »', () => {
    const matches = matchBuyerAgainstSuivi(BUYER, [
      dossier('bizarre', { propertyType: 'truc indéfini', commercializationPrice: 350000 }),
    ]);
    expect(matches).toHaveLength(1); // pas exclu
    expect(matches[0].typeUnrecognized).toBe(true);
  });

  it('un dossier sans aucun prix de référence apparaît quand même (mention, pas exclusion)', () => {
    const matches = matchBuyerAgainstSuivi(BUYER, [
      dossier('sansprix', { commercializationPrice: null, advisorPrice: null }),
    ]);
    expect(matches).toHaveLength(1);
    expect(matches[0].reference.kind).toBeNull();
  });
});

describe('buyer-match — l’écart CHIFFRÉ lit les mêmes entrées que le score', () => {
  it('chiffre le dépassement de budget et l’écart de surface quand le score les classe dehors', () => {
    // Prix 500 000 vs budget max 400 000 (25 % au-dessus → hors tolérance) ;
    // surface 120 vs 80 recherchés (50 % → très différente).
    const [match] = matchBuyerAgainstSuivi(BUYER, [
      dossier('loin', {
        surfaceArea: 120,
        roomsCount: 3,
        city: 'Nice',
        commercializationPrice: 500000,
      }),
    ]);
    const details = match.weaknesses.map((w) => w.detail).filter((d): d is string => d != null);
    expect(
      details.some((d) => /100\s?000\s?€.*au-dessus du budget/.test(d.replace(/ /g, ' '))),
    ).toBe(true);
    expect(details.some((d) => /40 m² de plus que recherché/.test(d))).toBe(true);
  });

  it('ne chiffre pas un bien que le score compte dans la tolérance (pas de contradiction)', () => {
    // Prix 440 000 : 10 % au-dessus de 400 000 → « Proche de la fourchette » (force du score),
    // donc PAS une faiblesse « au-dessus du budget ».
    const [match] = matchBuyerAgainstSuivi(BUYER, [
      dossier('proche', {
        surfaceArea: 80,
        roomsCount: 3,
        city: 'Nice',
        commercializationPrice: 440000,
      }),
    ]);
    const details = match.weaknesses.map((w) => w.detail ?? w.label);
    expect(details.some((d) => /budget/.test(d))).toBe(false);
  });
});
