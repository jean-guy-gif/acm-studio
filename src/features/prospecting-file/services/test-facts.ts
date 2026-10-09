import type { ListedProperty, ProspectingFileFacts } from '@/features/prospecting-file/types';

// Les biens de la maquette (mission 84), pour les tests : deux maisons de Cagnes-sur-Mer.
export const OUR_HOUSE: ListedProperty = {
  surfaceArea: 200,
  roomsCount: 9,
  landArea: 1200,
  outdoorSpaces: ['terrace', 'garden'],
  parkingTypes: ['none'],
  dpe: 'D',
  district: 'Les Bréguières',
  city: 'Cagnes-sur-Mer',
  price: 749000,
};

export const THEIR_HOUSE: ListedProperty = {
  surfaceArea: 201,
  roomsCount: 7,
  landArea: 900,
  outdoorSpaces: ['terrace'],
  parkingTypes: ['garage'],
  dpe: 'C',
  district: 'Les Bréguières',
  city: 'Cagnes sur Mer',
  price: 750000,
};

export function makeFacts(overrides: Partial<ProspectingFileFacts> = {}): ProspectingFileFacts {
  return {
    kind: 'house',
    ours: OUR_HOUSE,
    theirs: THEIR_HOUSE,
    theirAddress: '14 chemin des Oliviers, 06800 Cagnes-sur-Mer',
    distanceMeters: 640,
    ...overrides,
  };
}

// Les nombres formatés portent des espaces insécables : les tests comparent en espaces simples.
export const spaced = (text: string): string => text.replace(/[\u00a0\u202f]/g, ' ');
