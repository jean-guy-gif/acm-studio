import { communeKey } from '@/features/competitor-search/utils/commune-name';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import { formatSquareMeters } from '@/lib/format';
// LIVE — étapes AVANT la révélation du prix (« Est-il un sérieux concurrent ? »,
// « À quel prix pensez-vous ? »). Le vendeur juge le bien SANS son prix : la pédagogie
// tombe si un montant fuit à l'écran. Le titre brut du portail contient souvent le prix
// (« Appartement à vendre T3/F3 69 m² 365000 € Villeneuve-Loubet »).
//
// On ne retire PAS le prix du titre par expression régulière — les formats varient d'un
// portail à l'autre, un seul qui passe et le vendeur le lit. On COMPOSE un libellé
// neutre à partir des seuls champs STRUCTURÉS : aucun prix ne peut y entrer par accident.
//
// Le type de bien, quand il est connu (rempli à l'import depuis la carte de recherche,
// en vocabulaire canonique), ouvre le libellé : « Appartement · 3 pièces · … ». Type
// null (ancien import, saisie manuelle) → on s'en tient à pièces / surface / commune.
// Déterministe, aucun prix.
// Mission 140 — dans la langue du vendeur (le français par défaut).
export function neutralComparableLabel(
  entry: {
    propertyType?: string | null;
    roomsCount: number | null;
    surfaceArea: number | null;
    city: string | null;
    district: string | null;
  },
  language: TextLanguage = 'fr',
): string {
  const texts = clientTexts(language);
  const parts: string[] = [];
  const typeLabel = entry.propertyType
    ? texts.labels.propertyType[entry.propertyType as keyof typeof texts.labels.propertyType]
    : undefined;
  if (typeLabel) {
    parts.push(typeLabel);
  }
  if (entry.roomsCount != null && entry.roomsCount > 0) {
    parts.push(texts.common.rooms(entry.roomsCount));
  }
  if (entry.surfaceArea != null && entry.surfaceArea > 0) {
    parts.push(formatSquareMeters(entry.surfaceArea, { language }));
  }
  const location = entry.district?.trim() || entry.city?.trim();
  if (location) {
    parts.push(location);
  }
  return parts.length > 0 ? parts.join(' · ') : texts.common.competitorFallback;
}

// Lot A (Jean-Guy, 27/11) — la ligne du lieu, sous le libellé neutre, au Live : elle ne redit jamais
// ce que le libellé dit déjà. Le libellé finit par le quartier, sinon par la ville ; dessous, la
// ville seulement quand le libellé a nommé le quartier et qu'elle n'est pas déjà dans son nom
// (comparés comme partout, M71). Null : pas de ligne.
export function locationBelowLabel(entry: {
  city: string | null;
  district: string | null;
}): string | null {
  const district = communeKey(entry.district);
  const city = entry.city?.trim() || null;
  const cityKey = communeKey(city);
  if (!district || !city || !cityKey) return null;
  return ` ${district} `.includes(` ${cityKey} `) ? null : city;
}
