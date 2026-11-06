'use server';

import { hashDossierToken, newDossierToken } from '@/features/buyer-dossier/services/dossier-token';
import { voucherPath } from '@/features/visit-voucher/services/voucher-link';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type CreateVoucherLinkResult = { ok: true; linkPath: string } | { ok: false; error: string };

// Mission 137 — « Envoyer au visiteur » : un lien neuf vers le bon signé (le jeton n'est gardé
// qu'en condensat : un ancien lien ne se redonne pas, il continue de marcher jusqu'à son terme).
export async function createVoucherLink(documentId: unknown): Promise<CreateVoucherLinkResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  if (typeof documentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(documentId)) {
    return { ok: false, error: 'Bon de visite introuvable.' };
  }
  const admin = createServiceRoleClient();
  const { data: document } = await admin
    .from('buyer_documents')
    .select('id')
    .eq('id', documentId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!document) return { ok: false, error: 'Bon de visite introuvable.' };
  const token = newDossierToken();
  const { error } = await admin.from('buyer_document_links').insert({
    agency_id: profile.agency_id,
    document_id: documentId,
    created_by: profile.id,
    token_hash: hashDossierToken(token),
  });
  if (error) return { ok: false, error: 'Le lien n’a pas pu être créé. Réessayez.' };
  return { ok: true, linkPath: voucherPath(token) };
}
