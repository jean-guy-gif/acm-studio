import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeResponse } from '@/test-fixtures/fake-supabase';

// Mission 128 B — la Vue d'ensemble ne relance la veille du Localisateur (M75) que s'il reste une
// adresse à demander parmi les concurrents retenus ; une lecture en échec la laisse partir.
const state: { profile: { agency_id: string } | null; response: FakeResponse } = {
  profile: { agency_id: 'agence-1' },
  response: {},
};
const server = fakeSupabase(() => state.response);
vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => server.client }));

const { hasSelectedCompetitorsToLocate } =
  await import('@/features/competitor-locator/queries/has-competitors-to-locate');

const row = (over: Record<string, unknown>) => ({
  listing_url: 'https://www.seloger.com/annonces/achat/maison/vence/1.htm',
  locator_state: null,
  locator_confirmed: false,
  locator_purged_at: null,
  ...over,
});

describe('reste-t-il une adresse à demander au Localisateur ?', () => {
  beforeEach(() => {
    server.reset();
    state.profile = { agency_id: 'agence-1' };
    state.response = {};
  });

  it('oui : une adresse non confirmée, ou en cours d’analyse', async () => {
    state.response = { data: [row({ locator_confirmed: true }), row({})] };
    expect(await hasSelectedCompetitorsToLocate('dossier-1')).toBe(true);
    state.response = { data: [row({ locator_state: 'en-cours' })] };
    expect(await hasSelectedCompetitorsToLocate('dossier-1')).toBe(true);
  });

  it('non : tout est confirmé, purgé ou sans annonce', async () => {
    state.response = {
      data: [
        row({ locator_confirmed: true }),
        row({ locator_purged_at: '2026-01-01T00:00:00Z' }),
        row({ listing_url: null }),
      ],
    };
    expect(await hasSelectedCompetitorsToLocate('dossier-1')).toBe(false);
    state.response = { data: [] };
    expect(await hasSelectedCompetitorsToLocate('dossier-1')).toBe(false);
  });

  it('une lecture en échec laisse partir la veille, comme avant', async () => {
    state.response = { data: null, error: { message: 'panne' } };
    expect(await hasSelectedCompetitorsToLocate('dossier-1')).toBe(true);
  });

  it('cadrée sur les retenus du dossier et l’agence de l’appelant ; sans profil, rien', async () => {
    state.response = { data: [] };
    await hasSelectedCompetitorsToLocate('dossier-1');
    const eqs = server.calls.filter((call) => call.method === 'eq').map((call) => call.args);
    expect(eqs).toEqual([
      ['project_id', 'dossier-1'],
      ['agency_id', 'agence-1'],
      ['is_selected', true],
    ]);
    expect(server.writes()).toEqual([]);
    state.profile = null;
    expect(await hasSelectedCompetitorsToLocate('dossier-1')).toBe(false);
  });

  it('la veille coupée ne lance ni passe ni écoute du retour sur l’onglet, et repart à vrai', () => {
    const hook = readFileSync('src/features/competitor-locator/use-competitor-locator.ts', 'utf8');
    const effect = hook.slice(hook.indexOf('useEffect(() => {'));
    expect(effect.indexOf('if (!enabled) {')).toBeGreaterThan(-1);
    expect(effect.indexOf('if (!enabled) {')).toBeLessThan(effect.indexOf('createLocationWatch'));
    expect(effect.indexOf('if (!enabled) {')).toBeLessThan(
      effect.indexOf("addEventListener('visibilitychange'"),
    );
    expect(effect).toMatch(/\[projectId, router, refreshOnChange, demo, enabled\]/);
  });
});
