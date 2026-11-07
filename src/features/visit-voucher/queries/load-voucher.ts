import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { hashDossierToken } from '@/features/buyer-dossier/services/dossier-token';
import { loadDocumentAgency } from '@/features/seller-synthesis/queries/load-document-agency';
import {
  readVoucherFields,
  type StoredVoucherFields,
} from '@/features/visit-voucher/services/voucher-input';
import {
  SIGNATURE_BUCKET,
  VOUCHER_TOKEN_PATTERN,
} from '@/features/visit-voucher/services/voucher-link';
import {
  textToDocument,
  type RenderedDocument,
} from '@/features/visit-voucher/services/voucher-text';
import {
  legalTranslation,
  voucherFieldsForTranslation,
} from '@/features/legal-translation/legal-translation';
import { clientLanguage } from '@/lib/client-language';
import { textLanguage } from '@/lib/client-texts';
import type { Database } from '@/lib/supabase/database.types';

type Admin = SupabaseClient<Database>;

// Les images de signature, par des liens signés d'une heure : le temps de lire et d'imprimer (M37).
export const SIGNATURE_URL_TTL_SECONDS = 3600;

export type SignedVoucher = {
  id: string;
  buyerId: string | null;
  document: RenderedDocument;
  fields: StoredVoucherFields | null;
  signedAt: string;
  contentSha256: string;
  signatureUrls: string[];
  // Mission 140 B — la traduction jointe pour un client non francophone ; null tant que le juriste
  // ne l'a pas validée (`TRADUCTION_DOCUMENTS_JURIDIQUES_VALIDEE`), et pour un client francophone.
  translation: RenderedDocument | null;
  header: { name: string; logoUrl: string | null; brandDeclarations: string };
};

// Mission 137 — un bon signé, relu tel qu'il a été figé : le texte, jamais recalculé (un modèle ou
// une identité qui changent ensuite ne le touchent pas). Cadré sur son agence.
export async function loadSignedVoucher(
  admin: Admin,
  documentId: string,
  agencyId: string,
): Promise<SignedVoucher | null> {
  if (!/^[0-9a-f-]{36}$/i.test(documentId)) return null;
  const { data } = await admin
    .from('buyer_documents')
    .select(
      'id, buyer_id, rendered_text, fields, signed_at, content_sha256, signature_paths, buyers(language)',
    )
    .eq('id', documentId)
    .eq('agency_id', agencyId)
    .eq('kind', 'visit_voucher')
    .maybeSingle();
  if (!data) return null;
  const paths = data.signature_paths.filter((path) => path.startsWith(`${agencyId}/`));
  const [signed, agency] = await Promise.all([
    paths.length > 0
      ? admin.storage.from(SIGNATURE_BUCKET).createSignedUrls(paths, SIGNATURE_URL_TTL_SECONDS)
      : Promise.resolve({ data: [] as { signedUrl: string | null }[] }),
    loadDocumentAgency(admin, agencyId, null),
  ]);
  const fields = readVoucherFields(data.fields);
  const language = textLanguage(
    clientLanguage((data.buyers as unknown as { language: string | null } | null)?.language),
  );
  return {
    id: data.id,
    buyerId: data.buyer_id,
    document: textToDocument(data.rendered_text),
    fields,
    translation: fields
      ? legalTranslation(
          { kind: 'visit_voucher', fields: voucherFieldsForTranslation(fields) },
          language,
        )
      : null,
    signedAt: data.signed_at,
    contentSha256: data.content_sha256,
    signatureUrls: (signed.data ?? [])
      .map((entry) => entry.signedUrl)
      .filter((url): url is string => typeof url === 'string' && url.length > 0),
    header: {
      name: agency.agency.name,
      logoUrl: agency.agency.logoUrl,
      brandDeclarations: agency.brandDeclarations,
    },
  };
}

// Le lien du visiteur : forme du jeton, condensat, 30 jours ; puis le document de son agence.
export async function findVoucherByToken(
  admin: Admin,
  token: string,
): Promise<SignedVoucher | null> {
  if (!VOUCHER_TOKEN_PATTERN.test(token)) return null;
  const { data } = await admin
    .from('buyer_document_links')
    .select('document_id, agency_id, expires_at')
    .eq('token_hash', hashDossierToken(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (!data) return null;
  return loadSignedVoucher(admin, data.document_id, data.agency_id);
}
