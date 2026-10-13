import { describe, expect, it } from 'vitest';

import {
  IMPORT_RETRY_DELAYS_MS,
  MAX_LISTING_HTML_BYTES,
  importListing,
  isImported,
  isRetained,
  type ImportListingDeps,
  type PageImportResult,
  type PageRead,
  type ReadFailureCause,
  type SearchImportResult,
} from '@/features/competitor-search/services/import-listing';

// Mission 101 — aucun bien retenu perdu : quelle que soit la cause de l'échec, l'import finit par
// un concurrent dans le dossier ou par un « import en attente » — jamais par rien.

const URL = 'https://www.seloger.com/annonces/achat/appartement/cagnes-sur-mer-06/123.htm';
const PAGE: PageRead = { ok: true, html: '<html>annonce</html>', finalUrl: URL };
const never = <T>() => new Promise<T>(() => {});

type Script = {
  reads?: (PageRead | 'throw' | 'never')[];
  imports?: (PageImportResult | 'throw' | 'never')[];
  search?: SearchImportResult | 'throw' | 'never';
  withdrawn?: boolean;
};

function harness(script: Script) {
  const log = {
    reads: [] as boolean[],
    imports: 0,
    search: [] as boolean[],
    waits: [] as number[],
    reported: [] as { cause: ReadFailureCause; attempts: number }[],
  };
  const next = <T>(list: (T | 'throw' | 'never')[] | undefined, index: number, fallback: T) => {
    const step = list == null ? fallback : (list[Math.min(index, list.length - 1)] ?? fallback);
    if (step === 'throw') return Promise.reject(new Error('panne'));
    if (step === 'never') return never<T>();
    return Promise.resolve(step);
  };
  const deps: ImportListingDeps = {
    readPage: (_url, { freshWindow }) => {
      log.reads.push(freshWindow);
      return next(script.reads, log.reads.length - 1, PAGE);
    },
    isWithdrawn: () => script.withdrawn === true,
    importPage: () => {
      log.imports += 1;
      return next(script.imports, log.imports - 1, { ok: true } as PageImportResult);
    },
    createFromSearch: (_url, { withdrawn }) => {
      log.search.push(withdrawn);
      return next(script.search == null ? undefined : [script.search], 0, {
        ok: true,
      } as SearchImportResult);
    },
    reportReadFailure: async (_url, cause, attempts) => {
      log.reported.push({ cause, attempts });
    },
    wait: async (ms) => {
      log.waits.push(ms);
    },
    attemptTimeoutMs: 20,
  };
  return { deps, log };
}

describe('importListing — le chemin normal', () => {
  it('la page se lit du premier coup : importée, sans attente ni signalement', async () => {
    const { deps, log } = harness({});
    expect(await importListing(URL, deps)).toEqual({ status: 'imported', attempts: 1 });
    expect(log).toMatchObject({ reads: [false], imports: 1, search: [], waits: [], reported: [] });
  });

  it('trois tentatives : après 2 s, puis 5 s, la dernière dans une fenêtre neuve', async () => {
    const { deps, log } = harness({
      reads: [{ ok: false, reason: 'network' }, { ok: false, reason: 'network' }, PAGE],
    });
    expect(await importListing(URL, deps)).toEqual({ status: 'imported', attempts: 3 });
    expect(log.waits).toEqual([2000, 5000]);
    expect(IMPORT_RETRY_DELAYS_MS).toEqual([2000, 5000]);
    expect(log.reads).toEqual([false, false, true]);
    expect(log.search).toEqual([]);
  });

  it('un import refusé par le serveur se retente aussi', async () => {
    const { deps, log } = harness({ imports: [{ ok: false }, { ok: true }] });
    expect(await importListing(URL, deps)).toEqual({ status: 'imported', attempts: 2 });
    expect(log.imports).toBe(2);
  });
});

// Chaque cause d'échec, telle qu'elle se présente, et ce qu'on attend : la cause notée, le nombre
// de lectures, et un concurrent créé depuis la recherche.
const CAUSES: {
  name: string;
  script: Script;
  cause: ReadFailureCause;
  attempts: number;
}[] = [
  {
    name: 'réseau : la page ne répond jamais',
    script: { reads: [{ ok: false, reason: 'network' }] },
    cause: 'network',
    attempts: 3,
  },
  {
    name: 'robots.txt : le site refuse — inutile de réessayer',
    script: { reads: [{ ok: false, reason: 'robots' }] },
    cause: 'robots',
    attempts: 1,
  },
  {
    name: 'adresse invalide — inutile de réessayer',
    script: { reads: [{ ok: false, reason: 'invalid' }] },
    cause: 'invalid',
    attempts: 1,
  },
  {
    name: 'délai : l’extension ne répond pas en 30 secondes',
    script: { reads: ['never'] },
    cause: 'timeout',
    attempts: 3,
  },
  {
    name: 'délai annoncé par l’extension elle-même',
    script: { reads: [{ ok: false, reason: 'timeout' }] },
    cause: 'timeout',
    attempts: 3,
  },
  {
    name: 'site qui refuse la page (403)',
    script: { reads: [{ ok: false, reason: 'forbidden' }] },
    cause: 'network',
    attempts: 3,
  },
  {
    name: 'l’extension plante',
    script: { reads: ['throw'] },
    cause: 'network',
    attempts: 3,
  },
  {
    name: 'page vide',
    script: { reads: [{ ok: true, html: '   ', finalUrl: URL }] },
    cause: 'network',
    attempts: 3,
  },
  {
    name: 'taille : la page dépasse ce que l’import accepte — inutile de réessayer',
    script: {
      reads: [{ ok: true, html: 'a'.repeat(MAX_LISTING_HTML_BYTES + 1), finalUrl: URL }],
    },
    cause: 'too_large',
    attempts: 1,
  },
  {
    name: 'le serveur refuse l’import à chaque fois',
    script: { imports: [{ ok: false }] },
    cause: 'server',
    attempts: 3,
  },
  {
    name: 'l’appel d’import est rejeté (l’erreur du 12/10)',
    script: { imports: ['throw'] },
    cause: 'server',
    attempts: 3,
  },
  {
    name: 'le serveur ne répond pas à l’import',
    script: { imports: ['never'] },
    cause: 'timeout',
    attempts: 3,
  },
];

