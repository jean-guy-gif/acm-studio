import { slugifyCity } from '@/features/competitor-search/services/build-portal-search-urls';
import {
  SURFACE_FLOOR_SQM,
  WIDEST_SURFACE_TOLERANCE,
} from '@/features/competitor-search/services/rank-candidates';
import type { CompetitorSearchCriteria, SearchPortal } from '@/features/competitor-search/types';
import { SEARCH_PORTAL_LABELS } from '@/features/competitor-search/types';

// MISSION 69 — « Ouvrir mes recherches » : les adresses DÉJÀ FILTRÉES des quatre portails,
// construites depuis le bien vendeur, ouvertes dans des onglets VISIBLES du conseiller (c'est lui
// qui navigue, comme s'il avait réglé les filtres à la main ; ce n'est pas une lecture
// automatique, d'où des formes que le constructeur de la recherche automatique — mission 50,
// robots.txt — n'emploie pas). Formats relevés sur les pages du conseiller (01/10 et 05/10) et
// vérifiés à la main le 05/10.
//
// Valeurs envoyées : type, commune, pièces EXACTES, surface au dernier cran de la lecture (±10 %,
// jamais moins de ±3 m²), fourchette du conseiller STRICTE. La lecture garde ensuite ses crans
// (mission 61). Une donnée absente du bien n'est pas envoyée (aucune valeur inventée).
//
// Trois portails encodent la commune par un identifiant interne, APPRIS (portal_place_ids),
// jamais deviné. Inconnu → l'onglet s'ouvre sur la page de recherche de la commune, sans filtre,
// et l'écran demande de régler la commune une fois.

export type PlacePortal = Exclude<SearchPortal, 'bienici'>;
export const PLACE_PORTALS: readonly PlacePortal[] = [
  'seloger',
  'maisons_appartements',
  'green_acres',
];

export type KnownPlaceIds = Partial<Record<PlacePortal, string>>;

export type FilteredSearchLink = {
  portal: SearchPortal;
  label: string;
  url: string;
  // true : l'identifiant de commune de ce portail n'est pas encore connu — l'onglet n'est PAS
  // filtré, le conseiller règle la commune (et les filtres) une fois.
  needsPlace: boolean;
};

// L'ordre d'ouverture des onglets (et du récapitulatif).
const ORDER: SearchPortal[] = ['seloger', 'bienici', 'maisons_appartements', 'green_acres'];

// Clé de commune de portal_place_ids : « nice|06 ». Sans code postal à 5 chiffres, pas de clé —
// deux communes homonymes de départements différents ne doivent jamais se confondre.
export function placeCityKey(city: string, postalCode: string | null): string | null {
  const slug = slugifyCity(city);
  const postal = postalCode?.trim() ?? '';
  if (slug === '' || !/^\d{5}$/.test(postal)) {
    return null;
  }
  return `${slug}|${postal.slice(0, 2)}`;
}

// Bornes de surface envoyées : ±10 %, plancher ±3 m², arrondies VERS L'EXTÉRIEUR (le portail ne
// doit rien couper que la lecture garderait). 80 → 72–88 ; 20 → 17–23 ; 150 → 135–165.
export function searchSurfaceBounds(surface: number): { min: number; max: number } {
  const tolerance = Math.max(surface * WIDEST_SURFACE_TOLERANCE, SURFACE_FLOOR_SQM);
  // Arrondi au centième avant floor/ceil : 150 × 0,1 vaut 15,000000000000002 en flottant.
  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    min: Math.max(0, Math.floor(round(surface - tolerance))),
    max: Math.ceil(round(surface + tolerance)),
  };
}

type Values = {
  kind: 'apartment' | 'house' | null;
  rooms: number | null;
  surface: { min: number; max: number } | null;
  priceMin: number | null;
  priceMax: number | null;
};

function valuesOf(criteria: CompetitorSearchCriteria): Values {
  const type = criteria.propertyType;
  const rooms =
    criteria.roomsCount != null && criteria.roomsCount >= 1
      ? Math.round(criteria.roomsCount)
      : null;
  return {
    kind: type === 'apartment' || type === 'house' ? type : null,
    rooms,
    surface:
      criteria.surfaceArea != null && criteria.surfaceArea > 0
        ? searchSurfaceBounds(criteria.surfaceArea)
        : null,
    priceMin: criteria.advisorPriceMin != null ? Math.round(criteria.advisorPriceMin) : null,
    priceMax: criteria.advisorPriceMax != null ? Math.round(criteria.advisorPriceMax) : null,
  };
}

