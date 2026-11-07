import {
  advisorPricePerM2,
  placement,
  PLACEMENT_LABELS,
} from '@/features/address-dossier/services/sales-stats';
import type { AddressDossierView } from '@/features/address-dossier/components/address-dossier-block';
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

// Ce que dit « Avant le rendez-vous » : la ligne des ventes, ou pourquoi elle manque — jamais
// « aucune vente » pour une source en panne, une lecture en échec ou une adresse changée (M98).
export type RealSalesStatus =
  { kind: 'line'; summary: RealSalesSummary } | { kind: 'note'; text: string; link: string | null };

export function realSalesStatus(view: AddressDossierView, surface: number | null): RealSalesStatus {
  if (view.state === 'none') {
    return {
      kind: 'note',
      text: 'Ventes réelles autour du bien :',
      link: 'construisez le dossier d’adresse sur l’onglet Bien vendeur',
    };
  }
  if (view.state === 'unreadable') {
    return {
      kind: 'note',
      text: 'Le dossier d’adresse n’a pas pu être lu : rechargez la page.',
      link: null,
    };
  }
  if (view.stale) {
    return {
      kind: 'note',
      text: 'L’adresse ou le type du bien a changé depuis le dossier d’adresse :',
      link: 'actualisez-le sur l’onglet Bien vendeur',
    };
  }
  const sales = view.blocks.sales;
  if (sales.state === 'ok') {
    return {
      kind: 'line',
      summary: {
        radiusM: sales.data.radiusM,
        count: sales.data.count,
        stats: sales.data.stats,
        surface,
      },
    };
  }
  if (sales.state === 'unavailable') {
    return {
      kind: 'note',
      text: 'Ventes réelles : la source n’a pas répondu,',
      link: 'actualisez le dossier d’adresse sur l’onglet Bien vendeur',
    };
  }
  return {
    kind: 'note',
    text:
      sales.note === 'not_a_house_or_apartment'
        ? 'Ventes réelles : seulement pour une maison ou un appartement.'
        : 'Ventes réelles : aucune vente du même type à 1 km sur les trois dernières années.',
    link: null,
  };
}
