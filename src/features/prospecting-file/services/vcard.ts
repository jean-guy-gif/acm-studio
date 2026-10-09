// Mission 84 — la carte de contact du conseiller (vCard 3.0), portée par le QR code du dossier.

export type VCardContact = {
  firstName: string;
  lastName: string;
  agencyName: string;
  phone: string | null;
  email: string;
};

// Une valeur de vCard : antislash, virgule, point-virgule et retour à la ligne s'échappent.
const escape = (value: string): string =>
  value
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/([,;])/g, '\\$1');

export function buildVCard(contact: VCardContact): string {
  const fullName = `${contact.firstName} ${contact.lastName}`.trim();
  const phone = contact.phone?.replace(/[^+0-9]/g, '') ?? '';
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escape(contact.lastName)};${escape(contact.firstName)};;;`,
    `FN:${escape(fullName)}`,
    `ORG:${escape(contact.agencyName)}`,
    'TITLE:Conseiller immobilier',
    ...(phone !== '' ? [`TEL;TYPE=CELL:${phone}`] : []),
    `EMAIL;TYPE=WORK:${escape(contact.email)}`,
    'END:VCARD',
  ].join('\r\n');
}
