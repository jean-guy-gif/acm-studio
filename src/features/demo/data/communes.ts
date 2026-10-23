import type { GeoCommune } from '@/features/competitor-search/services/resolve-insee-code';

// Mission 114 — la table LOCALE des communes de la démonstration : ce que geo.api.gouv.fr
// répondrait pour les Alpes-Maritimes autour d'Antibes, Vence et Mougins. Vraies communes, vrais
// codes INSEE et codes postaux ; les centres sont arrondis au centième de degré (≈ 1 km), ce qui
// suffit aux rayons de la recherche (1 à 10 km). La démo n'appelle jamais le service public.

export type DemoCommune = {
  code: string;
  nom: string;
  codesPostaux: string[];
  centre: { lat: number; lon: number };
};

export const DEMO_DEPARTEMENT = '06';

export const DEMO_COMMUNES: readonly DemoCommune[] = [
  {
    code: '06004',
    nom: 'Antibes',
    codesPostaux: ['06600', '06160'],
    centre: { lat: 43.58, lon: 7.12 },
  },
  { code: '06155', nom: 'Vallauris', codesPostaux: ['06220'], centre: { lat: 43.58, lon: 7.05 } },
  { code: '06018', nom: 'Biot', codesPostaux: ['06410'], centre: { lat: 43.63, lon: 7.1 } },
  {
    code: '06161',
    nom: 'Villeneuve-Loubet',
    codesPostaux: ['06270'],
    centre: { lat: 43.66, lon: 7.12 },
  },
  {
    code: '06027',
    nom: 'Cagnes-sur-Mer',
    codesPostaux: ['06800'],
    centre: { lat: 43.66, lon: 7.15 },
  },
  {
    code: '06123',
    nom: 'Saint-Laurent-du-Var',
    codesPostaux: ['06700'],
    centre: { lat: 43.67, lon: 7.19 },
  },
  { code: '06157', nom: 'Vence', codesPostaux: ['06140'], centre: { lat: 43.72, lon: 7.11 } },
  {
    code: '06128',
    nom: 'Saint-Paul-de-Vence',
    codesPostaux: ['06570'],
    centre: { lat: 43.7, lon: 7.12 },
  },
  {
    code: '06044',
    nom: 'La Colle-sur-Loup',
    codesPostaux: ['06480'],
    centre: { lat: 43.69, lon: 7.1 },
  },
  {
    code: '06148',
    nom: 'Tourrettes-sur-Loup',
    codesPostaux: ['06140'],
    centre: { lat: 43.72, lon: 7.06 },
  },
  {
    code: '06122',
    nom: 'Saint-Jeannet',
    codesPostaux: ['06640'],
    centre: { lat: 43.75, lon: 7.14 },
  },
  { code: '06064', nom: 'Gattières', codesPostaux: ['06510'], centre: { lat: 43.76, lon: 7.18 } },
  {
    code: '06010',
    nom: 'Le Bar-sur-Loup',
    codesPostaux: ['06620'],
    centre: { lat: 43.7, lon: 6.99 },
  },
  { code: '06112', nom: 'Le Rouret', codesPostaux: ['06650'], centre: { lat: 43.68, lon: 7.08 } },
  {
    code: '06105',
    nom: 'Roquefort-les-Pins',
    codesPostaux: ['06330'],
    centre: { lat: 43.67, lon: 7.05 },
  },
  { code: '06152', nom: 'Valbonne', codesPostaux: ['06560'], centre: { lat: 43.64, lon: 7.01 } },
  { code: '06089', nom: 'Opio', codesPostaux: ['06650'], centre: { lat: 43.67, lon: 7.01 } },
  {
    code: '06038',
    nom: 'Châteauneuf-Grasse',
    codesPostaux: ['06740'],
    centre: { lat: 43.67, lon: 6.98 },
  },
  { code: '06085', nom: 'Mougins', codesPostaux: ['06250'], centre: { lat: 43.6, lon: 7.0 } },
  {
    code: '06084',
    nom: 'Mouans-Sartoux',
    codesPostaux: ['06370'],
    centre: { lat: 43.62, lon: 6.97 },
  },
  { code: '06030', nom: 'Le Cannet', codesPostaux: ['06110'], centre: { lat: 43.58, lon: 7.02 } },
  {
    code: '06029',
    nom: 'Cannes',
    codesPostaux: ['06400', '06150'],
    centre: { lat: 43.55, lon: 7.02 },
  },
  { code: '06069', nom: 'Grasse', codesPostaux: ['06130'], centre: { lat: 43.66, lon: 6.92 } },
  { code: '06090', nom: 'Pégomas', codesPostaux: ['06580'], centre: { lat: 43.6, lon: 6.93 } },
  {
    code: '06108',
    nom: 'La Roquette-sur-Siagne',
    codesPostaux: ['06550'],
    centre: { lat: 43.59, lon: 6.95 },
  },
  {
    code: '06088',
    nom: 'Nice',
    codesPostaux: ['06000', '06100', '06200', '06300'],
    centre: { lat: 43.71, lon: 7.26 },
  },
];

// La forme que lit le reste de l'outil (geo.api.gouv.fr : `centre` en GeoJSON, [lon, lat]).
export function toGeoCommune(commune: DemoCommune): GeoCommune {
  return {
    nom: commune.nom,
    code: commune.code,
    codesPostaux: commune.codesPostaux,
    centre: { coordinates: [commune.centre.lon, commune.centre.lat] },
    codeDepartement: DEMO_DEPARTEMENT,
  };
}

export function demoCommuneByCode(code: string): DemoCommune | null {
  return DEMO_COMMUNES.find((commune) => commune.code === code) ?? null;
}
