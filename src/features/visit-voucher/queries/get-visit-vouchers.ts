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

export type BuyerVoucher = { documentId: string; signedAt: string; labels: string[] };

// Les bons signés d'une fiche, du plus récent au plus ancien, avec les biens qu'ils portent ; une
// lecture en échec rend null, jamais « aucun bon » (M98).
export async function getBuyerVouchers(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  buyerId: string,
): Promise<BuyerVoucher[] | null> {
  const { data, error } = await supabase
    .from('buyer_documents')
    .select('id, signed_at, fields')
    .eq('agency_id', agencyId)
    .eq('buyer_id', buyerId)
    .eq('kind', 'visit_voucher')
    .order('signed_at', { ascending: false });
  if (error) return null;
  return (data ?? []).map((row) => {
    const biens = (row.fields as { biens?: { label?: unknown }[] } | null)?.biens ?? [];
    return {
      documentId: row.id,
      signedAt: row.signed_at,
      labels: biens
        .map((bien) => (typeof bien.label === 'string' ? bien.label : null))
        .filter((label): label is string => label != null),
    };
  });
}

export type BuyerOffer = {
  documentId: string;
  signedAt: string;
  validUntil: string;
  answer: 'accepted' | 'refused' | null;
};

// Mission 137 B — les offres d'achat signées d'une fiche, et la réponse du vendeur ; une lecture en
// échec rend null (M98).
export async function getBuyerOffers(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  buyerId: string,
): Promise<BuyerOffer[] | null> {
  const { data, error } = await supabase
    .from('buyer_documents')
    .select('id, signed_at, valid_until, buyer_document_acceptances(decision)')
    .eq('agency_id', agencyId)
    .eq('buyer_id', buyerId)
    .eq('kind', 'purchase_offer')
    .order('signed_at', { ascending: false });
  if (error) return null;
  return (data ?? []).map((row) => {
    const answers = row.buyer_document_acceptances as unknown as
      { decision: string }[] | { decision: string } | null;
    const answer = Array.isArray(answers) ? answers[0] : answers;
    return {
      documentId: row.id,
      signedAt: row.signed_at,
      validUntil: row.valid_until ?? '',
      answer:
        answer?.decision === 'accepted' || answer?.decision === 'refused' ? answer.decision : null,
    };
  });
}
