import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { OfferDecision } from '@/features/purchase-offer/services/offer-answer';
import type { Database } from '@/lib/supabase/database.types';

// Mission 138 — la réponse du vendeur, lue pour ses badges datés (« Offre acceptée le 06/11 ») : sur
// la visite d'où l'offre est née, et sur le dossier vendeur du bien. Toujours filtrée sur le genre
// `purchase_offer` (leçon de la 137 B : un bon de visite n'est jamais une offre).

export type OfferAnswer = {
  documentId: string;
  buyerId: string | null;
  buyerName: string | null;
  decision: OfferDecision;
  decidedAt: string;
  // Mission 145 — le statut de l'acquéreur aujourd'hui : une offre acceptée ne tient que tant
  // qu'il est « Sous offre » ou « A acheté » (« L'offre est tombée », M138).
  buyerStatus: string | null;
};

type Row = {
  id: string;
  buyer_id: string | null;
  buyers: unknown;
  buyer_document_acceptances: unknown;
};

function answerOf(row: Row): OfferAnswer | null {
  const answers = row.buyer_document_acceptances as
    { decision: string; decided_at: string }[] | { decision: string; decided_at: string } | null;
  const answer = Array.isArray(answers) ? answers[0] : answers;
  if (!answer || (answer.decision !== 'accepted' && answer.decision !== 'refused')) return null;
  return {
    documentId: row.id,
    buyerId: row.buyer_id,
    buyerName: (row.buyers as { name?: string } | null)?.name ?? null,
    decision: answer.decision,
    decidedAt: answer.decided_at,
    buyerStatus: (row.buyers as { status?: string } | null)?.status ?? null,
  };
}

const latest = (a: OfferAnswer, b: OfferAnswer | undefined): OfferAnswer =>
  !b || a.decidedAt > b.decidedAt ? a : b;

// Visite → la réponse la plus récente à une offre née d'elle ; null si la lecture échoue (jamais
// « aucune réponse », M98).
export async function getVisitOfferAnswers(
  supabase: SupabaseClient<Database>,
  visitIds: string[],
): Promise<Map<string, OfferAnswer> | null> {
  if (visitIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('buyer_document_visits')
    .select(
      'visit_request_id, buyer_documents!inner(id, buyer_id, kind, buyers(name, status), buyer_document_acceptances(decision, decided_at))',
    )
    .eq('buyer_documents.kind', 'purchase_offer')
    .in('visit_request_id', visitIds);
  if (error) return null;
  const answers = new Map<string, OfferAnswer>();
  for (const row of data ?? []) {
    const answer = answerOf(row.buyer_documents as unknown as Row);
    if (answer)
      answers.set(row.visit_request_id, latest(answer, answers.get(row.visit_request_id)));
  }
  return answers;
}

// Les réponses aux offres faites sur le bien d'un dossier vendeur, la plus récente d'abord ; null
// si la lecture échoue (jamais « aucune », M98).
export async function getProjectOfferAnswers(
  supabase: SupabaseClient<Database>,
  agencyId: string,
  projectIds: string[],
): Promise<(OfferAnswer & { projectId: string })[] | null> {
  if (projectIds.length === 0) return [];
  const { data, error } = await supabase
    .from('buyer_documents')
    .select(
      'id, buyer_id, fields, buyers(name, status), buyer_document_acceptances(decision, decided_at)',
    )
    .eq('agency_id', agencyId)
    .eq('kind', 'purchase_offer')
    .in('fields->>projectId', projectIds);
  if (error) return null;
  return (data ?? [])
    .map((row) => {
      const answer = answerOf(row as unknown as Row);
      const projectId = (row.fields as { projectId?: unknown } | null)?.projectId;
      return answer && typeof projectId === 'string' ? { ...answer, projectId } : null;
    })
    .filter((answer): answer is OfferAnswer & { projectId: string } => answer != null)
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
}
