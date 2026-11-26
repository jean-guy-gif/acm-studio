// La refonte, lot C — « un bien à la fois » : le parcours est figé au premier geste (« Bien 2 sur
// 4 » ne bouge pas quand un bien quitte les listes), et l'on regarde le premier bien, à partir du
// rang courant, qui est encore ouvert : un bien retenu ou écarté entre-temps — depuis sa fiche,
// ou par l'annulation d'un écart — est passé. Rend le rang de ce bien, ou la longueur du parcours
// quand tout est vu. Pur.
export function deckPosition(
  order: readonly string[],
  index: number,
  open: ReadonlySet<string>,
): number {
  let at = Math.max(0, index);
  while (at < order.length && !open.has(order[at] as string)) at += 1;
  return Math.min(at, order.length);
}
