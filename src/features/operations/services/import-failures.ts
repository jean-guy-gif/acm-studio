import {
  READ_FAILURE_CAUSES,
  READ_FAILURE_LABELS,
  type ReadFailureCause,
} from '@/features/competitor-search/services/import-listing';

// Mission 101 — le taux réel d'échec de lecture par portail. Les lignes du journal d'origine
// « import » disent « seloger.com · robots » : le portail et la clé de la cause, jamais l'adresse
// de l'annonce. Pur.

export const IMPORT_SOURCE = 'import';

export type PortalFailureStats = {
  host: string;
  // Biens dont la page n'a pas pu être lue, et concurrents créés depuis leur page.
  failed: number;
  read: number;
  // Part des lectures en échec, en % entier ; null sans aucune lecture.
  failureRate: number | null;
  causes: { cause: ReadFailureCause; label: string; count: number }[];
};

const bareHost = (host: string): string =>
  host
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');

function hostOf(listingUrl: string | null): string | null {
  try {
    return listingUrl ? bareHost(new URL(listingUrl).hostname) : null;
  } catch {
    return null;
  }
}

const isCause = (value: string): value is ReadFailureCause =>
  (READ_FAILURE_CAUSES as readonly string[]).includes(value);

// Une ligne qui n'a pas la forme attendue est ignorée, pas devinée.
export function importFailureStats(
  failureMessages: string[],
  importedListingUrls: (string | null)[],
): PortalFailureStats[] {
  const stats = new Map<string, { read: number; causes: Map<ReadFailureCause, number> }>();
  const entry = (host: string) => {
    let found = stats.get(host);
    if (!found) {
      found = { read: 0, causes: new Map() };
      stats.set(host, found);
    }
    return found;
  };
  for (const message of failureMessages) {
    const [host, cause, ...rest] = message.split(' · ');
    if (!host || !cause || rest.length > 0 || !isCause(cause) || !host.includes('.')) continue;
    const causes = entry(bareHost(host)).causes;
    causes.set(cause, (causes.get(cause) ?? 0) + 1);
  }
  for (const url of importedListingUrls) {
    const host = hostOf(url);
    if (host) entry(host).read += 1;
  }
  return [...stats.entries()]
    .map(([host, { read, causes }]) => {
      const failed = [...causes.values()].reduce((sum, count) => sum + count, 0);
      const total = failed + read;
      return {
        host,
        failed,
        read,
        failureRate: total > 0 ? Math.round((failed / total) * 100) : null,
        causes: [...causes.entries()]
          .map(([cause, count]) => ({ cause, label: READ_FAILURE_LABELS[cause], count }))
          .sort((a, b) => b.count - a.count || a.cause.localeCompare(b.cause)),
      };
    })
    .sort((a, b) => b.failed - a.failed || a.host.localeCompare(b.host));
}
