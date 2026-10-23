import 'server-only';

import {
  fetchCommunes,
  fetchDepartmentCommunes,
  geocodeSubject,
  resolveCommune,
} from '@/features/competitor-search/services/fetch-geo';
import type { SubjectGeocode } from '@/features/competitor-search/services/geocode-subject';
import type {
  GeoCommune,
  InseeResolution,
} from '@/features/competitor-search/services/resolve-insee-code';
import { demoGeo } from '@/features/demo/services/demo-geo';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';

// Mission 114 — les services de géographie derrière UNE porte : les services publics
// (geo.api.gouv.fr, api-adresse.data.gouv.fr — fetch-geo.ts) pour une agence réelle, la table
// locale des communes de la démonstration pour l'agence de démo. Le choix se fait côté serveur,
// sur le repère de l'agence (`agencies.is_demo`), jamais sur un paramètre du navigateur.
export type GeoProvider = {
  resolveCommune: (
    city: string,
    postalCode: string | null,
  ) => Promise<InseeResolution | { ok: false; reason: 'unavailable' }>;
  geocodeSubject: (
    address: string | null,
    postalCode: string | null,
    city: string,
  ) => Promise<SubjectGeocode>;
  fetchDepartmentCommunes: (departement: string) => Promise<GeoCommune[] | null>;
  fetchCommunes: (query: { postalCode: string } | { name: string }) => Promise<GeoCommune[] | null>;
};

// Chaque service public est appelé au moment du besoin, jamais lu à l'ouverture du module : un
// test qui ne simule qu'une partie de fetch-geo.ts garde les autres intactes.
export const liveGeo: GeoProvider = {
  resolveCommune: (city, postalCode) => resolveCommune(city, postalCode),
  geocodeSubject: (address, postalCode, city) => geocodeSubject(address, postalCode, city),
  fetchDepartmentCommunes: (departement) => fetchDepartmentCommunes(departement),
  fetchCommunes: (query) => fetchCommunes(query),
};

export function geoProvider(isDemo: boolean): GeoProvider {
  return isDemo ? demoGeo : liveGeo;
}

export async function geoProviderFor(agencyId: string | null | undefined): Promise<GeoProvider> {
  return geoProvider(await isDemoAgency(agencyId));
}
