// Mission 75 — tant que le Localisateur dit « en cours », ACM redemande toutes les 10 s pendant
// 2 min, puis s'arrête : la suite se lit à la prochaine ouverture du dossier.
export const LOCATOR_POLL_INTERVAL_MS = 10_000;
export const LOCATOR_POLL_WINDOW_MS = 120_000;

export function nextPollDelayMs(pending: boolean, elapsedMs: number): number | null {
  if (!pending || elapsedMs + LOCATOR_POLL_INTERVAL_MS > LOCATOR_POLL_WINDOW_MS) {
    return null;
  }
  return LOCATOR_POLL_INTERVAL_MS;
}
