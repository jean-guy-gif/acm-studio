import { describe, expect, it } from 'vitest';

import { matchesBuyerName } from '@/features/buyers/services/buyer-filters';
import {
  buyerBudgetLabel,
  buyerRoomsLabel,
  buyerToCriteria,
  buyerTypesLabel,
  criteriaToBuyerDraft,
  splitCities,
} from '@/features/buyers/services/buyer-criteria';
import type { BuyerInput } from '@/features/buyers/types';
import {
  reconcileBuyer,
  type BuyerCandidate,
} from '@/features/meeting-conclusion/services/buyer-reconciliation';

const input: BuyerInput = {
  name: 'M. Durand',
  phone: null,
  email: null,
  purpose: null,
  timeline: null,
  notes: null,
  propertyTypes: ['apartment'],
  cities: ['Antibes', 'Juan-les-Pins'],
  budgetIdeal: 400_000,
  budgetMax: 430_000,
  roomsMin: 3,
  bedroomsMin: 2,
  surfaceMin: 65,
  outdoor: true,
  parking: null,
  pool: null,
  floorMin: null,
  elevator: null,
  energyRatingMax: null,
  worksAccepted: null,
  mustHave: ['outdoor'],
  dealBreakers: null,
};

// Mission 117 — la fiche nourrit le rapprochement de M86 sans le changer.
describe('de la fiche au rapprochement (M86)', () => {
  it('communes jointes, pièces et surface minimums, budget plafond ; pas de budget min', () => {
    expect(buyerToCriteria(input)).toEqual({
      propertyType: 'Appartement',
      roomsCount: 3,
      surfaceArea: 65,
      budgetMin: null,
      budgetMax: 430_000,
      city: 'Antibes, Juan-les-Pins',
      // Mission 151 — la copropriété suit la fiche (non renseignée ici).
      condominiumAccepted: null,
      condominiumMustHave: false,
    });
  });

  it('deux types ou aucun : pas de filtre de type (M54 ne compare pas maison et appartement)', () => {
    expect(
      buyerToCriteria({ ...input, propertyTypes: ['apartment', 'house'] }).propertyType,
    ).toBeNull();
    expect(buyerToCriteria({ ...input, propertyTypes: [] }).propertyType).toBeNull();
  });

  it('le rapprochement joue ses règles : la marge de 5 % sur le plafond, une seule fois', () => {
    const candidate = (price: number, city = 'Antibes'): BuyerCandidate => ({
      key: `dossier:${price}`,
      group: 'mandate',
      title: 'Dossier',
      propertyType: 'apartment',
      roomsCount: 3,
      surfaceArea: 65,
      city,
      price,
      projectId: 'p',
      sellerName: 'Vendeur',
      sellerPhone: null,
      step: null,
      listingUrl: null,
    });
    const result = reconcileBuyer(buyerToCriteria(input), [
      candidate(451_000),
      candidate(452_000),
      candidate(420_000, 'Juan-les-Pins 06160'),
    ]);
    const matched = result.matches.mandate.map((hit) => hit.candidate.price);
    expect(matched).toContain(451_000); // 430 000 + 5 % = 451 500
    expect(matched).toContain(420_000); // Juan-les-Pins = Antibes (M86)
    expect(matched).not.toContain(452_000);
  });

  it('du rapprochement vers une fiche neuve : type, communes, pièces, surface, plafond', () => {
    expect(
      criteriaToBuyerDraft({
        propertyType: 'Maison',
        roomsCount: 5,
        surfaceArea: 120,
        budgetMin: 600_000,
        budgetMax: 800_000,
        city: 'Mougins, Valbonne',
      }),
    ).toEqual({
      propertyTypes: ['house'],
      cities: ['Mougins', 'Valbonne'],
      roomsMin: 5,
      surfaceMin: 120,
      budgetMax: 800_000,
      condominiumAccepted: null,
      condominiumMustHave: false,
    });
    expect(
      criteriaToBuyerDraft({
        propertyType: 'Villa',
        roomsCount: null,
        surfaceArea: null,
        budgetMin: null,
        budgetMax: null,
        city: null,
      }).propertyTypes,
    ).toEqual([]);
  });
});

describe('les mots de la liste', () => {
  it('communes : telles que tapées, dédoublonnées par leur clé', () => {
    expect(splitCities('Antibes, antibes ; Juan-les-Pins\nParis 15e, 75015 Paris')).toEqual([
      'Antibes',
      'Juan-les-Pins',
      'Paris 15e',
    ]);
    expect(splitCities('')).toEqual([]);
  });

  it('type, budget, pièces ; un champ absent est omis', () => {
    expect(buyerTypesLabel(input)).toBe('Appartement');
    expect(buyerTypesLabel({ propertyTypes: ['apartment', 'house'] })).toBe(
      'Appartement ou maison',
    );
    expect(buyerTypesLabel({ propertyTypes: [] })).toBeNull();
    const plain = (text: string | null) => text?.replace(/\s/g, ' ') ?? null;
    expect(plain(buyerBudgetLabel(input))).toBe('400 000 € – 430 000 €');
    expect(plain(buyerBudgetLabel({ budgetIdeal: null, budgetMax: 430_000 }))).toBe(
      'jusqu’à 430 000 €',
    );
    expect(buyerBudgetLabel({ budgetIdeal: null, budgetMax: null })).toBeNull();
    expect(buyerRoomsLabel({ roomsMin: 3 })).toBe('3 pièces ou plus');
    expect(buyerRoomsLabel({ roomsMin: 1 })).toBe('1 pièce ou plus');
    expect(buyerRoomsLabel({ roomsMin: null })).toBeNull();
  });

  // Mission 146 (partie B) — le tri par urgence remplace « les miens d'abord » (buyer-urgency).
  it('recherche par nom sans accent ni casse', () => {
    expect(matchesBuyerName('Émile', 'emi')).toBe(true);
    expect(matchesBuyerName('Famille Keller', 'KELL')).toBe(true);
    expect(matchesBuyerName('Zoé', 'emi')).toBe(false);
    expect(matchesBuyerName('Zoé', '  ')).toBe(true);
  });
});
