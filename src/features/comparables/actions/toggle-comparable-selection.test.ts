import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeSupabase } from '@/test-fixtures/fake-supabase';

// Mission 120 (décision du 28/10) — le bouton « Retenir » de la page Concurrents suit la même
// règle que « La retenir » : retenu, le concurrent demande la fusion de la carte d'une recherche
// acquéreur sur la même annonce (le service décide, selon le mandat) ; écarté, rien.
const state = vi.hoisted(() => ({
  selected: false,
  absorbed: [] as unknown[],
}));
const supabase = fakeSupabase((calls) =>
  calls.some((call) => call.method === 'update')
    ? { data: null }
    : { data: { id: 'c1', is_selected: state.selected } },
);
vi.mock('@/lib/auth/get-profile', () => ({
  getProfile: async () => ({ id: 'advisor-1', agency_id: 'agency-a', removed_at: null }),
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => supabase.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('next/navigation', () => ({
  redirect: () => {
    throw new Error('redirect');
  },
}));
vi.mock('@/features/buyer-prospecting/services/absorb-buyer-prospects', () => ({
  absorbBuyerProspectsForProject: async (...args: unknown[]) => {
    state.absorbed.push(args.slice(1));
    return 0;
  },
}));

const { toggleComparableSelection } =
  await import('@/features/comparables/actions/toggle-comparable-selection');

const form = () => {
  const data = new FormData();
  data.set('comparableId', 'c1');
  return data;
};

beforeEach(() => {
  supabase.reset();
  state.absorbed.length = 0;
});

describe('« Retenir » depuis la page Concurrents', () => {
  it('retenu : la fusion est demandée pour ce concurrent, dans l’agence et le dossier', async () => {
    state.selected = false;
    await expect(toggleComparableSelection('p1', form())).rejects.toThrow('redirect');
    expect(supabase.calls.find((call) => call.method === 'update')?.args[0]).toEqual({
      is_selected: true,
    });
    expect(state.absorbed).toEqual([['agency-a', 'p1', 'c1']]);
  });

  it('écarté : aucune fusion', async () => {
    state.selected = true;
    await expect(toggleComparableSelection('p1', form())).rejects.toThrow('redirect');
    expect(supabase.calls.find((call) => call.method === 'update')?.args[0]).toEqual({
      is_selected: false,
    });
    expect(state.absorbed).toEqual([]);
  });
});
