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
const TYPE_LABEL_FR: Record<string, string> = {
  apartment: 'Appartement',
  house: 'Maison',
  land: 'Terrain',
  building: 'Immeuble',
  commercial: 'Local commercial',
  parking: 'Parking',
};

export function neutralComparableLabel(entry: {
  propertyType?: string | null;
  roomsCount: number | null;
  surfaceArea: number | null;
  city: string | null;
  district: string | null;
}): string {
  const parts: string[] = [];
  const typeLabel = entry.propertyType ? TYPE_LABEL_FR[entry.propertyType] : undefined;
  if (typeLabel) {
    parts.push(typeLabel);
  }
  if (entry.roomsCount != null && entry.roomsCount > 0) {
    parts.push(`${entry.roomsCount} pièce${entry.roomsCount > 1 ? 's' : ''}`);
  }
  if (entry.surfaceArea != null && entry.surfaceArea > 0) {
    parts.push(`${entry.surfaceArea} m²`);
  }
  const location = entry.district?.trim() || entry.city?.trim();
  if (location) {
    parts.push(location);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Bien concurrent';
}
