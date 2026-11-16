import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LoopContacts, LoopProperty } from '@/features/buyers/services/loop-properties';
import type { Buyer } from '@/features/buyers/types';
import { fakeSupabase, type FakeCall } from '@/test-fixtures/fake-supabase';

// Mission 134 — préparer le lien d'un acquéreur (ce bien en tête de sa sélection) et noter l'envoi.
// Le bien et l'acquéreur sont relus au serveur ; un appel refusé n'écrit rien.
const profile = vi.hoisted(() => ({
  current: null as null | { id: string; agency_id: string; removed_at: string | null },
}));
const service = vi.hoisted(() => ({ client: null as unknown }));
const catalog = vi.hoisted(() => ({
  items: [] as LoopProperty[],
  contacts: { proposals: new Map() } as LoopContacts,
  failed: false,
}));
const agency = vi.hoisted(() => ({ buyers: [] as Buyer[], failed: false }));

vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => profile.current }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/features/buyers/queries/get-loop-properties', () => ({
  loadLoopCatalog: async () => catalog,
}));
vi.mock('@/features/buyers/queries/get-property-buyers', () => ({
  loadAgencyBuyers: async () => ({ ...agency, progress: new Map() }),
}));
vi.mock('@/features/buyer-dossier/actions/dossier-links', () => ({
  createDossierLink: async () => ({
    ok: true,
    url: 'https://acm/dossier/t',
    linkId: 'l',
    expiresAt: '',
  }),
}));

const { prepareProposalLink, recordProposal } = await import('@/features/buyers/actions/proposals');

const BUYER = '22222222-2222-4222-8222-222222222222';
const ITEM_ID = '33333333-3333-4333-8333-333333333333';
const KEY = 'listing:seloger:123';
const now = new Date();
const iso = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

const bien = (over: Partial<LoopProperty> = {}): LoopProperty => ({
  key: KEY,
  source: 'competitor',
  reference: 'c1',
  projectId: 'p1',
  sellerName: 'M. et Mme Bernard',
  origin: 'competitor',
  label: 'Maison · 5 pièces · 140 m² · Vence',
  property: {
    propertyType: 'house',
    roomsCount: 5,
    surfaceArea: 140,
    city: 'Vence',
    bedroomsCount: 4,
    floor: null,
    hasElevator: null,
    hasPool: true,
    outdoorSpaces: [],
    parkingTypes: [],
    energyRating: null,
    generalCondition: null,
  },
  price: 779_000,
  bornAt: iso(1),
  selectionRefs: ['competitor:c1'],
  originBuyerIds: [],
  ...over,
});

const theBuyer = {
  language: 'fr' as const,
  id: BUYER,
  agencyId: 'agency-a',
  advisorId: 'u1',
  createdAt: iso(20),
  updatedAt: iso(1),
  archivedAt: null,
  status: 'searching',
  statusChangedAt: iso(20),
  demo: false,
  ignoredSuggestions: [],
  financing: 'validated',
  financingChangedAt: iso(5),
  contactedAt: iso(2),
  condominiumAccepted: null,
  condominiumMustHave: false,
  softCriteria: [],
  fieldsToVerify: [],
  name: 'M. et Mme Lambert',
  phone: null,
  email: null,
  purpose: null,
  timeline: null,
  notes: null,
  propertyTypes: ['house'],
  cities: ['Vence'],
  budgetIdeal: null,
  budgetMax: 790_000,
  roomsMin: 4,
  bedroomsMin: null,
  surfaceMin: 110,
  outdoor: null,
  parking: null,
  pool: null,
  floorMin: null,
  elevator: null,
  energyRatingMax: null,
  worksAccepted: null,
  mustHave: [],
  dealBreakers: null,
} as Buyer;

const tableOf = (calls: FakeCall[]): string =>
  String([...calls].reverse().find((call) => call.method === 'from')?.args[0] ?? '');
let fake: ReturnType<typeof fakeSupabase>;
const answers: Record<string, unknown> = {};

beforeEach(() => {
  profile.current = { id: 'u1', agency_id: 'agency-a', removed_at: null };
  for (const key of Object.keys(answers)) delete answers[key];
  fake = fakeSupabase((calls) => ({ data: answers[tableOf(calls)] ?? null }));
  service.client = fake.client;
  catalog.items = [bien()];
  catalog.failed = false;
  agency.buyers = [theBuyer];
  agency.failed = false;
});

