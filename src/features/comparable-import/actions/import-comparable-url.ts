'use server';

import type { ComparableImportResult } from '@/features/comparable-import/types';
import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { fetchListingPage } from '@/features/comparable-import/services/fetch-listing-page';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';
import { detectSource } from '@/features/comparable-import/utils/detect-source';
import { isAllowedProtocol, normalizeUrl } from '@/features/comparable-import/utils/normalize-url';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

const GENERIC_ERROR = 'L’import a échoué. Vous pouvez saisir le bien manuellement.';

// projectId is bound server-side from the route; never taken from the client.
// This action only READS a remote page and returns prefill data — it never
// writes to `comparables`.
export async function importComparableUrl(
  projectId: string,
  formData: FormData,
): Promise<ComparableImportResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();

  // Multi-tenant guard: the project must belong to the caller's agency.
  // No existence leak — a foreign/absent project yields a generic failure.
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const rawUrl = String(formData.get('url') ?? '').trim();
  const url = normalizeUrl(rawUrl);
  if (!url || !isAllowedProtocol(url)) {
    return { ok: false, error: 'URL invalide.' };
  }

  const page = await fetchListingPage(rawUrl);
  if (!page.ok) {
    return { ok: false, error: page.error };
  }

  // Use the ORIGINAL advisor URL for extraction (e.g. SeLoger location), not the
  // canonical URL a redirect may have led to.
  const parts = extractListingData(page.html, url.href);
  const source = detectSource(url.hostname);
  const { data, foundFields, missingFields } = normalizeListingData(parts, page.finalUrl, source);

  if (foundFields.length === 0 && data.photoUrls.length === 0) {
    return { ok: false, error: 'Aucune information exploitable n’a été détectée.' };
  }

  return { ok: true, data, foundFields, missingFields };
}
