// Correctif du 12/10 — l'import en lot ne se fige plus. Chaque fiche est isolée : une fiche qui
// plante ou qui ne répond pas est comptée en échec, nommée, et les suivantes passent quand même.
// Le lot rend toujours la main, avec ce qui est entré et ce qui ne l'est pas.

export const BATCH_ITEM_TIMEOUT_MS = 30_000;
export const BATCH_PAUSE_MS = 1000;
export const BATCH_TIMEOUT_REASON =
  'la fiche n’a pas répondu en 30 secondes (elle peut être entrée quand même\u00a0: vérifiez la liste des concurrents avant de la relancer)';
export const BATCH_CRASH_REASON = 'l’import de la fiche a été interrompu par une erreur';

export type BatchItemOutcome = { ok: true } | { ok: false; reason: string };
export type BatchProgress = { done: number; failed: number; total: number };
export type BatchResult<T> = { imported: T[]; failures: { item: T; reason: string }[] };

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Une fiche : son résultat, ou un échec si elle lève, ou si elle ne répond pas à temps. Ne lève
// jamais.
async function runOne<T>(
  item: T,
  importItem: (item: T) => Promise<BatchItemOutcome>,
  timeoutMs: number,
): Promise<BatchItemOutcome> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<BatchItemOutcome>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, reason: BATCH_TIMEOUT_REASON }), timeoutMs);
  });
  try {
    return await Promise.race([
      importItem(item).catch((): BatchItemOutcome => ({ ok: false, reason: BATCH_CRASH_REASON })),
      timeout,
    ]);
  } catch {
    return { ok: false, reason: BATCH_CRASH_REASON };
  } finally {
    clearTimeout(timer);
  }
}

export async function runBatchImport<T>(options: {
  items: T[];
  importItem: (item: T) => Promise<BatchItemOutcome>;
  onProgress?: (progress: BatchProgress) => void;
  timeoutMs?: number;
  pauseMs?: number;
}): Promise<BatchResult<T>> {
  const { items, importItem, onProgress } = options;
  const timeoutMs = options.timeoutMs ?? BATCH_ITEM_TIMEOUT_MS;
  const pauseMs = options.pauseMs ?? BATCH_PAUSE_MS;
  const imported: T[] = [];
  const failures: { item: T; reason: string }[] = [];
  const report = () =>
    onProgress?.({
      done: imported.length + failures.length,
      failed: failures.length,
      total: items.length,
    });
  report();
  for (let index = 0; index < items.length; index += 1) {
    if (index > 0 && pauseMs > 0) await wait(pauseMs);
    const outcome = await runOne(items[index], importItem, timeoutMs);
    if (outcome.ok) imported.push(items[index]);
    else failures.push({ item: items[index], reason: outcome.reason });
    report();
  }
  return { imported, failures };
}

// « 5 sur 6 · 1 en échec » — les fiches TRAITÉES, pas seulement celles qui sont entrées.
export function batchProgressLabel(progress: BatchProgress): string {
  const base = `${progress.done} sur ${progress.total}`;
  return progress.failed > 0 ? `${base} · ${progress.failed} en échec` : base;
}
