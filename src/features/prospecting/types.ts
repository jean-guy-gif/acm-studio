import type { ProspectingRow } from '@/features/competitor-locator/services/build-prospecting-rows';

// Mission 86 — un concurrent à prospecter n'est jamais montré sans son bien vendeur :
// « Pour : [nom du dossier] · [type · pièces · surface · commune] ».
export type ProspectingSeller = {
  projectId: string;
  name: string;
  label: string | null;
};

export type ProspectingEntry = {
  row: ProspectingRow;
  seller: ProspectingSeller;
};

// Le filtre « Confrères et propriétaires / Confrères / Propriétaires » de la page.
export const PROSPECTING_TARGETS = ['all', 'colleagues', 'owners'] as const;
export type ProspectingTarget = (typeof PROSPECTING_TARGETS)[number];

export const PROSPECTING_TARGET_LABELS: Record<ProspectingTarget, string> = {
  all: 'Confrères et propriétaires',
  colleagues: 'Confrères',
  owners: 'Propriétaires',
};
