import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RankingListing } from '@/features/soft-ranking/types';
import { costMillicents } from '@/lib/ai/models';

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
  noUsage: false,
  // Lancement, mission 9 — les appels en cours au même instant, et la lecture des photos simulée.
  active: 0,
  maxActive: 0,
  photoReads: [] as {
    picks: { key: string; urls: string[] }[];
    criteria: string[];
    room: number;
  }[],
  photoRead: { byKey: new Map(), spent: 0 } as {
    byKey: Map<string, Map<string, { verdict: 'shown' | 'contrary'; numbers: number[] }>>;
    spent: number;
  },
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
    state.active += 1;
    state.maxActive = Math.max(state.maxActive, state.active);
    await new Promise((resolve) => setTimeout(resolve, 1));
    state.active -= 1;
    if (state.fail) return { ok: false, cause: 'unavailable', model: 'm', usage: null };
    return {
      ok: true,
      json: state.answer(text),
      model: 'eu.anthropic.claude-sonnet-4-6',
      usage: state.noUsage ? null : { input_tokens: 2000, output_tokens: 300 },
    };
  },
}));

vi.mock('@/features/soft-ranking/server/read-photos', () => ({
  photoWorstCase: () => 8_000,
  readListingPhotos: async (input: {
    picks: { key: string; urls: string[] }[];
    criteria: string[];
    room: number;
  }) => {
    state.photoReads.push(input);
    return state.photoRead;
  },
}));

const { RANKING_POOL, rankListings } = await import('@/features/soft-ranking/server/rank-listings');

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
  state.noUsage = false;
  state.active = 0;
  state.maxActive = 0;
  state.photoReads = [];
  state.photoRead = { byKey: new Map(), spent: 0 };
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
    // Rien n'est réservé : aucune ligne « échouée » à 0 € la nuit.
    expect(state.reserved).toEqual([]);
  });

  it('jamais plus que la réservation (M105) : la relance s’arrête à ce qu’elle couvre', async () => {
    // 20 annonces, trois lots ; le modèle ne répond qu'à la première de chaque lot.
    const many: RankingListing[] = Array.from({ length: 20 }, (_, index) => ({
      key: `https://x.fr/${index + 1}`,
      text: `Annonce numéro ${index + 1}, au calme.`,
      tags: [],
    }));
    state.answer = (text) => {
      const first = /<annonce id="(a\d+)">/.exec(text)![1];
      return {
        annonces: [
          {
            id: first,
            jugements: [
              {
                critere: 'calme',
                verdict: 'rien',
                citation: null,
                contre_citation: null,
                a_verifier: false,
              },
            ],
          },
        ],
      };
    };
    // Sans relevé de coût, chaque appel compte au pire : la réservation ne couvre plus qu'un lot.
    state.noUsage = true;
    await rankListings({ ...base, listings: many });
    const reserved = Number(state.reserved[0]!.wantedMillicents);
    expect(Number(state.settled[0]!.costMillicents)).toBeLessThanOrEqual(reserved);
    // Trois lots, puis la relance de ce que la réservation couvre encore : un lot.
    expect(state.calls).toHaveLength(4);
  });
});

// Lancement, mission 9 — « le texte de toutes les annonces est lu » : une recherche entière part
// d'un coup, au lieu de trois lots à la fois (mesuré le 24/11 : huit appels ensemble, 15,9 s).
describe('le texte de toutes les annonces', () => {
  it('soixante annonces : les huit lots partent ensemble, et toutes sont jugées', async () => {
    const sixty: RankingListing[] = Array.from({ length: 60 }, (_, index) => ({
      key: `https://x.fr/${index + 1}`,
      text: index === 0 ? 'Au calme absolu, aucun passage.' : 'Maison de ville.',
      tags: [],
    }));
    const ranking = await rankListings({ ...base, listings: sixty });
    expect(RANKING_POOL).toBe(8);
    expect(state.calls).toHaveLength(8);
    expect(state.maxActive).toBe(8);
    expect(ranking?.mode).toBe('full');
    if (ranking?.mode !== 'full') return;
    expect(Object.values(ranking.byKey).every(([first]) => first!.verdict !== 'unread')).toBe(true);
  });
});