describe('importListing — chaque cause d’échec finit par un concurrent importé', () => {
  it.each(CAUSES)('$name', async ({ script, cause, attempts }) => {
    const { deps, log } = harness(script);
    const outcome = await importListing(URL, deps);
    expect(outcome).toEqual({ status: 'imported_from_search', cause, attempts });
    expect(isImported(outcome)).toBe(true);
    expect(isRetained(outcome)).toBe(true);
    // Créé depuis la recherche, comme un bien toujours en ligne ; la cause est signalée une fois.
    expect(log.search).toEqual([false]);
    expect(log.reported).toEqual([{ cause, attempts }]);
    expect(log.reads).toHaveLength(attempts);
  });

  it('une page trop lourde n’est jamais envoyée au serveur', async () => {
    const { deps, log } = harness(CAUSES.find((c) => c.cause === 'too_large')!.script);
    await importListing(URL, deps);
    expect(log.imports).toBe(0);
  });
});

describe('importListing — une annonce retirée entre quand même, sans être retenue', () => {
  it.each([
    ['la page renvoie ailleurs que sur l’annonce', { withdrawn: true }],
    [
      'la page prouve le retrait (404, mention explicite du portail)',
      { imports: [{ ok: false, code: 'listing_withdrawn' }] },
    ],
  ] as [string, Script][])('%s', async (_name, script) => {
    const { deps, log } = harness(script);
    const outcome = await importListing(URL, deps);
    expect(outcome).toEqual({ status: 'imported_withdrawn', attempts: 1 });
    expect(isImported(outcome)).toBe(true);
    expect(isRetained(outcome)).toBe(false);
    expect(log.search).toEqual([true]);
    expect(log.reported).toEqual([{ cause: 'withdrawn', attempts: 1 }]);
  });
});

// Mission 103 — une page sans prix ni donnée, SANS preuve de retrait : une page captcha, un
// gabarit de portail modifié. Ce n'est pas une annonce retirée : le concurrent reste retenu.
describe('importListing — une page sans données n’écarte pas un concurrent retenu', () => {
  it('relue trois fois, puis créée depuis la recherche, retenue', async () => {
    const { deps, log } = harness({ imports: [{ ok: false, code: 'listing_empty' }] });
    const outcome = await importListing(URL, deps);
    expect(outcome).toEqual({ status: 'imported_from_search', cause: 'empty', attempts: 3 });
    expect(isRetained(outcome)).toBe(true);
    expect(log.search).toEqual([false]);
    expect(log.reported).toEqual([{ cause: 'empty', attempts: 3 }]);
  });

  it('la page revient à la deuxième lecture : importée depuis sa page', async () => {
    const { deps, log } = harness({
      imports: [{ ok: false, code: 'listing_empty' }, { ok: true }],
    });
    expect(await importListing(URL, deps)).toEqual({ status: 'imported', attempts: 2 });
    expect(log.search).toEqual([]);
  });
});

describe('importListing — quand même la recherche ne suffit pas : « import en attente », visible', () => {
  it.each([
    ['la carte n’a pas de prix', { ok: false, code: 'no_price' } as SearchImportResult, 'no_price'],
    ['le serveur refuse la création', { ok: false } as SearchImportResult, 'network'],
    ['la création plante', 'throw' as const, 'network'],
    ['la création ne répond pas', 'never' as const, 'network'],
  ])('%s', async (_name, search, cause) => {
    const { deps } = harness({ reads: [{ ok: false, reason: 'network' }], search });
    const outcome = await importListing(URL, deps);
    expect(outcome).toEqual({ status: 'pending', cause, attempts: 3 });
    expect(isImported(outcome)).toBe(false);
    expect(isRetained(outcome)).toBe(false);
  });

  it('un signalement en panne ne retient pas l’import', async () => {
    const { deps } = harness({ reads: [{ ok: false, reason: 'robots' }] });
    deps.reportReadFailure = () => Promise.reject(new Error('journal en panne'));
    expect((await importListing(URL, deps)).status).toBe('imported_from_search');
    deps.reportReadFailure = () => never<void>();
    expect((await importListing(URL, deps)).status).toBe('imported_from_search');
  });

  it('ne lève jamais, et ne rend jamais autre chose que ses quatre issues', async () => {
    const steps = ['throw', 'never', { ok: false, reason: 'network' } as PageRead, PAGE] as const;
    for (const read of steps) {
      for (const search of ['throw', 'never', { ok: true } as SearchImportResult] as const) {
        const { deps } = harness({ reads: [read], imports: ['throw'], search });
        const outcome = await importListing(URL, deps);
        expect(['imported', 'imported_from_search', 'imported_withdrawn', 'pending']).toContain(
          outcome.status,
        );
      }
    }
  });
});