function withParams(base: string, params: [string, string | number | null][]): string {
  const url = new URL(base);
  for (const [key, value] of params) {
    if (value != null) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

// Bien'ici : /recherche/achat/<commune>-<cp>/<type>/<n>-pieces?prix-min=…&surface-min=…
// Types : appartement, maisonvilla (relevé le 05/10). Pièces : « 1-piece », « 4-pieces ».
function bieniciUrl(criteria: CompetitorSearchCriteria, v: Values): string {
  const slug = slugifyCity(criteria.city);
  const postal = criteria.postalCode?.trim() ?? '';
  const place = /^\d{5}$/.test(postal) ? `${slug}-${postal}` : slug;
  const segments = [`https://www.bienici.com/recherche/achat/${place}`];
  if (v.kind != null) {
    segments.push(v.kind === 'house' ? 'maisonvilla' : 'appartement');
    if (v.rooms != null) {
      segments.push(v.rooms === 1 ? '1-piece' : `${v.rooms}-pieces`);
    }
  }
  return withParams(segments.join('/'), [
    ['prix-min', v.priceMin],
    ['prix-max', v.priceMax],
    ['surface-min', v.surface?.min ?? null],
    ['surface-max', v.surface?.max ?? null],
  ]);
}

function selogerUrl(placeId: string, v: Values): string {
  return withParams('https://www.seloger.com/classified-search', [
    ['distributionTypes', 'Buy'],
    ['estateTypes', v.kind === 'house' ? 'House' : v.kind === 'apartment' ? 'Apartment' : null],
    ['locations', placeId],
    ['numberOfRoomsMin', v.rooms],
    ['numberOfRoomsMax', v.rooms],
    ['priceMin', v.priceMin],
    ['priceMax', v.priceMax],
    ['spaceMin', v.surface?.min ?? null],
    ['spaceMax', v.surface?.max ?? null],
    ['projectTypes', 'Resale'],
  ]);
}

// M&A : nb_piece = 1 (Studio), 2, 3, 4 ou 999 (« 5 pièces et plus ») — le portail ne filtre pas
// exactement au-delà de 4 ; la lecture ramène au nombre exact.
function maisonsUrl(placeId: string, v: Values): string {
  return withParams('https://www.maisonsetappartements.fr/views/Search.php', [
    ['lang', 'fr'],
    ['TypeAnnonce', 'VEN'],
    ['TypeBien', v.kind === 'house' ? 'MAI' : v.kind === 'apartment' ? 'APP' : null],
    ['villes', placeId],
    ['bdgMin', v.priceMin],
    ['bdgMax', v.priceMax],
    ['surfMin', v.surface?.min ?? null],
    ['surfMax', v.surface?.max ?? null],
    ['nb_piece', v.rooms == null ? null : v.rooms >= 5 ? 999 : v.rooms],
  ]);
}

// Green Acres : tout tient dans searchQuery, segments « clé-valeur » enchaînés par des tirets.
// Le terrain minimal (mn_l_s) existe mais n'est PAS envoyé : le terrain départage, il ne filtre
// pas (décision du 01/10).
function greenAcresUrl(placeId: string, v: Values): string {
  const parts = ['cn-fr-lg-fr', `city_id-${placeId}`, 'type-properties-project_type-properties'];
  if (v.kind != null) parts.push(v.kind === 'house' ? 'hab_house-on' : 'hab_appartement-on');
  if (v.priceMin != null) parts.push(`mn_p-${v.priceMin}`);
  if (v.priceMax != null) parts.push(`mx_p-${v.priceMax}`);
  if (v.surface != null) parts.push(`mn_h_s-${v.surface.min}`, `mx_h_s-${v.surface.max}`);
  if (v.rooms != null) parts.push(`mn_rooms-${v.rooms}`, `mx_rooms-${v.rooms}`);
  return `https://www.green-acres.fr/maison-a-vendre?searchQuery=${parts.join('-')}`;
}

// Commune inconnue du portail : sa page de recherche de la commune, sans filtre (formes de la
// mission 50, déjà ouvertes par la recherche automatique).
function unfilteredEntry(portal: PlacePortal, criteria: CompetitorSearchCriteria): string {
  const slug = slugifyCity(criteria.city);
  const postal = criteria.postalCode?.trim() ?? '';
  const department = /^\d{5}$/.test(postal) ? postal.slice(0, 2) : null;
  switch (portal) {
    case 'seloger':
      return department
        ? `https://www.seloger.com/immobilier/achat/immo-${slug}-${department}/`
        : `https://www.seloger.com/immobilier/achat/immo-${slug}/`;
    case 'maisons_appartements':
      return department
        ? `https://www.maisonsetappartements.fr/fr/${department}/vente/${slug}/`
        : `https://www.maisonsetappartements.fr/fr/vente/${slug}/`;
    case 'green_acres':
      return `https://www.green-acres.fr/immobilier/${slug}`;
  }
}

export function buildFilteredSearchUrls(
  criteria: CompetitorSearchCriteria,
  placeIds: KnownPlaceIds,
): FilteredSearchLink[] {
  const v = valuesOf(criteria);
  return ORDER.map((portal) => {
    const label = SEARCH_PORTAL_LABELS[portal];
    if (portal === 'bienici') {
      return { portal, label, url: bieniciUrl(criteria, v), needsPlace: false };
    }
    const placeId = placeIds[portal];
    if (placeId == null) {
      return { portal, label, url: unfilteredEntry(portal, criteria), needsPlace: true };
    }
    const url =
      portal === 'seloger'
        ? selogerUrl(placeId, v)
        : portal === 'maisons_appartements'
          ? maisonsUrl(placeId, v)
          : greenAcresUrl(placeId, v);
    return { portal, label, url, needsPlace: false };
  });
}
