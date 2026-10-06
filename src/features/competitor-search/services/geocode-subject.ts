import { z } from 'zod';

import type { GeoPoint, SectorStatus } from '@/features/competitor-search/types';
import { communeKey } from '@/features/competitor-search/utils/commune-name';

// ÉTAPE 2 — le SECTEUR : l'adresse du bien vendeur géocodée par api-adresse.data.gouv.fr (Base
// Adresse Nationale, gratuite, sans clé). Partie PURE : construire la requête, juger la réponse.
//
// On ne mesure une distance QUE sur une position sûre : un résultat au numéro ou à la rue, avec un
// score ≥ 0,8, dans la commune du bien. Tout le reste (quartier, commune seule, score faible,
// autre commune) rend le secteur NEUTRE pour tous les candidats — et l'écran dit pourquoi.

export const GEOCODE_ENDPOINT = 'https://api-adresse.data.gouv.fr/search/';
export const MIN_GEOCODE_SCORE = 0.8;
const PRECISE_TYPES = new Set(['housenumber', 'street']);

export function geocodeUrl(
  address: string | null,
  postalCode: string | null,
  city: string,
): string | null {
  const street = address?.trim() ?? '';
  if (street === '') return null;
  const params = new URLSearchParams();
  params.set('q', [street, postalCode?.trim(), city].filter(Boolean).join(' '));
  params.set('limit', '1');
  if (postalCode != null && /^\d{5}$/.test(postalCode.trim())) {
    params.set('postcode', postalCode.trim());
  }
  return `${GEOCODE_ENDPOINT}?${params}`;
}

const featureSchema = z.object({
  geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
  properties: z.object({
    label: z.string().optional(),
    score: z.number(),
    type: z.string(),
    city: z.string().optional(),
  }),
});
const responseSchema = z.object({ features: z.array(z.unknown()) });

export type SubjectGeocode =
  { ok: true; point: GeoPoint; sector: SectorStatus } | { ok: false; sector: SectorStatus };

const neutral = (
  reason: Extract<SectorStatus, { status: 'neutral' }>['reason'],
): SubjectGeocode => ({
  ok: false,
  sector: { status: 'neutral', reason },
});

export function judgeGeocode(json: unknown, city: string): SubjectGeocode {
  const response = responseSchema.safeParse(json);
  if (!response.success) return neutral('unavailable');
  const first = featureSchema.safeParse(response.data.features[0]);
  if (!first.success) return neutral('imprecise'); // aucune adresse trouvée
  const { geometry, properties } = first.data;
  if (!PRECISE_TYPES.has(properties.type)) return neutral('imprecise');
  if (properties.score < MIN_GEOCODE_SCORE) return neutral('low_score');
  if (properties.city != null && communeKey(properties.city) !== communeKey(city)) {
    return neutral('other_city');
  }
  const [lon, lat] = geometry.coordinates;
  return {
    ok: true,
    point: { lat, lon },
    sector: { status: 'located', label: properties.label ?? city },
  };
}

// Ce que l'écran dit quand le secteur reste neutre.
export const SECTOR_NEUTRAL_MESSAGES: Record<
  Extract<SectorStatus, { status: 'neutral' }>['reason'],
  string
> = {
  no_address:
    'Secteur non utilisé : la fiche du bien vendeur n’a pas d’adresse. Ajoutez-la pour classer par distance.',
  imprecise:
    'Secteur non utilisé : l’adresse du bien vendeur n’a pas été trouvée au numéro ni à la rue. Précisez-la (numéro et rue) pour classer par distance.',
  low_score:
    'Secteur non utilisé : l’adresse du bien vendeur n’a été reconnue qu’avec un doute (score inférieur à 0,8). Vérifiez son orthographe pour classer par distance.',
  other_city:
    'Secteur non utilisé : l’adresse du bien vendeur a été trouvée dans une autre commune que la sienne. Vérifiez l’adresse et la ville.',
  unavailable:
    'Secteur non utilisé : le service de géocodage (adresse.data.gouv.fr) n’a pas répondu. Relancez la lecture pour réessayer.',
};
