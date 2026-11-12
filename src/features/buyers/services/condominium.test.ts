import { describe, expect, it } from 'vitest';

import { knownCondominium } from '@/features/buyers/services/condominium';

// Mission 151 — la copropriété connue d'un bien vendeur : seule sa fiche la dit.
describe('knownCondominium', () => {
  it('lit la ligne jointe, en objet ou en liste ; sans ligne, inconnue', () => {
    expect(knownCondominium({ is_condominium: true })).toBe(true);
    expect(knownCondominium([{ is_condominium: false }])).toBe(false);
    expect(knownCondominium([])).toBeNull();
    expect(knownCondominium(null)).toBeNull();
    expect(knownCondominium(undefined)).toBeNull();
    expect(knownCondominium({ is_condominium: null })).toBeNull();
  });
});
