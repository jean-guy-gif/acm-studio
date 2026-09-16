import { describe, expect, it } from 'vitest';

import { decideRobotsAllowed } from '@/features/comparable-import/services/robots-decision';

describe('decideRobotsAllowed (RFC 9309 §2.3.1)', () => {
  it('obeys a 200 robots.txt that forbids our bot', () => {
    const source = {
      ok: true as const,
      status: 200,
      text: 'User-agent: acmstudiobot\nDisallow: /annonces/',
    };
    expect(decideRobotsAllowed(source, '/annonces/123')).toBe(false);
    expect(decideRobotsAllowed(source, '/recherche/nice')).toBe(true);
  });

  it('4xx = « indisponible » → autorisé (401, 403, 404, 410)', () => {
    // 403 is the case that motivated this: Maisons et Appartements answers 403 to
    // robots.txt, which must NOT block the portal (RFC 9309 §2.3.1 "Unavailable").
    for (const status of [401, 403, 404, 410]) {
      expect(decideRobotsAllowed({ ok: true, status, text: '' }, '/ads/4534734')).toBe(true);
    }
  });

  it('429 = « ralentis » (Too Many Requests), pas une indisponibilité → refusé', () => {
    expect(decideRobotsAllowed({ ok: true, status: 429, text: '' }, '/ads/4534734')).toBe(false);
  });

  it('5xx = « inatteignable » → refusé (500, 503)', () => {
    expect(decideRobotsAllowed({ ok: true, status: 500, text: '' }, '/ads/4534734')).toBe(false);
    expect(decideRobotsAllowed({ ok: true, status: 503, text: '' }, '/ads/4534734')).toBe(false);
  });

  it('échec de lecture (pas de statut) → refusé', () => {
    expect(decideRobotsAllowed({ ok: false }, '/ads/4534734')).toBe(false);
  });
});
