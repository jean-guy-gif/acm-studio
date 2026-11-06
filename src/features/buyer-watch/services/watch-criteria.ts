import type { Buyer } from '@/features/buyers/types';
import { findAsCandidate, type WatchFind } from '@/features/buyer-watch/services/watch-finds';
import { categorizeIdeal } from '@/features/ideal-properties/services/categorize-ideal';
import { idealSearchCriteria } from '@/features/ideal-properties/services/ideal-criteria';
import { IDEAL_CATEGORIES } from '@/features/ideal-properties/types';

// Mission 136 — un bien trouvé par la veille ne compte que s'il ne contredit aucun indispensable
// de la fiche, jugé comme sur la page des biens idéaux (M118 : budget ★ au-delà du plafond, parking,
// ascenseur, travaux… que la requête ne filtre pas). À l'écriture du passage comme à la lecture : la
// fiche a pu changer depuis, et la tâche ne promet jamais plus de biens que la page n'en montre. Pur.
export function findsForBuyer(buyer: Buyer, finds: WatchFind[]): WatchFind[] {
  if (finds.length === 0) return [];
  const deduced = idealSearchCriteria(buyer);
  const categorized = categorizeIdeal(
    buyer,
    finds.map(findAsCandidate),
    deduced.ok ? deduced.criteria : null,
  );
  const kept = new Set(
    IDEAL_CATEGORIES.flatMap((category) =>
      categorized.byCategory[category].map((entry) => entry.candidate.url),
    ),
  );
  return finds.filter((find) => kept.has(find.url));
}
