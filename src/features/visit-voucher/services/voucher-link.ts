// Mission 137 — le lien du bon de visite envoyé au visiteur (Copier / E-mail), comme le dossier
// acquéreur (M119) : un jeton de 43 caractères, seul son condensat en base, 30 jours. Pur.
export const SIGNATURE_BUCKET = 'signed-documents';
export const VOUCHER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function voucherPath(token: string): string {
  return `/bon-de-visite/${token}`;
}

// Le message prérempli : « Bonjour, voici votre bon de visite du … : [lien] », signé du prénom.
export function voucherMessage(input: {
  date: string;
  url: string;
  advisorFirstName: string | null;
}): string {
  return [
    'Bonjour,',
    `Voici votre bon de visite du ${input.date} : ${input.url}`,
    input.advisorFirstName?.trim() ?? '',
  ]
    .filter(Boolean)
    .join('\n');
}
