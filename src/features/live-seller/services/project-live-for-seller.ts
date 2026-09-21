import type {
  FeatureComparison,
  LiveComparableResponse,
  LivePriceGaps,
  LiveSellerSummary,
  MarketDuration,
  PriceHistory,
  PriceReveal,
} from '@/features/live-seller/types';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import type {
  LiveAdvisorDecision,
  LiveComparableEntry,
  LiveComparativeData,
} from '@/features/seller-presentation/types/seller-presentation';

// MISSION 51 §2.2 — LISTE D'AUTORISATION, pas d'exclusion. Le défaut mesuré : la
// charge `/live` portait TOUS les prix concurrents dès le premier écran (prix, prix/m²,
// titre brut, slug d'URL), et la fourchette conseiller — invisibles mais présents, donc
// dans le navigateur avant que le vendeur ait rien estimé. Le verrou d'index (clamp)
// n'était qu'une garde de RENDU.
//
// Ici, chaque concurrent est projeté sur les SEULS champs autorisés. Un champ que
// personne n'a déclaré ne voyage pas : le prochain champ ajouté au modèle concurrent
// ne rouvre pas le trou en silence (contrairement à une liste d'exclusion, qu'il
// faudrait tenir exhaustive). L'autorisation d'un concurrent = son estimation est
// PERSISTÉE (le vendeur a joué le jeu de la révélation). Rang et écart sont calculés
// SERVEUR ; seuls leurs nombres voyagent — jamais la liste des prix qui les produit.

// Champs TOUJOURS sûrs : la découverte du concurrent, aucun montant. Le libellé est
// COMPOSÉ des champs déclarés (jamais le titre réel rogné d'un prix).
export type NeutralSellerComparable = {
  authorized: false;
  id: string;
  position: number;
  neutralLabel: string;
  city: string | null;
  district: string | null;
  propertyType: string | null;
  surfaceArea: number | null;
  roomsCount: number | null;
  bedroomsCount: number | null;
  energyRating: string | null;
  gesRating: string | null;
  photoUrls: string[];
  featureComparison: FeatureComparison[];
  // Les réponses du vendeur lui appartiennent : rien à lui cacher.
  response: LiveComparableResponse | null;
};

// Champs LIVRÉS après persistance de l'estimation (révélation autorisée) : le prix et
// tout ce qui le porte. `priceReveal` ne contient que des nombres déjà calculés serveur
// (rang, écart) — pas la liste des prix/m² retenus.
export type AuthorizedSellerComparable = Omit<NeutralSellerComparable, 'authorized'> & {
  authorized: true;
  title: string | null;
  price: number;
  pricePerSquareMeter: number | null;
  listingUrl: string | null;
  isOutlier: boolean;
  priceReveal: PriceReveal;
  priceHistory: PriceHistory;
  marketDuration: MarketDuration;
};

export type SellerComparable = NeutralSellerComparable | AuthorizedSellerComparable;

// Un concurrent est autorisé quand son estimation est PERSISTÉE — jamais une valeur de
// formulaire locale (même garde que canAdvanceLivePage : réponses persistées seules).
export function isComparableAuthorized(entry: LiveComparableEntry): boolean {
  return entry.response?.seller_estimated_listing_price != null;
}

export function projectComparableForSeller(entry: LiveComparableEntry): SellerComparable {
  const neutral: NeutralSellerComparable = {
    authorized: false,
    id: entry.id,
    position: entry.position,
    neutralLabel: neutralComparableLabel(entry),
    city: entry.city,
    district: entry.district,
    propertyType: entry.propertyType,
    surfaceArea: entry.surfaceArea,
    roomsCount: entry.roomsCount,
    bedroomsCount: entry.bedroomsCount,
    energyRating: entry.energyRating,
    gesRating: entry.gesRating,
    photoUrls: entry.photoUrls,
    featureComparison: entry.featureComparison,
    response: entry.response,
  };

  if (!isComparableAuthorized(entry)) {
    return neutral;
  }

  return {
    ...neutral,
    authorized: true,
    title: entry.title,
    price: entry.price,
    pricePerSquareMeter: entry.pricePerSquareMeter,
    listingUrl: entry.listingUrl,
    isOutlier: entry.isOutlier,
    priceReveal: entry.priceReveal,
    priceHistory: entry.priceHistory,
    marketDuration: entry.marketDuration,
  };
}

// La donnée Live remise au shell À L'OUVERTURE : concurrents projetés (neutres tant que
// non estimés) et le résumé du vendeur (qui lui appartient). PAS de fourchette conseiller
// — competitiveMarketCentral / priceGaps / advisorDecision n'entrent JAMAIS ici : ils
// sont LIVRÉS à l'entrée des écrans 7/8, par la même voie que la révélation.
export type SellerLiveData = {
  comparables: SellerComparable[];
  sellerSummary: LiveSellerSummary | null;
};

export function projectLiveForSeller(live: LiveComparativeData): SellerLiveData {
  return {
    comparables: live.comparables.map(projectComparableForSeller),
    sellerSummary: live.sellerSummary,
  };
}

// LA VOIE DE LIVRAISON — unique. Deux fragments autorisés, jamais dans la charge initiale :
//   • la révélation d'UN concurrent (prix + écart), autorisée par estimation PERSISTÉE ;
//   • la fourchette conseiller (écrans 7/8), montants advisor-only.
// Le serveur re-dérive la présentation et RE-VÉRIFIE l'autorisation ; le client ne peut
// pas forcer la livraison d'un prix que le vendeur n'a pas encore estimé.
export type AuthorizedAdvisorRange = {
  competitiveMarketCentral: number | null;
  priceGaps: LivePriceGaps;
  advisorDecision: LiveAdvisorDecision | null;
};

export type DeliveredFragment =
  | { kind: 'comparable'; comparable: AuthorizedSellerComparable }
  | { kind: 'advisor-range'; advisorRange: AuthorizedAdvisorRange };

// Révélation d'un concurrent : refusée (null) tant que l'estimation n'est pas persistée —
// même borne que canAdvanceLivePage, côté serveur, sur la donnée fraîche.
export function authorizeComparableReveal(
  live: LiveComparativeData,
  comparableId: string,
): AuthorizedSellerComparable | null {
  const entry = live.comparables.find((comparable) => comparable.id === comparableId);
  if (!entry || !isComparableAuthorized(entry)) {
    return null;
  }
  const projected = projectComparableForSeller(entry);
  return projected.authorized ? projected : null;
}

// La fourchette est autorisée par un FAIT EN BASE — la valeur perçue du vendeur est
// persistée — exactement comme la révélation l'est par l'estimation persistée. Même
// mécanisme (garde sur une réponse persistée), pas un régime « navigation ». C'est aussi
// la bonne pédagogie : on ne montre le central marché qu'APRÈS que le vendeur s'est
// prononcé (écran 7 en devine-puis-révèle).
export function isAdvisorRangeAuthorized(live: LiveComparativeData): boolean {
  return live.sellerSummary?.seller_perceived_property_price != null;
}

export function authorizeAdvisorRange(live: LiveComparativeData): AuthorizedAdvisorRange | null {
  if (!isAdvisorRangeAuthorized(live)) {
    return null;
  }
  return {
    competitiveMarketCentral: live.competitiveMarketCentral,
    priceGaps: live.priceGaps,
    advisorDecision: live.advisorDecision,
  };
}
