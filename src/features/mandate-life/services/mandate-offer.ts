import { heldOffers, type OfferHold } from '@/features/buyers/services/proposable';
import type { MandateOffer } from '@/features/mandate-life/types';

// Lot C — l'offre acceptée qui tient le mandat (la règle de la M145 A, `heldOffers`, lue sur toutes
// les offres de l'agence : la plus récente offre acceptée de chaque acquéreur, tant qu'il est « Sous
// offre » ou « A acheté »). Les offres illisibles : inconnue, jamais « aucune » (M98). Pur.
export type MandateOfferAnswer = OfferHold & {
  buyerName: string | null;
  price?: number | null;
  documentId?: string;
};

export function mandateOfferOf(
  answers: readonly MandateOfferAnswer[] | null,
  projectId: string,
): MandateOffer | null | 'unknown' {
  if (answers == null) return 'unknown';
  const held = heldOffers(answers).get(projectId);
  return held
    ? {
        acceptedAt: held.decidedAt,
        buyerId: held.buyerId,
        buyerName: held.buyerName,
        price: held.price ?? null,
        documentId: held.documentId ?? null,
      }
    : null;
}
