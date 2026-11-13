import { demoPhotoSet } from '@/features/demo/data/photo-sets';
import { DEMO_PHOTO_POOLS, DEMO_SCENARIOS, DEMO_STREETS } from '@/features/demo/data/scenarios';
import type { DemoSubject } from '@/features/demo/data/types';

// Mission 155 — un bien par dossier (décision de Jean-Guy, 13/11 : aucune photo partagée entre deux
// biens). Les trois biens des scénarios restent ceux du dossier « À préparer » (Antibes), du Live
// interactif (Vence) et du mandat de Mougins ; chaque autre dossier a ici le sien, dans le marché de
// son scénario (les mêmes annonces pour concurrents). Les dossiers qui existaient gardent les
// chiffres qui font jouer la démo (surface, prix, piscine : les acquéreurs qui correspondent, M133,
// M145) et prennent leur propre adresse, leur année et leur jeu de photos. Les six nouveaux mandats
// suivent leur fiche photo (docs/DEMO.md). Vraies communes, rues de la liste inventée (M147 B),
// prix cohérents avec le secteur ; le prix affiché par l'annonce donne, au Live, le prix convenu
// (97 % au millier près, `demoSeedPlan`).

type Street = (typeof DEMO_STREETS)[number];
const addr = (number: string, street: Street) => ({ number, street });
const at = (lat: number, lon: number) => ({ lat, lon });

const scenarioSubject = (id: 'antibes' | 'vence' | 'mougins'): DemoSubject =>
  DEMO_SCENARIOS.find((scenario) => scenario.id === id)!.subject;

// Les photos d'un bien : son jeu dès qu'il est déposé, sinon des photos de sa famille (le lot des
// photos les remplace toutes).
const photos = (set: string, fallback: readonly string[]): string[] =>
  demoPhotoSet(set) ?? [...fallback];

const apartment = DEMO_PHOTO_POOLS.apartment;
const house = DEMO_PHOTO_POOLS.house;
const villa = DEMO_PHOTO_POOLS.villa;

// « À relancer » — l'appartement de M. et Mme Lambert-Duval : les chiffres de celui d'Antibes (les
// Rossi y correspondent, M145 B), un autre immeuble.
export const LAMBERT_DUVAL_SUBJECT: DemoSubject = {
  ...scenarioSubject('antibes'),
  title: 'Appartement 3 pièces avec balcon — Antibes',
  constructionYear: 1979,
  district: 'Le Ponteil',
  address: addr('21', 'allée des Orangers Amers'),
  location: at(43.5768, 7.1171),
  photoSet: 'relance-antibes-appartement',
  photos: photos('relance-antibes-appartement', [apartment[1]!, apartment[2]!, apartment[3]!]),
  description:
    'Appartement 3 pièces de 68 m² au 3e étage avec ascenseur d’une résidence de 1979, balcon exposé sud, deux chambres, une place de stationnement.',
};

// « Prêt, en présentation directe » — la maison des Bernard, avec piscine (M133).
export const BERNARD_SUBJECT: DemoSubject = {
  ...scenarioSubject('vence'),
  title: 'Maison 5 pièces avec piscine — Vence',
  constructionYear: 2004,
  hasPool: true,
  district: 'Les Plans',
  address: addr('17', 'avenue des Collines Douces'),
  location: at(43.7189, 7.1128),
  photoSet: 'directe-vence-maison',
  photos: photos('directe-vence-maison', [house[3]!, house[0]!, house[5]!, house[6]!]),
  description:
    'Maison de 2004 de 135 m² sur 900 m² de terrain, piscine, quatre chambres, deux salles de bains, terrasse plein sud, garage.',
  strengths: ['Piscine', 'Terrain de 900 m²', 'Quatre chambres', 'Garage'],
};

// Le mandat de M. et Mme Lopez, à Vence (M145) : les chiffres de la maison de Mme Garcia, sans
// piscine, une autre maison.
export const LOPEZ_SUBJECT: DemoSubject = {
  ...scenarioSubject('vence'),
  title: 'Maison 5 pièces avec jardin — Vence',
  constructionYear: 1994,
  district: 'La Sine',
  address: addr('5', 'impasse du Moulin à Huile'),
  location: at(43.7231, 7.1003),
  photoSet: 'mandat-vence-maison',
  photos: photos('mandat-vence-maison', [house[0]!, house[4]!, house[6]!, house[7]!]),
  description:
    'Maison de 1994 de 135 m² sur 900 m² de terrain, quatre chambres, deux salles de bains, terrasse plein sud, garage.',
};

