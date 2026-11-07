import type { RealSale, SalesData, SalesStats } from '@/features/address-dossier/types';

// Mission 141 — les ventes réelles autour du bien, en chiffres. Service pur, sans zod : l'écran
// l'appelle à la frappe de l'analyse de valeur.
//
// Jamais une estimation (CLAUDE.md, décision du 07/11) : on montre des prix au m² de ventes
// réelles et on SITUE le chiffre que le conseiller a saisi ; aucune fonction ne multiplie une
// médiane par une surface, aucune ne rend un prix en euros pour le bien.

export const NEAR_RADIUS_M = 500;
export const WIDE_RADIUS_M = 1000;
// Sous 5 ventes à 500 m, on élargit à 1 km ; sous 5 ventes à 1 km, pas de médiane (trop peu pour
// dire quoi que ce soit), seulement les ventes.
export const MIN_SALES = 5;

// Le rayon : 500 m, sauf sous 5 ventes, alors 1 km.
export function salesRadius(sales: Pick<RealSale, 'distanceM'>[]): 500 | 1000 {
  const near = sales.filter((sale) => sale.distanceM <= NEAR_RADIUS_M).length;
  return near >= MIN_SALES ? NEAR_RADIUS_M : WIDE_RADIUS_M;
}

export function salesWithin<T extends Pick<RealSale, 'distanceM'>>(
  sales: T[],
  radiusM: number,
): T[] {
  return sales.filter((sale) => sale.distanceM <= radiusM);
}

// Le quantile d'une série triée, par interpolation linéaire entre les deux rangs voisins (la
// méthode usuelle des tableurs) ; arrondi à l'euro.
function quantile(sorted: number[], q: number): number {
  const position = (sorted.length - 1) * q;
  const below = Math.floor(position);
  const above = Math.ceil(position);
  const value = sorted[below]! + (sorted[above]! - sorted[below]!) * (position - below);
  return Math.round(value);
}

// Médiane, 1er et 3e quartiles du prix au m² ; null sous 5 ventes.
export function salesStats(sales: Pick<RealSale, 'pricePerM2'>[]): SalesStats | null {
  if (sales.length < MIN_SALES) return null;
  const sorted = sales.map((sale) => sale.pricePerM2).sort((a, b) => a - b);
  return {
    count: sorted.length,
    median: quantile(sorted, 0.5),
    q1: quantile(sorted, 0.25),
    q3: quantile(sorted, 0.75),
  };
}

export type Placement =
  'lowest_quarter' | 'below_median' | 'at_median' | 'above_median' | 'top_quarter';

// Où se situe un prix au m² dans les ventes : le quart le moins cher (sous le 1er quartile), sous
// la médiane, à la médiane, au-dessus, le quart le plus cher (au-dessus du 3e quartile).
export function placement(pricePerM2: number, stats: SalesStats): Placement {
  if (pricePerM2 > stats.q3) return 'top_quarter';
  if (pricePerM2 < stats.q1) return 'lowest_quarter';
  if (pricePerM2 > stats.median) return 'above_median';
  if (pricePerM2 < stats.median) return 'below_median';
  return 'at_median';
}

export const PLACEMENT_LABELS: Record<Placement, string> = {
  lowest_quarter: 'dans le quart le moins cher',
  below_median: 'au-dessous de la médiane',
  at_median: 'à la médiane',
  above_median: 'au-dessus de la médiane',
  top_quarter: 'dans le quart le plus cher',
};

// Le prix au m² de l'analyse de valeur du conseiller, sur la surface de la fiche : un chiffre
// saisi par lui, divisé, jamais l'inverse. null sans prix ou sans surface.
export function advisorPricePerM2(
  advisorValue: number | null | undefined,
  surface: number | null | undefined,
): number | null {
  if (advisorValue == null || !Number.isFinite(advisorValue) || advisorValue <= 0) return null;
  if (surface == null || !Number.isFinite(surface) || surface <= 0) return null;
  return Math.round(advisorValue / surface);
}

// Les ventes listées sur le dossier : les plus récentes du rayon.
export const LISTED_SALES = 20;

// Le bloc des ventes, à partir de toutes les ventes à 1 km : le rayon, le compte, les chiffres
// sur toutes, et les plus récentes pour la liste.
export function salesData(sales: RealSale[], propertyType: SalesData['propertyType']): SalesData {
  const radiusM = salesRadius(sales);
  const kept = salesWithin(sales, radiusM);
  const byDate = [...kept].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return {
    propertyType,
    radiusM,
    count: kept.length,
    stats: salesStats(kept),
    recent: byDate.slice(0, LISTED_SALES),
    latestSaleDate: byDate[0]?.date ?? null,
  };
}
