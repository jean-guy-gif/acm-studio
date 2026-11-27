import { describe, expect, it } from 'vitest';

import {
  locationBelowLabel,
  neutralComparableLabel,
} from '@/features/live-seller/utils/neutral-comparable-label';

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
    expect(label).toBe('3 pièces · 69\u00A0m² · Villeneuve-Loubet');
    // Le prix du titre brut (« … 365000 € … ») n'a aucune façon d'entrer ici.
    expect(label).not.toContain('365000');
    expect(label).not.toContain('365 000');
    expect(label).not.toContain('€');
  });

  it('préfère le quartier à la commune quand il existe', () => {
    expect(
      neutralComparableLabel({ roomsCount: 2, surfaceArea: 45, city: 'Nice', district: 'Cimiez' }),
    ).toBe('2 pièces · 45\u00A0m² · Cimiez');
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

// Lot A (Jean-Guy, 27/11) — au Live, la ligne du lieu, sous le libellé neutre, ne redit jamais ce
// que le libellé dit déjà : « Maison · 5 pièces · 135 m² · Saint-Paul-de-Vence » ne se suit plus de
// « Saint-Paul-de-Vence ». Le libellé finit par le quartier, sinon par la ville ; dessous, la ville
// seulement quand le libellé a nommé le quartier et qu'elle n'y est pas déjà.
describe('locationBelowLabel', () => {
  it('sans quartier, le libellé dit la ville : rien dessous', () => {
    expect(locationBelowLabel({ city: 'Saint-Paul-de-Vence', district: null })).toBeNull();
    expect(locationBelowLabel({ city: 'Saint-Paul-de-Vence', district: '  ' })).toBeNull();
  });

  it('avec un quartier, le libellé le dit : la ville seule dessous', () => {
    expect(locationBelowLabel({ city: 'Vence', district: 'Centre-ville' })).toBe('Vence');
    expect(locationBelowLabel({ city: ' Nice ', district: 'Cimiez' })).toBe('Nice');
  });

  it('une ville déjà dans le nom du quartier ne se redit pas', () => {
    expect(locationBelowLabel({ city: 'Vence', district: 'Vence centre' })).toBeNull();
    expect(
      locationBelowLabel({ city: 'Saint-Laurent-du-Var', district: 'St Laurent du Var' }),
    ).toBeNull();
    // « Vence » n'est pas dans « Saint-Paul » : la ville se dit.
    expect(locationBelowLabel({ city: 'Saint-Paul-de-Vence', district: 'Saint-Paul' })).toBe(
      'Saint-Paul-de-Vence',
    );
  });

  it('un quartier sans ville, ou rien du tout : rien dessous', () => {
    expect(locationBelowLabel({ city: null, district: 'Cimiez' })).toBeNull();
    expect(locationBelowLabel({ city: null, district: null })).toBeNull();
  });

  it('la ville ne paraît jamais deux fois, libellé et ligne réunis', () => {
    const entries = [
      { city: 'Saint-Paul-de-Vence', district: null },
      { city: 'Vence', district: 'Centre-ville' },
      { city: 'Vence', district: 'Vence centre' },
      { city: 'Antibes', district: 'Juan-les-Pins' },
    ];
    for (const entry of entries) {
      const label = neutralComparableLabel({ roomsCount: 5, surfaceArea: 135, ...entry });
      const shown = `${label} ${locationBelowLabel(entry) ?? ''}`;
      expect(shown.split(entry.city).length - 1, shown).toBeLessThanOrEqual(1);
    }
  });
});
