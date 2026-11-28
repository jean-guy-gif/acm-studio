import { BUYER_STATUS_LABELS, type BuyerStatus } from '@/features/buyers/types';

// Mission 117 — le statut d'un acquéreur avance un cran à la fois, et revient d'un cran (M86) :
//   en recherche → en visite → a acheté ; « abandonné » depuis la recherche ou la visite ;
//   « abandonné » reprend la recherche. Chaque changement est un fait daté (`status_changed_at`).
// Mission 138 — « Sous offre » vient de l'acceptation du vendeur (la base l'écrit) : de là, « a
// acheté », « abandonné », ou, si l'offre tombe, retour « en visite » à la main du conseiller.
export const BUYER_STATUS_MOVES = ['forward', 'back', 'abandon'] as const;
export type BuyerStatusMove = (typeof BUYER_STATUS_MOVES)[number];

const NEXT: Record<BuyerStatus, Partial<Record<BuyerStatusMove, BuyerStatus>>> = {
  searching: { forward: 'visiting', abandon: 'abandoned' },
  visiting: { forward: 'bought', back: 'searching', abandon: 'abandoned' },
  under_offer: { forward: 'bought', back: 'visiting', abandon: 'abandoned' },
  bought: { back: 'visiting' },
  abandoned: { back: 'searching' },
};

export function nextBuyerStatus(current: BuyerStatus, move: BuyerStatusMove): BuyerStatus | null {
  return NEXT[current][move] ?? null;
}

export function isBuyerStatusMove(value: unknown): value is BuyerStatusMove {
  return typeof value === 'string' && (BUYER_STATUS_MOVES as readonly string[]).includes(value);
}

// Lot C (question 18) — tant qu'un compromis est noté pour lui, il ne quitte pas la vente : ni
// « L'offre est tombée », ni « Abandonné » ; le compromis tombe d'abord, sur le dossier du vendeur.
export function leavesTheSale(move: BuyerStatusMove): boolean {
  return move === 'back' || move === 'abandon';
}

// Les boutons de l'écran : ce que chaque cran permet, avec son libellé.
export function buyerStatusActions(
  current: BuyerStatus,
  options: { compromiseNoted?: boolean } = {},
): { move: BuyerStatusMove; label: string; primary: boolean }[] {
  const actions: { move: BuyerStatusMove; label: string; primary: boolean }[] = [];
  const forward = nextBuyerStatus(current, 'forward');
  if (forward) {
    actions.push({ move: 'forward', label: BUYER_STATUS_LABELS[forward], primary: true });
  }
  const back = nextBuyerStatus(current, 'back');
  if (back) {
    actions.push({
      move: 'back',
      label:
        current === 'abandoned'
          ? 'Reprendre la recherche'
          : current === 'under_offer'
            ? 'L’offre est tombée\u00a0: revenir en visite'
            : `Revenir\u00a0: ${BUYER_STATUS_LABELS[back].toLowerCase()}`,
      primary: false,
    });
  }
  if (nextBuyerStatus(current, 'abandon')) {
    actions.push({ move: 'abandon', label: 'Abandonné', primary: false });
  }
  return options.compromiseNoted
    ? actions.filter((action) => !leavesTheSale(action.move))
    : actions;
}
