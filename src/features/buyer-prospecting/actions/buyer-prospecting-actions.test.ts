import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import type { ProspectingCard } from '@/features/prospecting/types';
import { fakeSupabase, type FakeCall } from '@/test-fixtures/fake-supabase';

// Mission 120 — les actions de « J'ai un acquéreur pour votre bien », appelées pour de vrai avec un
// client factice : ce qui est écrit, et ce qui ne l'est PAS quand un garde arrête.

const state = vi.hoisted(() => ({
  profile: null as null | Record<string, unknown>,
  cards: [] as unknown[],
  respond: (() => ({})) as (
    table: string,
    calls: FakeCall[],
  ) => { data?: unknown; error?: unknown },
  letter: null as unknown,
}));
const tableOf = (calls: FakeCall[]) =>
  String([...calls].reverse().find((call) => call.method === 'from')?.args[0] ?? '');
const service = fakeSupabase((calls) => state.respond(tableOf(calls), calls));
const user = fakeSupabase((calls) => state.respond(tableOf(calls), calls));

vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => state.profile }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => user.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/features/prospecting/queries/prospecting-card-store', () => ({
  getProspectingCards: async () => state.cards,
}));
vi.mock('@/features/prospecting/queries/get-oppositions', () => ({
  getOppositions: async () => ({ addresses: new Map(), listings: new Map() }),
}));
vi.mock('@/features/demo/services/is-demo-agency', () => ({ isDemoAgency: async () => false }));
vi.mock('@/features/buyer-prospecting/queries/get-buyer-letter', () => ({
  getBuyerLetter: async () => state.letter,
}));

const { prepareBuyerLetter } =
  await import('@/features/buyer-prospecting/actions/prepare-buyer-letter');
const { saveBuyerLetter } = await import('@/features/buyer-prospecting/actions/save-buyer-letter');
const { setBuyerProspectStatus } =
  await import('@/features/buyer-prospecting/actions/buyer-prospect-actions');

const VISIT = '11111111-1111-4111-8111-111111111111';
const ITEM = '22222222-2222-4222-8222-222222222222';
const URL = 'https://www.seloger.com/annonces/achat/maison/mougins-06/26ZEJMLWB13Y.htm';
const PROSPECT = '33333333-3333-4333-8333-333333333333';
const KEY = listingIdentityKey(URL);

const visit = (item: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  id: VISIT,
  buyer_id: 'buyer-1',
  buyer_selection_item_id: ITEM,
  cancelled_at: null,
  buyers: { archived_at: null },
  buyer_selection_items: { id: ITEM, snapshot: null, ...item },
  ...extra,
});

const writes = () => [...service.writes(), ...user.writes()];

beforeEach(() => {
  service.reset();
  user.reset();
  state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null, phone: '06' };
  state.cards = [];
  state.letter = null;
  state.respond = () => ({ data: null });
});

