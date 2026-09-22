// Mission 50 §3 / Mission 54 — LE TYPE FILTRE, IL NE PONDÈRE PAS. Un appartement ne
// concurrence pas une maison, et ne rapproche pas un acheteur qui cherche une maison.
// `scoreCandidate` traite le type comme un critère pondéré (partagé, on n'y touche pas) ;
// la garde de type est donc la responsabilité de l'APPELANT — la même des deux côtés
// (rankCandidates pour les concurrents, buyer-match pour la recherche acheteur).
//
// Les deux arguments sont des types NORMALISÉS (vocabulaire canonique) ou null.
// Un conflit = deux types CONNUS et DIFFÉRENTS. Un type inconnu (null) n'est pas un
// conflit — c'est une absence, que chaque appelant gère à sa façon (gardé, ou mis à part).
export function typesConflict(a: string | null, b: string | null): boolean {
  return a != null && b != null && a !== b;
}
