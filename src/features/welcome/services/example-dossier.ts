// Mission 97 — le dossier d'exemple : une DÉMONSTRATION, identifiée comme telle (badge
// « Exemple », nom du vendeur, titres des concurrents). Tout y est fictif et le dit : la commune
// n'existe pas, aucune adresse n'est donnée, aucun concurrent ne renvoie à une annonce, aucune
// photo n'est fournie. Il sert à découvrir l'outil et à s'entraîner au Live (M92) ; il est
// exclu des compteurs, des mesures et de la Prospection.
export const EXAMPLE_SELLER_NAME = 'Exemple — M. et Mme Démo';
export const EXAMPLE_CITY = 'Exempleville';

export const EXAMPLE_PROPERTY = {
  property_type: 'Appartement',
  surface_area: 68,
  rooms_count: 3,
  bedrooms_count: 2,
  city: EXAMPLE_CITY,
  district: 'Centre',
  floor: 2,
  building_floors: 4,
  energy_rating: 'D',
  general_condition: 'good',
  outdoor_spaces: ['balcony'],
  parking_types: ['garage'],
  description: 'Bien fictif du dossier d’exemple\u00a0: il sert à découvrir l’outil.',
  advisor_price_min: 290000,
  advisor_price_max: 330000,
} as const;

export type ExampleCompetitor = {
  title: string;
  price: number;
  surface_area: number;
  rooms_count: number;
  bedrooms_count: number;
  energy_rating: string;
  days_on_market: number;
};

// Cinq concurrents fictifs : assez pour être « prêt » (3 au moins) et pour voir le rythme
// accéléré du Live à partir du 4e (M95).
export const EXAMPLE_COMPETITORS: readonly ExampleCompetitor[] = [
  {
    title: 'Concurrent d’exemple A',
    price: 298000,
    surface_area: 65,
    rooms_count: 3,
    bedrooms_count: 2,
    energy_rating: 'D',
    days_on_market: 45,
  },
  {
    title: 'Concurrent d’exemple B',
    price: 312000,
    surface_area: 70,
    rooms_count: 3,
    bedrooms_count: 2,
    energy_rating: 'C',
    days_on_market: 120,
  },
  {
    title: 'Concurrent d’exemple C',
    price: 325000,
    surface_area: 72,
    rooms_count: 3,
    bedrooms_count: 2,
    energy_rating: 'D',
    days_on_market: 200,
  },
  {
    title: 'Concurrent d’exemple D',
    price: 289000,
    surface_area: 63,
    rooms_count: 3,
    bedrooms_count: 2,
    energy_rating: 'E',
    days_on_market: 60,
  },
  {
    title: 'Concurrent d’exemple E',
    price: 305000,
    surface_area: 67,
    rooms_count: 3,
    bedrooms_count: 2,
    energy_rating: 'D',
    days_on_market: 90,
  },
];

// Ce qu'un dossier d'exemple ne doit JAMAIS porter : de quoi le confondre avec un vrai bien.
export function exampleHasNoRealAddress(): boolean {
  return (
    !('address' in EXAMPLE_PROPERTY) &&
    !('postal_code' in EXAMPLE_PROPERTY) &&
    EXAMPLE_COMPETITORS.every((competitor) => !('listing_url' in competitor))
  );
}
