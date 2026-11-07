import {
  advisorPricePerM2,
  placement,
  PLACEMENT_LABELS,
} from '@/features/address-dossier/services/sales-stats';
import type { SalesStats } from '@/features/address-dossier/types';
import { formatEuroPerSquareMeter, formatNumber } from '@/lib/format';

// Mission 141 — les mots du dossier d'adresse, pour le conseiller seul. Service pur, sans zod.
// Jamais « estimation », jamais « fourchette » (celle du conseiller seule porte ce nom, M97, M105) :
// « La moitié des ventes entre … et … €/m² », « dans le quart le plus cher » (décision du 07/11).

export type RealSalesSummary = {
  radiusM: 500 | 1000;
  count: number;
  stats: SalesStats | null;
  // La surface de la fiche, pour situer l'analyse de valeur au m².
  surface: number | null;
};

export const radiusLabel = (radiusM: number) => (radiusM === 500 ? '500 m' : '1 km');

const salesCount = (count: number) => `${formatNumber(count)} vente${count > 1 ? 's' : ''}`;

export function middleHalfLabel(stats: SalesStats): string {
  return `La moitié des ventes entre ${formatEuroPerSquareMeter(stats.q1)} et ${formatEuroPerSquareMeter(stats.q3)}`;
}

// « Ventes réelles à 500 m : médiane 6 850 €/m² (14 ventes) · votre analyse de valeur :
// 7 300 €/m², dans le quart le plus cher ». Une information, jamais une recommandation de prix.
export function priceLine(
  summary: RealSalesSummary,
  advisorValue: number | null | undefined,
): string {
  const head = `Ventes réelles à ${radiusLabel(summary.radiusM)}`;
  if (summary.stats == null) {
    return `${head} : ${salesCount(summary.count)}, trop peu pour une médiane.`;
  }
  const base = `${head} : médiane ${formatEuroPerSquareMeter(summary.stats.median)} (${salesCount(summary.stats.count)})`;
  const perM2 = advisorPricePerM2(advisorValue, summary.surface);
  if (perM2 == null) {
    return summary.surface == null
      ? `${base} · la surface du bien manque pour situer votre analyse de valeur.`
      : `${base} · saisissez votre analyse de valeur pour la situer.`;
  }
  return `${base} · votre analyse de valeur : ${formatEuroPerSquareMeter(perM2)}, ${PLACEMENT_LABELS[placement(perM2, summary.stats)]}.`;
}
