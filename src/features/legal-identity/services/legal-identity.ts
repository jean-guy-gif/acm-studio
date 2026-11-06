import { formatEuro } from '@/lib/format';

// Mission 137 — l'identité légale de l'agence (Administration → Identité), qui identifie l'agence
// sur le bon de visite et l'offre d'achat : rien d'une autre agence, rien d'un modèle d'origine. Pur.

export type LegalIdentity = {
  companyName: string | null;
  companyForm: string | null;
  shareCapital: string | null;
  companySeat: string | null;
  rcsCity: string | null;
  rcsNumber: string | null;
  vatNumber: string | null;
  agencyPhone: string | null;
  agencyEmail: string | null;
  rcpInsurer: string | null;
  rcpAddress: string | null;
  rcpNumber: string | null;
  guaranteeBody: string | null;
  guaranteeAddress: string | null;
  guaranteeNumber: string | null;
  guaranteeAmount: number | null;
  representativeName: string | null;
  representativeTitle: string | null;
};

export const EMPTY_LEGAL_IDENTITY: LegalIdentity = {
  companyName: null,
  companyForm: null,
  shareCapital: null,
  companySeat: null,
  rcsCity: null,
  rcsNumber: null,
  vatNumber: null,
  agencyPhone: null,
  agencyEmail: null,
  rcpInsurer: null,
  rcpAddress: null,
  rcpNumber: null,
  guaranteeBody: null,
  guaranteeAddress: null,
  guaranteeNumber: null,
  guaranteeAmount: null,
  representativeName: null,
  representativeTitle: null,
};

// Les champs, dans l'ordre de l'écran, avec leur libellé et leur longueur maximale (celle de la
// base). Le montant de la garantie est à part (un nombre).
export const LEGAL_TEXT_FIELDS = [
  { key: 'companyName', label: 'Raison sociale', max: 160, group: 'Société' },
  { key: 'companyForm', label: 'Forme (SAS, SARL…)', max: 40, group: 'Société' },
  { key: 'shareCapital', label: 'Capital (en euros)', max: 40, group: 'Société' },
  { key: 'companySeat', label: 'Siège social', max: 300, group: 'Société' },
  { key: 'rcsCity', label: 'RCS : ville', max: 80, group: 'Société' },
  { key: 'rcsNumber', label: 'RCS : numéro', max: 40, group: 'Société' },
  { key: 'vatNumber', label: 'N° de TVA', max: 40, group: 'Société' },
  { key: 'agencyPhone', label: 'Téléphone de l’agence', max: 40, group: 'Agence' },
  { key: 'agencyEmail', label: 'E-mail de l’agence', max: 200, group: 'Agence' },
  {
    key: 'rcpInsurer',
    label: 'Assureur',
    max: 160,
    group: 'Responsabilité civile professionnelle',
  },
  {
    key: 'rcpAddress',
    label: 'Adresse de l’assureur',
    max: 300,
    group: 'Responsabilité civile professionnelle',
  },
  {
    key: 'rcpNumber',
    label: 'N° de contrat',
    max: 80,
    group: 'Responsabilité civile professionnelle',
  },
  { key: 'guaranteeBody', label: 'Organisme', max: 160, group: 'Garantie financière' },
  {
    key: 'guaranteeAddress',
    label: 'Adresse de l’organisme',
    max: 300,
    group: 'Garantie financière',
  },
  { key: 'guaranteeNumber', label: 'N° d’adhésion', max: 80, group: 'Garantie financière' },
  { key: 'representativeName', label: 'Nom', max: 160, group: 'Représentant légal' },
  {
    key: 'representativeTitle',
    label: 'Qualité (Président, Gérant…)',
    max: 80,
    group: 'Représentant légal',
  },
] as const satisfies readonly {
  key: Exclude<keyof LegalIdentity, 'guaranteeAmount'>;
  label: string;
  max: number;
  group: string;
}[];

export const GUARANTEE_AMOUNT_LABEL = 'Montant de la garantie (en euros)';

// Ce que la charte porte déjà (M87, M102), et qui entre aussi dans les deux documents.
export type BrandingMentions = {
  documentName: string | null;
  postalAddress: string | null;
  professionalCard: string | null;
  professionalCardIssuer: string | null;
};

const filled = (value: string | null | undefined): boolean => Boolean(value?.trim());

// Ce qui manque pour produire un bon de visite ou une offre : tous les champs de l'identité
// légale, plus l'adresse et la carte professionnelle de la charte. Aucun document incomplet.
export function legalIdentityGaps(
  identity: LegalIdentity | null,
  branding: BrandingMentions | null,
): string[] {
  const value = identity ?? EMPTY_LEGAL_IDENTITY;
  const gaps: string[] = [];
  if (!filled(branding?.postalAddress)) gaps.push('Adresse postale');
  if (!filled(branding?.professionalCard)) gaps.push('Carte professionnelle');
  if (!filled(branding?.professionalCardIssuer)) gaps.push('Carte délivrée par');
  for (const field of LEGAL_TEXT_FIELDS) {
    if (!filled(value[field.key])) gaps.push(field.label);
  }
  if (value.guaranteeAmount == null || !(value.guaranteeAmount > 0)) {
    gaps.push(GUARANTEE_AMOUNT_LABEL);
  }
  return gaps;
}

export function legalIdentityGapsLabel(gaps: string[]): string {
  return `Identité légale de l’agence à compléter (Administration → Identité) : ${gaps.join(', ')}.`;
}

// La garantie structurée, recomposée en une ligne pour les documents qui lisent le texte de la
// charte (M102) : rien ne change pour eux. 160 caractères au plus, comme le texte libre.
export function guaranteeLine(identity: LegalIdentity): string | null {
  if (!filled(identity.guaranteeBody)) return null;
  const parts = [
    `Garantie financière : ${identity.guaranteeBody!.trim()}`,
    filled(identity.guaranteeNumber) ? `n° ${identity.guaranteeNumber!.trim()}` : null,
    identity.guaranteeAmount != null && identity.guaranteeAmount > 0
      ? formatEuro(identity.guaranteeAmount)
      : null,
  ].filter(Boolean);
  const line = parts.join(', ');
  return line.length <= 160 ? line : line.slice(0, 159).trimEnd() + '…';
}
