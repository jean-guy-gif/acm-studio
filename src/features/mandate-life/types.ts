// Lot C (Jean-Guy, 27/11 et 28/11) — la vie du mandat côté vendeur. L'étape n'est jamais écrite
// (`projects.status` reste « conclu », CLAUDE.md) : elle se lit dans des faits datés, ceux de la
// conclusion (migration `vie_du_mandat`) et l'offre acceptée du côté acquéreur (M137 B, M138).

export const MANDATE_STAGES = [
  'signed',
  'offer_accepted',
  'under_compromise',
  'sold',
  'ended',
] as const;
export type MandateStage = (typeof MANDATE_STAGES)[number];

export const MANDATE_STAGE_LABELS: Record<MandateStage, string> = {
  signed: 'Mandat signé',
  offer_accepted: 'Offre acceptée',
  under_compromise: 'Sous compromis',
  sold: 'Vendu par l’agence',
  ended: 'Mandat terminé',
};

export type SaleBuyerOrigin = 'agency' | 'outside';

// Les faits de la fiche du mandat (AAAA-MM-JJ pour les jours), tels que la base les garde.
export type MandateLife = {
  endsOn: string | null;
  tacitRenewal: boolean;
  compromiseSignedOn: string | null;
  deedPlannedOn: string | null;
  buyerOrigin: SaleBuyerOrigin | null;
  compromiseBuyerId: string | null;
  deedSignedOn: string | null;
  salePrice: number | null;
  endedOn: string | null;
};

export const NO_MANDATE_LIFE: MandateLife = {
  endsOn: null,
  tacitRenewal: false,
  compromiseSignedOn: null,
  deedPlannedOn: null,
  buyerOrigin: null,
  compromiseBuyerId: null,
  deedSignedOn: null,
  salePrice: null,
  endedOn: null,
};

// Un avenant de baisse : sa date, le nouveau prix, l'heure de sa saisie (posée par la base).
export type MandateAmendment = { id: string; amendedOn: string; price: number; createdAt: string };

// L'offre acceptée qui tient le mandat (`heldOffers`, M145 A), telle que l'étape et ses cartes la
// lisent : le jour de l'acceptation, l'acquéreur, le montant offert.
export type MandateOffer = {
  acceptedAt: string;
  buyerId: string | null;
  buyerName: string | null;
  price: number | null;
};
