import { GRID_LEGEND_MARKS, type DeckMark, type GridMark } from '@/features/buyer-deck/types';
import { PRICE_ALIGNMENT_TEXT } from '@/features/price-positioning/services/price-alignment';

// Mission 122 (partie B, essai de Jean-Guy, 25/10) — ce que la grille, l'écran d'un bien, le lien
// et le PDF partagent pour dire un critère : sa couleur, l'étoile des indispensables et la légende.

// Les couleurs des marques : sémantiques (M55), lisibles sur fond clair comme sur la scène.
export const MARK_STYLES: Record<GridMark, string> = {
  ok: 'text-emerald-700 stage:text-emerald-300',
  near: 'text-amber-700 stage:text-amber-300',
  no: 'text-red-700 stage:text-red-300',
  check: 'text-sky-700 stage:text-sky-300',
};

// Le budget prend la couleur de la M116 (vert, orange, rouge face au budget plafond) ; les autres
// critères, celle de leur marque. Jamais la couleur seule : la marque et son fait restent écrits.
export function markClass(mark: DeckMark): string {
  return mark.tone ? PRICE_ALIGNMENT_TEXT[mark.tone] : MARK_STYLES[mark.mark];
}

// L'étoile des indispensables, DESSINÉE : le caractère « ★ » manque aux polices embarquées et ne
// s'affichait pas partout. Son nom se lit pour les lecteurs d'écran.
export function MustHaveStar({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label="indispensable"
      data-testid="must-star"
      className={`inline-block h-[0.9em] w-[0.9em] shrink-0 align-[-0.1em] text-amber-500 ${className}`}
    >
      <path
        fill="currentColor"
        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
      />
    </svg>
  );
}

// « ★ indispensable · ✓ oui · ≈ proche · ✗ non · ? à vérifier ensemble », l'étoile dessinée.
export function GridLegend({ className = '' }: { className?: string }) {
  return (
    <p className={className} data-testid="grid-legend">
      <MustHaveStar /> indispensable · {GRID_LEGEND_MARKS}
    </p>
  );
}
