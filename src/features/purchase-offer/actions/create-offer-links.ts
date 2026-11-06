'use server';

import { hashDossierToken, newDossierToken } from '@/features/buyer-dossier/services/dossier-token';
import { offerPath } from '@/features/purchase-offer/services/offer-link';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type CreateOfferLinksResult =
  { ok: true; buyerLinkPath: string; sellerLinkPath: string } | { ok: false; error: string };

// Mission 137 (partie B) — « Créer de nouveaux liens » pour une offre signée de l'agence : la copie
// des offrants et le lien du vendeur (le jeton n'est gardé qu'en condensat : un ancien lien ne se
// redonne pas, il marche jusqu'à son terme).
export async function createOfferLinks(documentId: unknown): Promise<CreateOfferLinksResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  if (typeof documentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(documentId)) {
    return { ok: false, error: 'Offre introuvable.' };
  }
  const admin = createServiceRoleClient();
  const { data: offer } = await admin
    .from('buyer_documents')
    .select('id')
    .eq('id', documentId)
    .eq('agency_id', profile.agency_id)
    .eq('kind', 'purchase_offer')
    .maybeSingle();
  if (!offer) return { ok: false, error: 'Offre introuvable.' };
  const buyerToken = newDossierToken();
  const sellerToken = newDossierToken();
  const { error } = await admin.from('buyer_document_links').insert([
    {
      agency_id: profile.agency_id,
      document_id: documentId,
      created_by: profile.id,
      token_hash: hashDossierToken(buyerToken),
      audience: 'visitor',
    },
    {
      agency_id: profile.agency_id,
      document_id: documentId,
      created_by: profile.id,
      token_hash: hashDossierToken(sellerToken),
      audience: 'seller',
    },
  ]);
  if (error) return { ok: false, error: 'Les liens n’ont pas pu être créés. Réessayez.' };
  return { ok: true, buyerLinkPath: offerPath(buyerToken), sellerLinkPath: offerPath(sellerToken) };
}