describe('les photos des biens les mieux classés', () => {
  const picked: Record<string, unknown>[] = [];
  const photos = {
    max: 5,
    pick: (byKey: Record<string, unknown>) => {
      picked.push(byKey);
      return [
        { key: 'https://x.fr/1', urls: ['https://p/1.jpg'] },
        { key: 'https://x.fr/2', urls: ['https://p/2.jpg'] },
      ];
    },
  };
  const withView = { ...base, criteria: ['calme' as const, 'vue' as const], photos };

  beforeEach(() => {
    picked.length = 0;
    state.photoRead = {
      byKey: new Map([['https://x.fr/2', new Map([['vue', { verdict: 'shown', numbers: [2] }]])]]),
      spent: 3_000,
    };
  });

  it('réservées avec le texte, lues une fois le texte jugé, réglées avec lui', async () => {
    await rankListings(base);
    const textOnly = state.reserved[0]!.wantedMillicents as number;
    state.reserved = [];
    state.settled = [];
    const ranking = await rankListings(withView);
    // Le pire cas des photos s'ajoute à celui du texte : cinq biens au plus.
    expect(state.reserved).toHaveLength(1);
    expect(state.reserved[0]!.wantedMillicents as number).toBeGreaterThanOrEqual(
      textOnly + 5 * 8_000,
    );
    // Les biens sont choisis sur le texte déjà jugé ; seuls les critères qu'une photo montre partent.
    expect(picked).toHaveLength(1);
    expect(Object.keys(picked[0]!)).toEqual(['https://x.fr/1', 'https://x.fr/2']);
    expect(state.photoReads).toHaveLength(1);
    expect(state.photoReads[0]!.criteria).toEqual(['vue']);
    // Un appel de texte (deux annonces, un lot) : ce qu'il a coûté sort de la réservation, et les
    // photos n'ont que le reste (M105 : jamais plus que la réservation).
    const textCost = costMillicents('eu.anthropic.claude-sonnet-4-6', {
      input_tokens: 2000,
      output_tokens: 300,
    })!;
    const reserved = state.reserved[0]!.wantedMillicents as number;
    expect(state.photoReads[0]!.room).toBe(reserved - textCost);
    if (ranking?.mode !== 'full') throw new Error('classement complet attendu');
    expect(ranking.byKey['https://x.fr/2']!.find((j) => j.key === 'vue')!.photos).toEqual({
      verdict: 'shown',
      numbers: [2],
    });
    expect(ranking.byKey['https://x.fr/1']!.some((j) => j.photos)).toBe(false);
    // Un seul règlement, le texte et les photos ; la trace dit les noms, jamais une adresse.
    expect(state.settled).toHaveLength(1);
    expect(state.settled[0]!.fieldsProposed).toEqual(['soft:calme', 'soft:vue', 'photo:vue']);
    expect(state.settled[0]!.costMillicents).toBe(textCost + 3_000);
    expect(state.settled[0]!.costMillicents as number).toBeLessThanOrEqual(reserved);
    expect(JSON.stringify(state.settled)).not.toMatch(/p\/1\.jpg|x\.fr/);
  });

  it('le plafond ne couvre plus les photos : le texte seul est lu', async () => {
    let asked = 0;
    const reserve = state.reserve;
    Object.defineProperty(state, 'reserve', {
      configurable: true,
      get: () => (asked++ === 0 ? { ok: false, reason: 'reached' } : reserve),
    });
    try {
      const ranking = await rankListings(withView);
      expect(ranking?.mode).toBe('full');
      expect(state.reserved).toHaveLength(2);
      expect(state.reserved[1]!.wantedMillicents as number).toBeLessThan(
        state.reserved[0]!.wantedMillicents as number,
      );
      expect(state.photoReads).toHaveLength(0);
      expect(state.settled[0]!.fieldsProposed).toEqual(['soft:calme', 'soft:vue']);
    } finally {
      Object.defineProperty(state, 'reserve', {
        configurable: true,
        writable: true,
        value: reserve,
      });
    }
  });

  it('aucun critère de la fiche ne se voit sur une photo : rien de réservé pour elles, rien de lu', async () => {
    await rankListings(base);
    const textOnly = state.reserved[0]!.wantedMillicents;
    state.reserved = [];
    await rankListings({ ...base, photos });
    expect(state.reserved[0]!.wantedMillicents).toBe(textOnly);
    expect(state.photoReads).toHaveLength(0);
  });

  it('sans la lecture des photos (la veille de nuit, l’interrupteur éteint) : rien ne change', async () => {
    await rankListings({ ...base, criteria: ['calme', 'vue'] });
    expect(state.photoReads).toHaveLength(0);
    expect(state.settled[0]!.fieldsProposed).toEqual(['soft:calme', 'soft:vue']);
  });

  it('le texte en échec : aucune photo lue', async () => {
    state.fail = true;
    await rankListings(withView);
    expect(state.photoReads).toHaveLength(0);
  });

  it('démo : des photos simulées, relues comme les vraies, sans appel ni chargement (M114)', async () => {
    // La première annonce dit la vue : elle se voit sur la première photo. La deuxième n'en dit
    // rien, et son texte (un nombre pair de caractères) la montre sur les deux premières ; la
    // troisième (un nombre impair) ne montre rien.
    const demoListings: RankingListing[] = [
      { key: 'https://x.fr/1', text: 'Belle vue mer depuis la terrasse.', tags: [] },
      { key: 'https://x.fr/2', text: 'Maison de ville, au calme.', tags: [] },
      { key: 'https://x.fr/3', text: 'Maison de village, au calme', tags: [] },
    ];
    expect(demoListings[1]!.text.length % 2).toBe(0);
    expect(demoListings[2]!.text.length % 2).toBe(1);
    const ranking = await rankListings({
      ...withView,
      demo: true,
      listings: demoListings,
      photos: {
        max: 5,
        pick: () =>
          demoListings.map((listing) => ({
            key: listing.key,
            urls: ['/demo/photos/a.jpg', '/demo/photos/b.jpg', '/demo/photos/c.jpg'],
          })),
      },
    });
    expect(state.calls).toHaveLength(0);
    expect(state.photoReads).toHaveLength(0);
    expect(state.reserved).toHaveLength(0);
    if (ranking?.mode !== 'full') throw new Error('classement complet attendu');
    const view = (key: string) => ranking.byKey[key]!.find((j) => j.key === 'vue')!;
    expect(view('https://x.fr/1').photos).toEqual({ verdict: 'shown', numbers: [1] });
    expect(view('https://x.fr/2').photos).toEqual({ verdict: 'shown', numbers: [1, 2] });
    expect(view('https://x.fr/3').photos).toBeUndefined();
    // Le calme ne se voit pas sur une photo : jamais de photos sur ce critère.
    expect(
      Object.values(ranking.byKey).some((judgments) =>
        judgments.some((j) => j.key === 'calme' && j.photos),
      ),
    ).toBe(false);
  });

  it('un bien sans texte, hors du classement : ses photos ne sont ni lues ni payées, et il ne prend aucune place', async () => {
    state.photoRead = {
      byKey: new Map([
        ['https://x.fr/sans-texte', new Map([['vue', { verdict: 'shown', numbers: [1] }]])],
      ]),
      spent: 0,
    };
    const ranking = await rankListings({
      ...withView,
      photos: {
        max: 1,
        pick: () => [
          { key: 'https://x.fr/sans-texte', urls: ['https://p/0.jpg'] },
          { key: 'https://x.fr/2', urls: ['https://p/2.jpg'] },
        ],
      },
    });
    expect(state.photoReads[0]!.picks).toEqual([
      { key: 'https://x.fr/2', urls: ['https://p/2.jpg'] },
    ]);
    if (ranking?.mode !== 'full') throw new Error('classement complet attendu');
    // Rien n'est écrit pour un bien que le texte n'a pas classé (« Aucun texte d'annonce à lire »).
    expect(ranking.byKey['https://x.fr/sans-texte']).toBeUndefined();
  });
});
