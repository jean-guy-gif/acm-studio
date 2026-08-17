// Dictionnaire centralisé des libellés d'interface (français). Règle produit :
// aucun mot anglais visible. Les clés techniques restent en anglais ; seules les
// VALEURS sont affichées. Ne pas disperser ces libellés dans les composants.
export const UI = {
  // Actions
  save: 'Enregistrer',
  saving: 'Enregistrement…',
  update: 'Mettre à jour',
  cancel: 'Annuler',
  validate: 'Valider',
  next: 'Suivant',
  previous: 'Précédent',
  summary: 'Sommaire',
  edit: 'Modifier',
  delete: 'Supprimer',
  add: 'Ajouter',
  close: 'Fermer',
  open: 'Ouvrir',
  logout: 'Déconnexion',
  start: 'Démarrer',

  // États
  loading: 'Chargement…',
  unknown: 'Non renseigné',
  upToDate: 'À jour',
  outdated: 'À actualiser',
  noData: 'Aucune donnée',
  optional: 'facultatif',

  // Écran / photos
  fullscreen: 'Plein écran',
  exitFullscreen: 'Quitter le plein écran',
  photosUnavailable: 'Photos indisponibles pour cette annonce',

  // Vocabulaire produit
  priceHistory: 'Historique des prix',
  priceHistoryUnavailable: 'Historique de prix non disponible.',
  sellerResponse: 'Réponse du vendeur',
  seriousCompetitor: 'Concurrent sérieux',
  mostDangerousCompetitor: 'Concurrent le plus dangereux',
  observedPositioning: 'Positionnement observé sur le marché concurrentiel',
  advisorAnalysis: 'Analyse comparative de marché du conseiller',
  sellerPerceivedValue: 'Valeur perçue par le vendeur',
  advisorPrice: 'Prix conseillé',
} as const;

export type UiLabelKey = keyof typeof UI;
