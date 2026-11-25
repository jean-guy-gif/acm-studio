// Ce que l'import d'une annonce annonce comme trouvé et à compléter, pour le BIEN VENDEUR : les mots
// du conseiller, et seulement les champs que sa fiche a (M44 : « À compléter » porte sur la liste
// réelle des champs du formulaire, pas sur ce que le lecteur sait lire). Pur.
//
// Lancement, mission 11 — le lecteur d'annonce est celui des concurrents : il annonce aussi le
// titre, le prix au m² du portail et le délai de commercialisation, que la fiche du bien vendeur
// n'a pas (M77 : le titre n'est écrit nulle part). Sans libellé, ils s'affichaient sous leur nom
// technique (« title, portalPricePerSquareMeter, daysOnMarket »).
const FIELD_LABELS: Record<string, string> = {
  price: 'Prix (indicatif)',
  surfaceArea: 'Surface',
  landArea: 'Terrain',
  roomsCount: 'Pièces',
  bedroomsCount: 'Chambres',
  bathroomsCount: 'Salles de bains',
  energyRating: 'DPE',
  gesRating: 'GES',
  address: 'Adresse',
  postalCode: 'Code postal',
  city: 'Ville',
  district: 'Quartier',
  constructionYear: 'Année de construction',
  heatingType: 'Chauffage',
  listingDescription: 'Description',
  photoUrls: 'Photos',
};

// Le prix lu sur une annonce est une information (M38) : trouvé, il se dit « indicatif » ; absent,
// il ne se demande pas — on ne demande jamais le prix du bien vendeur.
const NEVER_ASKED = new Set(['price']);

export function subjectImportSummary(fields: { found: string[]; missing: string[] }): {
  found: string[];
  missing: string[];
} {
  const words = (keys: string[]) =>
    keys.flatMap((key) => (FIELD_LABELS[key] ? [FIELD_LABELS[key]] : []));
  return {
    found: words(fields.found),
    missing: words(fields.missing.filter((key) => !NEVER_ASKED.has(key))),
  };
}
