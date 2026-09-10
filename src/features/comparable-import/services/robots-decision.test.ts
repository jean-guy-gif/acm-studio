import { describe, expect, it } from 'vitest';

import { decideRobotsAllowed } from '@/features/comparable-import/services/robots-decision';

describe('decideRobotsAllowed', () => {
  it('obeys a 200 robots.txt that forbids our bot', () => {
    const source = {
      ok: true as const,
      status: 200,
      text: 'User-agent: acmstudiobot\nDisallow: /annonces/',
    };
    expect(decideRobotsAllowed(source, '/annonces/123')).toBe(false);
    expect(decideRobotsAllowed(source, '/recherche/nice')).toBe(true);
  });

  it('fail-OPENS on a genuine 404 / 410 (no robots.txt — the protocol default)', () => {
    expect(decideRobotsAllowed({ ok: true, status: 404, text: '' }, '/annonces/1')).toBe(true);
    expect(decideRobotsAllowed({ ok: true, status: 410, text: '' }, '/annonces/1')).toBe(true);
  });

  it('does NOT conclude allowed on a refusal (403 / 429 / 5xx) — a block is not an absence', () => {
    expect(decideRobotsAllowed({ ok: true, status: 403, text: '' }, '/annonces/1')).toBe(false);
    expect(decideRobotsAllowed({ ok: true, status: 429, text: '' }, '/annonces/1')).toBe(false);
    expect(decideRobotsAllowed({ ok: true, status: 503, text: '' }, '/annonces/1')).toBe(false);
  });

  it('does NOT conclude allowed when the read itself failed', () => {
    expect(decideRobotsAllowed({ ok: false }, '/annonces/1')).toBe(false);
  });
});
