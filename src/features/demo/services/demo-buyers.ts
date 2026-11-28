import type { BuyerFinancing, BuyerInput } from '@/features/buyers/types';

// Mission 132 — un acquéreur de démo porte aussi son financement et son dernier contact (en jours
// avant « Préparer ma démo »), posés par la clé service comme les gestes de la fiche.
export type DemoBuyer = BuyerInput & {
  financing?: BuyerFinancing;
  contactedDaysAgo?: number | null;
  // Mission 133 — depuis combien de jours sa fiche existe (« cherche depuis 3 semaines », au Live) ;
  // étalé de 1 à 7 semaines pour que ce soit crédible (essai de Jean-Guy, 06/11).
  createdDaysAgo?: number;
};

// Une maison de 4 ou 5 pièces autour de Vence, entre 700 000 et 800 000 € : ce que cherchent les
// acquéreurs prêts de la démo, pour que le Live de Vence en trouve (décision de Jean-Guy, 05/11).
const venceHouse = (
  fields: Partial<DemoBuyer> & Pick<DemoBuyer, 'name' | 'phone' | 'email'>,
): DemoBuyer => ({
  purpose: 'primary',
  timeline: 'three_months',
  notes: null,
  propertyTypes: ['house'],
  cities: ['Vence', 'Saint-Paul-de-Vence', 'La Colle-sur-Loup'],
  budgetIdeal: null,
  budgetMax: 780_000,
  roomsMin: 4,
  bedroomsMin: 3,
  surfaceMin: 110,
  outdoor: true,
  parking: null,
  pool: null,
  floorMin: null,
  elevator: null,
  energyRatingMax: null,
  worksAccepted: null,
  mustHave: ['cities', 'budget'],
  dealBreakers: null,
  financing: 'validated',
  contactedDaysAgo: 3,
  ...fields,
});

