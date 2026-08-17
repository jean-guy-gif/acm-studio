'use server';

import type { ComparableImportResult } from '@/features/comparable-import/types';
import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';
import { detectSource } from '@/features/comparable-import/utils/detect-source';
import { isAllowedProtocol, normalizeUrl } from '@/features/comparable-import/utils/normalize-url';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

const GENERIC_ERROR = 'L’import a échoué. Vous pouvez saisir le bien manuellement.';

// Plan B when a portal refuses the server-side fetch (anti-bot): the advisor
// opens the listing in HIS OWN browser, copies the page source and pastes it
// here. Nothing is bypassed — this only analyses content the advisor can
// already see. Same extraction pipeline as the URL import; NO remote request
// is ever made by this action.
const MAX_HTML_BYTES = 4 * 1024 * 1024;

export async function importComparableHtml(
  projectId: string,
  formData: FormData,
): Promise<ComparableImportResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();

  // Multi-tenant guard: the project must belong to the caller's agency.
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: GENERIC_ERROR };
  }

  // The original listing URL is required: it anchors relative photo URLs,
  // the source label and the stored listing_url.
  const rawUrl = String(formData.get('url') ?? '').trim();
  const url = normalizeUrl(rawUrl);
  if (!url || !isAllowedProtocol(url)) {
    return { ok: false, error: 'URL invalide.' };
  }

  const html = String(formData.get('html') ?? '');
  if (html.trim() === '') {
    return { ok: false, error: 'Collez le code de la page de l’annonce.' };
  }
  if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    return { ok: false, error: 'Le contenu collé est trop volumineux.' };
  }

  const parts = extractListingData(html, url.href);
  const source = detectSource(url.hostname);
  const { data, foundFields, missingFields } = normalizeListingData(parts, url.href, source);

  if (foundFields.length === 0 && data.photoUrls.length === 0) {
    return { ok: false, error: 'Aucune information exploitable n’a été détectée.' };
  }

  return { ok: true, data, foundFields, missingFields };
}
