import { describe, expect, it } from 'vitest';

import fixture from '@/features/competitor-search/__fixtures__/stream-estate-nice-4p-proximite.json';
import { batchDecisions } from '@/features/competitor-search/services/batch-decisions';
import { learnFromDecisions } from '@/features/competitor-search/services/learn-from-decisions';
import { splitVisible } from '@/features/competitor-search/services/proximity';
import { rankCandidates } from '@/features/competitor-search/services/rank-candidates';
import { parseStreamEstateResponse } from '@/features/competitor-search/services/stream-estate';
import {
  STREAM_ESTATE_LABEL,
  STREAM_ESTATE_SOURCE,
  type CompetitorSearchCriteria,
} from '@/features/competitor-search/types';

// L'apprentissage ne reçoit d'une validation en lot que ce que le conseiller a RETENU. Une annonce
// non cochée — montrée ou derrière « Voir les N autres » — n'est ni retenue ni écartée.

const CRITERIA: CompetitorSearchCriteria = {
  city: 'Nice',
  postalCode: '06000',
  propertyType: 'apartment',
  district: null,
  surfaceArea: 80,
  roomsCount: 4,
  advisorPriceMin: 400000,
  advisorPriceMax: 480000,
};

// Ce test porte sur la validation en lot, pas sur le neuf : les biens neufs de la réponse y sont
// traités comme de l'ancien, pour garder plus de 10 annonces classées (« Voir les N autres »).
const candidates = parseStreamEstateResponse(
  fixture,
  new Date('2026-10-05T13:16:18Z'),
)!.candidates.map((candidate) => ({ ...candidate, isNewBuild: false }));

const ranked = rankCandidates(
  CRITERIA,
  [
    {
      portal: STREAM_ESTATE_SOURCE,
      label: STREAM_ESTATE_LABEL,
      searchUrl: '',
      status: 'ok',
      message: null,
      candidates,
    },
  ],
  learnFromDecisions([]),
).ranked;

describe('validation en lot : seules les retenues sont enregistrées', () => {
  it('les 5 cochés d’office importés → 5 « retenues », aucune « écartée »', () => {
    const { preselected, shown, others } = splitVisible(ranked);
    expect(others.length).toBeGreaterThan(0);
    const decisions = batchDecisions(preselected);
    expect(decisions).toHaveLength(5);
    expect(decisions.every((d) => d.decision === 'accepted')).toBe(true);
    // Les n° 6 à 10 (montrés, non cochés) et les cachés n'apparaissent nulle part.
    const recorded = new Set(decisions.map((d) => d.url));
    for (const entry of [...shown.slice(5), ...others]) {
      expect(recorded.has(entry.candidate.url)).toBe(false);
    }
  });

  it('une validation ne produit JAMAIS un refus implicite', () => {
    expect(batchDecisions(ranked).some((d) => d.decision === 'rejected')).toBe(false);
    expect(batchDecisions([])).toEqual([]);
  });

  it('l’apprentissage ne voit donc aucun refus après un lot sans « Écarter avec un motif »', () => {
    const decisions = batchDecisions(splitVisible(ranked).preselected).map((d) => ({
      listingUrl: d.url,
      listingHost: new URL(d.url).hostname,
      decision: d.decision,
      reason: null,
      price: d.price,
      surfaceArea: d.surfaceArea,
      district: null,
      propertyType: d.propertyType,
    }));
    const prefs = learnFromDecisions(decisions);
    const unseen = splitVisible(ranked).others[0];
    const rerank = rankCandidates(
      CRITERIA,
      [
        {
          portal: STREAM_ESTATE_SOURCE,
          label: STREAM_ESTATE_LABEL,
          searchUrl: '',
          status: 'ok',
          message: null,
          candidates: [unseen.candidate],
        },
      ],
      prefs,
    ).ranked;
    // L'annonce restée cachée revient neuve, non « déjà écartée ».
    expect(rerank[0].alreadyJudged).toBeNull();
  });
});
