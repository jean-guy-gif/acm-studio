import { describe, expect, it } from 'vitest';

import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import type { BuyerCriteria } from '@/features/meeting-conclusion/services/buyer-match';
import {
  buyerCandidates,
  reconcileBuyer,
} from '@/features/meeting-conclusion/services/buyer-reconciliation';
import type { ConclusionOutcome } from '@/features/meeting-conclusion/types';
import type { ProspectingEntry } from '@/features/prospecting/types';

type DossierInput = {
  outcome: ConclusionOutcome;
  type?: string | null;
  rooms?: number | null;
  surface?: number | null;
  city?: string | null;
  price?: number | null;
  advisorPrice?: number | null;
  phone?: string | null;
};

function dossier(id: string, o: DossierInput): SuiviDossier {
  return {
    project: { id, seller_name: id, seller_phone: o.phone ?? null } as SuiviDossier['project'],
    property: {
      propertyType: o.type === undefined ? 'Appartement' : o.type,
      roomsCount: o.rooms === undefined ? 3 : o.rooms,
      surfaceArea: o.surface === undefined ? 65 : o.surface,
      city: o.city === undefined ? 'Antibes' : o.city,
    },
    conclusion: {
      marketComputed: null,
      advisorAnalysis: null,
      advisorPrice: o.advisorPrice ?? null,
      commercializationPrice: o.price === undefined ? 320000 : o.price,
      sellerPerceivedPrice: null,
      launchReadinessFirst: null,
      launchReadinessLast: null,
      launchReadinessMissing: null,
      outcome: o.outcome,
      followUpReason: null,
      concludedAt: null,
      outcomeChangedAt: null,
    },
  };
}

type CompetitorInput = {
  type?: string | null;
  rooms?: number | null;
  surface?: number | null;
  city?: string | null;
  price?: number | null;
  address?: string | null;
  step?: 'colleague' | 'owner' | 'check';
  listingUrl?: string | null;
};

function competitor(id: string, sellerId: string, o: CompetitorInput = {}): ProspectingEntry {
  return {
    seller: { projectId: sellerId, name: `Vendeur ${sellerId}`, label: null },
    row: {
      id,
      address: o.address === undefined ? `${id} rue des Pins, Antibes` : o.address,
      propertyType: o.type === undefined ? 'Appartement' : o.type,
      roomsCount: o.rooms === undefined ? 3 : o.rooms,
      surfaceArea: o.surface === undefined ? 64 : o.surface,
      city: o.city === undefined ? 'Antibes' : o.city,
      price: o.price === undefined ? 329000 : o.price,
      step: o.step ?? 'owner',
      listingUrl: o.listingUrl ?? null,
    } as ProspectingEntry['row'],
  };
}

const BUYER: BuyerCriteria = {
  propertyType: 'Appartement',
  roomsCount: 3,
  surfaceArea: 60,
  budgetMin: 280000,
  budgetMax: 340000,
  city: 'Antibes, Juan-les-Pins',
};

const keys = (hits: { candidate: { key: string } }[]) => hits.map((hit) => hit.candidate.key);

describe('buyerCandidates — les trois listes', () => {
  it('range les mandats signés, les vendeurs à relancer et les concurrents à prospecter', () => {
    const candidates = buyerCandidates(
      [
        dossier('signe', { outcome: 'signed' }),
        dossier('relance', { outcome: 'follow_up', phone: ' 06 12 34 56 78 ' }),
      ],
      [competitor('c1', 'signe', { step: 'colleague', listingUrl: 'https://portail.test/1' })],
    );
    expect(candidates.map((candidate) => [candidate.key, candidate.group])).toEqual([
      ['dossier:signe', 'mandate'],
      ['dossier:relance', 'follow_up'],
      ['competitor:c1', 'competitor'],
    ]);
    expect(candidates[1].sellerPhone).toBe('06 12 34 56 78');
  });

  it('laisse de côté les dossiers vendus ailleurs ou retirés', () => {
    const candidates = buyerCandidates(
      [
        dossier('parti', { outcome: 'sold_elsewhere' }),
        dossier('retire', { outcome: 'withdrawn' }),
      ],
      [],
    );
    expect(candidates).toEqual([]);
  });

  it('un concurrent rappelle son bien vendeur, et son prix est celui de l’annonce', () => {
    const [candidate] = buyerCandidates([], [competitor('c1', 'signe', { price: 315000 })]);
    expect(candidate).toMatchObject({
      projectId: 'signe',
      sellerName: 'Vendeur signe',
      price: 315000,
      title: 'c1 rue des Pins, Antibes',
    });
  });

  it('un mandat prend le prix convenu, sinon le prix conseillé (M54)', () => {
    const [convenu, conseille, aucun] = buyerCandidates(
      [
        dossier('a', { outcome: 'signed', price: 320000, advisorPrice: 300000 }),
        dossier('b', { outcome: 'follow_up', price: null, advisorPrice: 300000 }),
        dossier('c', { outcome: 'follow_up', price: null }),
      ],
      [],
    );
    expect(convenu.price).toBe(320000);
    expect(conseille.price).toBe(300000);
    expect(aucun.price).toBeNull();
  });
});

