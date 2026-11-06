import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { addDays, type SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';

// Mission 137 (partie B) — « la date limite de validité est rappelée dans À faire aujourd'hui du
// conseiller la veille » : une offre sans réponse du vendeur fait naître sa tâche la veille de son
// dernier jour, et la garde ce jour-là ; passée, ou la réponse donnée, elle disparaît. Pur.
export type OfferForTask = {
  offerId: string;
  buyerId: string;
  buyerName: string | null;
  // AAAA-MM-JJ.
  validUntil: string;
  answered: boolean;
};

export function offerExpiryTasks(offers: OfferForTask[], now: Date): SuiviTask[] {
  const today = parisDay(now);
  return offers
    .filter((offer) => !offer.answered && /^\d{4}-\d{2}-\d{2}$/.test(offer.validUntil))
    .filter((offer) => offer.validUntil >= today)
    .map((offer) => ({
      kind: 'offer_expiry' as const,
      projectId: '',
      sellerName: '',
      dueOn: addDays(offer.validUntil, -1),
      buyerId: offer.buyerId,
      buyerName: offer.buyerName,
      offerId: offer.offerId,
      validUntil: offer.validUntil,
    }));
}
