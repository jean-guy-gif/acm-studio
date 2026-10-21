// Mission 112 — l'état du formulaire « Modifier le bien » : sur une erreur, la saisie revient
// telle quelle (un doublon ne la fait plus perdre). Un fichier « use server » n'exporte que des
// fonctions asynchrones : l'état vit ici.
export type UpdateComparableState = {
  error: string | null;
  values: Record<string, string> | null;
  // Une autre fiche du dossier porte déjà cette annonce (M108) : retenue, ou écartée — « la
  // retenir ? ».
  duplicate: { id: string; selected: boolean } | null;
};

export const initialUpdateComparableState: UpdateComparableState = {
  error: null,
  values: null,
  duplicate: null,
};