describe('reconcileBuyer — trois groupes, puis « proches mais hors critères »', () => {
  const candidates = buyerCandidates(
    [
      dossier('mandat', { outcome: 'signed' }),
      dossier('relance', {
        outcome: 'follow_up',
        city: 'Juan-les-Pins',
        surface: 62,
        price: 335000,
      }),
      dossier('trop-cher', { outcome: 'follow_up', price: 360000 }),
      dossier('maison', { outcome: 'signed', type: 'Maison' }),
      dossier('sans-type', { outcome: 'signed', type: null }),
    ],
    [
      competitor('proprio', 'mandat', { step: 'owner' }),
      competitor('confrere', 'mandat', { step: 'colleague', surface: 58, price: 315000 }),
      competitor('petit', 'mandat', { surface: 50 }),
    ],
  );
  const result = reconcileBuyer(BUYER, candidates);

  it('range ce qui correspond dans son groupe', () => {
    expect(keys(result.matches.mandate)).toEqual(['dossier:mandat']);
    expect(keys(result.matches.follow_up)).toEqual(['dossier:relance']);
    expect(keys(result.matches.competitor).sort()).toEqual([
      'competitor:confrere',
      'competitor:proprio',
    ]);
    expect(result.matchCount).toBe(4);
  });

  it('garde les biens du bon type mais hors règles, avec leur écart chiffré', () => {
    expect(keys(result.near).sort()).toEqual(['competitor:petit', 'dossier:trop-cher']);
    const tooExpensive = result.near.find((hit) => hit.candidate.key === 'dossier:trop-cher');
    expect(tooExpensive?.gaps.map((gap) => gap.replace(/[  ]/g, ' '))).toEqual([
      '20 000 € au-dessus du budget',
    ]);
  });

  it('le type filtre : une maison ne sort nulle part pour un acheteur d’appartement', () => {
    const everywhere = [
      ...result.matches.mandate,
      ...result.matches.follow_up,
      ...result.matches.competitor,
      ...result.near,
      ...result.unclassified,
    ];
    expect(keys(everywhere)).not.toContain('dossier:maison');
  });

  it('met à part un bien sans type, jamais mêlé aux autres', () => {
    expect(keys(result.unclassified)).toEqual(['dossier:sans-type']);
  });

  it('dit ce que les trois listes contiennent, concurrents compris', () => {
    expect(result.composition).toEqual({
      byType: [
        { type: 'apartment', count: 6 },
        { type: 'house', count: 1 },
      ],
      unclassifiedCount: 1,
    });
  });

  it('sans type demandé, rien n’est filtré ni mis à part', () => {
    const open = reconcileBuyer({ ...BUYER, propertyType: null }, candidates);
    expect(open.unclassified).toEqual([]);
    expect(keys([...open.matches.mandate, ...open.near])).toContain('dossier:maison');
  });

  it('classe un groupe par le score de M54 : le plus proche d’abord', () => {
    const ranked = reconcileBuyer(
      BUYER,
      buyerCandidates(
        [],
        [
          competitor('grand', 'mandat', { surface: 120, rooms: 6 }),
          competitor('pile', 'mandat', { surface: 60, rooms: 3 }),
        ],
      ),
    );
    expect(keys(ranked.matches.competitor)).toEqual(['competitor:pile', 'competitor:grand']);
  });

  it('une recherche sans aucun bien du type demandé garde la composition pour le dire', () => {
    const none = reconcileBuyer({ ...BUYER, propertyType: 'Terrain' }, candidates);
    expect(none.matchCount).toBe(0);
    expect(none.near).toEqual([]);
    expect(none.requestedType).toBe('land');
    expect(none.composition.byType.some((entry) => entry.type === 'land')).toBe(false);
  });
});
