import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { hashDossierToken } from '@/features/buyer-dossier/services/dossier-token';
import {
  readOfferFields,
  type StoredOfferFields,
} from '@/features/purchase-offer/services/offer-input';
import { loadDocumentAgency } from '@/features/seller-synthesis/queries/load-document-agency';
import { signPropertyPhotos } from '@/features/subject-property-photos/services/property-photo-storage';
import {
  SIGNATURE_BUCKET,
  VOUCHER_TOKEN_PATTERN,
} from '@/features/visit-voucher/services/voucher-link';
import {
  textToDocument,
  type RenderedDocument,
} from '@/features/visit-voucher/services/voucher-text';
import { SIGNATURE_URL_TTL_SECONDS } from '@/features/visit-voucher/queries/load-voucher';
import type { Database } from '@/lib/supabase/database.types';

type Admin = SupabaseClient<Database>;

export type SignedOffer = {
  id: string;
  agencyId: string;
  buyerId: string | null;
  document: RenderedDocument;
  fields: StoredOfferFields | null;
  signedAt: string;
  validUntil: string;
  contentSha256: string;
  signatureUrls: string[];
  coverPhotoUrl: string | null;
  header: { name: string; logoUrl: string | null; brandDeclarations: string };
  answer: {
    decision: 'accepted' | 'refused';
    decidedAt: string;
    signers: string[];
    signatureUrls: string[];
  } | null;
};

async function signedUrls(admin: Admin, agencyId: string, paths: string[]): Promise<string[]> {
  const own = paths.filter((path) => path.startsWith(`${agencyId}/`));
  if (own.length === 0) return [];
  const { data } = await admin.storage
    .from(SIGNATURE_BUCKET)
    .createSignedUrls(own, SIGNATURE_URL_TTL_SECONDS);
  return (data ?? [])
    .map((entry) => entry.signedUrl)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
}

// Mission 137 (partie B) — une offre signée, relue telle qu'elle a été figée, sa couverture (photo du
// bien vendeur signée une heure, M37), et la réponse du vendeur s'il y en a une. Cadrée sur son agence.
export async function loadSignedOffer(
  admin: Admin,
  documentId: string,
  agencyId: string,
): Promise<SignedOffer | null> {
  if (!/^[0-9a-f-]{36}$/i.test(documentId)) return null;
  const { data } = await admin
    .from('buyer_documents')
    .select(
      'id, buyer_id, rendered_text, fields, signed_at, valid_until, content_sha256, signature_paths',
    )
    .eq('id', documentId)
    .eq('agency_id', agencyId)
    .eq('kind', 'purchase_offer')
    .maybeSingle();
  if (!data || !data.valid_until) return null;
  const fields = readOfferFields(data.fields);
  const photoPath = fields?.cover.photoPath;
  const [signatures, agency, answer, photo] = await Promise.all([
    signedUrls(admin, agencyId, data.signature_paths),
    loadDocumentAgency(admin, agencyId, null),
    admin
      .from('buyer_document_acceptances')
      .select('decision, decided_at, signer_names, signature_paths')
      .eq('document_id', documentId)
      .eq('agency_id', agencyId)
      .maybeSingle(),
    photoPath && photoPath.startsWith(`${agencyId}/`)
      ? signPropertyPhotos(admin, [photoPath], SIGNATURE_URL_TTL_SECONDS)
      : Promise.resolve([]),
  ]);
  return {
    id: data.id,
    agencyId,
    buyerId: data.buyer_id,
    document: textToDocument(data.rendered_text),
    fields,
    signedAt: data.signed_at,
    validUntil: data.valid_until,
    contentSha256: data.content_sha256,
    signatureUrls: signatures,
    coverPhotoUrl: photo[0]?.url ?? null,
    header: {
      name: agency.agency.name,
      logoUrl: agency.agency.logoUrl,
      brandDeclarations: agency.brandDeclarations,
    },
    answer: answer.data
      ? {
          decision: answer.data.decision as 'accepted' | 'refused',
          decidedAt: answer.data.decided_at,
          signers: answer.data.signer_names ?? [],
          signatureUrls: await signedUrls(admin, agencyId, answer.data.signature_paths ?? []),
        }
      : null,
  };
}

// Le lien d'une offre : forme du jeton, condensat, 30 jours ; à qui il va.
export async function findOfferByToken(
  admin: Admin,
  token: string,
): Promise<{ offer: SignedOffer; audience: 'visitor' | 'seller' } | null> {
  if (!VOUCHER_TOKEN_PATTERN.test(token)) return null;
  const { data } = await admin
    .from('buyer_document_links')
    .select('document_id, agency_id, audience')
    .eq('token_hash', hashDossierToken(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (!data) return null;
  const offer = await loadSignedOffer(admin, data.document_id, data.agency_id);
  if (!offer) return null;
  return { offer, audience: data.audience === 'seller' ? 'seller' : 'visitor' };
}
