import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mission 147 (partie B) — une lecture du profil en échec n'est jamais « pas de profil » (M98) :
// relue une fois, puis une erreur (la page d'erreur), jamais `null` (« Première connexion »).

const state = vi.hoisted(() => ({
  answers: [] as { data: unknown; error: unknown }[],
  reads: 0,
}));

vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  cache: <T>(fn: T) => fn,
}));
vi.mock('@/lib/auth/get-user', () => ({ getUser: async () => ({ id: 'u1' }) }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            state.reads += 1;
            return state.answers.shift() ?? { data: null, error: null };
          },
        }),
      }),
    }),
  }),
}));

beforeEach(() => {
  state.answers = [];
  state.reads = 0;
});

describe('getProfile', () => {
  it('rend le profil lu', async () => {
    const { getProfile } = await import('@/lib/auth/get-profile');
    state.answers = [{ data: { id: 'u1' }, error: null }];
    expect(await getProfile()).toEqual({ id: 'u1' });
    expect(state.reads).toBe(1);
  });

  it('une lecture en échec se relit une fois', async () => {
    const { getProfile } = await import('@/lib/auth/get-profile');
    state.answers = [
      { data: null, error: { message: 'timeout' } },
      { data: { id: 'u1' }, error: null },
    ];
    expect(await getProfile()).toEqual({ id: 'u1' });
    expect(state.reads).toBe(2);
  });

  it('deux échecs : une erreur, jamais null', async () => {
    const { getProfile } = await import('@/lib/auth/get-profile');
    state.answers = [
      { data: null, error: { message: 'timeout' } },
      { data: null, error: { message: 'timeout' } },
    ];
    await expect(getProfile()).rejects.toThrow('Le profil n’a pas pu être lu.');
    expect(state.reads).toBe(2);
  });

  it('aucun profil (lu sans erreur) : null', async () => {
    const { getProfile } = await import('@/lib/auth/get-profile');
    expect(await getProfile()).toBeNull();
  });
});
