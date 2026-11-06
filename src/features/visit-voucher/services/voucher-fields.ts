import {
  legalIdentityGaps,
  type BrandingMentions,
  type LegalIdentity,
} from '@/features/legal-identity/services/legal-identity';
import type { VoucherAgency } from '@/features/visit-voucher/services/voucher-text';
import { formatNumber } from '@/lib/format';

// Mission 137 — ce que le bon de visite reçoit, assemblé depuis ce qu'ACM sait déjà. Pur.

// Le paragraphe de l'agence : l'identité légale et la charte ; null tant qu'elle est incomplète
// (aucun document incomplet n'est produit).
export function voucherAgency(input: {
  identity: LegalIdentity;
  branding: BrandingMentions;
  agencyName: string;
}): VoucherAgency | null {
  if (legalIdentityGaps(input.identity, input.branding).length > 0) return null;
  const { identity, branding } = input;
  const text = (value: string | null | undefined) => (value ?? '').trim();
  return {
    name: text(branding.documentName) || input.agencyName.trim(),
    address: text(branding.postalAddress),
    phone: text(identity.agencyPhone),
    email: text(identity.agencyEmail),
    companyName: text(identity.companyName),
    companyForm: text(identity.companyForm),
    shareCapital: text(identity.shareCapital),
    companySeat: text(identity.companySeat),
    rcsCity: text(identity.rcsCity),
    rcsNumber: text(identity.rcsNumber),
    cardNumber: text(branding.professionalCard),
    cardIssuer: text(branding.professionalCardIssuer),
    vatNumber: text(identity.vatNumber),
    rcpInsurer: text(identity.rcpInsurer),
    rcpAddress: text(identity.rcpAddress),
    rcpNumber: text(identity.rcpNumber),
    guaranteeBody: text(identity.guaranteeBody),
    guaranteeAddress: text(identity.guaranteeAddress),
    guaranteeNumber: text(identity.guaranteeNumber),
    representativeName: text(identity.representativeName),
    representativeTitle: text(identity.representativeTitle),
  };
}

// « 1 639 500 » : le prix en chiffres, à l'euro, le « € » est dans le texte validé.
export function voucherPrice(price: number): string {
  return formatNumber(Math.round(price), { maxDecimals: 0 });
}

// « Fait à … » : la commune de l'adresse de l'agence (après le code postal), sinon rien.
export function cityOfAddress(address: string | null | undefined): string {
  const match = /\b\d{5}\s+([^,]+?)\s*$/.exec(address?.trim() ?? '');
  return match?.[1]?.trim() ?? '';
}

export const VISITOR_CIVILITIES = ['M.', 'Mme'] as const;
export type VisitorCivility = (typeof VISITOR_CIVILITIES)[number];

// « M. Paul Keller », deux visiteurs : « M. Paul Keller et Mme Anna Keller ».
export function visitorsLabel(visitors: { civility: VisitorCivility; name: string }[]): string {
  return visitors.map((visitor) => `${visitor.civility} ${visitor.name.trim()}`).join(' et ');
}

// Le jour de la signature, à Paris, JJ/MM/AAAA.
export function parisDateLabel(now: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);
}

// L'heure de la signature, à Paris : « 06/11/2026 à 14:32 ».
export function parisDateTimeLabel(iso: string): string {
  const date = new Date(iso);
  const time = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${parisDateLabel(date)} à ${time}`;
}
