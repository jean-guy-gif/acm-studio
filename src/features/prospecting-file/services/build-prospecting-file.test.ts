import { describe, expect, it } from 'vitest';

import {
  allTexts,
  buildProspectingFile,
  resolveTexts,
} from '@/features/prospecting-file/services/build-prospecting-file';
import { plainText } from '@/features/prospecting-file/services/emphasis';
import {
  OUR_HOUSE,
  THEIR_HOUSE,
  makeFacts,
  spaced,
} from '@/features/prospecting-file/services/test-facts';
import {
  NO_OVERRIDES,
  type PropertyKind,
  type ProspectingFileVersion,
} from '@/features/prospecting-file/types';

const KINDS: PropertyKind[] = [
  'house',
  'apartment',
  'land',
  'building',
  'commercial',
  'parking',
  'unknown',
];

const said = (kind: PropertyKind, version: ProspectingFileVersion, showPrices = true) => {
  const file = buildProspectingFile(makeFacts({ kind }), version, { showPrices });
  return allTexts(file, file.defaults);
};

describe('accords selon le type de bien', () => {
  it.each([
    ['house', 'Votre maison et la nôtre'],
    ['apartment', 'Votre appartement et le nôtre'],
    ['land', 'Votre terrain et le nôtre'],
    ['building', 'Votre immeuble et le nôtre'],
    ['commercial', 'Votre local et le nôtre'],
    ['unknown', 'Votre bien et le nôtre'],
  ] as const)('%s : « %s »', (kind, opening) => {
    const file = buildProspectingFile(makeFacts({ kind }), 'owner', { showPrices: true });
    expect(plainText(file.defaults.title)).toBe(`${opening}\nattirent les mêmes acquéreurs.`);
  });

  it('la lettre suit le genre', () => {
    const house = buildProspectingFile(makeFacts(), 'owner', { showPrices: true });
    expect(house.defaults.letter).toContain('une maison à quelques rues de la vôtre');
    const flat = buildProspectingFile(makeFacts({ kind: 'apartment' }), 'owner', {
      showPrices: true,
    });
    expect(flat.defaults.letter).toContain('un appartement à quelques rues du vôtre');
    expect(flat.defaults.letter).toContain('notre appartement regarderont aussi le vôtre');
  });

  it('sans distance sûre, la lettre ne dit pas « à quelques rues »', () => {
    const file = buildProspectingFile(makeFacts({ distanceMeters: null }), 'owner', {
      showPrices: true,
    });
    expect(file.defaults.letter).toContain('dans le même secteur que la vôtre');
    expect(file.defaults.letter).not.toContain('quelques rues');
  });
});

describe('destinataire', () => {
  it('maison : au propriétaire, à l’adresse confirmée', () => {
    const file = buildProspectingFile(makeFacts(), 'owner', { showPrices: true });
    expect(file.addressee).toEqual({
      lead: 'Au propriétaire du',
      name: '14 chemin des Oliviers, 06800 Cagnes-sur-Mer',
      detail: null,
    });
  });

  it('appartement : aux copropriétaires (l’immeuble est connu, pas le lot)', () => {
    const file = buildProspectingFile(makeFacts({ kind: 'apartment' }), 'owner', {
      showPrices: true,
    });
    expect(file.addressee.lead).toBe('Aux copropriétaires du');
  });

  it('confrère : pas d’adresse, l’exclusivité et le bien', () => {
    const file = buildProspectingFile(makeFacts(), 'colleague', { showPrices: true });
    expect(file.addressee.name).toBe('Agence titulaire de l’exclusivité');
    expect(spaced(file.addressee.detail ?? '')).toBe(
      'Exclusivité · Maison 7 pièces · 201 m² · Cagnes sur Mer',
    );
    expect(allTexts(file, file.defaults).join(' ')).not.toContain('chemin des Oliviers');
  });
});

