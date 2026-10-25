// Mission 119 (partie B) — le conseiller imprimé sur le dossier acquéreur et sur son lien : celui de
// la fiche (partagée par toute l'agence, M117) ; s'il est un membre retiré, le conseiller connecté —
// sur le lien public, celui qui a créé le lien — ; retiré lui aussi, personne : un membre retiré ne
// signe plus rien (décision de Jean-Guy, 25/10). Service pur, sans lecture.
export type DossierAdvisorRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  photo_path: string | null;
  removed_at: string | null;
};

const active = (row: DossierAdvisorRow | null): DossierAdvisorRow | null =>
  row && row.removed_at == null ? row : null;

export function chooseDossierAdvisor(
  ofBuyer: DossierAdvisorRow | null,
  connected: DossierAdvisorRow | null,
): DossierAdvisorRow | null {
  return active(ofBuyer) ?? active(connected);
}
