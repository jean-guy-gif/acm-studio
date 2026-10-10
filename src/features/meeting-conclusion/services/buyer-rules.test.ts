import { describe, expect, it } from 'vitest';

import type { BuyerCriteria } from '@/features/meeting-conclusion/services/buyer-match';
import {
  buyerRuleGaps,
  negotiationNote,
  type BuyerFacts,
} from '@/features/meeting-conclusion/services/buyer-rules';
import {
  buyerCommuneKey,
  requestedCommuneKeys,
} from '@/features/meeting-conclusion/services/commune-alias';

// L'acheteur de l'essai : « Appartement · 3 pièces · 60 m² · 280 000 – 340 000 € · Antibes ».
const BUYER: BuyerCriteria = {
  propertyType: 'Appartement',
  roomsCount: 3,
  surfaceArea: 60,
  budgetMin: 280000,
  budgetMax: 340000,
  city: 'Antibes',
};
const FITS: BuyerFacts = { roomsCount: 3, surfaceArea: 65, city: 'Antibes', price: 320000 };

// Le formateur lie nombres et unités par des espaces insécables (M74) : on les lit comme des
// espaces pour comparer.
const plain = (text: string): string => text.replace(/[\u00a0\u202f]/g, ' ');
const details = (criteria: BuyerCriteria, facts: BuyerFacts) =>
  buyerRuleGaps(criteria, facts).map((gap) => plain(gap.detail));
const note = (criteria: BuyerCriteria, facts: BuyerFacts) => {
  const text = negotiationNote(criteria, facts);
  return text == null ? null : plain(text);
};
const matches = (criteria: BuyerCriteria, facts: BuyerFacts) =>
  buyerRuleGaps(criteria, facts).length === 0;

