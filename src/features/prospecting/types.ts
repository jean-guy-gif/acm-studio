import type { ProspectingRow } from '@/features/competitor-locator/services/build-prospecting-rows';

// Mission 86 — un concurrent à prospecter n'est jamais montré sans son bien vendeur :
// « Pour : [nom du dossier] · [type · pièces · surface · commune] ».
export type ProspectingSeller = {
  projectId: string;
  name: string;
  label: string | null;
  // Mission 98 — le conseiller du dossier : la tournée s'ouvre sur « Mes dossiers ».
  advisorId: string | null;
};

export type ProspectingEntry = {
  row: ProspectingRow;
  seller: ProspectingSeller;
};

// Mission 98 — une carte par BIEN. Le même bien retenu dans plusieurs mandats (même annonce, ou
// même adresse confirmée) n'est démarché qu'une fois : `row` porte le statut commun à toutes
// les copies, `sellers` tous les biens vendeurs concernés, `copies` les concurrents regroupés.
// `seller` est celui de la copie de référence (`row.id`).
export type ProspectingCard = ProspectingEntry & {
  sellers: ProspectingSeller[];
  copies: ProspectingEntry[];
};

// Le filtre « Confrères et propriétaires / Confrères / Propriétaires » de la page.
export const PROSPECTING_TARGETS = ['all', 'colleagues', 'owners'] as const;
export type ProspectingTarget = (typeof PROSPECTING_TARGETS)[number];

export const PROSPECTING_TARGET_LABELS: Record<ProspectingTarget, string> = {
  all: 'Confrères et propriétaires',
  colleagues: 'Confrères',
  owners: 'Propriétaires',
};