describe('version propriétaire', () => {
  it('le mot « mandat » n’apparaît nulle part, quel que soit le type', () => {
    for (const kind of KINDS) {
      expect(said(kind, 'owner').join(' ')).not.toMatch(/mandat/i);
    }
  });

  it('la proposition en trois points', () => {
    const file = buildProspectingFile(makeFacts(), 'owner', { showPrices: true });
    expect(file.defaults.proposals.map(plainText)).toEqual([
      'Découvrir votre projet et votre bien plus en détail, et vous montrer précisément le bien concurrent et l’analyse de ce marché.',
      'Présenter votre bien à mes acquéreurs dont le projet correspond.',
      'Vous rendre compte de chaque visite.',
    ]);
  });

  it('recto-verso, avec « Pour ne plus être sollicité » et l’origine de l’adresse', () => {
    const file = buildProspectingFile(makeFacts(), 'owner', { showPrices: true });
    expect(file.fixed.back).not.toBeNull();
    expect(file.fixed.optOut).toBe('Pour ne plus être sollicité');
    expect(file.fixed.information).toContain(
      'Votre adresse a été repérée à partir d’une annonce publiée.',
    );
    expect(said('house', 'owner').join(' ')).not.toContain('collectée ni conservée');
  });

  it('message clé : ce qui distingue leur bien, sinon une phrase neutre', () => {
    const file = buildProspectingFile(makeFacts(), 'owner', { showPrices: true });
    expect(spaced(file.defaults.keyMessage)).toBe(
      'Ce qui distingue votre maison (7 pièces, terrain de 900 m², garage, DPE C) intéresse une partie de mes acquéreurs. Je peux vous les amener.',
    );
    const same = buildProspectingFile(makeFacts({ theirs: OUR_HOUSE }), 'owner', {
      showPrices: true,
    });
    expect(same.defaults.keyMessage).toBe(
      'Une partie de mes acquéreurs cherche une maison comme la vôtre. Je peux vous les amener.',
    );
  });
});

describe('version confrère', () => {
  it('une seule page, honoraires partagés par accord écrit, sans taux', () => {
    const file = buildProspectingFile(makeFacts(), 'colleague', { showPrices: true });
    expect(file.fixed.back).toBeNull();
    expect(file.fixed.optOut).toBeNull();
    const proposal = file.defaults.proposals.map(plainText).join(' ');
    expect(proposal).toContain('Honoraires partagés selon un accord inter-cabinet écrit');
    expect(proposal).not.toMatch(/%|\d\s*(pour cent|€)/);
    expect(file.ours.label).toBe('Notre mandat');
    expect(file.theirs.label).toBe('Votre exclusivité');
  });

  it('la lettre nomme le bien en exclusivité', () => {
    const file = buildProspectingFile(makeFacts(), 'colleague', { showPrices: true });
    expect(spaced(file.defaults.letter)).toContain(
      'Vous avez en exclusivité la maison de 7 pièces à Cagnes sur Mer. Je viens de rentrer en mandat une maison comparable à 650 m.',
    );
  });
});

describe('ce que le document dit', () => {
  it('jamais « — » à la place d’une valeur, ni de jugement entre les deux biens', () => {
    const sparse = makeFacts({
      ours: { ...OUR_HOUSE, price: null, dpe: null, landArea: null },
      theirs: { ...THEIR_HOUSE, roomsCount: null, district: null, outdoorSpaces: [] },
      distanceMeters: null,
    });
    for (const version of ['owner', 'colleague'] as const) {
      for (const facts of [makeFacts(), sparse]) {
        const file = buildProspectingFile(facts, version, { showPrices: true });
        const text = allTexts(file, file.defaults).join(' | ');
        expect(text).not.toContain('—');
        expect(text).not.toMatch(/undefined|null|NaN/);
        expect(text).not.toMatch(/mieux|moins bien|plus cher|moins cher/i);
      }
    }
  });

  it('à la place de la photo du concurrent : son bien, son secteur, la distance', () => {
    const file = buildProspectingFile(makeFacts(), 'owner', { showPrices: true });
    expect(file.theirPlaceholder.map(spaced)).toEqual(['Votre maison', 'Les Bréguières · à 650 m']);
  });

  it('le texte du conseiller remplace le texte proposé, champ par champ', () => {
    const file = buildProspectingFile(makeFacts(), 'owner', { showPrices: true });
    const texts = resolveTexts(file.defaults, {
      ...NO_OVERRIDES,
      title: 'Mon titre',
      proposals: [null, 'Mon point 2', null],
    });
    expect(texts.title).toBe('Mon titre');
    expect(texts.letter).toBe(file.defaults.letter);
    expect(texts.proposals).toEqual([
      file.defaults.proposals[0],
      'Mon point 2',
      file.defaults.proposals[2],
    ]);
  });
});
