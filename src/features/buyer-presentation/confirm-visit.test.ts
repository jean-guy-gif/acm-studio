import { beforeEach, describe, expect, it, vi } from 'vitest';

import { visitMoment } from '@/features/buyer-presentation/services/visit-moment';
import { fakeSupabase, type FakeCall, type FakeResponse } from '@/test-fixtures/fake-supabase';

// Mission 142 — « Confirmer la visite », appelé POUR DE VRAI avec un client factice (modèle de
// `sensitive-actions.test.ts`, M100) : un appel refusé n'écrit rien. Mission 147 (partie A) — le
// message reprend le lien client « Vivre ici » d'Academia du mandat, s'il est collé ; sinon, la
// sélection seule.

const state = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  visit: null as Record<string, unknown> | null,
  item: null as Record<string, unknown> | null,
  projectLink: null as string | null,
}));

function lastTable(calls: FakeCall[]): string {
  const from = [...calls].reverse().find((call) => call.method === 'from');
  return from ? String(from.args[0]) : '';
}

const service = fakeSupabase((calls): FakeResponse => {
  switch (lastTable(calls)) {
    case 'buyer_visit_requests':
      return { data: state.visit };
    case 'buyer_selection_items':
      return { data: state.item };
    case 'projects':
      return { data: { academia_living_here_url: state.projectLink } };
    default:
      return {};
  }
});

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('@/features/ideal-properties/services/ideal-selection', () => ({
  toSelectionItem: (row: unknown) => row,
}));
vi.mock('@/features/buyer-presentation/queries/load-presentation', () => ({
  presentedItems: vi.fn(async () => [{ propertyType: 'house', city: 'Mougins' }]),
}));
vi.mock('@/features/buyer-dossier/actions/dossier-links', () => ({
  createDossierLink: vi.fn(async () => ({
    ok: true,
    url: 'https://x.test/dossier/abc',
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
  visited_at: null,
  buyers: { name: 'Famille Keller', phone: null, email: null, language: 'fr', archived_at: null },
};
const mandateItem = {
  id: 'i1',
  selection_id: 's1',
  source: 'project',
  reference: 'p1',
  removed_at: null,
};

// Demain, à Paris.
const tomorrow = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(
    new Date(Date.now() + 86_400_000),
  );

beforeEach(() => {
  service.reset();
  state.profile = advisor;
  state.visit = liveVisit;
  state.item = mandateItem;
  state.projectLink = null;
});

describe('« Confirmer la visite »', () => {
  it('refusé sans session, à un membre retiré, sur un identifiant douteux, une visite annulée ou d’un acquéreur archivé', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    state.profile = null;
    expect((await confirmVisit(VISIT, tomorrow(), '10:00')).ok).toBe(false);
    state.profile = { ...advisor, removed_at: '2026-10-01T00:00:00Z' };
    expect((await confirmVisit(VISIT, tomorrow(), '10:00')).ok).toBe(false);
    state.profile = advisor;
    expect((await confirmVisit('pas-un-uuid', tomorrow(), '10:00')).ok).toBe(false);
    state.visit = { ...liveVisit, cancelled_at: '2026-11-01T00:00:00Z' };
    expect((await confirmVisit(VISIT, tomorrow(), '10:00')).ok).toBe(false);
    state.visit = {
      ...liveVisit,
      buyers: { ...liveVisit.buyers, archived_at: '2026-11-01T00:00:00Z' },
    };
    expect((await confirmVisit(VISIT, tomorrow(), '10:00')).ok).toBe(false);
    expect(service.writes()).toEqual([]);
  });

  it('un jour mal saisi n’écrit rien', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    expect(await confirmVisit(VISIT, '14/11', '10:00')).toEqual({
      ok: false,
      error: 'Indiquez le jour et l’heure de la visite.',
    });
    expect(service.writes()).toEqual([]);
  });

  it('sans lien collé sur le mandat : la sélection seule', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    const result = await confirmVisit(VISIT, tomorrow(), '10:30');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.message).toContain('Votre sélection : https://x.test/dossier/abc');
    expect(result.message).not.toContain('Vivre ici');
    expect(result.message).not.toContain('ce qui l’entoure');
    expect(service.writes()).toEqual(['update buyer_visit_requests']);
  });

  it('avec le lien collé sur le mandat : « Vivre ici, autour du bien », en français et en anglais', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    state.projectLink = 'https://app.myacademia.ai/l/v3k9-2mq7.8f2c1a9e4b7d';
    const fr = await confirmVisit(VISIT, tomorrow(), '10:30');
    expect(fr.ok && fr.message).toContain(
      'Vivre ici, autour du bien : https://app.myacademia.ai/l/v3k9-2mq7.8f2c1a9e4b7d',
    );
    state.visit = { ...liveVisit, buyers: { ...liveVisit.buyers, language: 'en' } };
    const en = await confirmVisit(VISIT, tomorrow(), '10:30');
    expect(en.ok && en.message).toContain(
      'Living here, around the property: https://app.myacademia.ai/l/v3k9-2mq7.8f2c1a9e4b7d',
    );
    expect(en.ok && en.message).toContain('Your selection: https://x.test/dossier/abc');
  });

  it('un lien d’un autre site en base ne part jamais ; une annonce du marché n’a pas de lien', async () => {
    const { confirmVisit } = await import('@/features/buyer-presentation/actions/confirm-visit');
    state.projectLink = 'https://evil.test/l/x';
    const strange = await confirmVisit(VISIT, tomorrow(), '10:30');
    expect(strange.ok && strange.message).not.toContain('evil.test');
    state.projectLink = 'https://app.myacademia.ai/l/abc';
    state.item = { ...mandateItem, source: 'listing', reference: 'seloger:1' };
    service.reset();
    const listing = await confirmVisit(VISIT, tomorrow(), '10:30');
    expect(listing.ok && listing.message).not.toContain('myacademia');
    expect(
      service.calls.some((call) => call.method === 'from' && call.args[0] === 'projects'),
    ).toBe(false);
  });
});

describe('le jour de la visite', () => {
  const now = new Date('2026-11-07T10:00:00Z');
  it('saisi à Paris, dit dans sa langue ; jamais dans le passé ni à plus d’un an', () => {
    const moment = visitMoment('2026-11-14', '10:30', now);
    expect(moment.ok).toBe(true);
    if (!moment.ok) return;
    expect(moment.at).toBe('2026-11-14T09:30:00.000Z');
    expect(moment.day('fr')).toBe('samedi 14 novembre');
    expect(moment.time('fr')).toBe('10 h 30');
    expect(moment.day('en')).toBe('Saturday 14 November');
    expect(moment.time('en')).toBe('10:30 am');
    expect(visitMoment('2026-11-01', '10:30', now).ok).toBe(false);
    expect(visitMoment('2028-11-14', '10:30', now).ok).toBe(false);
    expect(visitMoment('2026-02-30', '10:30', now).ok).toBe(false);
    expect(visitMoment('2026-11-14', '25:00', now).ok).toBe(false);
  });
});