describe('« Envoyé, suivant »', () => {
  it('note le bien proposé à cet acquéreur, une fois (l’heure est celle de la base)', async () => {
    answers.buyer_proposals = { sent_at: iso(0) };
    expect(await recordProposal(BUYER, KEY, ITEM_ID)).toEqual({ ok: true, sentAt: iso(0) });
    expect(fake.writes()).toEqual(['upsert buyer_proposals']);
    const upsert = fake.calls.find((call) => call.method === 'upsert');
    expect(upsert?.args[0]).toMatchObject({
      agency_id: 'agency-a',
      buyer_id: BUYER,
      property_key: KEY,
      source: 'competitor',
      origin: 'competitor',
      selection_item_id: ITEM_ID,
      sent_by: 'u1',
    });
    expect(upsert?.args[0]).not.toHaveProperty('sent_at');
    expect(upsert?.args[1]).toMatchObject({ ignoreDuplicates: true });
  });

  it('un bien inconnu, un acquéreur qui ne correspond pas, un membre retiré : rien n’est écrit', async () => {
    expect((await recordProposal(BUYER, 'listing:autre:1', ITEM_ID)).ok).toBe(false);
    agency.buyers = [{ ...theBuyer, budgetMax: 500_000 }];
    expect((await recordProposal(BUYER, KEY, ITEM_ID)).ok).toBe(false);
    agency.buyers = [theBuyer];
    profile.current = { ...profile.current!, removed_at: iso(1) };
    expect((await recordProposal(BUYER, KEY, ITEM_ID)).ok).toBe(false);
    profile.current = { ...profile.current!, removed_at: null };
    expect((await recordProposal('pas-un-id', KEY, ITEM_ID)).ok).toBe(false);
    catalog.failed = true;
    expect((await recordProposal(BUYER, KEY, ITEM_ID)).ok).toBe(false);
    expect(fake.writes()).toEqual([]);
  });
});

describe('le lien de sa sélection, ce bien en tête', () => {
  it('une nouvelle sélection : ce bien d’abord, puis le lien', async () => {
    answers.buyers = { budget_max: 790_000 };
    answers.buyer_selections = { id: 's-new', buyer_words: null };
    answers.buyer_selection_items = [{ id: ITEM_ID, position: 1 }];
    const result = await prepareProposalLink(BUYER, KEY);
    // Mission 156 — aucun lien « Vivre ici » collé sur les biens recopiés : aucune ligne
    // d'information au partage.
    expect(result).toEqual({
      ok: true,
      url: 'https://acm/dossier/t',
      selectionItemId: ITEM_ID,
      livingHereLetters: [],
    });
    expect(fake.writes()).toEqual(['insert buyer_selections', 'insert buyer_selection_items']);
    const rows = fake.calls.filter((call) => call.method === 'insert')[1]?.args[0] as Record<
      string,
      unknown
    >[];
    expect(rows[0]).toMatchObject({
      position: 1,
      source: 'competitor',
      reference: 'c1',
      listed_price: 779_000,
    });
  });

  // Mission 145 — un bien de l'agence de sa sélection actuelle qui ne se propose plus (vendeur à
  // relancer, mandat sous offre acceptée : absent du catalogue) n'est pas recopié dans le lien.
  it('un bien de l’agence qui ne se propose plus n’est pas recopié', async () => {
    catalog.items = [
      bien({ origin: 'mandate', source: 'project', reference: 'p-lopez', key: 'project:p-lopez' }),
    ];
    answers.buyers = { budget_max: 790_000 };
    answers.buyer_selections = { id: 's-new', buyer_words: null };
    answers.buyer_selection_items = [
      { id: ITEM_ID, position: 1, source: 'project', reference: 'p-lambert-duval' },
      { id: 'i-2', position: 2, source: 'listing', reference: 'https://www.seloger.com/1.htm' },
    ];
    await prepareProposalLink(BUYER, 'project:p-lopez');
    const rows = fake.calls.filter((call) => call.method === 'insert')[1]?.args[0] as Record<
      string,
      unknown
    >[];
    expect(rows.map((row) => [row.source, row.reference])).toEqual([
      ['project', 'p-lopez'],
      ['listing', 'https://www.seloger.com/1.htm'],
    ]);
  });
});
