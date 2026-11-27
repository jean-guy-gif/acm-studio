import { describe, expect, it } from 'vitest';

import { parseBuyerInput, readBuyerFormData } from '@/features/buyers/schemas/buyer-input';

// Mission 117 — les règles de la fiche : nom et commune obligatoires, budgets cohérents, pièces ≥
// chambres ; tout le reste facultatif, une case vide reste vide.
const base = {
  name: 'M. Durand',
  cities: 'Antibes, Juan-les-Pins',
};

describe('la fiche acquéreur, relue par le serveur', () => {
  it('le nom et une commune suffisent ; le reste est vide, jamais deviné', () => {
    const parsed = parseBuyerInput(base);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.input).toMatchObject({
      name: 'M. Durand',
      cities: ['Antibes', 'Juan-les-Pins'],
      propertyTypes: [],
      mustHave: [],
      budgetIdeal: null,
      budgetMax: null,
      roomsMin: null,
      bedroomsMin: null,
      surfaceMin: null,
      outdoor: null,
      energyRatingMax: null,
      purpose: null,
      timeline: null,
    });
  });

  it('sans nom : refusé, sur le champ', () => {
    const parsed = parseBuyerInput({ ...base, name: '   ' });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.errors.name).toBe('Indiquez le nom de l’acquéreur.');
  });

  it('sans commune : refusé, sur le champ ; une virgule seule ne fait pas une commune', () => {
    for (const cities of ['', ' , ', undefined]) {
      const parsed = parseBuyerInput({ ...base, cities });
      expect(parsed.ok).toBe(false);
      if (parsed.ok) return;
      expect(parsed.errors.cities).toBe('Indiquez au moins une commune.');
    }
  });

  it('les communes se dédoublonnent par leur clé (alias M86, arrondissements M99)', () => {
    const parsed = parseBuyerInput({
      ...base,
      cities: 'Antibes\u202f; antibes, Paris 15e, 75015 Paris',
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.input.cities).toEqual(['Antibes', 'Paris 15e']);
  });

  it('les budgets : idéal au plus égal au plafond, lus à la française', () => {
    const ok = parseBuyerInput({ ...base, budget_ideal: '400 000', budget_max: '430 000' });
    expect(ok.ok && ok.input.budgetIdeal).toBe(400_000);
    expect(ok.ok && ok.input.budgetMax).toBe(430_000);
    const ko = parseBuyerInput({ ...base, budget_ideal: '450000', budget_max: '430000' });
    expect(ko.ok).toBe(false);
    if (ko.ok) return;
    expect(ko.errors.budget_max).toBe('Le budget plafond est au moins le budget idéal.');
  });

  it('pas plus de chambres que de pièces', () => {
    const ko = parseBuyerInput({ ...base, rooms_min: '2', bedrooms_min: '3' });
    expect(ko.ok).toBe(false);
    if (ko.ok) return;
    expect(ko.errors.bedrooms_min).toBe('Pas plus de chambres que de pièces.');
    const ok = parseBuyerInput({ ...base, rooms_min: '3', bedrooms_min: '2', surface_min: '65,5' });
    expect(ok.ok && ok.input).toMatchObject({ roomsMin: 3, bedroomsMin: 2, surfaceMin: 65.5 });
  });

  it('un nombre qui n’en est pas un : refusé, sur son champ', () => {
    const ko = parseBuyerInput({ ...base, budget_max: 'quatre cent mille' });
    expect(ko.ok).toBe(false);
    if (ko.ok) return;
    expect(ko.errors.budget_max).toBe('Budget plafond\u00a0: indiquez un nombre.');
  });

  it('listes et oui/non : hors liste ignoré, « yes »/« no » lus, vide = non renseigné', () => {
    const parsed = parseBuyerInput({
      ...base,
      property_types: ['apartment', 'land', 'apartment'],
      must_have: ['outdoor', 'price', 'cities'],
      outdoor: 'yes',
      pool: 'no',
      parking: '',
      purpose: 'primary',
      timeline: 'bientôt',
      energy_rating_max: 'D',
      email: 'durand@example.org',
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.input).toMatchObject({
      propertyTypes: ['apartment'],
      mustHave: ['outdoor', 'cities'],
      outdoor: true,
      pool: false,
      parking: null,
      purpose: 'primary',
      timeline: null,
      energyRatingMax: 'D',
      email: 'durand@example.org',
    });
  });

  it('un e-mail mal formé : refusé', () => {
    const ko = parseBuyerInput({ ...base, email: 'durand' });
    expect(ko.ok).toBe(false);
    if (ko.ok) return;
    expect(ko.errors.email).toBe('Indiquez une adresse e-mail valable.');
  });

  it('le formulaire se lit en entier : cases cochées comprises', () => {
    const formData = new FormData();
    formData.set('name', 'Mme Petit');
    formData.set('cities', 'Mougins');
    formData.append('property_types', 'house');
    formData.append('must_have', 'pool');
    formData.append('must_have', 'cities');
    formData.set('pool', 'yes');
    formData.set('budget_max', '900000');
    const parsed = parseBuyerInput(readBuyerFormData(formData));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.input).toMatchObject({
      name: 'Mme Petit',
      cities: ['Mougins'],
      propertyTypes: ['house'],
      mustHave: ['pool', 'cities'],
      pool: true,
      budgetMax: 900_000,
    });
  });
});
