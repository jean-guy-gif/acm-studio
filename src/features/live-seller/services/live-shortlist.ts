import type { Comparable } from '@/features/comparables/types';
import { normalizeCommuneName } from '@/features/competitor-search/utils/commune-name';
import { matchPercent } from '@/features/competitor-search/services/match-percent';
import { assessProximity } from '@/features/competitor-search/services/proximity';
import type {
  CompetitorCandidate,
  CompetitorSearchCriteria,
} from '@/features/competitor-search/types';
import { dpeClass } from '@/features/dpe/services/dpe';

// Mission 110 — un Live plus court. Au-delà de 6 concurrents retenus, « Lancer le Live » propose
// les 6 plus pertinents, modifiables ; le conseiller peut garder tout le monde. La pertinence est
// le % de correspondance de la M71, recalculé sur les concurrents retenus (il n'est pas gardé en
// base) ; un critère inconnu sort du calcul, comme à la recherche. À égalité, l'ordre du dossier.
// Les concurrents écartés du Live restent RETENUS : prix des concurrents, « prêt », Prospection.
export const LIVE_SHORTLIST_SIZE = 6;

function candidateOf(comparable: Comparable): CompetitorCandidate {
  return {
    key: null,
    url: comparable.listing_url ?? '',
    title: null,
    price: comparable.price,
    surfaceArea: comparable.surface_area,
    roomsCount: comparable.rooms_count,
    propertyType: comparable.property_type,
    pricePerSqm: null,
    landArea: comparable.land_area,
    city: comparable.city,
    photoUrls: [],
    isNewBuild: false,
    energyClass: dpeClass(comparable.energy_rating),
    features: {
      location: null,
      locationDiscarded: false,
      district: comparable.district,
      floor: null,
      hasElevator: null,
      hasPool: null,
      parking:
        comparable.parking_types && comparable.parking_types.length > 0
          ? comparable.parking_types
          : null,
      outdoor:
        comparable.outdoor_spaces && comparable.outdoor_spaces.length > 0
          ? { present: comparable.outdoor_spaces, absent: [] }
          : null,
      condition: comparable.general_condition,
      exposure: comparable.exposure,
      constructionYear: comparable.construction_year,
    },
  };
}

// Le % de correspondance d'un concurrent retenu avec le bien vendeur ; null s'il ne se calcule pas.
export function competitorMatchPercent(
  criteria: CompetitorSearchCriteria,
  comparable: Comparable,
): number | null {
  const candidate = candidateOf(comparable);
  const proximity = assessProximity(criteria, candidate, null, criteria.propertyType);
  const sameCommune =
    candidate.city == null ||
    criteria.city == null ||
    normalizeCommuneName(candidate.city) === normalizeCommuneName(criteria.city);
  return matchPercent(criteria, candidate, proximity.reasons, {
    distanceMeters: null,
    sameCommune,
  });
}

export type ShortlistEntry = { id: string; percent: number | null; proposed: boolean };

// Les concurrents retenus, du plus au moins pertinent, les 6 premiers proposés. Sans critères
// (bien vendeur sans commune), l'ordre du dossier décide.
export function proposeLiveShortlist(
  criteria: CompetitorSearchCriteria | null,
  comparables: readonly Comparable[],
): ShortlistEntry[] {
  const retained = comparables.filter((comparable) => comparable.is_selected);
  const scored = retained.map((comparable) => ({
    comparable,
    percent: criteria ? competitorMatchPercent(criteria, comparable) : null,
  }));
  scored.sort(
    (a, b) =>
      (b.percent ?? -1) - (a.percent ?? -1) ||
      a.comparable.display_order - b.comparable.display_order,
  );
  return scored.map((entry, index) => ({
    id: entry.comparable.id,
    percent: entry.percent,
    proposed: index < LIVE_SHORTLIST_SIZE,
  }));
}

// Faut-il proposer le choix au lancement ? Au-delà de 6 retenus, tant qu'il n'est pas fait.
export function needsLiveShortlist(retainedCount: number, shortlistAt: string | null): boolean {
  return retainedCount > LIVE_SHORTLIST_SIZE && shortlistAt == null;
}