// Le mandat de Mme Ferrand (fiche photo `mandat-antibes-appartement`) : pour Mr and Mrs Wilson.
export const FERRAND_SUBJECT: DemoSubject = {
  propertyType: 'apartment',
  title: 'Appartement 3 pièces, terrasse et vue mer — Antibes',
  surfaceArea: 74,
  landArea: null,
  roomsCount: 3,
  bedroomsCount: 2,
  bathroomsCount: 1,
  floor: 4,
  floorsCount: 4,
  hasElevator: true,
  energyRating: 'C',
  gesRating: 'C',
  constructionYear: 1972,
  heatingType: 'individual_electric',
  generalCondition: 'excellent',
  exposure: 'south_west',
  outdoorSpaces: ['terrace'],
  parkingTypes: ['indoor_parking'],
  hasPool: null,
  inseeCode: '06004',
  postalCode: '06600',
  district: 'La Salis',
  address: addr('9', 'boulevard des Palmiers Nains'),
  location: at(43.5705, 7.1213),
  photoSet: 'mandat-antibes-appartement',
  photos: photos('mandat-antibes-appartement', [apartment[0]!, apartment[2]!, apartment[4]!]),
  listedPrice: 452500,
  advisorRange: { min: 425000, max: 455000 },
  description:
    'Appartement 3 pièces de 74 m² au 4e et dernier étage avec ascenseur, résidence de 1972 rénovée, terrasse de 18 m² exposée sud-ouest avec vue mer partielle, parking en sous-sol et cave.',
  strengths: ['Terrasse de 18 m²', 'Dernier étage', 'Vue mer partielle', 'Parking en sous-sol'],
  monthlyCharges: 210,
  propertyTax: 1250,
};

// Le mandat de M. et Mme Delmas, à Juan-les-Pins (commune d'Antibes) : pour M. et Mme Rossi.
export const DELMAS_SUBJECT: DemoSubject = {
  propertyType: 'apartment',
  title: 'Appartement 3 pièces avec balcon — Juan-les-Pins',
  surfaceArea: 65,
  landArea: null,
  roomsCount: 3,
  bedroomsCount: 2,
  bathroomsCount: 1,
  floor: 2,
  floorsCount: 4,
  hasElevator: true,
  energyRating: 'D',
  gesRating: 'D',
  constructionYear: 1988,
  heatingType: 'individual_electric',
  generalCondition: 'good',
  exposure: 'south',
  outdoorSpaces: ['balcony'],
  parkingTypes: ['outdoor_parking'],
  hasPool: null,
  inseeCode: '06004',
  postalCode: '06160',
  district: 'Juan-les-Pins',
  address: addr('14', 'avenue des Tilleuls Hauts'),
  location: at(43.569, 7.1105),
  photoSet: 'mandat-juan-les-pins-appartement',
  photos: photos('mandat-juan-les-pins-appartement', [apartment[3]!, apartment[1]!, apartment[4]!]),
  listedPrice: 407000,
  advisorRange: { min: 380000, max: 410000 },
  description:
    'Appartement 3 pièces de 65 m² au 2e étage avec ascenseur d’une résidence de 1988, balcon exposé sud, deux chambres, une place de parking, à quelques minutes des plages.',
  strengths: ['Balcon exposé sud', 'Ascenseur', 'Place de parking', 'Proche des plages'],
  monthlyCharges: 165,
  propertyTax: 1080,
};

// Le mandat de Mme Perrin, à Villeneuve-Loubet : un appartement plus modeste du portefeuille.
export const PERRIN_SUBJECT: DemoSubject = {
  propertyType: 'apartment',
  title: 'Appartement 3 pièces avec balcon — Villeneuve-Loubet',
  surfaceArea: 62,
  landArea: null,
  roomsCount: 3,
  bedroomsCount: 2,
  bathroomsCount: 1,
  floor: 1,
  floorsCount: 3,
  hasElevator: false,
  energyRating: 'D',
  gesRating: 'D',
  constructionYear: 1995,
  heatingType: 'individual_electric',
  generalCondition: 'good',
  exposure: 'east',
  outdoorSpaces: ['balcony'],
  parkingTypes: ['closed_box'],
  hasPool: null,
  inseeCode: '06161',
  postalCode: '06270',
  district: 'Village',
  address: addr('3', 'rue des Jarres'),
  location: at(43.6585, 7.1218),
  photoSet: 'mandat-villeneuve-loubet-appartement',
  photos: photos('mandat-villeneuve-loubet-appartement', [
    apartment[4]!,
    apartment[0]!,
    apartment[3]!,
  ]),
  listedPrice: 360000,
  advisorRange: { min: 340000, max: 365000 },
  description:
    'Appartement 3 pièces de 62 m² au 1er étage d’une petite résidence de 1995, balcon exposé est, deux chambres, box fermé.',
  strengths: ['Balcon', 'Box fermé', 'Petite résidence', 'Proche du village'],
  monthlyCharges: 140,
  propertyTax: 950,
};

