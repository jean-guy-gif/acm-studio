import { describe, expect, it } from 'vitest';

import { buildLivePages } from '@/features/live-seller/services/build-live-pages';
import { pendingBeforeAnalysis } from '@/features/live-seller/services/pending-before-analysis';

const PERCEIVED = { seller_perceived_property_price: 750000 };
const estimated = { seller_serious_competitor: 'yes', seller_estimated_listing_price: 400000 };
const competitor = (id: string, response: Record<string, unknown> | null) => ({
  id,
  neutralLabel: `Appartement · 3 pièces · ${id}`,
  response: response as never,
});

describe('pendingBeforeAnalysis — mission 82', () => {
  it('rien à passer : prix du vendeur donné, chaque concurrent estimé ou écarté', () => {
    const comparables = [
      competitor('c1', estimated),
      competitor('c2', { seller_serious_competitor: 'no' }),
    ];
    const pages = buildLivePages({ comparables }, true);
    expect(pendingBeforeAnalysis(pages, comparables, PERCEIVED)).toEqual([]);
  });

  it('nomme le concurrent sauté par son rang et son libellé neutre, et mène à sa question', () => {
    const comparables = [
      competitor('c1', estimated),
      competitor('c2', estimated),
      competitor('c3', null),
    ];
    const pages = buildLivePages({ comparables }, true);
    const steps = pendingBeforeAnalysis(pages, comparables, PERCEIVED);
    expect(steps).toHaveLength(1);
    expect(steps[0].label).toBe('Concurrent 3 (Appartement · 3 pièces · c3)');
    expect(pages[steps[0].pageIndex]).toMatchObject({
      type: 'comparable_competition',
      comparableId: 'c3',
    });
  });

  it('un concurrent jugé sérieux mais pas encore estimé rouvre sur la devinette', () => {
    const comparables = [competitor('c1', { seller_serious_competitor: 'yes' })];
    const pages = buildLivePages({ comparables }, false);
    const [step] = pendingBeforeAnalysis(pages, comparables, PERCEIVED);
    expect(pages[step.pageIndex]).toMatchObject({ type: 'comparable_price', comparableId: 'c1' });
  });

  it('le prix du vendeur manquant est nommé en premier', () => {
    const comparables = [competitor('c1', null)];
    const pages = buildLivePages({ comparables }, true);
    const steps = pendingBeforeAnalysis(pages, comparables, null);
    expect(steps.map((step) => step.label)).toEqual([
      'Votre valeur perçue',
      'Concurrent 1 (Appartement · 3 pièces · c1)',
    ]);
    expect(pages[steps[0].pageIndex].type).toBe('seller_perceived_price');
  });
});
