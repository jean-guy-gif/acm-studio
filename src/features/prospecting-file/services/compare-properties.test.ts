import { describe, expect, it } from 'vitest';

import {
  cardTitles,
  closeness,
  comparedRows,
  defaultShowPrices,
  differences,
  formatDistance,
  pricesKnown,
} from '@/features/prospecting-file/services/compare-properties';
import {
  OUR_HOUSE,
  THEIR_HOUSE,
  makeFacts,
  spaced,
} from '@/features/prospecting-file/services/test-facts';

const labels = (rows: { label: string }[]) => rows.map((row) => row.label);

describe('lignes comparées selon le type de bien', () => {
  it('maison : surface, terrain, extérieur, stationnement, secteur, DPE, prix', () => {
    const cards = comparedRows(makeFacts(), { showPrices: true, compact: false });
    expect(labels(cards.ours)).toEqual([
      'Surface',
      'Terrain',
      'Extérieur',
      'Stationnement',
      'Secteur',
      'DPE',
      'Prix affiché',
    ]);
    expect(labels(cards.theirs)).toEqual(labels(cards.ours));
    expect(spaced(cards.ours[0].value)).toBe('200 m²');
    expect(cards.ours[3].value).toBe('Aucun');
    expect(cards.theirs[3].value).toBe('Garage');
    expect(spaced(cards.ours.at(-1)?.value ?? '')).toBe('749 000 €');
    expect(cards.theirs.find((row) => row.label === 'DPE')?.dpe).toBe('C');
  });

  it('appartement : pas de ligne terrain, même s’il est renseigné', () => {
    const cards = comparedRows(makeFacts({ kind: 'apartment' }), {
      showPrices: true,
      compact: false,
    });
    expect(labels(cards.ours)).not.toContain('Terrain');
    expect(labels(cards.ours)).toContain('Extérieur');
  });

  it('terrain : la surface est celle du terrain, sans pièces ni extérieur', () => {
    const facts = makeFacts({
      kind: 'land',
      ours: { ...OUR_HOUSE, surfaceArea: null },
      theirs: { ...THEIR_HOUSE, surfaceArea: null },
    });
    const cards = comparedRows(facts, { showPrices: false, compact: false });
    expect(labels(cards.ours)).toEqual(['Surface', 'Secteur', 'DPE']);
    expect(spaced(cards.ours[0].value)).toBe('1 200 m²');
    expect(cardTitles(facts, { compact: false }).ours).toBe('Terrain');
  });

  it('local ou immeuble : surface, secteur, DPE, prix', () => {
    for (const kind of ['commercial', 'building'] as const) {
      const cards = comparedRows(makeFacts({ kind }), { showPrices: true, compact: false });
      expect(labels(cards.ours)).toEqual(['Surface', 'Secteur', 'DPE', 'Prix affiché']);
    }
  });

  it('une ligne connue d’un seul côté ne s’affiche pas, des deux côtés', () => {
    const facts = makeFacts({
      theirs: { ...THEIR_HOUSE, landArea: null, dpe: null, outdoorSpaces: [], district: null },
    });
    const cards = comparedRows(facts, { showPrices: true, compact: false });
    expect(labels(cards.ours)).toEqual(['Surface', 'Stationnement', 'Secteur', 'Prix affiché']);
    expect(labels(cards.theirs)).toEqual(labels(cards.ours));
    // Sans quartier des deux côtés, le secteur est la commune.
    expect(cards.ours.find((row) => row.label === 'Secteur')?.value).toBe('Cagnes-sur-Mer');
    for (const row of [...cards.ours, ...cards.theirs]) {
      expect(row.value).not.toContain('—');
      expect(row.value).not.toBe('');
    }
  });

  it('titre : les pièces n’y figurent que si elles sont connues des deux côtés', () => {
    const titles = cardTitles(makeFacts(), { compact: false });
    expect(spaced(titles.ours)).toBe('Maison 9 pièces');
    expect(spaced(titles.theirs)).toBe('Maison 7 pièces');
    const unknown = makeFacts({ theirs: { ...THEIR_HOUSE, roomsCount: null } });
    expect(cardTitles(unknown, { compact: false })).toEqual({ ours: 'Maison', theirs: 'Maison' });
    expect(spaced(cardTitles(makeFacts(), { compact: true }).ours)).toBe(
      'Maison 9 pièces · 200 m²',
    );
  });
});

