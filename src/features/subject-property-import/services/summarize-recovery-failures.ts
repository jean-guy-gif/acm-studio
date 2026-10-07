// Mission 76 — « N échec(s) » alone told the advisor nothing. The failures of one
// recovery are grouped by cause, in order of first appearance, so the screen can say
// each cause once with the number of photos it concerns.

export type RecoveryFailureCause = { cause: string; count: number };

export function summarizeRecoveryFailures(errors: readonly string[]): RecoveryFailureCause[] {
  const counts = new Map<string, number>();
  for (const error of errors) {
    const cause = error.trim();
    if (cause !== '') {
      counts.set(cause, (counts.get(cause) ?? 0) + 1);
    }
  }
  return [...counts].map(([cause, count]) => ({ cause, count }));
}
