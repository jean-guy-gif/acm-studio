// Mission 49 — le choix de la description par PROVENANCE, pas par taille.
//
// pickLongestDescription départageait des textes par leur longueur, et la longueur
// n'a aucune notion d'appartenance : le jour où la description d'un voisin est plus
// longue que la nôtre, c'est la sienne qui atteint le vendeur (mesuré sur Green
// Acres : voisin 907 car., nôtre 765). On remplace « la plus longue » par trois
// niveaux de provenance :
//
//   Niveau 1 — cadré au bloc de l'annonce : la lecture propre à l'extracteur du
//     portail, et extractVisibleDescription / extractEmbeddedDescription une fois
//     cadrés (voir extract-listing-data, qui les lit sur la seule tranche de
//     l'annonce). Préféré.
//   Niveau 2 — métadonnée de page : og:description. Appartient à l'annonce par
//     construction (une page n'en a qu'une), mais souvent tronquée — d'où son rang.
//   Niveau 3 — ratissage du DOM entier, non cadré : SUPPRIMÉ. Pas conservé en
//     dernier recours : un ratissage non cadré ne rapporte un voisin que le jour où
//     le cadrage a échoué. Mieux vaut vide que le voisin.
//
// La longueur ne sert plus qu'à départager À L'INTÉRIEUR du niveau 1, où tous les
// candidats sont déjà cadrés — elle y est inoffensive. Et le choix REND SA SOURCE :
// la règle est ainsi testable (§5, test 3).

export type DescriptionProvenance = 'main-advert' | 'page-meta' | 'none';

export type SelectedDescription = {
  description: string | null;
  provenance: DescriptionProvenance;
};

function longest(candidates: Array<string | null | undefined>): string | null {
  const valid = candidates.filter(
    (value): value is string => typeof value === 'string' && value.trim() !== '',
  );
  if (valid.length === 0) {
    return null;
  }
  return valid.reduce((best, candidate) =>
    candidate.trim().length > best.trim().length ? candidate : best,
  );
}

export function selectListingDescription(input: {
  // Niveau 1 : lecture cadrée par l'extracteur du portail (lue dans son bloc).
  portalScoped?: string | null;
  // Niveau 1 : lecteurs génériques, déjà cadrés à la tranche de l'annonce.
  regionVisible?: string | null;
  regionEmbedded?: string | null;
  // Niveau 2 : métadonnée de page.
  ogMeta?: string | null;
}): SelectedDescription {
  // Niveau 1 — on préfère la lecture cadrée de l'extracteur (délibérée, nettoyée),
  // sinon la plus longue des lectures génériques CADRÉES.
  const level1 =
    (input.portalScoped?.trim() ? input.portalScoped : null) ??
    longest([input.regionVisible, input.regionEmbedded]);
  if (level1) {
    return { description: level1, provenance: 'main-advert' };
  }

  // Niveau 2 — métadonnée de page.
  const level2 = input.ogMeta?.trim() ? input.ogMeta.trim() : null;
  if (level2) {
    return { description: level2, provenance: 'page-meta' };
  }

  // Vide est un résultat valide (§5) — le journal le dira, jamais un voisin.
  return { description: null, provenance: 'none' };
}
