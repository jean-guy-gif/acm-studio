import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';

export type VisitVoucher = { documentId: string; buyerId: string | null; signedAt: string };

// Mission 137 — le bon signé de chaque visite (« gardé sur la visite ») : visite → son dernier bon.
// Une lecture en échec ne montre aucun bon (le bouton « Bon de visite » reste).
export async function getVisitVouchers(
  supabase: SupabaseClient<Database>,
  visitIds: string[],
): Promise<Map<string, VisitVoucher>> {
  if (visitIds.length === 0) return new Map();
  const { data } = await supabase
    .from('buyer_document_visits')
    .select('visit_request_id, buyer_documents!inner(id, buyer_id, signed_at)')
    .in('visit_request_id', visitIds);
  const vouchers = new Map<string, VisitVoucher>();
  for (const row of data ?? []) {
    const document = row.buyer_documents as unknown as {
      id: string;
      buyer_id: string | null;
      signed_at: string;
    };
    const known = vouchers.get(row.visit_request_id);
    if (!known || document.signed_at > known.signedAt) {
      vouchers.set(row.visit_request_id, {
        documentId: document.id,
        buyerId: document.buyer_id,
        signedAt: document.signed_at,
      });
    }
  }
  return vouchers;
}
