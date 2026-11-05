import { MAX_IDEAL_SELECTION } from '@/features/ideal-properties/types';
import type { SelectionItemInput } from '@/features/ideal-properties/services/ideal-selection';

// Mission 128 B — ce que l'écran des biens idéaux et le déroulé de l'acquéreur lisent de la
// sélection, sans zod : la relecture reste au serveur (`ideal-selection.ts`). Pur.

export const SELECTION_EMPTY = 'Cochez au moins un bien avant de retenir la sélection.';
export const SELECTION_TOO_MANY = `Retenez ${MAX_IDEAL_SELECTION} biens au plus.`;

// Mission 118 — « affiché le [date] », jamais « disponible » : une recherche n'est pas une
// disponibilité.
export function seenOnLabel(priceSeenOn: string | null): string | null {
  if (!priceSeenOn) return null;
  const date = new Date(`${priceSeenOn}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return `affiché le ${new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Paris' }).format(date)}`;
}

// « Retenir » ne s'active que si la sélection cochée change : les mêmes biens, dans n'importe quel
// ordre, ne changent rien. Pur.
export function selectionChanged(
  checked: readonly Pick<SelectionItemInput, 'source' | 'reference'>[],
  current: readonly Pick<SelectionItemInput, 'source' | 'reference'>[],
): boolean {
  const key = (item: Pick<SelectionItemInput, 'source' | 'reference'>) =>
    `${item.source}:${item.reference}`;
  const now = new Set(current.map(key));
  return checked.length !== now.size || checked.some((item) => !now.has(key(item)));
}
