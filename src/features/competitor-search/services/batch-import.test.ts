import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  BATCH_CRASH_REASON,
  BATCH_ITEM_TIMEOUT_MS,
  BATCH_TIMEOUT_REASON,
  batchProgressLabel,
  runBatchImport,
  type BatchItemOutcome,
  type BatchProgress,
} from '@/features/competitor-search/services/batch-import';

// Correctif du 12/10 — l'import en lot ne se fige plus : une fiche qui plante et une fiche qui ne
// répond pas sont comptées en échec, et le lot va au bout.

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const never = () => new Promise<BatchItemOutcome>(() => {});

async function run(behaviours: Record<string, () => Promise<BatchItemOutcome>>): Promise<{
  result: Awaited<ReturnType<typeof runBatchImport<string>>>;
  progress: BatchProgress[];
  calls: string[];
}> {
  const progress: BatchProgress[] = [];
  const calls: string[] = [];
  const pending = runBatchImport({
    items: Object.keys(behaviours),
    importItem: (item) => {
      calls.push(item);
      return behaviours[item]();
    },
    onProgress: (step) => progress.push(step),
  });
  await vi.runAllTimersAsync();
  return { result: await pending, progress, calls };
}

describe('runBatchImport', () => {
  it('une fiche qui PLANTE et une fiche qui NE RÉPOND PAS n’arrêtent pas le lot', async () => {
    const { result, progress, calls } = await run({
      a: async () => ({ ok: true }),
      plante: async () => {
        throw new Error('Maximum array nesting exceeded.');
      },
      muette: never,
      refusée: async () => ({ ok: false, reason: 'Prix introuvable sur la fiche.' }),
      b: async () => ({ ok: true }),
      c: async () => ({ ok: true }),
    });

    expect(calls).toEqual(['a', 'plante', 'muette', 'refusée', 'b', 'c']);
    expect(result.imported).toEqual(['a', 'b', 'c']);
    expect(result.failures).toEqual([
      { item: 'plante', reason: BATCH_CRASH_REASON },
      { item: 'muette', reason: BATCH_TIMEOUT_REASON },
      { item: 'refusée', reason: 'Prix introuvable sur la fiche.' },
    ]);
    // Le compteur dit les fiches traitées, échecs compris, jusqu'au bout.
    expect(progress.at(-1)).toEqual({ done: 6, failed: 3, total: 6 });
    expect(progress.map(batchProgressLabel)).toEqual([
      '0 sur 6',
      '1 sur 6',
      '2 sur 6 · 1 en échec',
      '3 sur 6 · 2 en échec',
      '4 sur 6 · 3 en échec',
      '5 sur 6 · 3 en échec',
      '6 sur 6 · 3 en échec',
    ]);
  });

  it('une fiche qui plante de façon synchrone est un échec, pas une exception', async () => {
    const { result } = await run({
      a: () => {
        throw new Error('avant même la promesse');
      },
      b: async () => ({ ok: true }),
    });
    expect(result.imported).toEqual(['b']);
    expect(result.failures).toEqual([{ item: 'a', reason: BATCH_CRASH_REASON }]);
  });

  it('attend une fiche lente 30 secondes, pas une de plus', async () => {
    const progress: BatchProgress[] = [];
    const pending = runBatchImport({
      items: ['lente'],
      importItem: never,
      onProgress: (step) => progress.push(step),
    });
    await vi.advanceTimersByTimeAsync(BATCH_ITEM_TIMEOUT_MS - 1);
    expect(progress.at(-1)).toEqual({ done: 0, failed: 0, total: 1 });
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending).failures).toEqual([{ item: 'lente', reason: BATCH_TIMEOUT_REASON }]);
    expect(BATCH_ITEM_TIMEOUT_MS).toBe(30_000);
  });

  it('une fiche qui répond à temps n’est pas comptée en échec plus tard', async () => {
    const { result } = await run({
      a: () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 29_000)),
    });
    expect(result).toEqual({ imported: ['a'], failures: [] });
  });

  it('un lot sans échec ne parle pas d’échec', () => {
    expect(batchProgressLabel({ done: 5, failed: 0, total: 6 })).toBe('5 sur 6');
    expect(batchProgressLabel({ done: 5, failed: 1, total: 6 })).toBe('5 sur 6 · 1 en échec');
  });
});

// L'écran rend TOUJOURS la main : la fin de l'import et l'écriture des décisions sont dans un
// `finally`, pas à la suite d'un lot qui pourrait ne pas arriver au bout.
describe('validateBatch (écran)', () => {
  it('écrit les décisions des fiches entrées et rend la main dans un finally', async () => {
    const { readFileSync } = await vi.importActual<typeof import('node:fs')>('node:fs');
    const source = readFileSync(
      `${process.cwd()}/src/features/competitor-search/components/competitor-search-panel.tsx`,
      'utf8',
    );
    const body = source.slice(
      source.indexOf('async function validateBatch()'),
      source.indexOf('async function importFromPortal('),
    );
    const afterFinally = body.slice(body.indexOf('} finally {'));
    expect(body).toContain('runBatchImport({');
    expect(afterFinally).toContain('recordDecisionsAction(decisions)');
    expect(afterFinally).toContain('batchDecisions(retained)');
    expect(afterFinally).toContain('setImporting(false)');
    expect(afterFinally).toContain('closeSearchWindowViaExtension(win.windowId)');
    // Plus rien après le finally : rien ne dépend d'un lot arrivé au bout.
    expect(afterFinally.slice(afterFinally.lastIndexOf('setImporting(false)'))).not.toMatch(
      /await /,
    );
  });
});
