import { describe, expect, it } from 'vitest';

import { buildLivePages } from '@/features/live-seller/services/build-live-pages';
import {
  hasLiveStarted,
  livePositionKey,
  liveResume,
  resumeIndexFor,
  resumeLabel,
} from '@/features/live-seller/services/live-resume';
import { maxReachableLiveIndex } from '@/features/live-seller/services/max-reachable-live-index';
import type { LiveSellerSummary } from '@/features/live-seller/types';

type Response = Record<string, unknown> | null;
const live = (summary: Record<string, unknown> | null, responses: Response[]) => ({
  sellerSummary: summary as LiveSellerSummary | null,
  comparables: responses.map((response, i) => ({ id: `c${i}`, response }) as never),
});
const typeAt = (source: ReturnType<typeof live>, index: number) => {
  const page = buildLivePages(source, true)[index];
  return `${page.type}${page.comparableId ? `:${page.comparableId}` : ''}`;
};
const FULL = {
  seller_serious_competitor: 'yes',
  seller_estimated_listing_price: 300000,
  seller_estimated_days_on_market: 90,
};

describe('hasLiveStarted', () => {
  it('un Live jamais commencé garde « Lancer le Live »', () => {
    expect(hasLiveStarted(null)).toBe(false);
    expect(hasLiveStarted(live(null, [null, null]))).toBe(false);
    expect(hasLiveStarted(live({ seller_property_comment: null }, [{}]))).toBe(false);
  });

  it('une seule réponse du vendeur suffit', () => {
    expect(hasLiveStarted(live({ seller_property_confirmed: 'yes' }, [null]))).toBe(true);
    expect(hasLiveStarted(live(null, [{ seller_serious_competitor: 'no' }]))).toBe(true);
  });
});

describe('liveResume — on reprend après la dernière réponse du vendeur', () => {
  it('jamais commencé : rien à reprendre, on part de l’introduction', () => {
    const source = live(null, [null, null]);
    const resume = liveResume(buildLivePages(source, true), source);
    expect(resume.started).toBe(false);
    expect(typeAt(source, resume.index)).toBe('intro');
  });

  it('un écran validé sans réponse n’y renvoie pas : on reprend après la dernière réponse', () => {
    // « Votre bien » et « Un sérieux concurrent ? » validés sans réponse, puis tout le premier
    // concurrent : on rouvre au 2e concurrent, pas à « Votre bien ».
    const source = live({ seller_perceived_property_price: 330000 }, [
      { seller_estimated_listing_price: 300000, seller_estimated_days_on_market: 90 },
      null,
    ]);
    const resume = liveResume(buildLivePages(source, true), source);
    expect(typeAt(source, resume.index)).toBe('comparable_competition:c1');
  });

  it('interrompu au 2e concurrent : on rouvre au 2e concurrent, à sa première question', () => {
    const source = live(
      { seller_property_confirmed: 'yes', seller_perceived_property_price: 330000 },
      [FULL, null, null],
    );
    const pages = buildLivePages(source, true);
    const resume = liveResume(pages, source);
    expect(resume.started).toBe(true);
    expect(typeAt(source, resume.index)).toBe('comparable_competition:c1');
    expect(resume.total).toBe(pages.length);
    expect(resumeLabel(resume)).toBe(`Reprendre (écran ${resume.index + 1} sur ${pages.length})`);
  });

  it('interrompu sur la devinette : on rouvre sur la devinette, jamais sur le prix', () => {
    const source = live(
      { seller_property_confirmed: 'yes', seller_perceived_property_price: 330000 },
      [FULL, { seller_serious_competitor: 'yes' }, null],
    );
    const resume = liveResume(buildLivePages(source, true), source);
    expect(typeAt(source, resume.index)).toBe('comparable_price:c1');
  });

  it('ne dépasse jamais la borne permise', () => {
    for (const source of [
      live(null, [null]),
      live({ seller_property_confirmed: 'yes' }, [FULL]),
      live({ seller_perceived_property_price: 1 }, [{ seller_serious_competitor: 'yes' }, FULL]),
      live({ seller_property_confirmed: 'yes', seller_perceived_property_price: 1 }, [FULL, FULL]),
    ]) {
      const pages = buildLivePages(source, true);
      expect(liveResume(pages, source).index).toBeLessThanOrEqual(
        maxReachableLiveIndex(pages, source),
      );
    }
  });

  it('tout répondu jusqu’au concurrent le plus dangereux : on rouvre sur le prix à reformuler', () => {
    const source = live(
      {
        seller_property_confirmed: 'yes',
        seller_perceived_property_price: 330000,
        seller_most_dangerous_comparable_id: 'c0',
      },
      [FULL],
    );
    const pages = buildLivePages(source, true);
    // Mission 94 — l'écran qui suit est celui où le vendeur reformule son prix.
    expect(typeAt(source, liveResume(pages, source).index)).toBe('seller_revised_price');
  });

  it('prix reformulé donné : on rouvre sur l’analyse des prix', () => {
    const source = live(
      {
        seller_property_confirmed: 'yes',
        seller_perceived_property_price: 350000,
        seller_most_dangerous_comparable_id: 'c0',
        seller_revised_property_price: 325000,
      },
      [FULL],
    );
    const pages = buildLivePages(source, true);
    expect(typeAt(source, liveResume(pages, source).index)).toBe('price_analysis');
  });
});

describe('la reprise ne renvoie plus en arrière (mission 89)', () => {
  it('« Votre bien » et « sérieux concurrent ? » sans réponse n’arrêtent plus la borne permise', () => {
    // Le conseiller a validé ces deux écrans sans réponse (le bouton ne l'exigeait pas), puis
    // le vendeur a deviné le prix : la borne va jusqu'à la durée, pas en arrière.
    const source = live({ seller_perceived_property_price: 330000 }, [
      { seller_estimated_listing_price: 300000 },
    ]);
    const pages = buildLivePages(source, true);
    expect(typeAt(source, maxReachableLiveIndex(pages, source))).toBe('comparable_duration:c0');
  });

  it('le prix reste hors d’atteinte tant que la devinette n’est pas enregistrée', () => {
    const source = live({ seller_perceived_property_price: 330000 }, [null]);
    const pages = buildLivePages(source, true);
    expect(typeAt(source, maxReachableLiveIndex(pages, source))).toBe('comparable_price:c0');
  });

  it('aucun concurrent n’est atteignable avant le prix du vendeur', () => {
    const source = live({ seller_property_confirmed: 'yes' }, [FULL]);
    const pages = buildLivePages(source, true);
    expect(typeAt(source, maxReachableLiveIndex(pages, source))).toBe('seller_perceived_price');
  });
});

describe('la position gardée par l’appareil', () => {
  const resume = { started: true, index: 7, total: 20 };

  it('rouvre exactement là où l’on était, si elle est plausible', () => {
    expect(resumeIndexFor(resume, '9')).toBe(9);
    expect(resumeIndexFor(resume, '3')).toBe(3);
  });

  it('retombe sur les réponses enregistrées sinon', () => {
    for (const stored of [null, '', '0', '-2', '20', '999', 'abc']) {
      expect(resumeIndexFor(resume, stored)).toBe(7);
    }
  });

  it('une clé par dossier', () => {
    expect(livePositionKey('abc')).toBe('acm-live-position:abc');
  });
});
