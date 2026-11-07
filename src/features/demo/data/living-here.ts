import type { GeoPoint } from '@/features/competitor-search/types';
import type {
  DailyData,
  MovesData,
  RisksLine,
  SchoolsData,
  SurroundingsData,
} from '@/features/living-here/types';

// Mission 142 — « Vivre ici » dans la démo (décision de Jean-Guy, 07/11) : deux fiches relevées une
// fois le 07/11/2026 dans les données publiques RÉELLES des secteurs (OpenStreetMap, annuaire de
// l'Éducation nationale, itinéraires de l'IGN, Géorisques), aux deux points de départ de la démo :
// l'adresse du mandat de Mougins (une adresse inventée, son point dans le secteur, M114) et le
// quartier de l'annonce d'Antibes que visitent Mr and Mrs Wilson (la position de l'annonce arrondie).
// Servies sans aucun appel réseau.

export type DemoLivingHere = {
  from: GeoPoint;
  daily: DailyData;
  schools: SchoolsData;
  moves: MovesData;
  surroundings: SurroundingsData;
  risks: RisksLine;
};

export const DEMO_LIVING_HERE: readonly DemoLivingHere[] = [
  {
    from: { lat: 43.6031, lon: 7.0012 },
    daily: {
      places: [
        { category: 'pharmacy', name: 'Pharmacie Saint-Basile', walkMinutes: 14 },
        { category: 'bakery', name: "Le Pain d'Olivier", walkMinutes: 15 },
        { category: 'supermarket', name: 'Carrefour Market', walkMinutes: 23 },
      ],
    },
    schools: {
      places: [
        { category: 'primary_school', name: 'Ecole élémentaire Rebuffel', walkMinutes: 11 },
        {
          category: 'middle_school',
          name: 'Ecole secondaire privée les Pouces Verts',
          walkMinutes: 48,
        },
        { category: 'nursery_school', name: 'Ecole maternelle Rebuffel', walkMinutes: 11 },
        {
          category: 'high_school',
          name: 'Ecole 2nd degré général privée privée Mougins School',
          walkMinutes: 35,
        },
      ],
    },
    moves: {
      transit: { category: 'transit', name: 'Qui Vend Bon', walkMinutes: 9 },
      drives: [
        { kind: 'tgv_station', name: 'Cannes', minutes: 17 },
        { kind: 'airport', name: "Nice-Côte d'Azur", minutes: 34 },
        { kind: 'town_centre', name: 'Mougins', minutes: 9 },
      ],
    },
    surroundings: { green: { category: 'green_space', name: null, walkMinutes: 12 } },
    risks: {
      riskCodes: ['11', '12', '13', '16', '18', '23', '24'],
      seismicZone: '3',
      clay: 'high',
    },
  },
  {
    from: { lat: 43.585, lon: 7.12 },
    daily: {
      places: [
        { category: 'bakery', name: 'Boulangerie Rochat', walkMinutes: 10 },
        { category: 'supermarket', name: 'La Vie Claire', walkMinutes: 2 },
        { category: 'pharmacy', name: 'Pharmacie Vautrin', walkMinutes: 8 },
        { category: 'doctor', name: 'Orthopédie Podologie', walkMinutes: 13 },
      ],
    },
    schools: {
      places: [
        { category: 'nursery_school', name: 'Ecole maternelle Arène', walkMinutes: 7 },
        { category: 'primary_school', name: 'Ecole élémentaire Guynemer', walkMinutes: 10 },
        { category: 'middle_school', name: 'Collège Fersen', walkMinutes: 13 },
        { category: 'high_school', name: 'Lycée du Mont Saint-Jean', walkMinutes: 19 },
      ],
    },
    moves: {
      transit: { category: 'transit', name: 'Gare SNCF', walkMinutes: 1 },
      drives: [
        { kind: 'tgv_station', name: 'Antibes', minutes: 1 },
        { kind: 'airport', name: "Nice-Côte d'Azur", minutes: 38 },
        { kind: 'town_centre', name: 'Antibes', minutes: 8 },
      ],
    },
    surroundings: {
      green: { category: 'green_space', name: 'Jardin René Cassin', walkMinutes: 3 },
    },
    risks: { riskCodes: ['11', '12', '13', '16', '24'], seismicZone: '3', clay: 'medium' },
  },
];
