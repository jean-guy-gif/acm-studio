import 'server-only';

import {
  billedAdverts,
  STREAM_ESTATE_ENDPOINT,
} from '@/features/competitor-search/services/stream-estate';
import type { FetchStreamEstatePage } from '@/features/competitor-search/services/stream-estate-tiers';
import { reportServerError } from '@/lib/app-errors/report-server-error';

export const STREAM_ESTATE_TIMEOUT_MS = 10_000;

// Mission 118 — la lecture d'UNE page de l'API Stream Estate, partagée par la recherche d'un bien
// vendeur (M71) et celle d'un acquéreur : la clé reste au serveur, chaque réponse est comptée
// (`onBilled`, M100), un refus 401/403 est dit comme tel, toute autre erreur entre au journal.
// Un refactoring de `searchStreamEstate` : aucun comportement ne change.
export function liveStreamEstatePage(
  apiKey: string,
  onBilled: (count: number) => void,
  reporter = 'searchStreamEstate',
): FetchStreamEstatePage {
  return async (params) => {
    try {
      const response = await fetch(`${STREAM_ESTATE_ENDPOINT}?${params}`, {
        headers: { 'X-API-KEY': apiKey, Accept: 'application/ld+json' },
        signal: AbortSignal.timeout(STREAM_ESTATE_TIMEOUT_MS),
        cache: 'no-store',
      });
      if (response.status === 401 || response.status === 403) {
        await reportServerError(reporter, new Error(`refus de l’API (${response.status})`));
        return { ok: false, refused: true };
      }
      if (!response.ok) throw new Error(`Stream Estate ${response.status}`);
      const json: unknown = await response.json();
      onBilled(billedAdverts(json));
      return { ok: true, json };
    } catch (error) {
      await reportServerError(reporter, error);
      return { ok: false, refused: false };
    }
  };
}
