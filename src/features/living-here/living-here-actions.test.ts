import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeResponse } from '@/test-fixtures/fake-supabase';

// Mission 142 — « Construire Vivre ici » et « Confirmer la visite », appelés POUR DE VRAI avec un
// client factice (modèle de `sensitive-actions.test.ts`, M100) : un appel refusé n'écrit rien.

const state = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  visit: null as Record<string, unknown> | null,
}));
const service = fakeSupabase((): FakeResponse => ({ data: state.visit }));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('@/features/living-here/services/build-for-item', () => ({
  buildLivingHereForItem: vi.fn(async () => ({ ok: true, propertyKey: 'listing:x:1' })),
}));
vi.mock('@/features/buyer-dossier/actions/dossier-links', () => ({
  createDossierLink: vi.fn(async () => ({
    ok: true,
    url: 'https://x.test/d',
    linkId: 'l',
    expiresAt: 'e',
  })),
}));

const AGENCY = '11111111-1111-4111-8111-111111111111';
const VISIT = '44444444-4444-4444-8444-444444444444';
const advisor = { id: 'u-advisor', agency_id: AGENCY, removed_at: null, first_name: 'Camille' };
const liveVisit = {
  id: VISIT,
  buyer_id: 'b1',
  buyer_selection_item_id: 'i1',
  cancelled_at: null,
  buyers: {
    name: 'Mr and Mrs Wilson',
    phone: null,
    email: null,
    language: 'en',
    archived_at: null,
  },
};

beforeEach(() => {
  service.reset();
  state.profile = advisor;
  state.visit = liveVisit;
});

describe('« Vivre ici » sur Visites', () => {
  it('refusé sans session, à un membre retiré, sur un identifiant douteux, une visite annulée ou d’un acquéreur archivé', async () => {
    const { buildLivingHereForVisit, confirmVisit } =
      await import('@/features/living-here/actions/living-here-actions');
    const { buildLivingHereForItem } =
      await import('@/features/living-here/services/build-for-item');
    state.profile = null;
    expect((await buildLivingHereForVisit(VISIT)).ok).toBe(false);
    state.profile = { ...advisor, removed_at: '2026-10-01T00:00:00Z' };
    expect((await confirmVisit(VISIT, '2099-01-01', '10:00')).ok).toBe(false);
    state.profile = advisor;
    expect((await buildLivingHereForVisit('pas-un-uuid')).ok).toBe(false);
    state.visit = { ...liveVisit, cancelled_at: '2026-11-01T00:00:00Z' };
    expect((await buildLivingHereForVisit(VISIT)).ok).toBe(false);
    state.visit = {
      ...liveVisit,
      buyers: { ...liveVisit.buyers, archived_at: '2026-11-01T00:00:00Z' },
    };
    expect((await confirmVisit(VISIT, '2099-01-01', '10:00')).ok).toBe(false);
    expect(service.writes()).toEqual([]);
    expect(buildLivingHereForItem).not.toHaveBeenCalled();
  });

  it('« Construire » passe par le service de l’agence ; un jour mal saisi n’écrit rien', async () => {
    const { buildLivingHereForVisit, confirmVisit } =
      await import('@/features/living-here/actions/living-here-actions');
    const { buildLivingHereForItem } =
      await import('@/features/living-here/services/build-for-item');
    expect(await buildLivingHereForVisit(VISIT)).toEqual({ ok: true });
    expect(buildLivingHereForItem).toHaveBeenCalledWith({
      agencyId: AGENCY,
      itemId: 'i1',
      builtBy: 'u-advisor',
    });
    service.reset();
    expect(await confirmVisit(VISIT, '14/11', '10:00')).toEqual({
      ok: false,
      error: 'Indiquez le jour et l’heure de la visite.',
    });
    expect(service.writes()).toEqual([]);
  });
});
