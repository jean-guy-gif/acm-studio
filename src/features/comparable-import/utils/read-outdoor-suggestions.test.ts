import { describe, expect, it } from 'vitest';

import { readOutdoorSuggestions } from '@/features/comparable-import/utils/read-outdoor-suggestions';

describe('readOutdoorSuggestions', () => {
  it('propose une terrasse et un parking (Green Acres)', () => {
    expect(
      readOutdoorSuggestions("d'une belle terrasse de 56 m². Deux places de parking complètent"),
    ).toEqual(['terrasse (56 m²)', '2 places de parking']);
  });

  it('propose un jardin « d’environ » et « une place de parking » (Maisons et Appartements)', () => {
    expect(
      readOutdoorSuggestions("s'accompagnant d'un jardin d'environ 60m2 … une place de parking"),
    ).toEqual(['jardin (60 m²)', '1 place de parking']);
  });

  it('propose un balcon nommé', () => {
    expect(readOutdoorSuggestions('lumineux avec balcon plein sud')).toEqual(['balcon']);
  });

  it('« Structure/extérieur à restaurer » (état du bâti) ne propose rien', () => {
    expect(readOutdoorSuggestions('Maison à rénover. Structure/extérieur à restaurer.')).toEqual(
      [],
    );
  });

  it('une terrasse sans surface n’est pas proposée (conservateur)', () => {
    expect(readOutdoorSuggestions('agréable terrasse ensoleillée')).toEqual([]);
  });
});