describe('préparer le courrier au propriétaire depuis une visite', () => {
  it('sans profil, une visite douteuse, annulée, ou d’une fiche archivée : rien n’est écrit', async () => {
    state.profile = null;
    expect((await prepareBuyerLetter(VISIT)).ok).toBe(false);
    state.profile = { id: 'advisor-1', agency_id: 'agency-a', removed_at: null };
    expect((await prepareBuyerLetter('pas-un-id')).ok).toBe(false);
    state.respond = (table) =>
      table === 'buyer_visit_requests'
        ? {
            data: visit(
              { source: 'listing', reference: URL, imported: { exclusivity: 'no' } },
              { cancelled_at: '2026-10-26' },
            ),
          }
        : { data: null };
    expect((await prepareBuyerLetter(VISIT)).ok).toBe(false);
    state.respond = (table) =>
      table === 'buyer_visit_requests'
        ? {
            data: visit(
              { source: 'listing', reference: URL, imported: { exclusivity: 'no' } },
              { buyers: { archived_at: '2026-10-26' } },
            ),
          }
        : { data: null };
    expect((await prepareBuyerLetter(VISIT)).ok).toBe(false);
    expect(writes()).toEqual([]);
  });

  it('un bien de l’agence ou en exclusivité ne reçoit pas de courrier au propriétaire', async () => {
    state.respond = (table) =>
      table === 'buyer_visit_requests'
        ? { data: visit({ source: 'project', reference: 'p1', imported: null }) }
        : { data: null };
    expect(await prepareBuyerLetter(VISIT)).toEqual({
      ok: false,
      error: 'Ce bien ne demande pas de courrier au propriétaire.',
    });
    state.respond = (table) =>
      table === 'buyer_visit_requests'
        ? { data: visit({ source: 'listing', reference: URL, imported: { exclusivity: 'yes' } }) }
        : { data: null };
    expect((await prepareBuyerLetter(VISIT)).ok).toBe(false);
    expect(writes()).toEqual([]);
  });

  it('une annonce du marché inconnue de l’agence : un bien démarché naît, puis son origine', async () => {
    state.respond = (table, calls) => {
      if (table === 'buyer_visit_requests')
        return {
          data: visit({
            source: 'listing',
            reference: URL,
            imported: { exclusivity: 'no', soldBy: 'agency', surfaceArea: 200, title: 'Piège' },
          }),
        };
      if (table === 'buyer_prospects')
        return calls.some((call) => call.method === 'insert')
          ? { data: { id: PROSPECT } }
          : { data: null };
      if (table === 'buyer_prospect_origins')
        return calls.some((call) => call.method === 'insert')
          ? { data: { id: 'origin-1' } }
          : { data: null };
      return { data: null };
    };
    expect(await prepareBuyerLetter(VISIT)).toEqual({
      ok: true,
      href: '/acquereurs/courrier/origin-1',
    });
    expect(writes()).toEqual(['insert buyer_prospects', 'insert buyer_prospect_origins']);
    const inserted = service.calls.filter((call) => call.method === 'insert');
    expect(inserted[0].args[0]).toMatchObject({
      agency_id: 'agency-a',
      listing_key: KEY,
      exclusivity: 'no',
      sold_by: 'agency',
    });
    expect(JSON.stringify(inserted[0].args[0])).not.toContain('Piège');
    expect(inserted[1].args[0]).toMatchObject({
      agency_id: 'agency-a',
      buyer_id: 'buyer-1',
      selection_item_id: ITEM,
      prospect_id: PROSPECT,
      letter_version: 'owner',
    });
  });

  it('un bien déjà sur une carte de concurrent (même annonce) : la carte reçoit l’origine, aucun bien démarché', async () => {
    state.cards = [
      {
        row: { id: 'comp-1', listingKey: KEY },
        copies: [{ row: { id: 'comp-1', listingKey: KEY } }],
      } as unknown as ProspectingCard,
    ];
    state.respond = (table, calls) => {
      if (table === 'buyer_visit_requests')
        return { data: visit({ source: 'listing', reference: URL, imported: null }) };
      if (table === 'buyer_prospect_origins')
        return calls.some((call) => call.method === 'insert')
          ? { data: { id: 'origin-2' } }
          : { data: null };
      return { data: null };
    };
    expect((await prepareBuyerLetter(VISIT)).ok).toBe(true);
    expect(writes()).toEqual(['insert buyer_prospect_origins']);
    expect(service.calls.find((call) => call.method === 'insert')?.args[0]).toMatchObject({
      comparable_id: 'comp-1',
    });
  });

  it('déjà préparé pour ce bien retenu : le même courrier, rien de plus', async () => {
    state.respond = (table) =>
      table === 'buyer_visit_requests'
        ? { data: visit({ source: 'listing', reference: URL, imported: { exclusivity: 'no' } }) }
        : table === 'buyer_prospect_origins'
          ? { data: { id: 'origin-3' } }
          : { data: null };
    expect(await prepareBuyerLetter(VISIT)).toEqual({
      ok: true,
      href: '/acquereurs/courrier/origin-3',
    });
    expect(writes()).toEqual([]);
  });
});

