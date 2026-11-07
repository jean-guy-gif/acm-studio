import type { GeoPoint } from '@/features/competitor-search/types';
import { distanceMeters } from '@/features/competitor-search/services/proximity';
import type {
  LivingHereBlocks,
  NearbyPlace,
  PlaceCategory,
  SectorPriority,
  StartOrigin,
} from '@/features/living-here/types';
import { SECTOR_PRIORITIES } from '@/features/living-here/types';

// Mission 142 — les règles de « Vivre ici ». Service pur, sans zod.

// Le quartier : la position de l'annonce arrondie sur une grille d'environ 500 m (0,005°), pour
// qu'aucun point ne laisse retrouver l'adresse d'un bien qui n'est pas de l'agence (M119).
export const DISTRICT_GRID = 0.005;

export function roundToDistrict(point: GeoPoint): GeoPoint {
  const round = (value: number) =>
    Math.round(Math.round(value / DISTRICT_GRID) * DISTRICT_GRID * 1e6) / 1e6;
  return { lat: round(point.lat), lon: round(point.lon) };
}

export type StartInput = {
  // Un mandat signé de l'agence : son adresse, géocodée (jamais montrée).
  mandateAddressPoint: GeoPoint | null;
  // La position de l'annonce (Stream Estate), déjà écartée si c'est un point de remplissage.
  listingPoint: GeoPoint | null;
  communeCentre: GeoPoint | null;
};

// D'où partent les distances (décision du 07/11) : seul un mandat signé part de son adresse ;
// tout le reste du quartier, sinon du centre de la commune ; rien, sans aucun point.
export function startPoint(input: StartInput): { point: GeoPoint; origin: StartOrigin } | null {
  if (input.mandateAddressPoint) return { point: input.mandateAddressPoint, origin: 'address' };
  if (input.listingPoint) return { point: roundToDistrict(input.listingPoint), origin: 'district' };
  if (input.communeCentre) return { point: input.communeCentre, origin: 'commune' };
  return null;
}

export type Candidate = { category: PlaceCategory; name: string | null; point: GeoPoint };

// Le plus proche de chaque catégorie, à vol d'oiseau (la marche se mesure ensuite par l'itinéraire).
export function nearestByCategory(
  from: GeoPoint,
  candidates: Candidate[],
  categories: readonly PlaceCategory[],
): Map<PlaceCategory, Candidate & { distanceM: number }> {
  const nearest = new Map<PlaceCategory, Candidate & { distanceM: number }>();
  for (const candidate of candidates) {
    if (!categories.includes(candidate.category)) continue;
    const distanceM = distanceMeters(from, candidate.point);
    const current = nearest.get(candidate.category);
    if (!current || distanceM < current.distanceM)
      nearest.set(candidate.category, { ...candidate, distanceM });
  }
  return nearest;
}

// Des minutes entières, au moins 1 : « environ 5 min ».
export function minutesOf(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

// À pied, les commerces comptent jusqu'à 15 minutes, les écoles jusqu'à 20.
export const SHOPS_WALK_LIMIT = 15;
export const SCHOOLS_WALK_LIMIT = 20;

export type PriorityVerdict = 'yes' | 'partly' | 'no' | 'to_check';

const within = (places: NearbyPlace[], categories: PlaceCategory[], limit: number) =>
  categories.filter((category) =>
    places.some((place) => place.category === category && place.walkMinutes <= limit),
  ).length;

// Ce qui compte pour lui (★ du secteur) : le bien les remplit-il ? Le calme n'a pas de source (le
// bruit est reporté, décision du 07/11) : « à vérifier à la visite », jamais affirmé. Une source en
// panne ne remplit ni ne contredit rien : « à vérifier ».
export function priorityVerdict(
  priority: SectorPriority,
  blocks: LivingHereBlocks,
): PriorityVerdict {
  if (priority === 'quiet') return 'to_check';
  if (priority === 'shops_on_foot') {
    if (blocks.daily.state !== 'ok') return 'to_check';
    const count = within(
      blocks.daily.data.places,
      ['bakery', 'supermarket', 'pharmacy'],
      SHOPS_WALK_LIMIT,
    );
    return count === 3 ? 'yes' : count > 0 ? 'partly' : 'no';
  }
  if (blocks.schools.state !== 'ok') return 'to_check';
  const count = within(
    blocks.schools.data.places,
    ['nursery_school', 'primary_school'],
    SCHOOLS_WALK_LIMIT,
  );
  return count === 2 ? 'yes' : count > 0 ? 'partly' : 'no';
}

// Le trajet jusqu'au lieu de l'acquéreur, relu : la durée et le mode, jamais le texte du lieu ni ses
// coordonnées (relecture du gardien-sql, 07/11) — le lieu se relit sur la fiche de l'acquéreur.
// Sans zod : la page Visites le lit aussi dans le navigateur.
export function readTrip(value: unknown): { minutes: number } | null {
  if (value == null || typeof value !== 'object') return null;
  const { mode, minutes } = value as { mode?: unknown; minutes?: unknown };
  return mode === 'car' &&
    typeof minutes === 'number' &&
    Number.isInteger(minutes) &&
    minutes >= 1 &&
    minutes <= 600
    ? { minutes }
    : null;
}

// Les ★ du secteur relues de la base : la liste fermée, sans doublon (relecture du gardien-sql).
export const sectorPrioritiesOf = (value: unknown): SectorPriority[] =>
  SECTOR_PRIORITIES.filter((priority) => Array.isArray(value) && value.includes(priority));