// Mission 117 — les deux acquéreurs de la démo, semés par « Préparer ma démo » (M114) et retirés
// par la remise à zéro : cohérents avec les scénarios — l'appartement d'Antibes (3 pièces, 68 m²,
// convenu autour de 393 000 €) et la villa de Mougins (7 pièces, 210 m², piscine, convenue autour
// de 1 639 500 €). Des personnes fictives, aux noms neutres ; Mission 130 B — un téléphone de la plage 06 39 98
// (réservée à la fiction par l'ARCEP) et un e-mail en example.com, jamais réels.
export const DEMO_BUYERS: DemoBuyer[] = [
  {
    name: 'M. et Mme Rossi',
    phone: '06 39 98 63 04',
    email: 'rossi.antibes@example.com',
    purpose: 'primary',
    timeline: 'three_months',
    notes: 'Vendent leur appartement à Nice\u202f; veulent un balcon et une place de parking.',
    propertyTypes: ['apartment'],
    cities: ['Antibes', 'Juan-les-Pins'],
    budgetIdeal: 380_000,
    budgetMax: 400_000,
    roomsMin: 3,
    bedroomsMin: 2,
    surfaceMin: 60,
    outdoor: true,
    parking: true,
    pool: null,
    floorMin: 1,
    elevator: null,
    energyRatingMax: 'D',
    worksAccepted: false,
    mustHave: ['outdoor', 'budget'],
    dealBreakers: 'Rez-de-chaussée sur rue.',
    // Mission 145 (partie B) — prêts à visiter : ils correspondent à l'appartement d'Antibes
    // des Lambert-Duval, vendeurs à relancer, et font jouer l'alerte « rentrer le mandat ».
    financing: 'validated',
    contactedDaysAgo: 3,
  },
  {
    name: 'Famille Keller',
    phone: '06 39 98 52 10',
    email: 'famille.keller@example.com',
    purpose: 'secondary',
    timeline: 'now',
    notes: 'Résidence secondaire pour les vacances en famille\u202f; grand jardin souhaité.',
    propertyTypes: ['house'],
    cities: ['Mougins', 'Mouans-Sartoux', 'Valbonne'],
    budgetIdeal: 1_500_000,
    budgetMax: 1_650_000,
    roomsMin: 6,
    bedroomsMin: 4,
    surfaceMin: 180,
    outdoor: true,
    parking: true,
    pool: true,
    floorMin: null,
    elevator: null,
    energyRatingMax: null,
    worksAccepted: false,
    mustHave: ['pool', 'cities'],
    dealBreakers: 'Pas de route passante, pas de travaux lourds.',
    // Mission 136 — prêts à visiter : la veille cherche pour eux.
    financing: 'validated',
    contactedDaysAgo: 5,
    // Mission 143 (B1) — la fiche existe AVANT sa première sélection (présentée il y a 21 jours) :
    // « Fiche créée » ouvre « Ce qui s'est passé », jamais après des faits plus anciens.
    createdDaysAgo: 30,
  },
  // Mission 132 — cinq acquéreurs PRÊTS À VISITER autour de Vence (financement validé, contact il
  // y a moins de 30 jours, un budget plafond), et un sixième sans financement validé : il ne compte
  // pas (décision de Jean-Guy, 05/11).
  venceHouse({
    name: 'M. et Mme Lambert',
    createdDaysAgo: 8,
    phone: '06 39 98 21 46',
    email: 'lambert.vence@example.com',
    notes: 'Quittent Paris\u202f; accord de principe de leur banque.',
    budgetIdeal: 740_000,
    budgetMax: 790_000,
    // Mission 133 — la piscine est indispensable : la maison des Bernard en a une, pas celle de
    // Mme Garcia (décision de Jean-Guy, 06/11).
    pool: true,
    mustHave: ['cities', 'pool'],
    // Mission 151 — pas de copropriété, sans ★ : rien n'est écarté, la carte d'une annonce le
    // dit « Copropriété : à vérifier » ; les maisons sous mandat sont déclarées hors copropriété.
    condominiumAccepted: false,
    // Mission 151 (partie B) — ce qui compte pour eux, avec leurs mots : leurs biens idéaux se
    // rangent par là (décision de Jean-Guy, 12/11 : les Arnaud naissent de la photo, pas semés).
    softCriteria: [
      { key: 'calme', words: 'au calme, loin des routes' },
      { key: 'vue', words: 'une belle vue' },
      { key: 'plain_pied', words: 'de plain-pied si possible' },
    ],
    // Mission 135 — le contact précède la sélection partagée il y a 3 jours.
    contactedDaysAgo: 4,
  }),
  venceHouse({
    name: 'Famille Moreau',
    createdDaysAgo: 15,
    phone: '06 39 98 34 81',
    email: 'famille.moreau@example.com',
    notes: 'Trois enfants\u202f; une chambre de plus serait un vrai plus.',
    roomsMin: 5,
    bedroomsMin: 4,
    surfaceMin: 130,
    budgetMax: 800_000,
    contactedDaysAgo: 6,
  }),
  venceHouse({
    name: 'Mme Faure',
    createdDaysAgo: 22,
    phone: '06 39 98 47 09',
    email: 'c.faure@example.com',
    notes: 'Apport de la vente de sa maison à Cagnes, signée.',
    cities: ['Vence', 'La Colle-sur-Loup'],
    budgetMax: 760_000,
    contactedDaysAgo: 9,
  }),
  venceHouse({
    name: 'M. Girard et Mme Chevalier',
    // Mission 155 — une fiche nouvelle, sans sélection : la maison de plain-pied de Mme Navarro, à
    // Saint-Paul-de-Vence, est à leur proposer.
    createdDaysAgo: 2,
    phone: '06 39 98 58 62',
    email: 'girard.chevalier@example.com',
    notes: 'Télétravail\u00a0: un bureau au calme.',
    cities: ['Saint-Paul-de-Vence', 'Vence'],
    budgetMax: 750_000,
    mustHave: ['cities', 'outdoor'],
    contactedDaysAgo: 2,
  }),
  venceHouse({
    name: 'M. et Mme Roux',
    // Mission 155 — nouveaux aussi, sans sélection.
    createdDaysAgo: 5,
    phone: '06 39 98 69 35',
    email: 'roux.famille@example.com',
    notes: 'Retraités, cherchent de plain-pied si possible.',
    roomsMin: 4,
    bedroomsMin: 2,
    budgetMax: 720_000,
    contactedDaysAgo: 5,
  }),
  venceHouse({
    name: 'M. Fontaine',
    // Mission 155 — à recontacter : aucun échange depuis plus de 30 jours (M132).
    createdDaysAgo: 40,
    phone: '06 39 98 72 18',
    email: 'f.fontaine@example.com',
    notes: 'Rendez-vous à la banque dans quinze jours.',
    cities: ['Vence'],
    budgetMax: 770_000,
    financing: 'in_progress',
    contactedDaysAgo: 34,
  }),
  // Mission 139 — un acquéreur anglophone, pour montrer ses messages en anglais : un appartement à
  // Antibes, financement en cours (il ne compte pas parmi les prêts à visiter).
  {
    name: 'Mr and Mrs Wilson',
    language: 'en',
    createdDaysAgo: 10,
    phone: '06 39 98 57 92',
    email: 'wilson.antibes@example.com',
    purpose: 'secondary',
    timeline: 'six_months',
    notes: 'Résidence secondaire\u202f; vivent à Londres, viennent un mois par an.',
    propertyTypes: ['apartment'],
    cities: ['Antibes'],
    budgetIdeal: null,
    budgetMax: 450_000,
    roomsMin: 3,
    bedroomsMin: 2,
    surfaceMin: 60,
    outdoor: true,
    parking: null,
    pool: null,
    floorMin: null,
    elevator: null,
    energyRatingMax: null,
    worksAccepted: null,
    mustHave: ['cities'],
    dealBreakers: null,
    financing: 'in_progress',
    contactedDaysAgo: 3,
  },
];
