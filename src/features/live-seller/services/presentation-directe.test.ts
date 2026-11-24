import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase, type FakeCall } from '@/test-fixtures/fake-supabase';

// Mission 131 — la présentation directe. Deux preuves demandées par la fiche :
//   • le parcours direct ne crée aucune réponse du vendeur (seul le fait « montré » est écrit) ;
//   • passer en directe en cours de route garde ce qui a déjà été répondu.

// Ce que la base rend, table par table, à l'action qui montre un concurrent en directe.
type Rows = { project?: unknown; comparable?: unknown; response?: unknown };
let rows: Rows = {};
const lastTable = (calls: FakeCall[]) =>
  String([...calls].reverse().find((call) => call.method === 'from')?.args[0] ?? '');
const server = fakeSupabase((calls) => {
  const table = lastTable(calls);
  if (table === 'projects') return { data: rows.project ?? null };
  if (table === 'comparables') return { data: rows.comparable ?? null };
  if (table === 'live_seller_responses') {
    const writing = calls.some((call) => call.method === 'insert' || call.method === 'update');
    return writing ? { data: null, error: null } : { data: rows.response ?? null };
  }
  return {};
});

vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/get-profile', () => ({
  getProfile: async () => ({ id: 'u-1', agency_id: 'a-1', removed_at: null }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => server.client }));

import {
  buildLivePages,
  indexAfterModeChange,
  type LiveNavComparable,
} from '@/features/live-seller/services/build-live-pages';
import { canAdvanceLivePage } from '@/features/live-seller/services/can-advance-live-page';
import { pendingBeforeAnalysis } from '@/features/live-seller/services/pending-before-analysis';
import {
  isComparableAuthorized,
  isDurationAuthorized,
} from '@/features/live-seller/services/project-live-for-seller';
import {
  livePresentationMode,
  priceShown,
} from '@/features/live-seller/services/presentation-mode';
import {
  ALREADY_ANSWERED_MESSAGE,
  NOT_DIRECT_MESSAGE,
  writeShownDirectly,
} from '@/features/live-seller/services/write-shown-directly';
import type { LiveComparableResponse } from '@/features/live-seller/types';
import type { LiveComparableEntry } from '@/features/seller-presentation/types/seller-presentation';

const SELLER_ANSWERS = [
  'seller_serious_competitor',
  'seller_serious_competitor_comment',
  'seller_estimated_listing_price',
  'seller_price_coherence',
  'seller_price_coherence_comment',
  'seller_estimated_days_on_market',
  'seller_market_duration_reason',
  'seller_market_duration_comment',
] as const;

const response = (fields: Partial<LiveComparableResponse>): LiveComparableResponse =>
  ({ comparable_id: 'x', shown_directly_at: null, ...fields }) as LiveComparableResponse;
const competitor = (id: string, fields?: Partial<LiveComparableResponse>): LiveNavComparable => ({
  id,
  response: fields ? response({ comparable_id: id, ...fields }) : null,
  energyRating: null,
  durationKnown: true,
});
const types = (pages: { type: string }[]) => pages.map((page) => page.type);

beforeEach(() => {
  server.reset();
  rows = {};
});

