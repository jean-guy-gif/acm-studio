import {
  isDefaultFilters,
  queryFilters,
} from '@/features/competitor-search/services/search-filters';
import {
  STREAM_ESTATE_BILLING_CAP,
  STREAM_ESTATE_PRICE_PER_ADVERT_EUR,
} from '@/features/competitor-search/services/stream-estate-tiers';
import {
  isDefaultSettings,
  type SearchSettings,
} from '@/features/competitor-search/services/search-settings';
import type { CompetitorSearchCriteria } from '@/features/competitor-search/types';
import { formatEuro } from '@/lib/format';

// Mission 93 — aucune recherche Stream Estate payée pour rien.
//
//   1. Seule l'extension ACM permet d'importer un bien trouvé : sans elle, la recherche ne part
//      pas — aucun appel facturé.
//   2. Le dernier résultat est gardé pour ce dossier — mission 105 : sur le dossier, côté serveur
//      (`kept-result.ts`) —, et se réaffiche sans nouvel appel.
//   3. Il est jeté dès que le bien vendeur ou la fourchette change (l'empreinte ne correspond
//      plus) : un résultat périmé ne s'affiche jamais. Mission 99 — un réglage de la recherche
//      qui change le jette aussi : on ne relit pas le résultat d'autres critères.

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
// Mission 105 — le montant seul : « 0,60 € », pour la confirmation avant de relancer.
export const STREAM_ESTATE_MAX_COST = formatEuro(
  STREAM_ESTATE_BILLING_CAP * STREAM_ESTATE_PRICE_PER_ADVERT_EUR,
  { minDecimals: 2, maxDecimals: 2 },
);
export const STREAM_ESTATE_MAX_COST_LABEL = `Coût maximal : ${STREAM_ESTATE_MAX_COST} par recherche`;

// --- 2 et 3. Le dernier résultat, gardé puis invalidé --------------------------------------

// Ce dont dépend une recherche : le bien vendeur (adresse comprise, elle fixe le secteur) et la
// fourchette. Calculée côté serveur, depuis la base — jamais depuis ce que l'écran affiche.
// Sans réglage, l'empreinte est celle d'avant la mission 99 : ce qui était gardé le reste.
// Mission 108 — des « Prix recherchés » réglés à part remplacent la fourchette de la fiche dans la
// recherche : la fourchette n'entre alors plus dans l'empreinte, et la changer ne jette plus le
// résultat payé.
export function searchFingerprint(
  criteria: CompetitorSearchCriteria,
  address: string | null,
  settings: SearchSettings | null = null,
): string {
  const used: Partial<CompetitorSearchCriteria> = { ...criteria };
  if (settings?.price != null) {
    delete used.advisorPriceMin;
    delete used.advisorPriceMax;
  }
  const entries = Object.entries({ ...used, address: address?.trim() || null }).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  // Mission 111 — seuls les critères de la REQUÊTE entrent dans l'empreinte : l'étage,
  // l'extérieur, le terrain et la piscine trient les biens déjà reçus, à chaque lecture, et ne
  // jettent pas le résultat payé. Sans critère de requête réglé, l'empreinte reste celle d'avant
  // les missions 110 et 111 : aucun résultat gardé ne se perd au déploiement.
  const queried = settings ? { ...settings, filters: queryFilters(settings.filters) } : null;
  if (isDefaultSettings(queried)) return JSON.stringify(entries);
  const { filters, ...rest } = queried!;
  return JSON.stringify([...entries, ['settings', isDefaultFilters(filters) ? rest : queried]]);
}
