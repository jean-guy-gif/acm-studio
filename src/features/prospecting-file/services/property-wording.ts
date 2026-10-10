import type { PropertyKind } from '@/features/prospecting-file/types';

// Mission 84 — les accords selon le type de bien : « Votre maison et la nôtre », « Votre
// appartement et le nôtre ». Un type qui ne se reconnaît pas dit « bien ».

const NOUNS: Record<PropertyKind, { noun: string; feminine: boolean; elided: boolean }> = {
  house: { noun: 'maison', feminine: true, elided: false },
  apartment: { noun: 'appartement', feminine: false, elided: true },
  land: { noun: 'terrain', feminine: false, elided: false },
  building: { noun: 'immeuble', feminine: false, elided: true },
  commercial: { noun: 'local', feminine: false, elided: false },
  parking: { noun: 'parking', feminine: false, elided: false },
  unknown: { noun: 'bien', feminine: false, elided: false },
};

export type PropertyWording = {
  noun: string; // maison
  a: string; // une maison
  the: string; // la maison · l’appartement
  yourNoun: string; // votre maison
  ourNoun: string; // notre maison
  ourOne: string; // la nôtre
  yourOne: string; // la vôtre
  ofYourOne: string; // de la vôtre · du vôtre
  toYourOne: string; // à la vôtre · au vôtre
};

export function propertyWording(kind: PropertyKind): PropertyWording {
  const { noun, feminine, elided } = NOUNS[kind];
  return {
    noun,
    a: `${feminine ? 'une' : 'un'} ${noun}`,
    the: elided ? `l’${noun}` : `${feminine ? 'la' : 'le'} ${noun}`,
    yourNoun: `votre ${noun}`,
    ourNoun: `notre ${noun}`,
    ourOne: feminine ? 'la nôtre' : 'le nôtre',
    yourOne: feminine ? 'la vôtre' : 'le vôtre',
    ofYourOne: feminine ? 'de la vôtre' : 'du vôtre',
    toYourOne: feminine ? 'à la vôtre' : 'au vôtre',
  };
}

export const capitalize = (text: string): string =>
  text === '' ? text : text[0].toUpperCase() + text.slice(1);