describe('les écrans de la présentation directe', () => {
  it('dès le départ : aucun écran qui demande quelque chose au vendeur', () => {
    const pages = buildLivePages(
      { comparables: [competitor('a'), competitor('b'), competitor('c')], sellerSummary: null },
      true,
      'accelerated',
      'direct',
    );
    expect(types(pages)).toEqual([
      'intro',
      'subject_property',
      'comparable_direct',
      'comparable_direct',
      'comparable_direct',
      'advisor_closest',
      'price_analysis',
      'conclusion',
    ]);
    // Ni valeur perçue, ni devinette, ni reformulation, ni note de 1 à 10, ni « le plus dangereux ».
    for (const asked of [
      'seller_perceived_price',
      'comparable_price',
      'comparable_quick_guess',
      'seller_revised_price',
      'closing_question',
      'dangerous_competitor',
    ]) {
      expect(types(pages)).not.toContain(asked);
    }
  });

  it('passé en directe au 3e concurrent : ce qui a été répondu garde ses écrans', () => {
    const live = {
      comparables: [
        competitor('a', { seller_serious_competitor: 'yes', seller_estimated_listing_price: 300 }),
        competitor('b', { seller_serious_competitor: 'no' }),
        competitor('c'),
        competitor('d'),
      ],
      sellerSummary: { seller_perceived_property_price: 350_000 },
    };
    const pages = buildLivePages(live, false, 'complete', 'direct');
    // Le 1er, deviné : sa révélation et sa durée deviennent son écran direct (rien à deviner).
    expect(types(pages)).toEqual([
      'intro',
      'seller_perceived_price',
      'comparable_competition',
      'comparable_price',
      'comparable_direct',
      'comparable_competition',
      'comparable_direct',
      'comparable_direct',
      'advisor_closest',
      'price_analysis',
      'conclusion',
    ]);
  });

  it('revenu au Live interactif : un concurrent montré en directe ne se devine plus', () => {
    const pages = buildLivePages(
      {
        comparables: [
          competitor('a', { shown_directly_at: '2026-11-05T10:00:00Z' }),
          competitor('b'),
        ],
        sellerSummary: null,
      },
      false,
      'complete',
      'interactive',
    );
    // Sa valeur perçue n'est plus demandée : un prix lui a déjà été montré.
    expect(types(pages)).not.toContain('seller_perceived_price');
    expect(pages.filter((page) => page.comparableId === 'a').map((page) => page.type)).toEqual([
      'comparable_direct',
    ]);
    expect(pages.filter((page) => page.comparableId === 'b').map((page) => page.type)).toContain(
      'comparable_price',
    );
    expect(types(pages)).toContain('closing_question');
  });

  it('changer de mode garde la place du conseiller', () => {
    const before = buildLivePages(
      { comparables: [competitor('a'), competitor('b'), competitor('c')] },
      false,
      'complete',
      'interactive',
    );
    const at = before.findIndex(
      (page) => page.comparableId === 'c' && page.type === 'comparable_competition',
    );
    const after = buildLivePages(
      { comparables: [competitor('a'), competitor('b'), competitor('c')] },
      false,
      'complete',
      'direct',
    );
    const index = indexAfterModeChange(before[at], at, after);
    expect(after[index]).toMatchObject({ comparableId: 'c', type: 'comparable_direct' });
  });

  // Lancement, mission 1 (24/11) — depuis « Votre valeur perçue », le bouton « Voir d'abord les
  // biens et leurs prix » passe en présentation directe : le conseiller arrive sur le premier
  // concurrent, montré avec son prix ; la valeur perçue n'est plus un écran.
  it('depuis « Votre valeur perçue », passer en directe mène au premier concurrent, avec son prix', () => {
    const live = { comparables: [competitor('a'), competitor('b'), competitor('c')] };
    const before = buildLivePages(live, true, 'complete', 'interactive');
    const at = before.findIndex((page) => page.type === 'seller_perceived_price');
    expect(at).toBeGreaterThan(0);
    const after = buildLivePages(live, true, 'complete', 'direct');
    expect(after.some((page) => page.type === 'seller_perceived_price')).toBe(false);
    const index = indexAfterModeChange(before[at], at, after);
    expect(after[index]).toMatchObject({ comparableId: 'a', type: 'comparable_direct' });
  });

  it('on ne quitte l’écran d’un concurrent qu’une fois le fait « montré » enregistré', () => {
    expect(canAdvanceLivePage('comparable_direct', competitor('a'), null)).toBe(false);
    expect(
      canAdvanceLivePage(
        'comparable_direct',
        competitor('a', { shown_directly_at: '2026-11-05T10:00:00Z' }),
        null,
      ),
    ).toBe(true);
  });

  it('« Analyse des prix » ne réclame pas la devinette d’un concurrent montré en directe', () => {
    const pages = buildLivePages(
      { comparables: [competitor('a'), competitor('b')] },
      false,
      'complete',
      'direct',
    );
    const pending = pendingBeforeAnalysis(
      pages,
      [
        { id: 'a', neutralLabel: 'A', response: response({ shown_directly_at: '2026-11-05' }) },
        { id: 'b', neutralLabel: 'B', response: null },
      ],
      null,
    );
    expect(pending.map((step) => step.key)).toEqual(['b']);
    expect(pages[pending[0].pageIndex]).toMatchObject({ type: 'comparable_direct' });
  });
});

describe('le prix livré : deviné ou montré en directe', () => {
  const entry = (fields: Partial<LiveComparableResponse> | null) =>
    ({ response: fields ? response(fields) : null }) as LiveComparableEntry;

  it('montré en directe autorise le prix ET la durée, sans devinette', () => {
    const shown = entry({ shown_directly_at: '2026-11-05T10:00:00Z' });
    expect(isComparableAuthorized(shown)).toBe(true);
    expect(isDurationAuthorized(shown)).toBe(true);
    expect(isComparableAuthorized(entry(null))).toBe(false);
    expect(isComparableAuthorized(entry({ seller_serious_competitor: 'yes' }))).toBe(false);
  });

  it('une valeur inconnue en base vaut le Live interactif', () => {
    expect(livePresentationMode('direct')).toBe('direct');
    expect(livePresentationMode('autre')).toBe('interactive');
    expect(livePresentationMode(null)).toBe('interactive');
    expect(priceShown(null)).toBe(false);
  });
});

