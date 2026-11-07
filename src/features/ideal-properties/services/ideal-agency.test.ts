import { describe, expect, it } from 'vitest';

import { idealAgencyCandidates } from '@/features/ideal-properties/services/ideal-agency';
import type { BuyerCandidate } from '@/features/meeting-conclusion/services/buyer-reconciliation';

// Mission 145 (partie A) — « Ce que l'agence a déjà », dans les biens idéaux : un mandat signé sans
// offre acceptée et les concurrents à prospecter ; jamais un vendeur à relancer.
const candidate = (group: BuyerCandidate['group'], projectId: string): BuyerCandidate => ({
  key: `${group}:${projectId}`,
  group,
  title: projectId,
  propertyType: 'house',
  roomsCount: 5,
  surfaceArea: 135,
  city: 'Vence',
  price: 713_000,
  projectId,
  sellerName: projectId,
  sellerPhone: null,
  step: null,
  listingUrl: null,
});

describe('les biens de l’agence que proposent les biens idéaux', () => {
  it('le vendeur à relancer et le mandat sous offre acceptée sortent ; le reste demeure', () => {
    const kept = idealAgencyCandidates(
      [
        candidate('mandate', 'p-lopez'),
        candidate('mandate', 'p-mougins'),
        candidate('follow_up', 'p-lambert-duval'),
        candidate('competitor', 'p-lefebvre'),
      ],
      new Set(['p-mougins']),
    );
    expect(kept.map((entry) => entry.key)).toEqual(['mandate:p-lopez', 'competitor:p-lefebvre']);
  });
});