// Le mandat de M. et Mme Garnier, à La Colle-sur-Loup : une maison à piscine pour les Lambert,
// la famille Moreau et Mme Faure.
export const GARNIER_SUBJECT: DemoSubject = {
  propertyType: 'house',
  title: 'Maison 5 pièces avec piscine — La Colle-sur-Loup',
  surfaceArea: 145,
  landArea: 1100,
  roomsCount: 5,
  bedroomsCount: 4,
  bathroomsCount: 2,
  floor: null,
  floorsCount: 2,
  hasElevator: null,
  energyRating: 'C',
  gesRating: 'B',
  constructionYear: 2002,
  heatingType: 'individual_heat_pump',
  generalCondition: 'excellent',
  exposure: 'south',
  outdoorSpaces: ['terrace', 'garden'],
  parkingTypes: ['garage'],
  hasPool: true,
  inseeCode: '06044',
  postalCode: '06480',
  district: 'Les Hauts',
  address: addr('11', 'montée des Oliviers Bas'),
  location: at(43.687, 7.102),
  photoSet: 'mandat-la-colle-sur-loup-maison',
  photos: photos('mandat-la-colle-sur-loup-maison', [house[2]!, house[4]!, house[5]!, house[7]!]),
  listedPrice: 809500,
  advisorRange: { min: 760000, max: 810000 },
  description:
    'Maison de 2002 de 145 m² sur 1 100 m² de terrain, piscine, quatre chambres, deux salles de bains, terrasse exposée sud, garage.',
  strengths: ['Piscine', 'Terrain de 1 100 m²', 'Quatre chambres', 'Au calme'],
  monthlyCharges: null,
  propertyTax: 2300,
};

// Le mandat de Mme Navarro, à Saint-Paul-de-Vence : de plain-pied, pour M. Girard et Mme Chevalier
// et M. et Mme Roux.
export const NAVARRO_SUBJECT: DemoSubject = {
  propertyType: 'house',
  title: 'Maison 4 pièces de plain-pied — Saint-Paul-de-Vence',
  surfaceArea: 118,
  landArea: 1400,
  roomsCount: 4,
  bedroomsCount: 3,
  bathroomsCount: 2,
  floor: null,
  floorsCount: 1,
  hasElevator: null,
  energyRating: 'C',
  gesRating: 'C',
  constructionYear: 1985,
  heatingType: 'individual_heat_pump',
  generalCondition: 'good',
  exposure: 'south',
  outdoorSpaces: ['terrace', 'garden'],
  parkingTypes: ['carport'],
  hasPool: false,
  inseeCode: '06128',
  postalCode: '06570',
  district: 'Les Collines',
  address: addr('6', 'chemin de la Source Haute'),
  location: at(43.693, 7.117),
  photoSet: 'mandat-saint-paul-de-vence-maison',
  photos: photos('mandat-saint-paul-de-vence-maison', [house[3]!, house[5]!, house[6]!, house[4]!]),
  listedPrice: 727000,
  advisorRange: { min: 690000, max: 730000 },
  description:
    'Maison de plain-pied de 1985, rénovée, 118 m² sur 1 400 m² de terrain, trois chambres, deux salles de bains, terrasse exposée sud, abri pour deux voitures.',
  strengths: ['De plain-pied', 'Terrain de 1 400 m²', 'Au calme', 'Rénovée'],
  monthlyCharges: null,
  propertyTax: 2050,
};

// Le mandat de M. et Mme Castel, à Valbonne : une villa du marché de Mougins.
export const CASTEL_SUBJECT: DemoSubject = {
  ...scenarioSubject('mougins'),
  title: 'Villa 6 pièces avec piscine — Valbonne',
  surfaceArea: 195,
  landArea: 2300,
  roomsCount: 6,
  bedroomsCount: 4,
  bathroomsCount: 3,
  energyRating: 'C',
  gesRating: 'B',
  constructionYear: 1992,
  exposure: 'south_west',
  inseeCode: '06152',
  postalCode: '06560',
  district: 'Les Collines',
  address: addr('2', 'sentier des Genêts d’Or'),
  location: at(43.642, 7.009),
  photoSet: 'mandat-valbonne-villa',
  photos: photos('mandat-valbonne-villa', [villa[4]!, villa[1]!, villa[2]!, villa[5]!]),
  listedPrice: 1639000,
  advisorRange: { min: 1550000, max: 1650000 },
  description:
    'Villa de 1992 rénovée en 2019, 195 m² sur 2 300 m² de terrain, piscine, quatre chambres, trois salles de bains, garage double.',
  strengths: ['Piscine', 'Terrain de 2 300 m²', 'Rénovée en 2019', 'Garage double'],
  propertyTax: 4400,
};
