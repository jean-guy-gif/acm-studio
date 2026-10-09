// Mission 81 — un prix de commercialisation saisi au dernier écran du Live mais pas encore
// enregistré : c'est lui que « Terminer le rendez-vous » enregistre avant d'ouvrir la
// conclusion. Rend la saisie à enregistrer, ou null s'il n'y a rien à faire (champ vide,
// ou saisie identique à celle déjà enregistrée). La validité du montant n'est pas jugée
// ici : le serveur revalide, et son refus retient le conseiller sur l'écran.
export function pendingCommercializationPrice(
  typed: string,
  lastSaved: string | null,
): string | null {
  const value = typed.trim();
  if (value === '') {
    return null;
  }
  return value === lastSaved?.trim() ? null : value;
}
