import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RankingListing } from '@/features/soft-ranking/types';

// Mission 151 (partie B) — le classement côté serveur, avec le budget et Bedrock SIMULÉS : aucun
// test n'appelle le vrai modèle (décision de Jean-Guy, 12/11).

const state = vi.hoisted(() => ({
  reserve: { ok: true, usageId: 'u-1' } as
    { ok: true; usageId: string } | { ok: false; reason: 'reached' | 'unavailable' },
  reserved: [] as Record<string, unknown>[],
  settled: [] as Record<string, unknown>[],
  calls: [] as { system: string; text: string; timeoutMs?: number }[],
  answer: (_text: string): unknown => ({ annonces: [] }),
  fail: false,
}));

vi.mock('@/features/ai-budget/services/ai-budget', () => ({
  reserveAiBudget: async (input: Record<string, unknown>) => {
    state.reserved.push(input);
    return state.reserve;
  },
  settleAiBudget: async (input: Record<string, unknown>) => {
    state.settled.push(input);
  },
}));
vi.mock('@/lib/ai/bedrock', () => ({
  aiModel: () => 'eu.anthropic.claude-sonnet-4-6',
  aiConfigured: () => true,
  callStructured: async (input: {
    system: string;
    content: { text: string }[];
    timeoutMs?: number;
  }) => {
    const text = input.content[0]!.text;
    state.calls.push({ system: input.system, text, timeoutMs: input.timeoutMs });
    if (state.fail) return { ok: false, cause: 'unavailable', model: 'm', usage: null };
    return {
      ok: true,
      json: state.answer(text),
      model: 'eu.anthropic.claude-sonnet-4-6',
      usage: { input_tokens: 2000, output_tokens: 300 },
    };
  },
}));

const { rankListings } = await import('@/features/soft-ranking/server/rank-listings');

const listings: RankingListing[] = [
  { key: 'https://x.fr/1', text: 'Au calme absolu, aucun passage.', tags: [] },
  { key: 'https://x.fr/2', text: 'Maison sur la route passante.', tags: [] },
];
const base = {
  agencyId: 'agency-a',
  userId: 'u1',
  criteria: ['calme' as const],
  listings,
  demo: false,
  open: true,
};

// La réponse du modèle aux annonces de l'appel (« <annonce id="a1"> »).
const answerAll = (text: string) => ({
  annonces: [...text.matchAll(/<annonce id="(a\d+)">/g)].map(([, id]) => ({
    id,
    jugements: [
      id === 'a1'
        ? {
            critere: 'calme',
            verdict: 'clairement',
            citation: 'Au calme absolu',
            contre_citation: null,
            a_verifier: false,
          }
        : {
            critere: 'calme',
            verdict: 'rien',
            citation: null,
            contre_citation: null,
            a_verifier: false,
          },
    ],
  })),
});

beforeEach(() => {
  state.reserve = { ok: true, usageId: 'u-1' };
  state.reserved = [];
  state.settled = [];
  state.calls = [];
  state.answer = answerAll;
  state.fail = false;
});

describe('rankListings', () => {
  it('sans critère doux, ou sans bien : rien, aucun appel', async () => {
    expect(await rankListings({ ...base, criteria: [] })).toBeNull();
    expect(await rankListings({ ...base, listings: [] })).toBeNull();
    expect(state.calls).toEqual([]);
  });

  it('agence fermée : classement simplifié, ni budget ni appel', async () => {
    const ranking = await rankListings({ ...base, open: false });
    expect(ranking).toEqual({
      mode: 'simple',
      reason: 'closed',
      byKey: { 'https://x.fr/1': ['calme'], 'https://x.fr/2': [] },
    });
    expect(state.reserved).toEqual([]);
    expect(state.calls).toEqual([]);
  });

  it('démo : la lecture simulée, sans budget ni appel (M114)', async () => {
    const ranking = await rankListings({ ...base, demo: true });
    expect(ranking?.mode).toBe('full');
    expect(state.reserved).toEqual([]);
    expect(state.calls).toEqual([]);
  });

  it('réserve, lit, règle ; la trace n’a que les noms des critères, jamais un texte', async () => {
    const ranking = await rankListings(base);
    expect(ranking?.mode).toBe('full');
    if (ranking?.mode !== 'full') return;
    expect(ranking.byKey['https://x.fr/1']![0]).toMatchObject({
      verdict: 'clearly',
      quote: 'Au calme absolu',
    });
    expect(ranking.byKey['https://x.fr/2']![0]!.verdict).toBe('nothing');
    expect(state.reserved[0]).toMatchObject({
      purpose: 'ranking',
      source: 'listings',
      userId: 'u1',
    });
    expect(state.settled).toHaveLength(1);
    expect(state.settled[0]).toMatchObject({
      usageId: 'u-1',
      outcome: 'ranked',
      fieldsProposed: ['soft:calme'],
    });
    expect(JSON.stringify([state.reserved, state.settled])).not.toMatch(/calme absolu|x\.fr/);
    // Le modèle ne voit ni lien ni clé : un numéro, les étiquettes et le texte.
    expect(state.calls[0]!.text).not.toContain('x.fr');
    expect(state.calls[0]!.timeoutMs).toBeGreaterThan(0);
  });

  it('une annonce absente de la réponse est relancée une fois, puis « non lue »', async () => {
    state.answer = (text) => {
      const all = answerAll(text);
      return { annonces: all.annonces.filter((item) => item.id === 'a1') };
    };
    const ranking = await rankListings(base);
    expect(state.calls).toHaveLength(2);
    expect(state.calls[1]!.text).toContain('Maison sur la route passante');
    expect(ranking?.mode === 'full' && ranking.byKey['https://x.fr/2']![0]!.verdict).toBe('unread');
  });

  it('budget atteint ou illisible : simplifié, sans appel', async () => {
    state.reserve = { ok: false, reason: 'reached' };
    expect(await rankListings(base)).toMatchObject({ mode: 'simple', reason: 'budget' });
    state.reserve = { ok: false, reason: 'unavailable' };
    expect(await rankListings(base)).toMatchObject({ mode: 'simple', reason: 'failed' });
    expect(state.calls).toEqual([]);
  });

  it('la veille sans place dans sa moitié du budget : simplifiée, rien n’est réservé', async () => {
    const ranking = await rankListings({ ...base, userId: null, mayReserve: async () => false });
    expect(ranking).toMatchObject({ mode: 'simple', reason: 'budget' });
    expect(state.reserved).toEqual([]);
  });

  it('le fournisseur échoue : simplifié, réglé « échouée » au pire cas, jamais gratuit', async () => {
    state.fail = true;
    expect(await rankListings(base)).toMatchObject({ mode: 'simple', reason: 'failed' });
    expect(state.settled[0]).toMatchObject({ outcome: 'failed' });
    expect(Number(state.settled[0]!.costMillicents)).toBeGreaterThan(0);
  });

  it('le délai écoulé : aucun appel lancé, classement simplifié', async () => {
    const ranking = await rankListings({ ...base, deadlineMs: 0 });
    expect(ranking).toMatchObject({ mode: 'simple', reason: 'failed' });
    expect(state.calls).toEqual([]);
  });
});
