import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeCall } from '@/test-fixtures/fake-supabase';

// Lot C — les gestes de « Son mandat », appelés tels que l'écran les appelle : un garde (membre
// actif, dossier de l'agence, conclu, mandat signé), la relecture de ce qui vient du navigateur, le
// geste à son étape (relue en base, l'offre acceptée comprise), puis l'écriture par la clé de
// service ; un appel refusé n'écrit rien.
const profile = vi.hoisted(() => ({
  current: null as null | { id: string; agency_id: string; removed_at: string | null },
}));
const service = vi.hoisted(() => ({ client: null as unknown }));

vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => profile.current }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));

const {
  addMandateAmendment,
  compromiseFell,
  endMandateWithoutSale,
  recordCompromise,
  recordSale,
  removeLastMandateAmendment,
  setMandateEnd,
} = await import('@/features/mandate-life/actions/mandate-actions');

const PROJECT = '11111111-1111-4111-8111-111111111111';
const KELLER = '22222222-2222-4222-8222-222222222222';
const ROSSI = '33333333-3333-4333-8333-333333333333';

type World = {
  status?: string;
  conclusion?: Record<string, unknown> | null;
  offers?: unknown[] | null;
  amendments?: unknown[];
  buyer?: Record<string, unknown> | null;
};

const signedConclusion = (over: Record<string, unknown> = {}) => ({
  outcome: 'signed',
  signed_at: '2026-10-28T10:00:00Z',
  concluded_at: '2026-10-28T10:00:00Z',
  commercialization_price: '1639500',
  mandate_ends_on: null,
  mandate_tacit_renewal: false,
  compromise_signed_on: null,
  deed_planned_on: null,
  sale_buyer_origin: null,
  compromise_buyer_id: null,
  deed_signed_on: null,
  sale_price: null,
  mandate_ended_on: null,
  ...over,
});

const kellerOffer = {
  id: 'doc-1',
  buyer_id: KELLER,
  fields: { projectId: PROJECT, price: 1_560_000 },
  buyers: { name: 'Famille Keller', status: 'under_offer' },
  buyer_document_acceptances: [{ decision: 'accepted', decided_at: '2026-11-20T10:00:00Z' }],
};

// Une base factice : chaque chaîne répond selon la table de son dernier `from`.
function world(state: World) {
  return fakeSupabase((calls: FakeCall[]) => {
    const from = [...calls].reverse().find((call) => call.method === 'from');
    const table = String(from?.args[0] ?? '');
    const since = calls.slice(calls.lastIndexOf(from as FakeCall));
    if (since.some((call) => ['update', 'insert', 'delete'].includes(call.method))) return {};
    switch (table) {
      case 'projects':
        return {
          data:
            state.status === undefined
              ? { id: PROJECT, status: 'meeting_completed' }
              : state.status
                ? { id: PROJECT, status: state.status }
                : null,
        };
      case 'project_meeting_conclusions':
        return { data: state.conclusion === undefined ? signedConclusion() : state.conclusion };
      case 'buyer_documents':
        return state.offers === null
          ? { error: { message: 'down' } }
          : { data: state.offers ?? [] };
      case 'mandate_price_amendments':
        return { data: state.amendments ?? [] };
      case 'buyers':
        return { data: state.buyer === undefined ? { id: ROSSI } : state.buyer };
      default:
        return {};
    }
  });
}

const updateOf = (calls: FakeCall[]) =>
  calls.find((call) => call.method === 'update')?.args[0] as Record<string, unknown> | undefined;

beforeEach(() => {
  profile.current = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
});

describe('le garde', () => {
  it('sans profil, retiré, un dossier inconnu, archivé ou pas signé : refusé, rien d’écrit', async () => {
    for (const [state, who] of [
      [{}, null],
      [{}, { id: 'advisor-1', agency_id: 'agency-a', removed_at: '2026-11-01' }],
      [{ status: '' }, undefined],
      [{ status: 'archived' }, undefined],
      [{ conclusion: signedConclusion({ outcome: 'follow_up' }) }, undefined],
    ] as const) {
      if (who !== undefined) profile.current = who;
      const fake = world(state as World);
      service.client = fake.client;
      expect((await setMandateEnd(PROJECT, { months: 3 })).ok).toBe(false);
      expect(fake.writes()).toEqual([]);
      profile.current = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
    }
  });

  it('les offres illisibles : refusé, jamais lu comme « aucune offre » (M98)', async () => {
    const fake = world({ offers: null });
    service.client = fake.client;
    expect((await setMandateEnd(PROJECT, { months: 3 })).ok).toBe(false);
    expect(fake.writes()).toEqual([]);
  });
});