const ready = {
  status: 'ready',
  originId: 'origin-1',
  buyerId: 'buyer-1',
  agencyId: 'agency-a',
  profileId: 'advisor-1',
  buyer: { name: 'Famille Keller', budgetIdeal: 1_500_000, budgetMax: 1_650_000 },
  defaults: { title: 'T', letter: 'L', contactHook: 'C' },
  theirPhoto: { listing: [], saved: { mode: null, sourceUrl: null, path: null }, prefix: 'x/' },
};

describe('enregistrer le courrier', () => {
  it('un texte qui nomme l’acquéreur, dit son budget ou promet : refusé, rien n’est écrit', async () => {
    state.letter = ready;
    for (const letter of [
      'La famille Keller aime votre maison.',
      'Un budget de 1 650 000 €.',
      'Une offre ferme.',
    ]) {
      const result = await saveBuyerLetter('origin-1', {
        title: 'T',
        letter,
        contactHook: 'C',
        theirPhoto: { mode: 'none' },
      });
      expect(result.ok).toBe(false);
    }
    expect(writes()).toEqual([]);
  });

  it('un courrier bloqué (adresse à confirmer) ne s’enregistre pas', async () => {
    state.letter = { status: 'blocked', buyerId: 'buyer-1', blocker: 'address_unconfirmed' };
    expect(
      await saveBuyerLetter('origin-1', {
        title: '',
        letter: '',
        contactHook: '',
        theirPhoto: { mode: 'none' },
      }),
    ).toEqual({ ok: false, error: 'Adresse à confirmer avant d’envoyer' });
    expect(writes()).toEqual([]);
  });

  it('seul ce qui diffère du texte proposé est gardé ; « Sans photo »', async () => {
    state.letter = ready;
    state.respond = () => ({ data: [{ id: 'origin-1' }] });
    expect(
      await saveBuyerLetter('origin-1', {
        title: 'T',
        letter: 'Mon texte.',
        contactHook: '',
        theirPhoto: { mode: 'none' },
      }),
    ).toEqual({ ok: true });
    expect(writes()).toEqual(['update buyer_prospect_origins']);
    expect(service.calls.find((call) => call.method === 'update')?.args[0]).toMatchObject({
      letter_title: null,
      letter_body: 'Mon texte.',
      letter_contact_hook: null,
      their_photo_mode: 'none',
    });
  });
});

describe('le statut d’une carte acquéreur', () => {
  const row = (patch: Record<string, unknown> = {}) => ({
    id: PROSPECT,
    agency_id: 'agency-a',
    listing_url: URL,
    listing_key: KEY,
    facts: {},
    sold_by: 'agency',
    exclusivity: 'no',
    locator_address: '8 allée du Décor, Mougins',
    locator_confirmed: true,
    prospecting_handed_at: null,
    prospecting_meeting_at: null,
    prospecting_mandate_at: null,
    prospecting_declined_at: null,
    prospecting_collaboration_at: null,
    prospecting_collaboration_declined_at: null,
    ...patch,
  });

  it('« Marquer remis » depuis « prêt » : le fait daté, dans l’agence', async () => {
    state.respond = (table, calls) =>
      table === 'buyer_prospects'
        ? calls.some((call) => call.method === 'update')
          ? { data: [{ id: PROSPECT }] }
          : { data: row() }
        : { data: null };
    expect(await setBuyerProspectStatus(PROSPECT, 'handed')).toEqual({ ok: true });
    expect(writes()).toEqual(['update buyer_prospects']);
    const update = service.calls.find((call) => call.method === 'update')?.args[0] as Record<
      string,
      unknown
    >;
    expect(update.prospecting_handed_at).toEqual(expect.any(String));
  });

  it('un saut de cran ou un geste inconnu : refusé, rien n’est écrit', async () => {
    state.respond = (table) => (table === 'buyer_prospects' ? { data: row() } : { data: null });
    expect((await setBuyerProspectStatus(PROSPECT, 'mandate')).ok).toBe(false);
    expect((await setBuyerProspectStatus(PROSPECT, 'tout')).ok).toBe(false);
    expect(writes()).toEqual([]);
  });
});
