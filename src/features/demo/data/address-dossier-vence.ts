import type { RealSale, RisksData, UrbanismData } from '@/features/address-dossier/types';

// Mission 141 — le dossier d'adresse de la démo (décision de Jean-Guy, 07/11) : la maison du
// scénario de Vence (une adresse inventée, M114), et autour de son point les données publiques
// RÉELLES du secteur, relevées une fois le 07/11/2026 — les ventes de maisons à 500 m sur trois ans
// (DVF, fichiers geo-dvf d'Etalab, communes voisines comprises), les risques (Géorisques) et la zone
// du PLU avec ses servitudes (Géoportail de l'urbanisme). Ni rue, ni parcelle, ni DPE, ni
// copropriété : l'adresse est fictive, rien n'est trouvé à cette adresse. Servi sans aucun appel
// réseau pendant la démo.

export const DEMO_DOSSIER_CAPTURED_ON = '2026-11-07';

export const DEMO_VENCE_SALES: readonly RealSale[] = [
  { date: '2025-09-02', price: 525000, surface: 75, pricePerM2: 7000, rooms: 3, distanceM: 234 },
  { date: '2025-07-23', price: 610000, surface: 135, pricePerM2: 4519, rooms: 5, distanceM: 464 },
  { date: '2025-07-18', price: 566000, surface: 116, pricePerM2: 4879, rooms: 4, distanceM: 446 },
  { date: '2025-06-24', price: 447000, surface: 91, pricePerM2: 4912, rooms: 4, distanceM: 168 },
  { date: '2025-04-29', price: 2973000, surface: 190, pricePerM2: 15647, rooms: 5, distanceM: 374 },
  { date: '2024-12-18', price: 602000, surface: 78, pricePerM2: 7718, rooms: 4, distanceM: 249 },
  { date: '2024-10-14', price: 670000, surface: 157, pricePerM2: 4268, rooms: 5, distanceM: 386 },
  { date: '2024-09-11', price: 927000, surface: 147, pricePerM2: 6306, rooms: 8, distanceM: 133 },
  { date: '2024-08-27', price: 680000, surface: 104, pricePerM2: 6538, rooms: 5, distanceM: 468 },
  { date: '2024-05-29', price: 625000, surface: 146, pricePerM2: 4281, rooms: 6, distanceM: 238 },
  { date: '2024-05-14', price: 340000, surface: 73, pricePerM2: 4658, rooms: 3, distanceM: 195 },
  { date: '2024-04-29', price: 375000, surface: 77, pricePerM2: 4870, rooms: 4, distanceM: 292 },
  { date: '2023-11-23', price: 1, surface: 101, pricePerM2: 0, rooms: 4, distanceM: 278 },
];

export const DEMO_VENCE_RISKS: RisksData = {
  communeRisks: ['Inondation', 'Mouvement de terrain', 'Séisme', 'Feu de forêt'],
  seismicZone: '4 - MOYENNE',
  radonClass: '2',
  clayExposure: 'Exposition forte',
  pollutedSites: 0,
  groundMovements: 0,
};

export const DEMO_VENCE_URBANISM: UrbanismData = {
  zone: { code: 'UFb4', label: 'Zone UF : zones pavillonnaires' },
  servitudes: [
    { code: 'AC2', label: 'Site inscrit ou classé', name: 'Site Inscrit - Arrière-pays de Vence' },
    {
      code: 'AC1',
      label: 'Abords de monument historique',
      name: 'Commanderie de Saint-Martin (ancienne)',
    },
    { code: 'PM1', label: 'Plan de prévention des risques naturels', name: null },
  ],
};
