import { describe, expect, it } from 'vitest';

import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  matchBuyerAgainstSuivi,
  noneOfTypeLabel,
  referencePrice,
  suiviComposition,
  typeCountLabel,
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

describe('buyer-match — LE TYPE FILTRE, IL NE PONDÈRE PAS (M50 §3)', () => {
  it('une recherche « maison » ne classe AUCUN dossier apartment, quel que soit son score', () => {
    // Un appartement qui matche prix + surface + commune + pièces (~85 pts chez le score) :
    // il ne doit PAS sortir pour une recherche « maison ».
    const parfaitApart = dossier('apart-parfait', {
      propertyType: 'Appartement',
      surfaceArea: 60,
      roomsCount: 3,
      city: 'Nice',
      commercializationPrice: 480000,
    });
    const uneMaison = dossier('maison', {
      propertyType: 'Maison',
      surfaceArea: 60,
      roomsCount: 3,
      city: 'Nice',
      commercializationPrice: 480000,
    });

    const { ranked, unclassified } = matchBuyerAgainstSuivi(
      { ...BUYER, propertyType: 'maison', surfaceArea: 60, budgetMin: 454000, budgetMax: 520000 },
      [parfaitApart, uneMaison],
    );

    // Aucun apartment dans le classement, ni dans les « à part ».
    const ids = [...ranked, ...unclassified].map((m) => m.dossier.project.id);
    expect(ids).not.toContain('apart-parfait');
    // La maison, elle, est classée.
    expect(ranked.map((m) => m.dossier.project.id)).toEqual(['maison']);
  });

  it('type demandé + dossier SANS type normalisable → mis à part, pas exclu, pas classé', () => {
    const sansType = dossier('sans-type', { propertyType: null, commercializationPrice: 350000 });
    const apart = dossier('apart', { propertyType: 'Appartement', commercializationPrice: 360000 });

    const { ranked, unclassified } = matchBuyerAgainstSuivi(BUYER, [sansType, apart]);
    expect(ranked.map((m) => m.dossier.project.id)).toEqual(['apart']);
    expect(unclassified.map((m) => m.dossier.project.id)).toEqual(['sans-type']);
  });

  it('type NON demandé (champ vide) → aucun filtre, tous les types classés', () => {
    const { ranked, unclassified } = matchBuyerAgainstSuivi({ ...BUYER, propertyType: null }, [
      dossier('apart', { propertyType: 'Appartement', commercializationPrice: 360000 }),
      dossier('maison', { propertyType: 'Maison', commercializationPrice: 360000 }),
      dossier('sans-type', { propertyType: null, commercializationPrice: 360000 }),
    ]);
    expect(ranked).toHaveLength(3);
    expect(unclassified).toHaveLength(0);
  });
});

describe('buyer-match — dire ce que le Suivi CONTIENT, pas seulement ce qui manque', () => {
  it('résume la composition du Suivi par type', () => {
    const composition = suiviComposition([
      dossier('a1', { propertyType: 'Appartement' }),
      dossier('a2', { propertyType: 'Studio' }), // studio → apartment (vocabulaire commun)
      dossier('m1', { propertyType: 'Maison' }),
      dossier('x1', { propertyType: null }),
    ]);
    expect(composition.byType).toEqual([
      { type: 'apartment', count: 2 },
      { type: 'house', count: 1 },
    ]);
    expect(composition.unclassifiedCount).toBe(1);
  });

  it('nomme les types en français (genre, pluriel)', () => {
    expect(typeCountLabel({ type: 'apartment', count: 3 })).toBe('3 appartements');
    expect(typeCountLabel({ type: 'house', count: 1 })).toBe('1 maison');
    expect(noneOfTypeLabel('house')).toBe('aucune maison');
    expect(noneOfTypeLabel('apartment')).toBe('aucun appartement');
  });

  it('une recherche « maison » sur un Suivi d’appartements rend 0 classé + la composition', () => {
    const result = matchBuyerAgainstSuivi({ ...BUYER, propertyType: 'maison' }, [
      dossier('a1', { propertyType: 'Appartement', commercializationPrice: 480000 }),
      dossier('a2', { propertyType: 'Appartement', commercializationPrice: 490000 }),
    ]);
    expect(result.requestedType).toBe('house');
    expect(result.ranked).toHaveLength(0);
    expect(result.composition.byType).toEqual([{ type: 'apartment', count: 2 }]);
  });
});

describe('buyer-match (§6.5) — la référence de prix est nommée', () => {
  it('un dossier signé prend le prix CONVENU ; sinon le prix CONSEILLÉ ; sinon rien', () => {
    expect(
      referencePrice(dossier('a', { commercializationPrice: 500000, advisorPrice: 510000 })),
    ).toEqual({ kind: 'convenu', value: 500000 });
    expect(
      referencePrice(
        dossier('b', { outcome: 'follow_up', commercializationPrice: null, advisorPrice: 510000 }),
      ),
    ).toEqual({ kind: 'conseille', value: 510000 });
    expect(
      referencePrice(dossier('c', { commercializationPrice: null, advisorPrice: null })),
    ).toEqual({ kind: null, value: null });
  });

  it('le rapprochement porte la nature du prix de référence sur chaque carte classée', () => {
    const { ranked } = matchBuyerAgainstSuivi(BUYER, [
      dossier('signe', { propertyType: 'Appartement', commercializationPrice: 380000 }),
      dossier('relance', {
        propertyType: 'Appartement',
        outcome: 'follow_up',
        advisorPrice: 390000,
      }),
    ]);
    const byId = Object.fromEntries(ranked.map((m) => [m.dossier.project.id, m]));
    expect(byId.signe.reference.kind).toBe('convenu');
    expect(byId.relance.reference.kind).toBe('conseille');
  });
});

describe('buyer-match — l’écart CHIFFRÉ lit les mêmes entrées que le score', () => {
  it('chiffre le dépassement de budget et l’écart de surface quand le score les classe dehors', () => {
    const { ranked } = matchBuyerAgainstSuivi(BUYER, [
      dossier('loin', {
        propertyType: 'Appartement',
        surfaceArea: 120,
        roomsCount: 3,
        city: 'Nice',
        commercializationPrice: 500000,
      }),
    ]);
    const details = ranked[0].weaknesses.map((w) => w.detail).filter((d): d is string => d != null);
    expect(
      details.some((d) => /100\s?000\s?€.*au-dessus du budget/.test(d.replace(/ /g, ' '))),
    ).toBe(true);
    expect(details.some((d) => /40 m² de plus que recherché/.test(d))).toBe(true);
  });

  it('ne chiffre pas un bien que le score compte dans la tolérance (pas de contradiction)', () => {
    const { ranked } = matchBuyerAgainstSuivi(BUYER, [
      dossier('proche', {
        propertyType: 'Appartement',
        surfaceArea: 80,
        roomsCount: 3,
        city: 'Nice',
        commercializationPrice: 440000,
      }),
    ]);
    const details = ranked[0].weaknesses.map((w) => w.detail ?? w.label);
    expect(details.some((d) => /budget/.test(d))).toBe(false);
  });
});
