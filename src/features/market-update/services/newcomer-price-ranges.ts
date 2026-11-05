export type PriceRange = { min: number; max: number };

// Mission 129 (décision de Jean-Guy, 30/10) — la fourchette des nouveaux venus : de −5 % du prix de
// commercialisation à ce prix ; s'il reste moins de 3 biens, la recherche s'élargit à −10 %, sur
// une tranche disjointe de la première (rien n'est facturé deux fois). Pur.
export const NEWCOMERS_MIN_FOUND = 3;

// Les planchers sont arrondis au millier inférieur : le même chiffre dans la requête et à l'écran
// (maquette M129-5).
const thousandBelow = (value: number) => Math.floor(value / 1000) * 1000;

export function newcomerPriceRanges(price: number): { first: PriceRange; widened: PriceRange } {
  const ceiling = Math.round(price);
  const floor5 = thousandBelow(ceiling * 0.95);
  const floor10 = thousandBelow(ceiling * 0.9);
  return {
    first: { min: floor5, max: ceiling },
    widened: { min: floor10, max: floor5 - 1 },
  };
}
