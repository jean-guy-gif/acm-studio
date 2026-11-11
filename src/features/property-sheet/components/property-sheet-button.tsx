'use client';

import type { PropertySheetTarget } from '@/features/property-sheet/actions/load-property-sheet';
import { PropertySheetView } from '@/features/property-sheet/components/property-sheet-view';
import { usePropertySheet } from '@/features/property-sheet/components/use-property-sheet';

// Mission 152 (partie B) — « Voir la fiche » là où la fiche se lit sans rien retenir (la sélection
// d'une fiche acquéreur, « Proposer ce bien ») : aucun bouton plein dans la fiche (fiche B.4).
export function PropertySheetButton({
  target,
  backLabel,
  budgetMax = null,
  className,
  children = 'Voir la fiche',
}: {
  target: PropertySheetTarget;
  backLabel: string;
  budgetMax?: number | null;
  className: string;
  children?: React.ReactNode;
}) {
  const { state, openTarget, close } = usePropertySheet();
  return (
    <>
      <button
        type="button"
        className={className}
        data-testid="open-property-sheet"
        onClick={() => openTarget(target)}
      >
        {children}
      </button>
      {state ? (
        <PropertySheetView
          state={state}
          onClose={close}
          backLabel={backLabel}
          budgetMax={budgetMax}
        />
      ) : null}
    </>
  );
}
