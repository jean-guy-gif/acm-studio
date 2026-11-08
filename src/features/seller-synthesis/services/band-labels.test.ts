import { describe, expect, it } from 'vitest';

import {
  boxLeft,
  estimateLabelWidth,
  labelBoxes,
  layoutBand,
  LABEL_GAP_PX,
  type BandLayout,
  type BandMarker,
} from '@/features/seller-synthesis/services/band-labels';
import { formatEuro } from '@/lib/format';

const m = (label: string, value: number): BandMarker => ({
  label,
  value,
  amount: formatEuro(value),
  tone: 'muted',
});

// Aucune boîte n'en touche une autre sur la même rangée, et toutes restent dans la frise.
function expectReadable(layout: BandLayout, bandWidth: number) {
  const boxes = labelBoxes(layout, bandWidth);
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(bandWidth + 0.001);
  }
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      if (a.row !== b.row) continue;
      const apart = a.right <= b.left || b.right <= a.left;
      expect(apart, `boîtes ${i} et ${j} à ${bandWidth} px`).toBe(true);
    }
  }
}

// Les largeurs de calcul de la synthèse (téléphone et le reste), puis toutes les largeurs plus
// grandes où la même mise en page s'affiche, jusqu'au PDF et au-delà.
const NARROW = 240;
const MEDIUM = 500;
const WIDE = 640;
const widthsFrom = (from: number) => Array.from({ length: 70 }, (_, i) => from + i * 10);

// Le dossier 868af175 de l'essai (08/11) : les repères à 127 992 et 129 000 € sortaient de l'échelle
// écrite (129 900 € … 149 000 €), et les étiquettes se recouvraient.
const THOUVENIN_PRICES = [129_900, 134_000, 139_000, 149_000];
const THOUVENIN_MARKERS = [
  m('Au début', 149_000),
  m('Après le marché', 129_000),
  m('Le plus dangereux selon vous', 134_000),
  m('Prix des concurrents', 127_992),
];

describe('layoutBand — l’échelle', () => {
  it('couvre chaque prix et chaque repère, bornes comprises', () => {
    const layout = layoutBand(THOUVENIN_PRICES, THOUVENIN_MARKERS, WIDE);
    expect(layout.low).toBe(127_992);
    expect(layout.high).toBe(149_000);
    for (const value of [...THOUVENIN_PRICES, ...THOUVENIN_MARKERS.map((x) => x.value)]) {
      expect(value).toBeGreaterThanOrEqual(layout.low);
      expect(value).toBeLessThanOrEqual(layout.high);
    }
    for (const position of [...layout.dots, ...layout.groups.map((g) => g.position)]) {
      expect(position).toBeGreaterThanOrEqual(0);
      expect(position).toBeLessThanOrEqual(1);
    }
  });

  it('place un seul montant au milieu', () => {
    const layout = layoutBand([300_000], [m('Au début', 300_000)], WIDE);
    expect(layout.dots).toEqual([0.5]);
    expect(layout.groups[0]!.position).toBe(0.5);
  });

  it('sans rien à montrer, ne casse pas', () => {
    const layout = layoutBand([], [], WIDE);
    expect(layout.groups).toEqual([]);
    expect(layout.dots).toEqual([]);
  });
});

