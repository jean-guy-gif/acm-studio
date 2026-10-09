import { parseLocatorProperty } from '@/features/competitor-locator/schemas/locator-property';
import type {
  CompetitorToLocate,
  LocatorAvailability,
  RawLocatorEntry,
} from '@/features/competitor-locator/types';

// Mission 75 — une passe : demander au Localisateur les adresses qui manquent, enregistrer ce
// qu'il rend. Les dépendances (extension, actions serveur) sont injectées : la logique se teste
// sans navigateur.
export type SyncOutcome = {
  availability: LocatorAvailability;
  // Au moins une analyse « en cours » : ACM redemandera.
  pending: boolean;
  // Nombre de concurrents dont l'enregistrement a changé.
  changed: number;
};

export type SyncDeps = {
  ping: () => Promise<LocatorAvailability>;
  loadToLocate: () => Promise<CompetitorToLocate[]>;
  fetchProperties: (
    urls: string[],
  ) => Promise<
    | { ok: true; properties: Record<string, unknown> }
    | { ok: false; reason: 'sharing_off' | 'error' }
  >;
  save: (entries: RawLocatorEntry[]) => Promise<{ ok: boolean; changed: number }>;
  maxUrls: number;
};

export async function syncCompetitorLocations(deps: SyncDeps): Promise<SyncOutcome> {
  const availability = await deps.ping();
  if (availability !== 'ready') {
    return { availability, pending: false, changed: 0 };
  }

  const urls = [...new Set((await deps.loadToLocate()).map((competitor) => competitor.listingUrl))];
  const entries: RawLocatorEntry[] = [];
  let pending = false;

  for (let start = 0; start < urls.length; start += deps.maxUrls) {
    const batch = urls.slice(start, start + deps.maxUrls);
    const result = await deps.fetchProperties(batch);
    if (!result.ok) {
      if (result.reason === 'sharing_off') {
        return { availability: 'sharing_off', pending: false, changed: 0 };
      }
      continue;
    }
    for (const listingUrl of batch) {
      // Seules les annonces demandées sont lues : une clé en trop est ignorée.
      const raw = Object.hasOwn(result.properties, listingUrl)
        ? result.properties[listingUrl]
        : undefined;
      const location = parseLocatorProperty(raw);
      if (location) {
        entries.push({ listingUrl, raw });
        pending = pending || location.state === 'en-cours';
      }
    }
  }

  const saved = entries.length > 0 ? await deps.save(entries) : { ok: true, changed: 0 };
  return { availability, pending, changed: saved.changed };
}
