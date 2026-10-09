// Mission 84 — le téléphone du conseiller, imprimé sur les dossiers de prospection. Pur.
// Même forme que la contrainte de la base : chiffres, espaces ou points, « + » en tête admis.
const PHONE_RE = /^\+?[0-9][0-9 .]{5,24}$/;

export type ParsedPhone = { ok: true; phone: string | null } | { ok: false; error: string };

// Un champ vide retire le téléphone ; un numéro mal formé est refusé, jamais corrigé.
export function parseAdvisorPhone(value: unknown): ParsedPhone {
  const phone = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (phone === '') {
    return { ok: true, phone: null };
  }
  if (!PHONE_RE.test(phone) || phone.replace(/\D/g, '').length < 9) {
    return { ok: false, error: 'Téléphone invalide : par exemple 06 12 34 56 78.' };
  }
  return { ok: true, phone };
}

// La photo du conseiller vit dans le bucket privé des photos, sous le dossier de son agence
// (les politiques de stockage portent sur ce premier segment).
export function advisorPhotoPrefix(agencyId: string): string {
  return `${agencyId}/advisors/`;
}
