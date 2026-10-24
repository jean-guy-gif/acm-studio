// Mission 119 — décision de Jean-Guy, 24/10 : devant l'acquéreur, un bien de l'agence en MANDAT
// SIGNÉ montre son prix de commercialisation comme « Prix affiché » ; un bien d'un VENDEUR À
// RELANCER ne montre aucun prix — « Prix à confirmer avec le propriétaire » — : l'analyse du
// conseiller ne sort jamais devant un tiers. Même règle pour le dossier et le lien (partie B).
// Le prix d'entrée est celui figé à la sélection (M86, M111) ; cette règle décide seulement s'il
// se montre.
export function agencyPriceForBuyer(
  outcome: string | null | undefined,
  listedPrice: number | null,
): number | null {
  return outcome === 'signed' ? listedPrice : null;
}

export const PRICE_TO_CONFIRM = 'Prix à confirmer avec le propriétaire';
