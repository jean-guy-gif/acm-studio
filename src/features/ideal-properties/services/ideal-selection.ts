import { z } from 'zod';

import {
  IDEAL_CATEGORIES,
  MAX_IDEAL_SELECTION,
  SELECTION_SOURCES,
  type IdealSelection,
  type IdealSelectionItem,
  type SelectionItemRow,
  type SelectionRow,
} from '@/features/ideal-properties/types';

// Mission 118 — ce que l'écran envoie quand le conseiller « retient la sélection » : trois biens au
// plus, chacun avec sa source, sa référence, son libellé, son prix affiché, sa catégorie et ses
// écarts nommés, plus ce que la recherche en a dit (une annonce du marché). Relu ici, côté
// serveur, avant toute écriture.
const itemSchema = z.object({
  source: z.enum(SELECTION_SOURCES),
  reference: z.string().trim().min(1).max(2000),
  label: z.string().trim().min(1).max(300),
  listedPrice: z.number().int().min(0).nullable(),
  category: z.enum([...IDEAL_CATEGORIES, 'agency']).nullable(),
  gaps: z.array(z.string().trim().min(1).max(200)).max(20),
  snapshot: z.record(z.string(), z.unknown()).nullable(),
});

export type SelectionItemInput = z.infer<typeof itemSchema>;

const selectionSchema = z.array(itemSchema).min(1).max(MAX_IDEAL_SELECTION);

export const SELECTION_EMPTY = 'Cochez au moins un bien avant de retenir la sélection.';
export const SELECTION_TOO_MANY = `Retenez ${MAX_IDEAL_SELECTION} biens au plus.`;

export function readSelectionInput(
  raw: unknown,
): { ok: true; items: SelectionItemInput[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: SELECTION_EMPTY };
  if (raw.length > MAX_IDEAL_SELECTION) return { ok: false, error: SELECTION_TOO_MANY };
  const parsed = selectionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'La sélection n’a pas pu être lue.' };
  // Deux fois le même bien : une fois.
  const seen = new Set<string>();
  const items = parsed.data.filter((item) => {
    const key = `${item.source}:${item.reference}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ok: true, items };
}

// Mission 118 — « affiché le [date] », jamais « disponible » : une recherche n'est pas une
// disponibilité.
export function seenOnLabel(priceSeenOn: string | null): string | null {
  if (!priceSeenOn) return null;
  const date = new Date(`${priceSeenOn}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return `affiché le ${new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Paris' }).format(date)}`;
}

const photoOf = (snapshot: unknown): string | null => {
  if (typeof snapshot !== 'object' || snapshot == null) return null;
  const photos = (snapshot as { photoUrls?: unknown }).photoUrls;
  const first = Array.isArray(photos) ? photos[0] : null;
  return typeof first === 'string' && /^https:\/\//i.test(first) ? first : null;
};

export function toSelectionItem(item: SelectionItemRow): IdealSelectionItem {
  return {
    id: item.id,
    position: item.position,
    source: (SELECTION_SOURCES as readonly string[]).includes(item.source)
      ? (item.source as IdealSelectionItem['source'])
      : 'listing',
    reference: item.reference,
    label: item.label,
    listedPrice: item.listed_price,
    priceSeenOn: item.price_seen_on,
    category:
      item.category != null && [...IDEAL_CATEGORIES, 'agency'].includes(item.category)
        ? (item.category as IdealSelectionItem['category'])
        : null,
    gaps: item.gaps,
    photoUrl: photoOf(item.imported) ?? photoOf(item.snapshot),
    imported: item.imported != null,
    pitch: item.pitch ?? null,
    snapshot:
      typeof item.snapshot === 'object' && item.snapshot != null && !Array.isArray(item.snapshot)
        ? (item.snapshot as Record<string, unknown>)
        : null,
  };
}

// Essai de Jean-Guy (26/10) — la sélection actuelle, cochée en arrivant sur « Biens idéaux » :
// chaque bien sous la forme que « Retenir la sélection » envoie. Pur.
export function selectionAsInputs(selection: IdealSelection): SelectionItemInput[] {
  return selection.items.map((item) => ({
    source: item.source,
    reference: item.reference,
    label: item.label,
    listedPrice: item.listedPrice,
    category: item.category,
    gaps: [...item.gaps],
    snapshot: item.snapshot,
  }));
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

export function toSelection(row: SelectionRow, items: SelectionItemRow[]): IdealSelection {
  return {
    id: row.id,
    createdAt: row.created_at,
    presentedAt: row.presented_at ?? null,
    buyerWords: row.buyer_words ?? null,
    presentedDeck: row.presented_deck ?? null,
    // Mission 122 — un bien retiré (retrait doux) quitte la sélection ; sa ligne reste en base.
    items: [...items]
      .filter((item) => item.removed_at == null)
      .sort((a, b) => a.position - b.position)
      .map(toSelectionItem),
  };
}
