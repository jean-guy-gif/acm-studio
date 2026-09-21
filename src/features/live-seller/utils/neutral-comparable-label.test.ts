import { describe, expect, it } from 'vitest';

import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';

describe('neutralComparableLabel', () => {
  // Le titre du portail porte le prix. Le libellé neutre, composé des seuls champs
  // structurés, ne peut JAMAIS le laisser passer — la pédagogie de l'étape « sans
  // prix » tient. On ne retire pas le prix du titre par regex : on ne lit pas le titre.
  it('compose un libellé sans prix depuis les champs structurés (titre à prix ignoré)', () => {
    const label = neutralComparableLabel({
      roomsCount: 3,
      surfaceArea: 69,
      city: 'Villeneuve-Loubet',
      district: null,
    });
    expect(label).toBe('3 pièces · 69 m² · Villeneuve-Loubet');
    // Le prix du titre brut (« … 365000 € … ») n'a aucune façon d'entrer ici.
    expect(label).not.toContain('365000');
    expect(label).not.toContain('365 000');
    expect(label).not.toContain('€');
  });

  it('préfère le quartier à la commune quand il existe', () => {
    expect(
      neutralComparableLabel({ roomsCount: 2, surfaceArea: 45, city: 'Nice', district: 'Cimiez' }),
    ).toBe('2 pièces · 45 m² · Cimiez');
  });

  it('n’affiche que ce qui existe (une pièce au singulier, surface absente)', () => {
    expect(
      neutralComparableLabel({ roomsCount: 1, surfaceArea: null, city: 'Antibes', district: null }),
    ).toBe('1 pièce · Antibes');
  });

  it('sans aucun champ structuré → libellé générique, jamais le titre', () => {
    expect(
      neutralComparableLabel({ roomsCount: null, surfaceArea: null, city: null, district: null }),
    ).toBe('Bien concurrent');
  });
});
