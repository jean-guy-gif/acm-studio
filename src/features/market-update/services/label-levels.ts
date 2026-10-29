import { bandPosition } from '@/features/live-seller/services/market-reading';
import { formatEuro } from '@/lib/format';

// Mission 127 — les étiquettes d'une ligne de prix ne se touchent jamais (Jean-Guy, 29/10) : trois
// niveaux de chaque côté de la ligne (près, moyen, loin) ; une étiquette prend le premier niveau
// où elle ne touche aucune étiquette déjà posée, sa largeur estimée à 6,5 px par caractère sur
// une ligne de 700 px ; près d'un bord, elle s'ancre du côté où elle a la place (M115). Pur.

export type LabelSide = 'above' | 'below';
export type LabelAnchor = 'start' | 'end' | 'center';
export type LabelSlot = { side: LabelSide; level: 0 | 1 | 2; anchor: LabelAnchor };

export const BAND_PX = 700;
export const PX_PER_CHAR = 6.5;
const MARGIN_PX = 8;
const LEVELS: { side: LabelSide; level: 0 | 1 | 2 }[] = [
  { side: 'above', level: 0 },
  { side: 'below', level: 0 },
  { side: 'above', level: 1 },
  { side: 'below', level: 1 },
  { side: 'above', level: 2 },
  { side: 'below', level: 2 },
];

export function placeLabels(
  items: { label: string; value: number }[],
  scale: { min: number; max: number },
): LabelSlot[] {
  const all = [scale.min, scale.max];
  const taken = new Map<string, [number, number][]>();
  return items.map((item) => {
    const position = bandPosition(item.value, all);
    const x = position * BAND_PX;
    const width = Math.max(item.label.length, formatEuro(item.value).length) * PX_PER_CHAR;
    const anchor: LabelAnchor = position < 0.12 ? 'start' : position > 0.88 ? 'end' : 'center';
    const span: [number, number] =
      anchor === 'start'
        ? [x, x + width]
        : anchor === 'end'
          ? [x - width, x]
          : [x - width / 2, x + width / 2];
    const free = (key: string) =>
      (taken.get(key) ?? []).every(
        ([from, to]) => span[1] + MARGIN_PX <= from || span[0] - MARGIN_PX >= to,
      );
    const slot =
      LEVELS.find(({ side, level }) => free(`${side}${level}`)) ?? LEVELS[LEVELS.length - 1];
    const key = `${slot.side}${slot.level}`;
    taken.set(key, [...(taken.get(key) ?? []), span]);
    return { ...slot, anchor };
  });
}
