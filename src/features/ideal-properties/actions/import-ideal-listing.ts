'use server';

import { revalidatePath } from 'next/cache';

import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';
import { detectSource } from '@/features/comparable-import/utils/detect-source';
import { parseListingUrl } from '@/features/comparable-import/utils/normalize-listing-url';
import { isAllowedProtocol } from '@/features/comparable-import/utils/normalize-url';
import { readListingPayload } from '@/features/competitor-search/services/listing-payload';
import { isDemoListingHost } from '@/features/demo/services/demo-urls';
import { getProfile } from '@/lib/auth/get-profile';
import type { Json } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type ImportIdealListingResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = 'L’import de cette annonce a échoué.';
const MAX_HTML_BYTES = 4 * 1024 * 1024;

// Mission 118 — une annonce du marché retenue pour un acquéreur s'importe comme un concurrent
// (M-import : le même lecteur, photos, prix, durée, « Vendu par », exclusivité), mais rattachée à
// la sélection de l'acquéreur, pas à un dossier vendeur. La page arrive dans un formulaire, lue par
// l'extension (correctif du 12/10) ; une annonce de démonstration n'a pas de page et n'entre pas ici.
export async function importIdealListing(
  itemId: string,
  payload: FormData,
): Promise<ImportIdealListingResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: GENERIC_ERROR };
  const listing = readListingPayload(payload);
  if (!listing) return { ok: false, error: GENERIC_ERROR };
  const url = parseListingUrl(listing.url);
  if (!url || !isAllowedProtocol(url) || isDemoListingHost(url.hostname)) {
    return { ok: false, error: 'Adresse d’annonce invalide.' };
  }
  const { html } = listing;
  if (html.trim() === '' || Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const client = createServiceRoleClient();
  const { data: item } = await client
    .from('buyer_selection_items')
    .select('id, reference, selection_id, buyer_selections!inner(buyer_id)')
    .eq('id', itemId)
    .eq('agency_id', profile.agency_id)
    .eq('source', 'listing')
    .maybeSingle();
  if (!item) return { ok: false, error: GENERIC_ERROR };
  const reference = parseListingUrl(item.reference);
  if (!reference || reference.href !== url.href) return { ok: false, error: GENERIC_ERROR };

  const parts = extractListingData(html, url.href);
  const { data, foundFields } = normalizeListingData(parts, url.href, detectSource(url.hostname));
  if (foundFields.length === 0) {
    return { ok: false, error: 'Aucune information exploitable n’a été détectée.' };
  }
  const { error } = await client
    .from('buyer_selection_items')
    .update({ imported: data as unknown as Json })
    .eq('id', itemId)
    .eq('agency_id', profile.agency_id);
  if (error) return { ok: false, error: GENERIC_ERROR };
  const buyerId = (item.buyer_selections as unknown as { buyer_id: string } | null)?.buyer_id;
  if (buyerId) {
    revalidatePath(`/acquereurs/${buyerId}`);
    revalidatePath(`/acquereurs/${buyerId}/biens-ideaux`);
  }
  return { ok: true };
}
