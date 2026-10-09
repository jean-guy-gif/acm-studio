import { nextPollDelayMs } from '@/features/competitor-locator/services/poll-schedule';
import type { SyncOutcome } from '@/features/competitor-locator/services/sync-competitor-locations';

// Mission 75 — la veille : une passe tout de suite, puis toutes les 10 s tant qu'une analyse est
// « en cours », 2 min au plus. `start()` repart de zéro (après un import, ou quand le conseiller
// revient sur l'onglet) ; `stop()` arrête tout.
export type LocationWatch = { start: () => void; stop: () => void };

export function createLocationWatch(deps: {
  sync: () => Promise<SyncOutcome>;
  onOutcome: (outcome: SyncOutcome) => void;
  now?: () => number;
}): LocationWatch {
  const now = deps.now ?? (() => Date.now());
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    generation += 1;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const start = () => {
    cancel();
    const current = generation;
    const startedAt = now();

    const pass = async () => {
      let outcome: SyncOutcome;
      try {
        outcome = await deps.sync();
      } catch {
        return;
      }
      if (current !== generation) {
        return;
      }
      deps.onOutcome(outcome);
      const delay = nextPollDelayMs(outcome.pending, now() - startedAt);
      if (delay !== null) {
        timer = setTimeout(() => void pass(), delay);
      }
    };

    void pass();
  };

  return { start, stop: cancel };
}