describe('montrer un concurrent en directe', () => {
  const retained = { id: 'c-1', is_selected: true, excluded_from_live: false };
  const written = () =>
    server.calls.find((call) => call.method === 'insert' || call.method === 'update')?.args[0] as
      Record<string, unknown> | undefined;

  it('n’écrit aucune réponse du vendeur : seulement le fait daté', async () => {
    rows = {
      project: { id: 'p-1', status: 'ready_for_meeting', live_presentation_mode: 'direct' },
      comparable: retained,
    };
    expect(await writeShownDirectly('p-1', 'c-1')).toEqual({ ok: true });
    expect(server.writes()).toEqual(['insert live_seller_responses']);
    const row = written()!;
    expect(row.shown_directly_at).toEqual(expect.any(String));
    for (const answer of SELLER_ANSWERS) {
      expect(row).not.toHaveProperty(answer);
    }
  });

  it('garde la réponse déjà donnée : un concurrent deviné n’est jamais réécrit', async () => {
    rows = {
      project: { id: 'p-1', status: 'ready_for_meeting', live_presentation_mode: 'direct' },
      comparable: retained,
      response: { id: 'r-1', shown_directly_at: null, seller_estimated_listing_price: 300_000 },
    };
    // Son prix est déjà livré ; la durée suit, sans rien écrire.
    expect(await writeShownDirectly('p-1', 'c-1')).toEqual({ ok: true });
    expect(server.writes()).toEqual([]);
  });

  it('un « Non » ne se montre pas en directe', async () => {
    rows = {
      project: { id: 'p-1', status: 'ready_for_meeting', live_presentation_mode: 'direct' },
      comparable: retained,
      response: { id: 'r-1', shown_directly_at: null, seller_serious_competitor: 'no' },
    };
    expect(await writeShownDirectly('p-1', 'c-1')).toEqual({
      ok: false,
      error: ALREADY_ANSWERED_MESSAGE,
    });
    expect(server.writes()).toEqual([]);
  });

  it('une réponse « sérieux : oui » donnée avant : on n’ajoute que le fait', async () => {
    rows = {
      project: { id: 'p-1', status: 'ready_for_meeting', live_presentation_mode: 'direct' },
      comparable: retained,
      response: { id: 'r-1', shown_directly_at: null, seller_serious_competitor: 'yes' },
    };
    expect(await writeShownDirectly('p-1', 'c-1')).toEqual({ ok: true });
    expect(server.writes()).toEqual(['update live_seller_responses']);
    expect(Object.keys(written()!).sort()).toEqual(['shown_directly_at', 'updated_at']);
  });

  it('refusé hors présentation directe, et sur un dossier conclu', async () => {
    rows = {
      project: { id: 'p-1', status: 'ready_for_meeting', live_presentation_mode: 'interactive' },
      comparable: retained,
    };
    expect(await writeShownDirectly('p-1', 'c-1')).toEqual({
      ok: false,
      error: NOT_DIRECT_MESSAGE,
    });
    rows = {
      project: { id: 'p-1', status: 'meeting_completed', live_presentation_mode: 'direct' },
      comparable: retained,
    };
    expect((await writeShownDirectly('p-1', 'c-1')).ok).toBe(false);
    expect(server.writes()).toEqual([]);
  });

  it('refusé pour un concurrent hors Live', async () => {
    rows = {
      project: { id: 'p-1', status: 'ready_for_meeting', live_presentation_mode: 'direct' },
      comparable: { ...retained, excluded_from_live: true },
    };
    expect((await writeShownDirectly('p-1', 'c-1')).ok).toBe(false);
    expect(server.writes()).toEqual([]);
  });
});

describe('le plus proche, proposé par le conseiller', () => {
  it('revérifié au serveur : mode direct, prix montré, pas de « Non »', async () => {
    const { saveAdvisorClosest } =
      await import('@/features/live-seller/actions/save-advisor-closest');
    const retained = { id: 'c-1', is_selected: true, excluded_from_live: false };
    rows = {
      project: { id: 'p-1', status: 'ready_for_meeting', live_presentation_mode: 'interactive' },
      comparable: retained,
    };
    expect((await saveAdvisorClosest('p-1', 'c-1')).ok).toBe(false);
    rows = {
      project: { id: 'p-1', status: 'ready_for_meeting', live_presentation_mode: 'direct' },
      comparable: retained,
      response: { seller_serious_competitor: 'no', shown_directly_at: null },
    };
    expect((await saveAdvisorClosest('p-1', 'c-1')).ok).toBe(false);
    rows = {
      project: { id: 'p-1', status: 'ready_for_meeting', live_presentation_mode: 'direct' },
      comparable: retained,
      response: { shown_directly_at: '2026-11-05T10:00:00Z' },
    };
    expect(server.writes()).toEqual([]);
    expect(await saveAdvisorClosest('p-1', 'c-1')).toEqual({ ok: true });
  });
});
