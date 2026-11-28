// Lot C — la fin du mandat se saisit en mois ou en date : la durée devient une date, au serveur,
// depuis la signature. Pur.

export const MANDATE_MONTHS_MAX = 36;
// « Préparer le renouvellement » (ou « Faire le point avant la reconduction »), 30 jours avant la fin
// du mandat ; « Préparer l'acte », 15 jours avant la date prévue de l'acte.
export const RENEWAL_NOTICE_DAYS = 30;
export const DEED_NOTICE_DAYS = 15;

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

// AAAA-MM-JJ + n mois, le même jour ; le dernier jour du mois quand il n'existe pas.
export function addMonths(day: string, months: number): string {
  const [, y, m, d] = DAY.exec(day) ?? [];
  const index = Number(y) * 12 + (Number(m) - 1) + months;
  const year = Math.floor(index / 12);
  const month = index % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(Number(d), lastDay))).toISOString().slice(0, 10);
}

// La fin d'un mandat de `months` mois signé le `signedOn` ; null hors de 1 à 36 mois entiers.
export function mandateEndFrom(signedOn: string, months: number): string | null {
  if (!Number.isInteger(months) || months < 1 || months > MANDATE_MONTHS_MAX) return null;
  if (!DAY.test(signedOn)) return null;
  return addMonths(signedOn, months);
}
