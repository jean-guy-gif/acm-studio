// Termes non français EXPLICITEMENT autorisés dans l'interface : noms propres,
// acronymes réglementaires, marques de portails et nom de mode. Tout autre mot
// anglais visible est interdit (règle produit). Utilisé par le test de garde de
// francisation.
export const ALLOWED_NON_FRENCH = [
  'Live', // nom du mode « temps réel » présenté au vendeur (usuel en français)
  'ACM', // produit ACM Studio
  'Studio',
  'Start Academy', // marque de l'agence (nom propre, texte alternatif du logo officiel)
  'DPE', // diagnostic de performance énergétique (acronyme)
  'GES', // gaz à effet de serre (acronyme)
  'URL', // acronyme
  'e-mail', // orthographe française admise
  // Marques / noms propres de portails immobiliers :
  'SeLoger',
  'Leboncoin',
  'Green Acres',
  'Belles Demeures',
  'Propriétés Le Figaro',
  'Figaro',
  'PAP',
  'bienici',
  'Bien’ici',
] as const;
