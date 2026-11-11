import { z } from 'zod';

// Mission 152 (partie A) — la copie de l'annonce d'un concurrent, telle qu'ACM l'a lue, écrite une
// fois à sa création (`competitor_listing_copies`). Les faits passent par une liste d'autorisation,
// à l'écriture comme à la lecture : ni titre, ni adresse, ni lien, ni « Vendu par », ni exclusivité
// (M83, M107). Elle sert à prouver le prix, rien d'autre : JAMAIS le texte de l'annonce, qui cite
// parfois l'adresse du propriétaire (Jean-Guy, 11/11).

export const LISTING_PHOTOS_MAX = 40;
const FEATURES_MAX = 40;
const FEATURE_LENGTH_MAX = 80;

const shortText = z.string().trim().min(1).max(120);
const count = z.number().int().min(0).max(1_000);
const area = z.number().positive().max(1_000_000);
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/)
  .max(40);

export const listingCopyFactsSchema = z
  .object({
    propertyType: shortText,
    surfaceArea: area,
    landArea: area,
    roomsCount: count,
    bedroomsCount: count,
    floor: z.number().int().min(-5).max(200),
    floorsCount: z.number().int().min(0).max(200),
    energyRating: z.string().regex(/^[A-G]$/),
    gesRating: z.string().regex(/^[A-G]$/),
    constructionYear: z.number().int().min(1000).max(2200),
    generalCondition: shortText,
    exposure: shortText,
    heatingType: shortText,
    city: shortText,
    district: shortText,
    outdoorSpaces: z.array(shortText).max(20),
    parkingTypes: z.array(shortText).max(20),
    features: z.array(z.string().trim().min(1).max(FEATURE_LENGTH_MAX)).max(FEATURES_MAX),
    publishedAt: day,
    publicationLowerBoundLabel: shortText,
    modifiedAt: day,
  })
  .partial();

export type ListingCopyFacts = z.infer<typeof listingCopyFactsSchema>;

// Relit des faits stockés : chaque champ hors de la liste ou hors de sa forme est ignoré, les
// autres restent (M101 : une valeur hors bornes devient absente).
export function readListingCopyFacts(raw: unknown): ListingCopyFacts {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const shape = listingCopyFactsSchema.shape;
  const facts: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!(key in shape)) continue;
    const parsed = shape[key as keyof typeof shape].safeParse(value);
    if (parsed.success && parsed.data !== undefined) facts[key] = parsed.data;
  }
  return facts as ListingCopyFacts;
}

// Les adresses des photos, jamais les fichiers (M58) : en https seulement, sans doublon, 40 au plus.
export function readListingCopyPhotos(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const photos: string[] = [];
  for (const value of raw) {
    if (typeof value !== 'string' || value.length > 2_000) continue;
    try {
      if (new URL(value).protocol !== 'https:') continue;
    } catch {
      continue;
    }
    if (!photos.includes(value)) photos.push(value);
    if (photos.length === LISTING_PHOTOS_MAX) break;
  }
  return photos;
}