describe('les gestes', () => {
  it('la fin du mandat : trois mois après la signature, la reconduction tacite gardée', async () => {
    const fake = world({});
    service.client = fake.client;
    expect(await setMandateEnd(PROJECT, { months: 3, tacit: true })).toEqual({ ok: true });
    expect(updateOf(fake.calls)).toMatchObject({
      mandate_ends_on: '2027-01-28',
      mandate_tacit_renewal: true,
    });
  });

  it('un avenant : sous le prix du mandat seulement ; posé au nom du conseiller', async () => {
    const fake = world({});
    service.client = fake.client;
    const refused = await addMandateAmendment(PROJECT, {
      amendedOn: '2026-11-14',
      price: 1_700_000,
    });
    expect(refused.ok).toBe(false);
    expect(fake.writes()).toEqual([]);
    expect(
      await addMandateAmendment(PROJECT, { amendedOn: '2026-11-14', price: 1_590_000 }),
    ).toEqual({
      ok: true,
    });
    const insert = fake.calls.find((call) => call.method === 'insert')?.args[0];
    expect(insert).toMatchObject({
      price: 1_590_000,
      created_by: 'advisor-1',
      amended_on: '2026-11-14',
    });
  });

  it('retirer le dernier avenant : celui de la date la plus récente, lui seul', async () => {
    const fake = world({
      amendments: [
        {
          id: 'a-1',
          project_id: PROJECT,
          amended_on: '2026-11-14',
          price: '1590000',
          created_at: '2026-11-14T09:00:00Z',
        },
        {
          id: 'a-2',
          project_id: PROJECT,
          amended_on: '2026-11-20',
          price: '1550000',
          created_at: '2026-11-20T09:00:00Z',
        },
      ],
    });
    service.client = fake.client;
    expect(await removeLastMandateAmendment(PROJECT)).toEqual({ ok: true });
    const deleted = fake.calls.findIndex((call) => call.method === 'delete');
    expect(fake.calls[deleted + 1]).toEqual({ method: 'eq', args: ['id', 'a-2'] });
  });

  it('le compromis de l’offre acceptée : l’acquéreur relu en base, jamais pris du navigateur', async () => {
    const fake = world({ offers: [kellerOffer] });
    service.client = fake.client;
    expect(
      await recordCompromise(PROJECT, {
        compromiseSignedOn: '2026-11-25',
        deedPlannedOn: '2027-01-15',
        buyer: 'offer',
        buyerId: ROSSI,
      }),
    ).toEqual({ ok: true });
    expect(updateOf(fake.calls)).toMatchObject({
      compromise_signed_on: '2026-11-25',
      deed_planned_on: '2027-01-15',
      sale_buyer_origin: 'agency',
      compromise_buyer_id: KELLER,
    });
  });

  it('sans offre acceptée, « l’acquéreur de l’offre » est refusé ; venu d’ailleurs, sans fiche', async () => {
    const without = world({});
    service.client = without.client;
    expect(
      (
        await recordCompromise(PROJECT, {
          compromiseSignedOn: '2026-11-25',
          deedPlannedOn: '2027-01-15',
          buyer: 'offer',
        })
      ).ok,
    ).toBe(false);
    expect(without.writes()).toEqual([]);
    const outside = world({});
    service.client = outside.client;
    expect(
      await recordCompromise(PROJECT, {
        compromiseSignedOn: '2026-11-25',
        deedPlannedOn: '2027-01-15',
        buyer: 'outside',
      }),
    ).toEqual({ ok: true });
    expect(updateOf(outside.calls)).toMatchObject({
      sale_buyer_origin: 'outside',
      compromise_buyer_id: null,
    });
  });

  it('la vente : refusée avant le compromis ; notée sous compromis', async () => {
    const before = world({});
    service.client = before.client;
    expect(
      (await recordSale(PROJECT, { deedSignedOn: '2026-11-27', salePrice: 1_560_000 })).ok,
    ).toBe(false);
    expect(before.writes()).toEqual([]);
    const under = world({
      conclusion: signedConclusion({
        compromise_signed_on: '2026-11-02',
        deed_planned_on: '2026-11-27',
        sale_buyer_origin: 'outside',
      }),
    });
    service.client = under.client;
    expect(await recordSale(PROJECT, { deedSignedOn: '2026-11-27', salePrice: 1_560_000 })).toEqual(
      { ok: true },
    );
    expect(updateOf(under.calls)).toMatchObject({
      deed_signed_on: '2026-11-27',
      sale_price: 1_560_000,
    });
  });

  it('le compromis tombé : tout le compromis se vide ensemble', async () => {
    const fake = world({
      conclusion: signedConclusion({
        compromise_signed_on: '2026-11-02',
        deed_planned_on: '2026-12-27',
        sale_buyer_origin: 'agency',
        compromise_buyer_id: KELLER,
      }),
    });
    service.client = fake.client;
    expect(await compromiseFell(PROJECT)).toEqual({ ok: true });
    expect(updateOf(fake.calls)).toMatchObject({
      compromise_signed_on: null,
      deed_planned_on: null,
      sale_buyer_origin: null,
      compromise_buyer_id: null,
    });
  });

  it('la fin sans vente : refusée quand une offre acceptée tient le mandat', async () => {
    const fake = world({ offers: [kellerOffer] });
    service.client = fake.client;
    expect((await endMandateWithoutSale(PROJECT, { endedOn: '2026-11-27' })).ok).toBe(false);
    expect(fake.writes()).toEqual([]);
  });
});