describe('layoutBand — les étiquettes', () => {
  it('fond deux repères au même montant en une étiquette', () => {
    const layout = layoutBand(
      THOUVENIN_PRICES,
      [m('Au début', 149_000), m('Après le marché', 129_000), m('Convenu ensemble', 129_000)],
      WIDE,
    );
    expect(layout.groups).toHaveLength(2);
    expect(layout.groups[0]!.labels).toEqual(['Après le marché', 'Convenu ensemble']);
    expect(layout.mode).toBe('labels');
  });

  it('le dossier 868af175 : lisible au calcul du téléphone et du reste, et à toute largeur au-delà', () => {
    for (const design of [NARROW, MEDIUM, WIDE]) {
      const layout = layoutBand(THOUVENIN_PRICES, THOUVENIN_MARKERS, design);
      for (const width of widthsFrom(design)) expectReadable(layout, width);
      // Chaque étiquette reste au-dessus (ou au-dessous) de son repère.
      for (const group of layout.groups) {
        expect(group.offset).toBeGreaterThanOrEqual(0);
        expect(group.offset).toBeLessThanOrEqual(group.width);
      }
    }
    // Sur l'écran large et le PDF, les quatre étiquettes s'écrivent sur la frise (maquette M148-7) ;
    // sur téléphone, trop serrées : des repères numérotés.
    expect(layoutBand(THOUVENIN_PRICES, THOUVENIN_MARKERS, WIDE).mode).toBe('labels');
    expect(layoutBand(THOUVENIN_PRICES, THOUVENIN_MARKERS, NARROW).mode).toBe('numbered');
  });

  it('des prix à 100 € les uns des autres et quatre repères : jamais deux textes l’un sur l’autre', () => {
    const prices = [140_000, 140_100, 140_200, 140_300, 152_000];
    const markers = [
      m('Au début', 140_050),
      m('Après le marché', 140_150),
      m('Le plus dangereux selon vous', 140_100),
      m('Prix des concurrents', 140_250),
    ];
    for (const design of [NARROW, MEDIUM, WIDE]) {
      const layout = layoutBand(prices, markers, design);
      // Trop serrés pour quatre étiquettes : des repères numérotés, la légende dessous.
      expect(layout.mode).toBe('numbered');
      expect(layout.groups.map((g) => g.number)).toEqual([1, 2, 3, 4]);
      for (const width of widthsFrom(design)) expectReadable(layout, width);
    }
  });

  it('cale contre le bord une étiquette qui en sortirait', () => {
    const layout = layoutBand(
      [100_000, 200_000],
      [m('Le plus dangereux selon vous', 100_000)],
      WIDE,
    );
    const [box] = labelBoxes(layout, WIDE);
    expect(box!.left).toBe(0);
    const end = layoutBand([100_000, 200_000], [m('Le plus dangereux selon vous', 200_000)], WIDE);
    const [last] = labelBoxes(end, WIDE);
    expect(last!.right).toBeCloseTo(WIDE);
  });

  it('met dessous ce qui ne tient pas dessus, et laisse un écart entre deux voisines', () => {
    const layout = layoutBand(
      [100_000, 200_000],
      [m('Au début', 150_000), m('Après le marché', 151_000)],
      WIDE,
    );
    expect(layout.mode).toBe('labels');
    expect(layout.groups.map((g) => g.lane)).toEqual(['above', 'below']);
    for (const width of widthsFrom(WIDE)) expectReadable(layout, width);
    const spread = layoutBand(
      [100_000, 200_000],
      [m('Au début', 110_000), m('Après le marché', 190_000)],
      WIDE,
    );
    expect(spread.groups.map((g) => g.lane)).toEqual(['above', 'above']);
    const [a, b] = labelBoxes(spread, WIDE);
    expect(b!.left - a!.right).toBeGreaterThanOrEqual(LABEL_GAP_PX);
  });
});

describe('estimateLabelWidth et boxLeft', () => {
  it('estime la boîte sur le plus long des deux textes', () => {
    expect(estimateLabelWidth(['Le plus dangereux selon vous'], '134 000 €')).toBeGreaterThan(
      estimateLabelWidth(['Au début'], '134 000 €'),
    );
  });

  it('centre, sinon cale contre le bord', () => {
    expect(boxLeft(0.5, 50, 100, 500)).toBe(200);
    expect(boxLeft(0, 50, 100, 500)).toBe(0);
    expect(boxLeft(1, 50, 100, 500)).toBe(400);
    // Glissée à droite de son repère : le décalage est plus court que la demi-largeur.
    expect(boxLeft(0.5, 10, 100, 500)).toBe(240);
  });
});
