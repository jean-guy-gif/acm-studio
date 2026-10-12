import { describe, expect, it } from 'vitest';

import { arrondissementOfPostalCode } from '@/features/competitor-search/utils/arrondissements';
import { COMMUNE_ALIASES } from '@/features/meeting-conclusion/services/commune-alias';
import { addressKey, unitAddressKey } from '@/features/prospecting/services/address-key';

describe('addressKey — une seule écriture pour une adresse', () => {
  it('ignore la casse, les accents, la ponctuation, le code postal et les abréviations de voie', () => {
    const key = '8 avenue du docteur hochet antibes';
    for (const address of [
      '8 avenue du Docteur Hochet, 06160 Antibes',
      '8, av. du Dr Hochet — 06160 ANTIBES',
      '  8 Avenue  du  docteur Hochet 06160 Antibes, France ',
      '8 avenue du Docteur Hochet, Antibes',
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

  // Mission 102 — av., bd, ch., rte, all., imp.
  it('les abréviations courantes de voie', () => {
    for (const [short, long] of [
      ['av.', 'avenue'],
      ['bd', 'boulevard'],
      ['ch.', 'chemin'],
      ['rte', 'route'],
      ['all.', 'allée'],
      ['imp.', 'impasse'],
    ]) {
      expect(addressKey(`4 ${short} des Pins, 06140 Vence`)).toBe(
        addressKey(`4 ${long} des Pins, 06140 Vence`),
      );
    }
  });

  it('deux numéros, deux adresses ; deux rues, deux adresses', () => {
    expect(addressKey('8 avenue Hochet, Antibes')).not.toBe(
      addressKey('18 avenue Hochet, Antibes'),
    );
    expect(addressKey('8 avenue Hochet, Antibes')).not.toBe(addressKey('8 avenue Foch, Antibes'));
    expect(addressKey('8 avenue Hochet, Antibes')).not.toBe(addressKey('8 avenue Hochet, Nice'));
  });

  // Mission 102 — la clé désigne l'immeuble : un étage ajouté n'échappe plus à l'opposition.
  it('l’étage, le bâtiment, l’appartement, « bis » et « ter » sortent de la clé', () => {
    const key = addressKey('8 avenue Hochet, 06160 Antibes');
    for (const address of [
      '8 avenue Hochet · 2e étage, 06160 Antibes',
      '8 avenue Hochet, 2ème étage, 06160 Antibes',
      '8 avenue Hochet, étage 3, 06160 Antibes',
      '8 avenue Hochet, 06160 Antibes · 1er étage',
      '8 avenue Hochet, bâtiment B, 06160 Antibes',
      '8 avenue Hochet, bât. A2, appt 12, 06160 Antibes',
      '8 avenue Hochet, appartement 4, 06160 Antibes',
      '8 bis avenue Hochet, 06160 Antibes',
      '8bis avenue Hochet, 06160 Antibes',
      '8 ter avenue Hochet, 06160 Antibes',
    ]) {
      expect(addressKey(address), address).toBe(key);
    }
  });

  it('`unitAddressKey` les garde : le 8 et le 8 bis, ou deux étages, ne sont pas le même bien', () => {
    expect(unitAddressKey('8 bis avenue Hochet, Antibes')).not.toBe(
      unitAddressKey('8 avenue Hochet, Antibes'),
    );
    expect(unitAddressKey('8 avenue Hochet · 2e étage')).not.toBe(
      unitAddressKey('8 avenue Hochet · 3e étage'),
    );
    // Le reste de la normalisation est le même.
    expect(unitAddressKey('8, av. Hochet — 06160 Juan-les-Pins')).toBe('8 avenue hochet antibes');
  });

  // Mission 102 — les noms d'usage de la M86 : « Juan-les-Pins » n'échappe plus à « Antibes ».
  it('le nom d’usage d’une commune vaut la commune', () => {
    expect(addressKey('8 avenue Hochet, 06160 Juan-les-Pins')).toBe(
      addressKey('8 avenue Hochet, 06600 Antibes'),
    );
    expect(addressKey('2 chemin des Sables, Cap d’Antibes')).toBe('2 chemin des sables antibes');
    expect(addressKey('5 route de Grasse, 06220 Golfe-Juan')).toBe('5 route de grasse vallauris');
    expect(addressKey('1 rue des Pins, Cros-de-Cagnes')).toBe('1 rue des pins cagnes sur mer');
    expect(addressKey('10 impasse des Lilas, 06150 Cannes La Bocca')).toBe(
      '10 impasse des lilas cannes',
    );
  });

  it('reprend chaque égalité de la liste des communes (M86)', () => {
    for (const [alias, commune] of Object.entries(COMMUNE_ALIASES)) {
      expect(addressKey(`3 rue Haute, ${alias}`), alias).toBe(`3 rue haute ${commune}`);
    }
  });

  // Mission 102 — les arrondissements de la M99.
  it('un arrondissement s’écrit d’une seule façon', () => {
    for (const address of [
      '12 rue Lecourbe, 75015 Paris',
      '12 rue Lecourbe, Paris 15e',
      '12 rue Lecourbe, Paris 15ème',
      '12 rue Lecourbe, PARIS 15E ARRONDISSEMENT',
      '12 rue Lecourbe, 75015 Paris 15e',
    ]) {
      expect(addressKey(address), address).toBe('12 rue lecourbe paris 15');
    }
    expect(addressKey('3 bd Baille, 13005 Marseille')).toBe('3 boulevard baille marseille 5');
    expect(addressKey('3 bd Baille, Marseille 5e')).toBe('3 boulevard baille marseille 5');
    expect(addressKey('1 rue de la Charité, 69002 Lyon')).toBe('1 rue de la charite lyon 2');
    expect(addressKey('4 rue Mesnil, 75116 Paris')).toBe('4 rue mesnil paris 16');
    expect(addressKey('7 rue de Rivoli, Paris 1er')).toBe('7 rue de rivoli paris 1');
  });

  it('deux arrondissements, deux adresses ; nom et code postal en désaccord : la ville seule', () => {
    expect(addressKey('12 rue X, 75015 Paris')).not.toBe(addressKey('12 rue X, 75016 Paris'));
    expect(addressKey('12 rue X, 75016 Paris 15e')).toBe('12 rue x paris');
    expect(addressKey('2 rue de Paris, 06000 Nice')).toBe('2 rue de paris nice');
  });

  it('lit le code postal d’un arrondissement comme la recherche (M99)', () => {
    for (const postal of ['75001', '75020', '75116', '69009', '13016']) {
      const arrondissement = arrondissementOfPostalCode(postal);
      expect(addressKey(`1 rue X, ${postal} ${arrondissement?.city}`)).toBe(
        `1 rue x ${arrondissement?.city} ${arrondissement?.number}`,
      );
    }
  });

  it('une clé relue rend la même clé : les lignes déjà en base se relisent sans migration', () => {
    for (const address of [
      '8 bis av. du Dr Hochet, 2e étage, 06160 Juan-les-Pins',
      '12 rue Lecourbe, 75015 Paris',
      '3 rue haute 06140 vence',
    ]) {
      const key = addressKey(address);
      expect(addressKey(key)).toBe(key);
    }
    // Une clé d'avant la mission (code postal, étage et nom d'usage compris) rejoint la nouvelle.
    expect(addressKey('8 avenue hochet 2e etage 06160 juan les pins')).toBe(
      addressKey('8 avenue Hochet, Antibes'),
    );
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
