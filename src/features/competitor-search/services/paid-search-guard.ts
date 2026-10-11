import {
  STREAM_ESTATE_BILLING_CAP,
  STREAM_ESTATE_PRICE_PER_ADVERT_EUR,
} from '@/features/competitor-search/services/stream-estate-tiers';
import type { CompetitorSearchCriteria } from '@/features/competitor-search/types';
import { formatEuro } from '@/lib/format';

// Mission 93 — aucune recherche Stream Estate payée pour rien.
//
//   1. Seule l'extension ACM permet d'importer un bien trouvé : sans elle, la recherche ne part
//      pas — aucun appel facturé.
//   2. Le dernier résultat est gardé pour ce dossier, le temps de la séance, dans le stockage de
//      l'onglet : une actualisation ou un retour arrière le réaffiche sans nouvel appel.
//   3. Il est jeté dès que le bien vendeur ou la fourchette change (l'empreinte ne correspond
//      plus) : un résultat périmé ne s'affiche jamais.

// --- 1. Pas d'appel payant sans extension --------------------------------------------------

export type PaidSearchOutcome<T> = { ran: true; result: T } | { ran: false; reason: 'extension' };

// `search` n'est appelé QUE si l'extension répond. C'est la seule voie vers l'appel facturé.
export async function runPaidSearch<T>(
  ping: () => Promise<{ available: boolean }>,
  search: () => Promise<T>,
): Promise<PaidSearchOutcome<T>> {
  const extension = await ping();
  if (!extension.available) {
    return { ran: false, reason: 'extension' };
  }
  return { ran: true, result: await search() };
}

// « Coût maximal : 0,60 € par recherche » — le plafond automatique (M71), dit avant de payer.
export const STREAM_ESTATE_MAX_COST_LABEL = `Coût maximal : ${formatEuro(
  STREAM_ESTATE_BILLING_CAP * STREAM_ESTATE_PRICE_PER_ADVERT_EUR,
  { minDecimals: 2, maxDecimals: 2 },
)} par recherche`;

// --- 2 et 3. Le dernier résultat, gardé puis invalidé --------------------------------------

// Ce dont dépend une recherche : le bien vendeur (adresse comprise, elle fixe le secteur) et la
// fourchette. Calculée côté serveur, depuis la base — jamais depuis ce que l'écran affiche.
export function searchFingerprint(
  criteria: CompetitorSearchCriteria,
  address: string | null,
): string {
  const entries = Object.entries({ ...criteria, address: address?.trim() || null }).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  return JSON.stringify(entries);
}

export type KeptSearch<P, N> = { fingerprint: string; portal: P; note: N };

type TabStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const KEPT_SEARCH_KEY_PREFIX = 'acm-stream-estate:';
const keyOf = (projectId: string) => `${KEPT_SEARCH_KEY_PREFIX}${projectId}`;

export function keepSearch<P, N>(
  storage: TabStorage,
  projectId: string,
  kept: KeptSearch<P, N>,
): void {
  try {
    storage.setItem(keyOf(projectId), JSON.stringify(kept));
  } catch {
    // Stockage plein ou refusé : la recherche reste affichée, elle ne sera juste pas gardée.
  }
}

export function forgetSearch(storage: TabStorage, projectId: string): void {
  try {
    storage.removeItem(keyOf(projectId));
  } catch {
    // Rien à oublier.
  }
}

// Y a-t-il quelque chose de gardé pour ce dossier ? (Évite de demander l'empreinte pour rien.)
export function hasKeptSearch(storage: TabStorage, projectId: string): boolean {
  try {
    return storage.getItem(keyOf(projectId)) != null;
  } catch {
    return false;
  }
}

// Le résultat gardé, SEULEMENT si le bien et la fourchette n'ont pas changé ; sinon il est jeté.
export function recallSearch<P, N>(
  storage: TabStorage,
  projectId: string,
  fingerprint: string,
): KeptSearch<P, N> | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(keyOf(projectId));
  } catch {
    return null;
  }
  if (raw == null) {
    return null;
  }
  try {
    const kept = JSON.parse(raw) as Partial<KeptSearch<P, N>> | null;
    if (
      kept != null &&
      kept.fingerprint === fingerprint &&
      kept.portal != null &&
      kept.note != null
    ) {
      return kept as KeptSearch<P, N>;
    }
  } catch {
    // Contenu illisible : jeté comme un résultat périmé.
  }
  forgetSearch(storage, projectId);
  return null;
}
