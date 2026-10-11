import { describe, expect, it } from 'vitest';

import { addressKey } from '@/features/prospecting/services/address-key';

describe('addressKey — une seule écriture pour une adresse', () => {
  it('ignore la casse, les accents, la ponctuation et les abréviations de voie', () => {
    const key = '8 avenue du docteur hochet 06160 antibes';
    for (const address of [
      '8 avenue du Docteur Hochet, 06160 Antibes',
      '8, av. du Dr Hochet — 06160 ANTIBES',
      '  8 Avenue  du  docteur Hochet 06160 Antibes, France ',
    ]) {
      expect(addressKey(address)).toBe(key);
    }
  });

  it('St et Ste comme les communes (M71), bd comme boulevard', () => {
    expect(addressKey('3 bd St-Roch, 06300 Nice')).toBe(
      addressKey('3 boulevard Saint Roch 06300 Nice'),
    );
    expect(addressKey('1 pl. Ste-Claire')).toBe('1 place sainte claire');
  });

  it('deux numéros, deux adresses ; l’étage reste dans la clé', () => {
    expect(addressKey('8 avenue Hochet')).not.toBe(addressKey('18 avenue Hochet'));
    expect(addressKey('8 avenue Hochet · 2e étage')).not.toBe(addressKey('8 avenue Hochet'));
  });

  it('une adresse absente ou vide n’a pas de clé', () => {
    for (const address of [null, undefined, '', '   ', ' , — ']) {
      expect(addressKey(address)).toBeNull();
    }
  });

  it('ne produit que des minuscules, des chiffres et des espaces simples', () => {
    expect(addressKey('12 bis, Chemin de l’Église\n06800 Cagnes-sur-Mer')).toMatch(
      /^[a-z0-9]+( [a-z0-9]+)*$/,
    );
  });
});
