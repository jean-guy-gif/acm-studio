import { beforeEach, describe, expect, it, vi } from 'vitest';

import { dismissalKey } from '@/features/buyer-dismissals/services/dismissal-key';
import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 139 — « Écarter pour lui » : la clé du bien, celle de la boucle (M134), recalculée au
// serveur ; la fiche de l'agence ; la raison dans la liste ; « Annuler » juste après, et seulement
// ce que le conseiller vient d'écarter lui-même.
const BUYER = '0bbbbbbb-0000-4000-8000-000000000001';
const PROJECT = '0ccccccc-0000-4000-8000-000000000001';
const state = vi.hoisted(() => ({
  profile: { id: 'u1', agency_id: 'agency-a', removed_at: null as string | null },
  respond: (() => ({ data: null })) as (
    table: string,
    calls: { method: string; args: unknown[] }[],
  ) => { data?: unknown; error?: unknown },
}));
const service = fakeSupabase((calls) => {
  const table = [...calls].reverse().find((call) => call.method === 'from')?.args[0];
  return state.respond(String(table), calls);
});
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/app-errors/report-server-error', () => ({ reportServerError: async () => {} }));

const { dismissForBuyer, undoDismissal } =
  await import('@/features/buyer-dismissals/actions/dismiss');

describe('la clé d’un bien écarté', () => {
  it('celle de la boucle : l’identité publiée d’une annonce, un dossier, un concurrent sans annonce', () => {
    expect(dismissalKey({ source: 'project', projectId: 'p1' })).toBe('project:p1');
    expect(dismissalKey({ source: 'competitor', competitorId: 'c1', listingUrl: null })).toBe(
      'competitor:c1',
    );
    const url = 'https://www.seloger.com/annonces/achat/maison/vence-06/123456789.htm';
    const listing = dismissalKey({ source: 'listing', url });
    // Un concurrent et l'annonce du marché qui le désignent ont la même clé.
    expect(dismissalKey({ source: 'competitor', competitorId: 'c1', listingUrl: url })).toBe(
      listing,
    );
    expect(listing.startsWith('listing:')).toBe(true);
  });
});

describe('écarter pour lui', () => {
  beforeEach(() => {
    service.reset();
    state.profile.removed_at = null;
    state.respond = (table) =>
      table === 'buyers'
        ? { data: { id: BUYER } }
        : table === 'projects'
          ? { data: { id: PROJECT } }
          : { data: null };
  });

  it('un dossier de l’agence : la clé recalculée au serveur, la raison, le libellé borné', async () => {
    const result = await dismissForBuyer(
      BUYER,
      { source: 'project', reference: PROJECT },
      '  Maison · 5 pièces · 140 m² · Vence  ',
      'over_budget',
    );
    expect(result).toEqual({ ok: true, key: `project:${PROJECT}` });
    expect(service.calls.find((call) => call.method === 'insert')?.args[0]).toEqual({
      agency_id: 'agency-a',
      buyer_id: BUYER,
      property_key: `project:${PROJECT}`,
      label: 'Maison · 5 pièces · 140 m² · Vence',
      reason: 'over_budget',
      dismissed_by: 'u1',
    });
  });

  it('refusé sans rien écrire : raison hors liste, fiche d’une autre agence, cible inconnue', async () => {
    expect(
      (await dismissForBuyer(BUYER, { source: 'project', reference: PROJECT }, 'X', 'vue')).ok,
    ).toBe(false);
    state.respond = () => ({ data: null });
    expect(
      (await dismissForBuyer(BUYER, { source: 'project', reference: PROJECT }, 'X', 'sector')).ok,
    ).toBe(false);
    state.respond = (table) => (table === 'buyers' ? { data: { id: BUYER } } : { data: null });
    expect(
      (
        await dismissForBuyer(
          BUYER,
          { source: 'listing', reference: 'javascript:alert(1)' },
          'X',
          'sector',
        )
      ).ok,
    ).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('« Annuler » : seulement ce qu’il vient d’écarter lui-même, dans les 15 minutes', async () => {
    state.respond = (table) =>
      table === 'buyers'
        ? { data: { id: BUYER } }
        : table === 'buyer_dismissals'
          ? { data: [{ id: 'd1' }] }
          : { data: null };
    expect(await undoDismissal(BUYER, `project:${PROJECT}`)).toEqual({
      ok: true,
      key: `project:${PROJECT}`,
    });
    const filters = service.calls
      .filter((call) => call.method === 'eq' || call.method === 'gte')
      .map((call) => call.args[0]);
    expect(filters).toEqual(
      expect.arrayContaining(['buyer_id', 'property_key', 'dismissed_by', 'dismissed_at']),
    );
    state.respond = (table) => (table === 'buyers' ? { data: { id: BUYER } } : { data: [] });
    expect(await undoDismissal(BUYER, `project:${PROJECT}`)).toEqual({
      ok: false,
      error: 'Il est trop tard pour annuler.',
    });
  });
});
