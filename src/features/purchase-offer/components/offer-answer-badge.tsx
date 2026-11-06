import { badgeRejected, badgeSelected } from '@/components/ui/styles';
import {
  offerAnswerBadge,
  type OfferDecision,
} from '@/features/purchase-offer/services/offer-answer';

// Mission 138 — « Offre acceptée le 06/11 » / « Offre refusée le 06/11 », sur la fiche acquéreur,
// la visite et le dossier vendeur ; la couleur double le mot, jamais seule.
export function OfferAnswerBadge({
  decision,
  decidedAt,
  suffix,
}: {
  decision: OfferDecision;
  decidedAt: string;
  // Sur le dossier vendeur : de qui vient l'offre.
  suffix?: string | null;
}) {
  return (
    <span
      className={`${decision === 'accepted' ? badgeSelected : badgeRejected} whitespace-nowrap`}
      data-testid="offer-answer-badge"
      data-decision={decision}
    >
      {offerAnswerBadge(decision, decidedAt)}
      {suffix ? ` · ${suffix}` : ''}
    </span>
  );
}
