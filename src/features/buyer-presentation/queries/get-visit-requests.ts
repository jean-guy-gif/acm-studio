import 'server-only';

import { toVisitRequest } from '@/features/buyer-presentation/services/visit-request-row';
import type { VisitRequest } from '@/features/buyer-presentation/types';
import type { SelectionSource } from '@/features/ideal-properties/types';
import { createClient } from '@/lib/supabase/server';

export type VisitLine = VisitRequest & {
  buyerName: string;
  buyerArchived: boolean;
  itemLabel: string;
  itemSource: SelectionSource;
  itemPrice: number | null;
  // Mission 119 — une visite sur un concurrent ou une exclusivité : « Propriétaire ou confrère à
  // contacter » (le courrier est la M120). Côté conseiller seulement.
  contactReminder: boolean;
};

// Mission 119 — toutes les demandes de visite de l'agence, par acquéreur, avec le bien retenu ;
// les demandes annulées ne s'affichent pas.
export async function getVisitLines(): Promise<VisitLine[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('buyer_visit_requests')
    .select(
      '*, buyers!inner(name, archived_at), buyer_selection_items!inner(label, source, listed_price, imported)',
    )
    .is('cancelled_at', null)
    .order('requested_at', { ascending: false });
  return (data ?? []).map((row) => {
    const buyer = row.buyers as unknown as { name: string; archived_at: string | null };
    const item = row.buyer_selection_items as unknown as {
      label: string;
      source: string;
      listed_price: number | null;
      imported: { exclusivity?: unknown } | null;
    };
    const source = (['project', 'competitor', 'listing'] as const).includes(
      item.source as SelectionSource,
    )
      ? (item.source as SelectionSource)
      : 'listing';
    return {
      ...toVisitRequest(row),
      buyerName: buyer.name,
      buyerArchived: buyer.archived_at != null,
      itemLabel: item.label,
      itemSource: source,
      itemPrice: item.listed_price,
      contactReminder: source === 'competitor' || item.imported?.exclusivity === 'yes',
    };
  });
}
