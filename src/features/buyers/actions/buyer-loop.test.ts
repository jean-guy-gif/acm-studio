import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PropertyBuyers } from '@/features/buyers/services/property-buyers';
import {
  buildSuiviTaskList,
  dossierTasks,
  type SuiviTaskInput,
} from '@/features/meeting-conclusion/services/suivi-tasks';
import { taskLine } from '@/features/meeting-conclusion/services/suivi-step-labels';
import { fakeSupabase, type FakeCall } from '@/test-fixtures/fake-supabase';

// Mission 133 — les gestes de la boucle : « Montrer au vendeur » (le moment noté sur le Live) et
// « Envoyer le lien » (une sélection avec ce bien en tête). Un appel refusé n'écrit rien.
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
vi.mock('@/features/buyer-dossier/actions/dossier-links', () => ({
  createDossierLink: async () => ({
    ok: true,
    url: 'https://x/dossier/t',
    linkId: 'l',
    expiresAt: '',
  }),
}));

const { showBuyersToSeller } = await import('@/features/live-seller/actions/show-buyers-to-seller');
const { proposeProjectToBuyer } = await import('@/features/buyers/actions/propose-project');
const { NOT_SIGNED_MESSAGE } = await import('@/features/buyers/services/property-buyers');

const PROJECT = '11111111-1111-4111-8111-111111111111';
const BUYER = '22222222-2222-4222-8222-222222222222';
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

describe('« Envoyer le lien »', () => {
  it('refusé hors d’un mandat signé : rien n’est écrit', async () => {
    answers.projects = { id: PROJECT, status: 'ready_for_meeting', is_example: false };
    answers.project_meeting_conclusions = null;
    expect(await proposeProjectToBuyer(BUYER, PROJECT)).toEqual({
      ok: false,
      error: NOT_SIGNED_MESSAGE,
    });
    answers.projects = { id: PROJECT, status: 'meeting_completed', is_example: false };
    answers.project_meeting_conclusions = { outcome: 'follow_up', commercialization_price: null };
    expect((await proposeProjectToBuyer(BUYER, PROJECT)).ok).toBe(false);
    expect(fake.writes()).toEqual([]);
  });

  it('un identifiant mal formé ou un acquéreur qui ne correspond pas : rien n’est écrit', async () => {
    expect((await proposeProjectToBuyer('pas-un-id', PROJECT)).ok).toBe(false);
    answers.projects = { id: PROJECT, status: 'meeting_completed', is_example: false };
    answers.project_meeting_conclusions = { outcome: 'signed', commercialization_price: 735_000 };
    expect((await proposeProjectToBuyer(BUYER, PROJECT)).ok).toBe(false);
    expect(fake.writes()).toEqual([]);
  });
});

describe('« Proposer le bien de M. Bernard à 7 acquéreurs prêts »', () => {
  const input = (over: Partial<SuiviTaskInput> = {}): SuiviTaskInput => ({
    projectId: 'p1',
    sellerName: 'M. et Mme Bernard',
    outcome: 'signed',
    isExample: false,
    concludedAt: '2026-11-04T10:00:00Z',
    signedAt: '2026-11-04T10:00:00Z',
    firstFollowUpOn: null,
    contacts: [],
    lastPointAt: null,
    competitorCount: 0,
    readyCount: 0,
    visits: [],
    buyersToPropose: 7,
    ...over,
  });

  it('due à la signature, jamais en retard, vers les acquéreurs du dossier', () => {
    const now = new Date('2026-11-06T10:00:00Z');
    const list = buildSuiviTaskList([input()], now);
    expect(list.dues.map((task) => task.kind)).toEqual(['propose_buyers']);
    const line = taskLine(
      list.dues[0]!,
      { motiveLabel: null, lastContactDays: null, signedOn: null, propertyLabel: null },
      '2026-11-06',
    );
    expect(line.title).toBe('Proposer le bien de M. et Mme Bernard à 7 acquéreurs prêts');
    expect(line.late).toBeNull();
    expect(line.href).toBe('/builder/p1#acquereurs');
  });

  it('à zéro, ou hors d’un mandat signé, pas de tâche', () => {
    expect(dossierTasks(input({ buyersToPropose: 0 }))).toEqual([]);
    expect(dossierTasks(input({ outcome: 'follow_up' })).map((task) => task.kind)).not.toContain(
      'propose_buyers',
    );
  });

  it('après une visite, avant le Point marché', () => {
    const now = new Date('2026-12-06T10:00:00Z');
    const list = buildSuiviTaskList(
      [
        input({
          competitorCount: 3,
          visits: [{ requestedAt: '2026-11-05T10:00:00Z', buyerName: 'Famille Keller' }],
        }),
      ],
      now,
    );
    expect(list.dues.map((task) => task.kind)).toEqual([
      'visit',
      'propose_buyers',
      'market_update',
    ]);
  });
});
