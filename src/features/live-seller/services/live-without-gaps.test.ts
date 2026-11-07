import { describe, expect, it } from 'vitest';

import type { LivePage } from '@/features/live-seller/services/build-live-pages';
import {
  answeredResumeBound,
  clampInitialLiveIndex,
} from '@/features/live-seller/services/max-reachable-live-index';
import { livePhotoPreloadUrls } from '@/features/live-seller/services/photo-preload';
import { SAVE_TIMEOUT_MS } from '@/features/live-seller/services/guarded-save';
import {
  BACKGROUND_SAVE_TIMEOUT_MS,
  BACKGROUND_TIMEOUT_ERROR,
  createSaveChain,
} from '@/features/live-seller/services/save-chain';
import { screenEnter } from '@/features/live-seller/services/screen-enter';
import {
  LIVE_SIGNED_URL_TTL_SECONDS,
  SIGNED_URL_TTL_SECONDS,
} from '@/features/subject-property-photos/constants';
import type { LiveComparableResponse, LiveSellerSummary } from '@/features/live-seller/types';

// Mission 144 — « Le Live sans trou » : photos préchargées, enregistrements de fond dans l'ordre,
// reprise jamais plus loin que la base, entrée d'écran sans écran transparent.
const page = (
  key: string,
  type: LivePage['type'],
  comparableId: string | null = null,
): LivePage => ({ key, type, title: key, comparableId, comparableIndex: null, step: null });

const PAGES: LivePage[] = [
  page('intro', 'intro'),
  page('subject_property', 'subject_property'),
  page('seller_perceived_price', 'seller_perceived_price'),
  page('competition:c1', 'comparable_competition', 'c1'),
  page('price:c1', 'comparable_price', 'c1'),
  page('reveal:c1', 'comparable_price_reveal', 'c1'),
  page('competition:c2', 'comparable_competition', 'c2'),
  page('price:c2', 'comparable_price', 'c2'),
  page('dpe_market', 'dpe_market'),
  page('price_analysis', 'price_analysis'),
  page('conclusion', 'conclusion'),
  page('closing_question', 'closing_question'),
];

const summary = (over: Partial<LiveSellerSummary>) => over as LiveSellerSummary;
const response = (over: Partial<LiveComparableResponse>) => over as LiveComparableResponse;

describe('les photos préchargées dès l’introduction', () => {
  it('dans l’ordre du Live : la photo principale de chaque écran d’abord, puis les autres, une fois', () => {
    const urls = livePhotoPreloadUrls(
      PAGES,
      ['bien-1.jpg', 'bien-2.jpg'],
      [
        { id: 'c1', photoUrl: 'c1-a.jpg', photoUrls: ['c1-a.jpg', 'c1-b.jpg'] },
        { id: 'c2', photoUrl: null, photoUrls: ['c2-a.jpg', 'c2-b.jpg'] },
        { id: 'hors-live', photoUrl: 'cache.jpg', photoUrls: ['cache.jpg'] },
      ],
    );
    expect(urls).toEqual([
      'bien-1.jpg',
      'c1-a.jpg',
      'c2-a.jpg',
      'bien-2.jpg',
      'c1-b.jpg',
      'c2-b.jpg',
    ]);
  });

  it('un concurrent absent du Live n’est jamais demandé', () => {
    expect(
      livePhotoPreloadUrls(PAGES, [], [{ id: 'x', photoUrl: 'x.jpg', photoUrls: [] }]),
    ).toEqual([]);
  });

  it('les liens signés du Live valent 2 h au moins, sans allonger les autres', () => {
    expect(LIVE_SIGNED_URL_TTL_SECONDS).toBeGreaterThanOrEqual(2 * 60 * 60);
    expect(SIGNED_URL_TTL_SECONDS).toBe(30 * 60);
  });
});

