// Mission 122 — l'extérieur et le parking d'une annonce du marché, tels que l'import ou la
// recherche les disent : une liste nommée, `['none']` quand l'annonce dit qu'il n'y en a pas
// (« ✗ Pas de parking », M118), une liste vide quand elle ne dit rien (« ? à vérifier »).
const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

export function listingOutdoor(
  imported: Record<string, unknown> | null,
  outdoorFeature: { present?: unknown } | null,
): string[] {
  if (imported) return list(imported.outdoorSpaces);
  if (outdoorFeature != null && list(outdoorFeature.present).length === 0) return ['none'];
  return list(outdoorFeature?.present);
}

export function listingParking(
  imported: Record<string, unknown> | null,
  features: Record<string, unknown> | null,
): string[] {
  if (imported) return list(imported.parkingTypes);
  // Sur la carte de recherche, une liste vide dit « aucun parking » ; null dit « rien d'écrit ».
  if (Array.isArray(features?.parking) && features.parking.length === 0) return ['none'];
  return list(features?.parking);
}