describe('buyerRuleGaps — ce qui « correspond » (mission 86, règles 19)', () => {
  it('un bien dans toutes les règles correspond', () => {
    expect(matches(BUYER, FITS)).toBe(true);
  });

  describe('surface : au moins celle demandée, avec 5 % de marge', () => {
    it('60 m² demandés → 57 m² acceptés, la borne comprise', () => {
      expect(matches(BUYER, { ...FITS, surfaceArea: 57 })).toBe(true);
    });

    it('56,9 m² est hors marge, et l’écart est chiffré sur la surface demandée', () => {
      expect(matches(BUYER, { ...FITS, surfaceArea: 56.9 })).toBe(false);
      expect(details(BUYER, { ...FITS, surfaceArea: 54 })).toEqual(['6 m² de moins']);
    });

    it('plus grand que demandé correspond toujours', () => {
      expect(matches(BUYER, { ...FITS, surfaceArea: 140 })).toBe(true);
    });
  });

  describe('prix : du budget min au budget max + 5 %', () => {
    it('340 000 € de budget → 357 000 € acceptés, la borne comprise', () => {
      expect(matches(BUYER, { ...FITS, price: 357000 })).toBe(true);
      expect(matches(BUYER, { ...FITS, price: 350000 })).toBe(true);
    });

    it('357 001 € est hors marge, et l’écart se chiffre sur le budget max', () => {
      expect(matches(BUYER, { ...FITS, price: 357001 })).toBe(false);
      expect(details(BUYER, { ...FITS, price: 360000 })).toEqual(['20 000 € au-dessus du budget']);
    });

    it('le budget min ne prend aucune marge', () => {
      expect(matches(BUYER, { ...FITS, price: 280000 })).toBe(true);
      expect(details(BUYER, { ...FITS, price: 268000 })).toEqual(['12 000 € sous le budget']);
    });

    it('un prix au-dessus du budget mais dans la marge le dit', () => {
      expect(note(BUYER, { ...FITS, price: 350000 })).toBe(
        '10 000 € au-dessus du budget, à négocier',
      );
      expect(negotiationNote(BUYER, { ...FITS, price: 340000 })).toBeNull();
      expect(negotiationNote(BUYER, { ...FITS, price: 360000 })).toBeNull();
      expect(negotiationNote({ ...BUYER, budgetMax: null }, FITS)).toBeNull();
    });

    it('un seul des deux budgets suffit à filtrer', () => {
      const maxOnly = { ...BUYER, budgetMin: null };
      expect(matches(maxOnly, { ...FITS, price: 100000 })).toBe(true);
      expect(matches(maxOnly, { ...FITS, price: 400000 })).toBe(false);
      const minOnly = { ...BUYER, budgetMax: null };
      expect(matches(minOnly, { ...FITS, price: 900000 })).toBe(true);
      expect(matches(minOnly, { ...FITS, price: 100000 })).toBe(false);
    });
  });

  describe('pièces : au moins le nombre demandé', () => {
    it('plus de pièces correspond, moins ne correspond pas', () => {
      expect(matches(BUYER, { ...FITS, roomsCount: 4 })).toBe(true);
      expect(details(BUYER, { ...FITS, roomsCount: 2 })).toEqual(['1 pièce de moins']);
      expect(details(BUYER, { ...FITS, roomsCount: 1 })).toEqual(['2 pièces de moins']);
    });
  });

  describe('commune : identique, plusieurs possibles, alias compris', () => {
    it('une autre commune ne correspond pas, et elle est nommée', () => {
      expect(details(BUYER, { ...FITS, city: 'Nice' })).toEqual(['Autre commune : Nice']);
    });

    it('plusieurs communes séparées par des virgules', () => {
      const two = { ...BUYER, city: 'Antibes, Vence' };
      expect(matches(two, { ...FITS, city: 'Vence' })).toBe(true);
      expect(matches(two, { ...FITS, city: 'Antibes' })).toBe(true);
      expect(matches(two, { ...FITS, city: 'Nice' })).toBe(false);
    });

    it('Juan-les-Pins compte comme Antibes, dans les deux sens', () => {
      expect(matches(BUYER, { ...FITS, city: 'Juan-les-Pins' })).toBe(true);
      expect(matches({ ...BUYER, city: 'Juan les Pins' }, FITS)).toBe(true);
    });

    it('compare sans accent, tiret, majuscule ni « St »', () => {
      const buyer = { ...BUYER, city: 'st laurent du var' };
      expect(matches(buyer, { ...FITS, city: 'Saint-Laurent-du-Var' })).toBe(true);
      expect(matches({ ...BUYER, city: 'ANTIBES' }, { ...FITS, city: 'antibes' })).toBe(true);
    });
  });

  describe('un champ laissé vide ne filtre pas', () => {
    const EMPTY: BuyerCriteria = {
      propertyType: null,
      roomsCount: null,
      surfaceArea: null,
      budgetMin: null,
      budgetMax: null,
      city: null,
    };

    it('aucun critère : tout correspond, même un bien dont on ne sait rien', () => {
      expect(matches(EMPTY, { roomsCount: null, surfaceArea: null, city: null, price: null })).toBe(
        true,
      );
    });

    it('chaque champ vide laisse passer ce qu’il aurait écarté', () => {
      expect(matches({ ...BUYER, roomsCount: null }, { ...FITS, roomsCount: 1 })).toBe(true);
      expect(matches({ ...BUYER, surfaceArea: null }, { ...FITS, surfaceArea: 20 })).toBe(true);
      expect(matches({ ...BUYER, city: null }, { ...FITS, city: 'Nice' })).toBe(true);
      expect(
        matches({ ...BUYER, budgetMin: null, budgetMax: null }, { ...FITS, price: 900000 }),
      ).toBe(true);
    });
  });

  it('une donnée absente du bien, demandée par l’acheteur, ne correspond pas et se dit', () => {
    expect(
      details(BUYER, { roomsCount: null, surfaceArea: null, city: null, price: null }),
    ).toEqual([
      'Commune non renseignée',
      'Nombre de pièces non renseigné',
      'Surface non renseignée',
      'Prix non renseigné',
    ]);
  });

  it('cumule les écarts', () => {
    expect(details(BUYER, { roomsCount: 2, surfaceArea: 50, city: 'Nice', price: 400000 })).toEqual(
      [
        'Autre commune : Nice',
        '1 pièce de moins',
        '10 m² de moins',
        '60 000 € au-dessus du budget',
      ],
    );
  });
});

describe('alias de communes', () => {
  it('ramène un quartier connu à sa commune', () => {
    expect(buyerCommuneKey('Juan-les-Pins')).toBe('antibes');
    expect(buyerCommuneKey('Cap d’Antibes')).toBe('antibes');
    expect(buyerCommuneKey("CAP D'ANTIBES")).toBe('antibes');
    expect(buyerCommuneKey('Golfe-Juan')).toBe('vallauris');
    expect(buyerCommuneKey('Cros de Cagnes')).toBe('cagnes sur mer');
    expect(buyerCommuneKey('La Bocca')).toBe('cannes');
  });

  it('laisse les autres communes telles quelles, code postal ôté', () => {
    expect(buyerCommuneKey('Vence')).toBe('vence');
    expect(buyerCommuneKey('Antibes 06600')).toBe('antibes');
    expect(buyerCommuneKey('  ')).toBeNull();
    expect(buyerCommuneKey(null)).toBeNull();
  });

  it('lit plusieurs communes, sans doublon', () => {
    expect(requestedCommuneKeys('Antibes, Juan-les-Pins ; Vallauris,')).toEqual([
      'antibes',
      'vallauris',
    ]);
    expect(requestedCommuneKeys(null)).toEqual([]);
    expect(requestedCommuneKeys(' , ')).toEqual([]);
  });
});
