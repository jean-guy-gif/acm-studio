import type { ConclusionAmounts } from '@/features/meeting-conclusion/types';

// Mission 53 §3 — on stocke les FAITS (quatre montants figés), pas les résultats. Les
// libellés et les écarts se calculent ICI, à l'affichage, PUR et testable.
//
// Les libellés distinguent explicitement les quatre repères : la mesure de la mission a
// montré que « conseiller » (l'analyse) et « conseillé » (le prix validé) se confondent.

export const AMOUNT_LABELS: Record<keyof ConclusionAmounts, string> = {
  marketComputed: 'Marché calculé (d’après les concurrents)',
  advisorAnalysis: 'Analyse du conseiller (avis de valeur)',
  advisorPrice: 'Prix conseillé (validé)',
  commercializationPrice: 'Prix de commercialisation (convenu)',
};

export type AmountRow = { key: keyof ConclusionAmounts; label: string; value: number | null };

// Les quatre montants, dans l'ordre de lecture : les trois repères, puis le prix convenu.
export function amountRows(amounts: ConclusionAmounts): AmountRow[] {
  return (
    ['marketComputed', 'advisorAnalysis', 'advisorPrice', 'commercializationPrice'] as const
  ).map((key) => ({ key, label: AMOUNT_LABELS[key], value: amounts[key] }));
}

export type ConclusionGap = {
  key: string;
  label: string;
  amount: number | null; // prix convenu − repère
  percentage: number | null; // écart relatif au repère, en %
};

// L'écart du prix CONVENU face à chacun des trois repères. Null dès qu'un des deux
// montants manque (aucune valeur inventée) ou que le repère est nul (pas de division).
function gap(
  key: string,
  label: string,
  convenu: number | null,
  reference: number | null,
): ConclusionGap {
  if (convenu == null || reference == null || reference === 0) {
    return { key, label, amount: null, percentage: null };
  }
  const amount = convenu - reference;
  return { key, label, amount, percentage: Math.round((amount / reference) * 100) };
}

// Ce que Laurent veut lire : « à combien de pour cent étions-nous ? » — le prix convenu
// comparé au prix conseillé, au marché calculé, à l'analyse du conseiller.
export function conclusionGaps(amounts: ConclusionAmounts): ConclusionGap[] {
  return [
    gap(
      'vs_advisor_price',
      'Convenu vs prix conseillé',
      amounts.commercializationPrice,
      amounts.advisorPrice,
    ),
    gap(
      'vs_market_computed',
      'Convenu vs marché calculé',
      amounts.commercializationPrice,
      amounts.marketComputed,
    ),
    gap(
      'vs_advisor_analysis',
      'Convenu vs analyse conseiller',
      amounts.commercializationPrice,
      amounts.advisorAnalysis,
    ),
  ];
}
