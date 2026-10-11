import { DANGEROUS_REASONS, type DangerousReason } from '@/features/live-seller/constants';
import type { LiveSellerSummary } from '@/features/live-seller/types';

// Le choix du « concurrent le plus dangereux » part en fond pendant que l'écran avance (M51) :
// la charge de la page ne le connaît donc pas. On le reporte ici dans le résumé tenu par le
// navigateur, pour que « Conclusion » le dise sans attendre un rechargement.

export type DangerousChoice = Pick<
  LiveSellerSummary,
  | 'seller_most_dangerous_comparable_id'
  | 'seller_most_dangerous_reason'
  | 'seller_most_dangerous_comment'
>;

function text(value: FormDataEntryValue | null): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed === '' ? null : trimmed;
}

// Lit le formulaire de l'écran. Un concurrent qui n'est pas dans la liste du Live, ou un motif
// hors liste, ne se reporte pas : l'écran ne dit jamais ce que le serveur refuserait.
export function dangerousChoiceFromForm(
  formData: FormData,
  competitorIds: readonly string[],
): DangerousChoice {
  const id = text(formData.get('seller_most_dangerous_comparable_id'));
  const reason = text(formData.get('seller_most_dangerous_reason'));
  return {
    seller_most_dangerous_comparable_id: id != null && competitorIds.includes(id) ? id : null,
    seller_most_dangerous_reason:
      reason != null && DANGEROUS_REASONS.includes(reason as DangerousReason) ? reason : null,
    seller_most_dangerous_comment: text(formData.get('seller_most_dangerous_comment')),
  };
}
