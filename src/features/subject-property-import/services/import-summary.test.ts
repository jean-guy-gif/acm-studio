import { describe, expect, it } from 'vitest';

import { summarizeListingFields } from '@/features/comparable-import/services/normalize-listing-data';
import type { ImportedComparableData } from '@/features/comparable-import/types';
import { subjectImportSummary } from '@/features/subject-property-import/services/import-summary';

// Lancement, mission 11 — vu sur un vrai dossier : à l'import de l'annonce du bien vendeur,
// « Informations détectées » écrivait « title, portalPricePerSquareMeter, daysOnMarket ».
describe('le résumé de l’import du bien vendeur', () => {
  it('ne dit que des champs de la fiche, en français', () => {
    expect(
      subjectImportSummary({
        found: [
          'title',
          'price',
          'portalPricePerSquareMeter',
          'surfaceArea',
          'roomsCount',
          'city',
          'daysOnMarket',
          'photoUrls',
        ],
        missing: ['bedroomsCount', 'gesRating'],
      }),
    ).toEqual({
      found: ['Prix (indicatif)', 'Surface', 'Pièces', 'Ville', 'Photos'],
      missing: ['Chambres', 'GES'],
    });
  });

  it('ne demande jamais le prix du bien vendeur, ni un champ que la fiche n’a pas', () => {
    expect(
      subjectImportSummary({
        found: [],
        missing: ['title', 'price', 'portalPricePerSquareMeter', 'daysOnMarket', 'district'],
      }),
    ).toEqual({ found: [], missing: ['Quartier'] });
  });

  it('aucune clé technique, quels que soient les champs que le lecteur annonce', () => {
    const nothing = new Proxy({ photoUrls: [] } as unknown as ImportedComparableData, {
      get: (target, key) => (key === 'photoUrls' ? [] : null),
    });
    const everything = new Proxy({} as ImportedComparableData, {
      get: (target, key) => (key === 'photoUrls' ? ['https://example.com/a.jpg'] : 1),
    });
    const keys = [
      ...summarizeListingFields(nothing).missingFields,
      ...summarizeListingFields(everything).foundFields,
    ];
    expect(keys).toContain('daysOnMarket');
    const summary = subjectImportSummary({ found: keys, missing: keys });
    for (const word of [...summary.found, ...summary.missing]) {
      expect(word, word).not.toMatch(/[a-z][A-Z]|^[a-z]+$/);
    }
  });
});