describe('les enregistrements de fond, dans l’ordre', () => {
  it('chacun part après le précédent ; une révélation attend la file entière', async () => {
    const chain = createSaveChain();
    const order: string[] = [];
    let release!: () => void;
    const slow = new Promise<void>((resolve) => (release = resolve));
    void chain.run('Votre bien', async () => {
      await slow;
      order.push('Votre bien');
      return { ok: true };
    });
    void chain.run('valeur perçue', async () => {
      order.push('valeur perçue');
      return { ok: true };
    });
    const reveal = chain.settle().then((missing) => order.push(`révélation ${missing.length}`));
    await Promise.resolve();
    expect(order).toEqual([]);
    release();
    await reveal;
    expect(order).toEqual(['Votre bien', 'valeur perçue', 'révélation 0']);
  });

  it('la valeur perçue en échec : relancée une fois avant la révélation, qui a lieu si elle passe', async () => {
    const results: string[] = [];
    const chain = createSaveChain({
      onStart: (key) => results.push(`${key} en cours`),
      onResult: (key, r) => results.push(`${key} ${r.ok}`),
    });
    let calls = 0;
    const perceived = () => Promise.resolve({ ok: ++calls > 1 });
    await chain.run('valeur perçue', perceived);
    await expect(chain.settle()).resolves.toEqual([]);
    expect(calls).toBe(2);
    // Le suivi de l'écran (« Relancer ») apprend la relance, puis sa réussite.
    expect(results).toEqual([
      'valeur perçue en cours',
      'valeur perçue false',
      'valeur perçue en cours',
      'valeur perçue true',
    ]);
  });

  it('toujours en échec : la file dit ce qui manque, avec le refus du serveur (M82)', async () => {
    const chain = createSaveChain();
    await chain.run('seller_perceived_price', () =>
      Promise.resolve({ ok: false, error: 'Indiquez votre prix.' }),
    );
    await expect(chain.settle()).resolves.toEqual([
      { key: 'seller_perceived_price', error: 'Indiquez votre prix.' },
    ]);
    // Une réussite plus tard, sous la même clé, la libère.
    await chain.run('seller_perceived_price', () => Promise.resolve({ ok: true }));
    await expect(chain.settle()).resolves.toEqual([]);
  });

  it('le délai d’un enregistrement de fond, relance comprise, tient dans celui du bouton (M89)', () => {
    expect(BACKGROUND_SAVE_TIMEOUT_MS * 2).toBeLessThan(SAVE_TIMEOUT_MS);
  });

  it('un enregistrement qui ne répond pas ne bloque pas la file : compté en échec après le délai', async () => {
    const chain = createSaveChain({ timeoutMs: 20 });
    const never = chain.run('Votre bien', () => new Promise(() => undefined));
    await expect(never).resolves.toEqual({ ok: false, error: BACKGROUND_TIMEOUT_ERROR });
    const next = chain.run('valeur perçue', () => Promise.resolve({ ok: true }));
    await expect(next).resolves.toEqual({ ok: true });
  });

  it('un enregistrement qui lève une erreur compte comme un échec', async () => {
    const chain = createSaveChain();
    await expect(chain.run('x', () => Promise.reject(new Error('réseau')))).resolves.toMatchObject({
      ok: false,
    });
  });
});

describe('la reprise après un rechargement, jamais plus loin que la base', () => {
  const live = (over: {
    summary?: Partial<LiveSellerSummary>;
    c1?: Partial<LiveComparableResponse>;
    c2?: Partial<LiveComparableResponse>;
  }) => ({
    sellerSummary: summary(over.summary ?? {}),
    comparables: [
      { id: 'c1', response: over.c1 ? response(over.c1) : null },
      { id: 'c2', response: over.c2 ? response(over.c2) : null },
    ],
  });

  it('« Votre bien » perdu dans le rechargement : on y revient', () => {
    expect(answeredResumeBound(PAGES, live({}))).toBe(1);
    expect(clampInitialLiveIndex(3, PAGES, live({}))).toBe(1);
  });

  it('la valeur perçue enregistrée, la question suivante est le premier concurrent', () => {
    const state = live({
      summary: { seller_property_confirmed: 'yes', seller_perceived_property_price: 350_000 },
    });
    expect(answeredResumeBound(PAGES, state)).toBe(3);
    expect(clampInitialLiveIndex(3, PAGES, state)).toBe(3);
  });

  it('un « Non » saute la suite du concurrent, et les écrans sans question ne retiennent pas', () => {
    const state = live({
      summary: { seller_property_confirmed: 'yes', seller_perceived_property_price: 350_000 },
      c1: {
        seller_serious_competitor: 'yes',
        seller_estimated_listing_price: 300_000,
        seller_price_coherence: 'yes',
      },
      c2: { seller_serious_competitor: 'no' },
    });
    // « Non » : le moteur retire la devinette de c2 du Live. Plus aucune question avant la note :
    // DPE, analyse et conclusion se rouvrent.
    const pages = PAGES.filter((candidate) => candidate.key !== 'price:c2');
    expect(answeredResumeBound(pages, state)).toBe(10);
    expect(clampInitialLiveIndex(9, pages, state)).toBe(9);
  });
});

describe('l’entrée d’un écran', () => {
  it('aucun fondu entre deux écrans du même concurrent ; un fondu bref au changement', () => {
    expect(screenEnter(PAGES[3]!, PAGES[4]!)).toBe('none');
    expect(screenEnter(PAGES[5]!, PAGES[6]!)).toBe('switch');
    expect(screenEnter(PAGES[1]!, PAGES[2]!)).toBe('switch');
    expect(screenEnter(null, PAGES[0]!)).toBe('switch');
  });
});
