// Mission 137 — l'identité légale de l'agence de démonstration : entièrement inventée, crédible,
// au bon format (raison sociale, RCS et TVA fictifs — 123 456 789 est le numéro d'exemple d'usage,
// la clé de TVA est calculée —, téléphone en 06 39 98, plage que l'ARCEP réserve à la fiction,
// e-mail en example.com) ; les rues viennent du jeu de la démo (DEMO_STREETS). Posée par
// « Préparer ma démo » si l'agence n'en a pas : un manager qui la corrige n'est jamais écrasé.
export const DEMO_LEGAL_IDENTITY = {
  company_name: 'Riviera Habitat Conseil',
  company_form: 'SAS',
  share_capital: '10 000',
  company_seat: '14 avenue des Collines Douces, 06250 Mougins',
  rcs_city: 'Cannes',
  rcs_number: '123 456 789',
  vat_number: 'FR32123456789',
  agency_phone: '06 39 98 10 20',
  agency_email: 'agence.riviera@example.com',
  rcp_insurer: 'Caisse Azuréenne d’Assurance Professionnelle',
  rcp_address: '8 rue du Vieux Pressoir, 06000 Nice',
  rcp_number: 'RCP-2026-004812',
  guarantee_body: 'Fonds de Garantie des Collines',
  guarantee_address: '3 traverse des Terrasses Fleuries, 06400 Cannes',
  guarantee_number: 'GF-118734',
  guarantee_amount: 120000,
  representative_name: 'Claire Vasseur',
  representative_title: 'Présidente',
} as const;

// Décision de Jean-Guy (06/11) : le nom et l'adresse de l'agence de démonstration, posés par
// « Préparer ma démo » et « Remettre ma démo à zéro » ; plus aucun « Démo » imprimé sur un document.
export const DEMO_AGENCY_NAME = 'Agence Horizon Côte d’Azur';
export const DEMO_AGENCY_ADDRESS = '70 rue du Bonheur, 06140 Vence';

// Mission 155 — la carte professionnelle de l'agence de démonstration, inventée au format d'une carte
// délivrée par une CCI des Alpes-Maritimes : posée seulement si l'agence n'en a pas (une agence de
// démonstration neuve ne préparait ni bon de visite ni offre, M102, M137) ; celle d'un manager n'est
// jamais remplacée.
export const DEMO_PROFESSIONAL_CARD = {
  professional_card: 'CPI 0605 2026 000 090 155',
  professional_card_issuer: 'CCI Nice Côte d’Azur',
} as const;
