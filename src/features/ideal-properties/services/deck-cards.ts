import {
  toVerifyLabels,
  type CategorizedCandidate,
  type WhyPill,
} from '@/features/ideal-properties/services/categorize-ideal';
import {
  budgetPill,
  criteriaCount,
  whyPills,
} from '@/features/ideal-properties/services/why-pills';
import { MAX_IDEAL_SELECTION } from '@/features/ideal-properties/types';
import type { BuyerHit } from '@/features/meeting-conclusion/services/buyer-reconciliation';
import type { SoftReasons } from '@/features/soft-ranking/types';

// La refonte, lot C (maquettes REFONTE-3, 5 et 6) — « un bien à la fois » : ce que dit la carte
// d'un bien, composé ici, hors du composant. Pur. Rien de nouveau n'est lu : ce sont les faits des
// biens idéaux (M118), de ce qui compte pour eux (M151 B) et de l'écart au budget (M122 B).

export type DeckCard = {
  key: string;
  // Le libellé neutre (type · pièces · surface · commune) : jamais un titre ni une adresse.
  label: string;
  photo: string | null;
  price: number | null;
  // « affiché le 24/11/2026 », « Dans l'agence · Pour : M. Lefebvre ».
  origin: string | null;
  // « 8 critères sur 8 » ; `allMet` : tous satisfaits (la coche verte).
  criteria: { label: string; allMet: boolean } | null;
  budget: { tone: 'good' | 'watch'; label: string } | null;
  why: WhyPill[];
  // Ce qui est à savoir avant de proposer : les écarts, ce qui reste à vérifier. Jamais caché.
  notes: string[];
  // Une annonce du marché, ou un bien de l'agence : le lien de la fiche complète le dit.
  listing: boolean;
};

// Les biens du parcours : ceux que la veille a trouvés (la tâche « N nouveaux biens » d'un
// acquéreur mène à ces N biens, « Bien 1 sur N »), ou tous les biens ouverts de sa page (« Les voir
// un par un », depuis la liste).
export type DeckScope = 'watch' | 'all';

// Une annonce du marché — la veille, ou la recherche.
export function marketDeckCard({
  key,
  label,
  entry,
  origin,
  budgetMax,
  reasons,
}: {
  key: string;
  label: string;
  entry: CategorizedCandidate;
  origin: string | null;
  budgetMax: number | null;
  reasons: SoftReasons | undefined;
}): DeckCard {
  const budget = budgetPill(entry.candidate.price, budgetMax);
  const count = criteriaCount(entry.criteriaOk, entry.criteriaTotal);
  return {
    key,
    label,
    photo: entry.candidate.photoUrls[0] ?? null,
    price: entry.candidate.price,
    origin,
    criteria: count ? { label: count, allMet: entry.criteriaOk === entry.criteriaTotal } : null,
    budget,
    why: whyPills(entry.why ?? [], reasons),
    // L'écart au budget est déjà dit par sa pastille.
    notes: [...entry.gaps, ...toVerifyLabels(entry)].filter((note) => note !== budget?.label),
    listing: true,
  };
}

// Un bien de l'agence (un mandat signé, un concurrent à prospecter) : sa photo et ses critères se
// lisent sur sa fiche ; la carte dit sa commune, ce que sa fiche dit de ce qui compte pour eux, et
// ses écarts.
export function agencyDeckCard({
  key,
  label,
  hit,
  sourceLabel,
  budgetMax,
  reasons,
}: {
  key: string;
  label: string;
  hit: BuyerHit;
  sourceLabel: string;
  budgetMax: number | null;
  reasons: SoftReasons | undefined;
}): DeckCard {
  const budget = budgetPill(hit.candidate.price, budgetMax);
  const city = hit.candidate.city?.trim();
  return {
    key,
    label,
    photo: null,
    price: hit.candidate.price,
    origin: `${sourceLabel} · Pour : ${hit.candidate.sellerName}`,
    criteria: null,
    budget,
    why: whyPills(city ? [{ tone: 'plain', label: city }] : [], reasons),
    notes: [hit.note, hit.condominiumNote].filter(
      (note): note is string => note != null && note !== budget?.label,
    ),
    listing: false,
  };
}

// Au-dessus des deux gestes : ce qu'il faut savoir de la sélection avant de décider du bien.
//   • des biens proposés, pas encore enregistrés : la ligne le dit, avec « Retenir la sélection » —
//     rien de proposé ne se perd sans le dire ;
//   • une sélection complète et déjà enregistrée : comment faire de la place.
// `retain` : le bouton est offert (la sélection a changé et n'est pas vide).
export function deckSelectionNote({
  count,
  changed,
}: {
  // Les biens de la sélection en cours (trois au plus).
  count: number;
  // Elle diffère de la sélection enregistrée.
  changed: boolean;
}): { text: string; retain: boolean } | null {
  const full = count >= MAX_IDEAL_SELECTION;
  if (changed && count > 0) {
    return {
      text: full
        ? 'Sélection complète, pas encore enregistrée.'
        : `${count} bien${count > 1 ? 's' : ''} dans la sélection, pas encore enregistrée.`,
      retain: true,
    };
  }
  if (full) {
    return {
      text: 'Sélection complète : pour proposer ce bien, retirez-en un dans toute la liste.',
      retain: false,
    };
  }
  return null;
}
