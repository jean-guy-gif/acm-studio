import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PropertyBuyers } from '@/features/buyers/services/property-buyers';
import { fakeSupabase, type FakeCall } from '@/test-fixtures/fake-supabase';

// Mission 133 — « Montrer au vendeur » : le moment noté sur le Live. Un appel refusé n'écrit rien.
// (« Envoyer le lien » est devenu l'envoi en série de la 134 : `proposals.test.ts`.)
const profile = vi.hoisted(() => ({
  current: null as null | {
    id: string;
    agency_id: string;
    removed_at: string | null;
    first_name: string;
  },
}));
const user = vi.hoisted(() => ({ client: null as unknown }));
const service = vi.hoisted(() => ({ client: null as unknown }));
const matching = vi.hoisted(() => ({ result: null as PropertyBuyers | null }));

vi.mock('@/lib/auth/get-profile', () => ({ getProfile: async () => profile.current }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => user.client }));
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/features/buyers/queries/get-property-buyers', () => ({
  getPropertyBuyers: async () => matching.result,
  loadLoopProperties: async () => ({ properties: new Map(), failed: false }),
}));

const { showBuyersToSeller } = await import('@/features/live-seller/actions/show-buyers-to-seller');

const PROJECT = '11111111-1111-4111-8111-111111111111';
const readyOf = (count: number): PropertyBuyers => ({
  price: 740_000,
  ready: Array.from({ length: count }, (_, index) => ({
    buyer: { id: `b${index}`, name: `B${index}` } as never,
    ready: true,
    missing: null,
    sinceDays: 2,
  })),
  others: [],
});

// La réponse du client factice selon la table lue.
const tableOf = (calls: FakeCall[]): string =>
  String([...calls].reverse().find((call) => call.method === 'from')?.args[0] ?? '');

let fake: ReturnType<typeof fakeSupabase>;
const answers: Record<string, unknown> = {};

beforeEach(() => {
  profile.current = { id: 'u1', agency_id: 'agency-a', removed_at: null, first_name: 'Carl' };
  for (const key of Object.keys(answers)) delete answers[key];
  fake = fakeSupabase((calls) => ({ data: answers[tableOf(calls)] ?? null }));
  user.client = fake.client;
  service.client = fake.client;
  matching.result = readyOf(5);
});

describe('« Montrer au vendeur »', () => {
  it('à partir de 5 prêts, le moment est noté sur le résumé du Live', async () => {
    answers.projects = { id: PROJECT, status: 'ready_for_meeting', is_example: false };
    answers.live_seller_summary = { id: 's1' };
    expect(await showBuyersToSeller(PROJECT)).toEqual({ ok: true });
    expect(fake.writes()).toEqual(['update live_seller_summary']);
    const update = fake.calls.find((call) => call.method === 'update');
    expect(update?.args[0]).toMatchObject({ buyers_shown_count: 5 });
  });

  it('sous 5, sur un Live conclu, sur un exemple ou pour un membre retiré : rien n’est écrit', async () => {
    answers.projects = { id: PROJECT, status: 'ready_for_meeting', is_example: false };
    matching.result = readyOf(4);
    expect((await showBuyersToSeller(PROJECT)).ok).toBe(false);
    matching.result = readyOf(5);
    answers.projects = { id: PROJECT, status: 'meeting_completed', is_example: false };
    expect((await showBuyersToSeller(PROJECT)).ok).toBe(false);
    answers.projects = { id: PROJECT, status: 'ready_for_meeting', is_example: true };
    expect((await showBuyersToSeller(PROJECT)).ok).toBe(false);
    answers.projects = { id: PROJECT, status: 'ready_for_meeting', is_example: false };
    profile.current = { ...profile.current!, removed_at: '2026-11-01T00:00:00Z' };
    expect((await showBuyersToSeller(PROJECT)).ok).toBe(false);
    expect(fake.writes()).toEqual([]);
  });
});

describe('les acquéreurs de l’agence', () => {
  it('se lisent sans les fiches archivées, et une lecture en échec le dit', async () => {
    const { readBuyers } = await vi.importActual<
      typeof import('@/features/buyers/queries/get-buyers')
    >('@/features/buyers/queries/get-buyers');
    expect(await readBuyers()).toEqual({ buyers: [], failed: false });
    expect(fake.calls).toContainEqual({ method: 'is', args: ['archived_at', null] });
    user.client = fakeSupabase(() => ({ error: { message: 'panne' } })).client;
    expect((await readBuyers()).failed).toBe(true);
  });
});
