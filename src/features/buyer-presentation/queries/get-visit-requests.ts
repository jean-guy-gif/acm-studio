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
  // Mission 120 — le bien retenu (sa référence : dossier, concurrent ou annonce) et l'exclusivité
  // lue à l'import, pour l'action que la visite propose. Côté conseiller seulement.
  itemId: string;
  itemReference: string;
  itemExclusivity: string | null;
};

// Mission 119 — toutes les demandes de visite de l'agence, par acquéreur, avec le bien retenu ;
// les demandes annulées ne s'affichent pas.
export async function getVisitLines(): Promise<VisitLine[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('buyer_visit_requests')
    .select(
      '*, buyers!inner(name, archived_at), buyer_selection_items!inner(id, label, source, reference, listed_price, imported)',
    )
    .is('cancelled_at', null)
    .order('requested_at', { ascending: false });
  return (data ?? []).map((row) => {
    const buyer = row.buyers as unknown as { name: string; archived_at: string | null };
    const item = row.buyer_selection_items as unknown as {
      id: string;
      reference: string;
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
      itemId: item.id,
      itemReference: item.reference,
      itemExclusivity:
        typeof item.imported?.exclusivity === 'string' ? item.imported.exclusivity : null,
    };
  });
}
