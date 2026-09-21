// MISSION 51 §2.3 — « une description qui contient ce genre de phrase n'est pas une
// description ». Certains portails renvoient, à la place du texte de l'annonce, un mur
// d'inscription (« Connectez-vous pour accéder aux infos de cette annonce… Créer un
// compte »). Récupéré à l'import, il s'affichait tel quel au vendeur.
//
// On le reconnaît à ses appels à l'action de connexion / création de compte — des
// tournures qui n'ont rien à faire dans la description d'un bien. À traiter à la SOURCE
// (sélection de la description à l'import) ET en garde d'affichage (données déjà
// stockées avant ce correctif). Le contenu importé reste une donnée, jamais exécuté.
const WALL_MARKERS: RegExp[] = [
  /connectez[-\s]?vous/i,
  /cr[ée]e[rz]\s+un\s+compte/i,
  /inscrivez[-\s]?vous/i,
  /identifiez[-\s]?vous/i,
  /veuillez\s+vous\s+connecter/i,
  /pour\s+acc[ée]der\s+aux?\s+(infos|informations|annonces?|coordonn[ée]es|d[ée]tails)/i,
];

export function isJunkDescription(text: string | null | undefined): boolean {
  if (text == null || text.trim() === '') {
    return false;
  }
  return WALL_MARKERS.some((marker) => marker.test(text));
}

// La description, ou null si c'est un mur d'inscription : « pas une description ».
export function cleanDescription(text: string | null | undefined): string | null {
  if (text == null || text.trim() === '') {
    return null;
  }
  return isJunkDescription(text) ? null : text;
}
