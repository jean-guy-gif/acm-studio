// Mission 89 — devant le vendeur, UN seul prix porte le nom « Prix des concurrents » : celui que
// le conseiller a validé au positionnement (pré-rempli par le calcul, modifiable), et à défaut
// de décision enregistrée, le calcul courant. Le « Marché calculé » brut ne se montre plus au
// vendeur : il reste côté conseiller, et seulement quand il diffère (showsMarketComputed).
export function sellerFacingCompetitorPrice(
  validatedPrice: number | null | undefined,
  marketComputed: number | null | undefined,
): number | null {
  return validatedPrice ?? marketComputed ?? null;
}
