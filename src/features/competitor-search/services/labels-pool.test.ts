import { describe, expect, it } from 'vitest';

import {
  elevatorFromLabels,
  poolFromLabels,
} from '@/features/competitor-search/services/stream-estate-features';

// Mission 122 (partie B, essai de Jean-Guy, 25/10) — trois villas avec piscine montraient « ? » :
// la piscine d'un concurrent est dans les étiquettes de son annonce, et elle se lit pour chaque
// source, avec la même règle que Stream Estate.
describe('la piscine et l’ascenseur lus dans les étiquettes d’une annonce', () => {
  it('« Piscine » dite : oui ; « Sans piscine » : non ; rien de dit : inconnu', () => {
    expect(poolFromLabels(['Terrasse', 'Jardin', '1 parking: Garage', 'Piscine'])).toBe(true);
    expect(poolFromLabels(['Piscine privée'])).toBe(true);
    expect(poolFromLabels(['Sans piscine'])).toBe(false);
    expect(poolFromLabels(['Pas de piscine', 'Terrasse'])).toBe(false);
    expect(poolFromLabels(['Terrasse'])).toBeNull();
    expect(poolFromLabels([])).toBeNull();
    // Une piscine dite quelque part l'emporte.
    expect(poolFromLabels(['Sans piscine', 'Piscine'])).toBe(true);
  });

  it('l’ascenseur : dit, oui ; sinon inconnu, jamais « non » par défaut', () => {
    expect(elevatorFromLabels(['Ascenseur'])).toBe(true);
    expect(elevatorFromLabels(['Terrasse'])).toBeNull();
  });
});

describe('le déroulé lit ces étiquettes pour un concurrent et pour une annonce importée', () => {
  it('le chargement des biens les passe à la règle', async () => {
    const { readFileSync } = await import('node:fs');
    const code = readFileSync(
      'src/features/buyer-presentation/queries/load-presentation.ts',
      'utf8',
    );
    expect(code).toMatch(/listing_features/);
    expect(code).toMatch(/hasPool: poolFromLabels\(labels\)/);
    expect(code).toMatch(/hasPool: poolFromLabels\(importedLabels\) \?\?/);
  });
});
