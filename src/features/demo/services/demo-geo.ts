import type { GeoProvider } from '@/features/competitor-search/services/geo-provider';
import type { SubjectGeocode } from '@/features/competitor-search/services/geocode-subject';
import {
  pickInseeCode,
  type GeoCommune,
} from '@/features/competitor-search/services/resolve-insee-code';
import { normalizeCommuneName } from '@/features/competitor-search/utils/commune-name';
import { DEMO_COMMUNES, DEMO_DEPARTEMENT, toGeoCommune } from '@/features/demo/data/communes';
import { DEMO_LISTINGS, DEMO_SCENARIOS } from '@/features/demo/data/scenarios';
import { demoAddressLine } from '@/features/demo/services/demo-listing-data';

// Mission 114 — geo.api.gouv.fr et api-adresse.data.gouv.fr SIMULÉS sur la table locale des
// communes de la démonstration (data/communes.ts). La commune se choisit par la MÊME règle que
// pour une agence réelle (`pickInseeCode`, fail-closed) ; une adresse n'est « reconnue » que si
// c'est l'une des adresses fictives du jeu de données, et seulement dans sa commune — comme la
// Base Adresse Nationale ne reconnaît une adresse qu'au numéro ou à la rue.

const COMMUNES: GeoCommune[] = DEMO_COMMUNES.map(toGeoCommune);

const key = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

type KnownAddress = {
  line: string;
  inseeCode: string;
  point: { lat: number; lon: number };
  streetKey: string;
};

const KNOWN_ADDRESSES: KnownAddress[] = [
  ...DEMO_SCENARIOS.map((scenario) => ({
    line: demoAddressLine(scenario.subject),
    inseeCode: scenario.subject.inseeCode,
    point: scenario.subject.location,
    streetKey: key(`${scenario.subject.address.number} ${scenario.subject.address.street}`),
  })),
  ...DEMO_LISTINGS.map((listing) => ({
    line: demoAddressLine(listing),
    inseeCode: listing.inseeCode,
    point: listing.location,
    streetKey: key(`${listing.address.number} ${listing.address.street}`),
  })),
];

const neutral = (
  reason: Extract<SubjectGeocode, { ok: false }>['sector'] extends infer S
    ? S extends { status: 'neutral'; reason: infer R }
      ? R
      : never
    : never,
): SubjectGeocode => ({ ok: false, sector: { status: 'neutral', reason } });

export const demoGeo: GeoProvider = {
  async resolveCommune(city, postalCode) {
    return pickInseeCode(COMMUNES, city, postalCode);
  },

  async geocodeSubject(address, postalCode, city) {
    const street = address?.trim() ?? '';
    if (street === '') return neutral('no_address');
    const wanted = normalizeCommuneName(city);
    const communeCodes = new Set(
      COMMUNES.filter(
        (commune) =>
          normalizeCommuneName(commune.nom) === wanted &&
          (postalCode == null || (commune.codesPostaux ?? []).includes(postalCode.trim())),
      ).map((commune) => commune.code),
    );
    const found = KNOWN_ADDRESSES.find((known) => known.streetKey === key(street));
    if (!found) return neutral('imprecise');
    if (communeCodes.size > 0 && !communeCodes.has(found.inseeCode)) return neutral('other_city');
    return { ok: true, point: found.point, sector: { status: 'located', label: found.line } };
  },

  async fetchDepartmentCommunes(departement) {
    return departement === DEMO_DEPARTEMENT ? COMMUNES : [];
  },

  async fetchCommunes(query) {
    if ('postalCode' in query) {
      return COMMUNES.filter((commune) => (commune.codesPostaux ?? []).includes(query.postalCode));
    }
    const wanted = normalizeCommuneName(query.name);
    return COMMUNES.filter((commune) => normalizeCommuneName(commune.nom).includes(wanted));
  },
};