describe('prix : interrupteur « Afficher les prix »', () => {
  const withPrices = (ours: number | null, theirs: number | null) =>
    makeFacts({ ours: { ...OUR_HOUSE, price: ours }, theirs: { ...THEIR_HOUSE, price: theirs } });

  it('allumé si notre prix est inférieur, égal ou au plus 5 % au-dessus', () => {
    expect(defaultShowPrices(withPrices(700000, 750000))).toBe(true);
    expect(defaultShowPrices(withPrices(750000, 750000))).toBe(true);
    expect(defaultShowPrices(withPrices(787500, 750000))).toBe(true);
  });

  it('éteint au-delà de 5 %, ou quand un prix manque', () => {
    expect(defaultShowPrices(withPrices(787501, 750000))).toBe(false);
    expect(defaultShowPrices(withPrices(null, 750000))).toBe(false);
    expect(pricesKnown(withPrices(null, 750000))).toBe(false);
  });

  it('éteint : « Même gamme de prix » sans chiffre, et aucune ligne de prix', () => {
    const facts = withPrices(900000, 750000);
    const items = closeness(facts, { showPrices: false });
    expect(items).toContain('*Même gamme de prix*');
    expect(items.join(' ')).not.toMatch(/€/);
    const cards = comparedRows(facts, { showPrices: false, compact: false });
    expect(labels(cards.ours)).not.toContain('Prix affiché');
  });

  it('notre prix absent : jamais de chiffre, même interrupteur allumé', () => {
    const facts = withPrices(null, 750000);
    expect(closeness(facts, { showPrices: true }).join(' ')).not.toMatch(/€/);
    expect(labels(comparedRows(facts, { showPrices: true, compact: false }).theirs)).not.toContain(
      'Prix affiché',
    );
  });
});

describe('ce qui les rapproche, ce qui les distingue', () => {
  it('même quartier et distance, même gamme de prix, surface proche', () => {
    expect(closeness(makeFacts(), { showPrices: true }).map(spaced)).toEqual([
      '*Même quartier*, à 650 m l’un de l’autre',
      '*Même gamme de prix* : 749 000 € et 750 000 €',
      '*Surface proche* : 200 m² et 201 m²',
    ]);
  });

  it('distance pas sûre : « même secteur » seul', () => {
    const facts = makeFacts({
      distanceMeters: null,
      theirs: { ...THEIR_HOUSE, district: null },
    });
    expect(closeness(facts, { showPrices: true })[0]).toBe('*Même secteur*');
  });

  it('surfaces éloignées : pas de « surface proche », et la surface distingue', () => {
    const facts = makeFacts({ theirs: { ...THEIR_HOUSE, surfaceArea: 150 } });
    expect(closeness(facts, { showPrices: true }).join(' ')).not.toMatch(/surface/i);
    expect(spaced(differences(facts)[0])).toContain('200 m²');
  });

  it('distingue dans les deux sens, en faits', () => {
    expect(differences(makeFacts()).map(spaced)).toEqual([
      '*La nôtre* : 9 pièces, terrain de 1 200 m², jardin, DPE D',
      '*La vôtre* : 7 pièces, terrain de 900 m², garage, DPE C',
    ]);
  });

  it('jamais un jugement', () => {
    const cheaper = makeFacts({ theirs: { ...THEIR_HOUSE, price: 500000, dpe: 'G' } });
    for (const facts of [makeFacts(), cheaper]) {
      const said = [...closeness(facts, { showPrices: true }), ...differences(facts)].join(' ');
      expect(said).not.toMatch(/mieux|moins bien|plus cher|moins cher/i);
    }
  });
});

describe('distance', () => {
  it('arrondie pour se lire', () => {
    expect(spaced(formatDistance(640))).toBe('650 m');
    expect(spaced(formatDistance(12))).toBe('50 m');
    expect(spaced(formatDistance(1840))).toBe('1,8 km');
  });
});
