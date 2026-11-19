// Correctifs 161 — la frise des ventes réelles quand il y en a beaucoup (37 sur le dossier de
// démonstration d'Academia depuis la règle de Laurent du 19/11, toutes pièces confondues) : jamais
// deux prix l'un sur l'autre. Jusqu'à 12 ventes, chaque prix s'écrit là où il a la place ; au-delà,
// seuls le plus bas, le plus haut et le plus récent, et les points se font plus petits ; un prix
// qui n'a pas la place ne s'écrit pas (il reste sur la vente, dans la liste). Pur.

export const TIMELINE_ALL_PRICES_UP_TO = 12;

export type TimelinePoint = { x: number; y: number; text: string };
export type PlacedLabel = {
  x: number;
  y: number;
  anchor: 'start' | 'end' | 'middle';
  text: string;
};

// Les ventes dont le prix s'écrit : toutes jusqu'à 12 ; au-delà, la plus basse, la plus haute et
// la plus récente (à égalité, la première).
export function labelledSales(sales: { month: string; price: number }[]): Set<number> {
  if (sales.length <= TIMELINE_ALL_PRICES_UP_TO) return new Set(sales.map((_, i) => i));
  let low = 0;
  let high = 0;
  let recent = 0;
  sales.forEach((sale, i) => {
    if (sale.price < sales[low]!.price) low = i;
    if (sale.price > sales[high]!.price) high = i;
    if (sale.month > sales[recent]!.month) recent = i;
  });
  return new Set([low, high, recent]);
}

// Le rayon d'un point : 8, ou 5 au-delà de 12 ventes.
export const timelineDotRadius = (count: number) => (count > TIMELINE_ALL_PRICES_UP_TO ? 5 : 8);

// Les prix écrits à côté de leur point : à droite, sinon à gauche, au-dessus ou au-dessous ; ni sur
// un autre prix, ni sur un autre point, ni hors du dessin (`width`), ni sur l'axe des années
// (`bottom`) ; sans place, pas écrit.
// `only` : les points dont le prix s'écrit (les autres comptent comme obstacles).
export function placeTimelineLabels(
  points: TimelinePoint[],
  only: Set<number>,
  width = Infinity,
  bottom = Infinity,
  // Le rayon des points (8, ou 5 au-delà de 12 ventes) : un prix s'écarte d'un point de ce rayon et
  // de 3 px, pas plus.
  dot = 8,
  charWidth = 9.5,
): PlacedLabel[] {
  type Box = PlacedLabel & { x0: number; x1: number; y0: number; y1: number };
  const boxes: Box[] = [];
  const placed: PlacedLabel[] = [];
  const clash = (b: Box, own: number) =>
    b.x0 < 0 ||
    b.x1 > width ||
    b.y0 < 0 ||
    b.y1 > bottom ||
    boxes.some((o) => b.x0 < o.x1 && o.x0 < b.x1 && b.y0 < o.y1 && o.y0 < b.y1) ||
    points.some(
      (p, i) =>
        i !== own &&
        p.x > b.x0 - dot - 3 &&
        p.x < b.x1 + dot + 3 &&
        p.y > b.y0 - dot - 3 &&
        p.y < b.y1 + dot + 3,
    );
  points.forEach((p, i) => {
    if (!only.has(i)) return;
    const w = Math.max(40, p.text.length * charWidth);
    const box = (x: number, y: number, anchor: PlacedLabel['anchor']): Box => {
      const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
      return { x, y, anchor, text: p.text, x0, x1: x0 + w, y0: y - 14, y1: y + 2 };
    };
    // À droite, à gauche, au-dessus, au-dessous, puis en diagonale vers le haut.
    const tries: Box[] = [
      box(p.x + 12, p.y + 6, 'start'),
      box(p.x - 12, p.y + 6, 'end'),
      box(p.x, p.y - 14, 'middle'),
      box(p.x, p.y + 26, 'middle'),
      box(p.x + 8, p.y - 14, 'start'),
      box(p.x - 8, p.y - 14, 'end'),
    ];
    const pick = tries.find((t) => !clash(t, i));
    if (!pick) return;
    boxes.push(pick);
    placed.push({ x: pick.x, y: pick.y, anchor: pick.anchor, text: pick.text });
  });
  return placed;
}
