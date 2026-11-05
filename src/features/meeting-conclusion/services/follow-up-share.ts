// Mission 130 — envoyer la relance depuis le téléphone ou l'ordinateur du conseiller : le message
// de M96, ouvert dans l'application choisie, au numéro ou à l'adresse du dossier vendeur. L'outil
// n'envoie rien (M96, M122 B). Pur.
export type FollowUpShareHrefs = { sms: string | null; whatsapp: string | null; email: string };

// Le numéro tel que les liens l'attendent : chiffres et « + » seulement ; un 0 français devient +33
// pour WhatsApp, qui exige l'indicatif.
const digits = (phone: string): string => phone.replace(/[^\d+]/g, '');
const international = (phone: string): string => {
  const value = digits(phone);
  if (value.startsWith('+')) return value.slice(1);
  if (value.startsWith('00')) return value.slice(2);
  if (value.startsWith('0')) return `33${value.slice(1)}`;
  return value;
};

export function followUpShareHrefs(
  message: string,
  phone: string | null,
  email: string | null,
): FollowUpShareHrefs {
  const body = encodeURIComponent(message);
  const number = phone?.trim() ? digits(phone) : null;
  return {
    sms: number ? `sms:${number}?&body=${body}` : null,
    whatsapp: number ? `https://wa.me/${international(number)}?text=${body}` : null,
    email: `mailto:${email?.trim() ? encodeURIComponent(email.trim()) : ''}?subject=${encodeURIComponent('Notre rendez-vous')}&body=${body}`,
  };
}

export function telHref(phone: string): string {
  return `tel:${digits(phone)}`;
}
