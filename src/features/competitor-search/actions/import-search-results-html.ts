'use server';

import type { SearchResultsHtmlImport } from '@/features/competitor-search/types';
import { SEARCH_PORTAL_LABELS } from '@/features/competitor-search/types';
import {
  detectSearchPortal,
  extractSearchResults,
} from '@/features/competitor-search/services/extract-search-results';
import { isAllowedProtocol, normalizeUrl } from '@/features/comparable-import/utils/normalize-url';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

const GENERIC_ERROR = 'L’analyse a échoué. Vous pouvez importer une annonce par son adresse.';
const MAX_HTML_BYTES = 4 * 1024 * 1024;

// Fallback des portails qui refusent la lecture serveur : le conseiller ouvre
// la page de RÉSULTATS dans son navigateur, copie son code et le colle ici.
// Aucune requête distante ; même moteur d'extraction que la tentative serveur.
export async function importSearchResultsHtml(
  projectId: string,
  formData: FormData,
): Promise<SearchResultsHtmlImport> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const supabase = await createClient();
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

  const portal = detectSearchPortal(url.hostname);
  if (!portal) {
    return {
      ok: false,
      error:
        'Portail non reconnu. Collez une page de résultats SeLoger, Bien’ici, Figaro ou Green Acres.',
    };
  }

  const html = String(formData.get('html') ?? '');
  if (html.trim() === '') {
    return { ok: false, error: 'Collez le code de la page de résultats.' };
  }
  if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    return { ok: false, error: 'Le contenu collé est trop volumineux.' };
  }

  const candidates = extractSearchResults(html, url.href, portal);
  if (candidates.length === 0) {
    return { ok: false, error: 'Aucune annonce détectée dans le code collé.' };
  }

  return {
    ok: true,
    portal: {
      portal,
      label: SEARCH_PORTAL_LABELS[portal],
      searchUrl: url.href,
      status: 'ok',
      message: null,
      candidates,
    },
  };
}
