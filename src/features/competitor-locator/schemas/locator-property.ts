import { z } from 'zod';

import {
  LOCATOR_LABEL_KEYS,
  LOCATOR_SOURCES,
  LOCATOR_STATES,
  type CompetitorLocation,
} from '@/features/competitor-locator/types';

// Mission 75 — une entrée de `ACM_BIENS_PAR_URL`, relue telle que le Localisateur la livre.
// Le contenu vient du navigateur : c'est une donnée, revalidée ici des deux côtés (page et
// serveur). Un état inconnu rejette l'entrée ; une clé d'étiquette ou une source inconnue reste
// vide plutôt que d'être devinée. Le texte de l'étiquette n'est jamais lu pour décider.

const MAX_TEXT = 300;

const text = z
  .unknown()
  .optional()
  .transform((value) => (typeof value === 'string' ? value.trim().slice(0, MAX_TEXT) : ''))
  .transform((value) => (value === '' ? null : value));

function oneOf<const T extends readonly string[]>(values: T) {
  return z
    .unknown()
    .optional()
    .transform((value) =>
      typeof value === 'string' && (values as readonly string[]).includes(value)
        ? (value as T[number])
        : null,
    );
}

function coordinate(limit: number) {
  return z
    .unknown()
    .optional()
    .transform((value) =>
      typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit
        ? value
        : null,
    );
}

const identifier = z
  .unknown()
  .optional()
  .transform((value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    return typeof value === 'string' && value.trim() !== '' ? value.trim().slice(0, 100) : null;
  });

const instant = z
  .unknown()
  .optional()
  .transform((value) => {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  });

const locatorPropertySchema = z
  .object({
    etat: z.enum(LOCATOR_STATES),
    etiquette: text,
    etiquetteCle: oneOf(LOCATOR_LABEL_KEYS),
    adresse: text,
    source: oneOf(LOCATOR_SOURCES),
    confirme: z
      .unknown()
      .optional()
      .transform((value) => value === true),
    bienId: identifier,
    lat: coordinate(90),
    lon: coordinate(180),
    analyseLe: instant,
  })
  .transform((entry): CompetitorLocation => ({
    state: entry.etat,
    label: entry.etiquette,
    labelKey: entry.etiquetteCle,
    address: entry.adresse,
    source: entry.source,
    // Retenue en silence : confirmée par le conseiller (`confirme`) ou par le Localisateur (clé
    // `confirmee`), et seulement s'il rend UNE adresse (« maison à préciser » n'en a pas).
    confirmed: (entry.confirme || entry.etiquetteCle === 'confirmee') && entry.adresse !== null,
    propertyId: entry.bienId,
    latitude: entry.lat,
    longitude: entry.lon,
    analyzedAt: entry.analyseLe,
  }));

export function parseLocatorProperty(raw: unknown): CompetitorLocation | null {
  const parsed = locatorPropertySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
