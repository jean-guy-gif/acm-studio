// LIVE — étapes AVANT la révélation du prix (« Est-il un sérieux concurrent ? »,
// « À quel prix pensez-vous ? »). Le vendeur juge le bien SANS son prix : la pédagogie
// tombe si un montant fuit à l'écran. Le titre brut du portail contient souvent le prix
// (« Appartement à vendre T3/F3 69 m² 365000 € Villeneuve-Loubet »).
//
// On ne retire PAS le prix du titre par expression régulière — les formats varient d'un
// portail à l'autre, un seul qui passe et le vendeur le lit. On COMPOSE un libellé
// neutre à partir des seuls champs STRUCTURÉS : aucun prix ne peut y entrer par accident.
//
// Le type de bien (« Appartement ») n'est pas stocké sur un comparable (la table
// comparables n'a pas de colonne de type) : le libellé s'en tient à pièces / surface /
// commune. Déterministe.
export function neutralComparableLabel(entry: {
  roomsCount: number | null;
  surfaceArea: number | null;
  city: string | null;
  district: string | null;
}): string {
  const parts: string[] = [];
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
