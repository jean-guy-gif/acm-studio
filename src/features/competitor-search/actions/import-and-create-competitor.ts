'use server';

import { revalidatePath } from 'next/cache';

import { maybePromoteToReady } from '@/features/projects/services/project-readiness';

import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';
import { observeListing } from '@/features/comparable-import/services/record-listing-observation';
import { detectSource } from '@/features/comparable-import/utils/detect-source';
import { isAllowedProtocol, normalizeUrl } from '@/features/comparable-import/utils/normalize-url';
import { importedToComparableInput } from '@/features/comparables/utils/imported-to-comparable-input';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type ImportAndCreateResult =
  { ok: true; name: string | null; becameReady?: boolean } | { ok: false; error: string };

const GENERIC_ERROR = 'L’import de cette annonce a échoué.';
const MAX_HTML_BYTES = 4 * 1024 * 1024;

// MISSION 50 §8 — import EN LOT : crée un concurrent dans le dossier à partir du code
// d'une fiche lue PAR L'EXTENSION (le HTML arrive du navigateur, aucune requête ici).
// Même pipeline d'extraction que l'import unitaire (extract + normalize + observation
// datée), puis insertion directe (le mapping remplace le formulaire pré-rempli).
// Ne redirige pas et ne jette pas : renvoie un résultat, pour que le lot isole chaque
// fiche — une qui échoue n'emporte pas les autres. Rien n'est écrit tant que le
// conseiller n'a pas cliqué : cet appel EST déclenché par ce clic.
export async function importAndCreateComparable(
  projectId: string,
  rawUrl: string,
  html: string,
  // Type lu sur la CARTE de recherche (déjà canonique). Normalisé ici par sécurité —
  // la colonne exige le vocabulaire canonique, jamais du texte libre. Null = inconnu.
  propertyType: string | null = null,
): Promise<ImportAndCreateResult> {
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

  const url = normalizeUrl(rawUrl);
  if (!url || !isAllowedProtocol(url)) {
    return { ok: false, error: 'Adresse d’annonce invalide.' };
  }
  if (html.trim() === '' || Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    return { ok: false, error: GENERIC_ERROR };
  }

  const parts = extractListingData(html, url.href);
  const source = detectSource(url.hostname);
  const { data, foundFields } = normalizeListingData(parts, url.href, source);

  const input = importedToComparableInput(data);
  if (input == null) {
    // Sans prix, un concurrent n'a pas de sens (et le prix est requis en base). On
    // n'invente pas : la fiche est signalée en échec, relançable seule.
    return { ok: false, error: 'Prix introuvable sur la fiche.' };
  }
  if (foundFields.length === 0) {
    return { ok: false, error: 'Aucune information exploitable n’a été détectée.' };
  }

  // Observation datée (mission 47), best effort — comme l'import unitaire.
  await observeListing(supabase, profile.agency_id, url.href, data);

  // Type canonique écrit en base (apartment/house/…) ; jamais le texte libre.
  const canonicalType = normalizePropertyType(propertyType);

  // display_order = max + 1, recalculé à chaque tentative ; sur collision (contrainte
  // unique différée, 23505) on réessaie. Même logique que createComparable.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: last } = await supabase
      .from('comparables')
      .select('display_order')
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (last?.display_order ?? 0) + 1;

    const { error } = await supabase.from('comparables').insert({
      ...input,
      property_type: canonicalType,
      project_id: projectId,
      agency_id: profile.agency_id,
      display_order: nextOrder,
      is_selected: true,
    });
    if (!error) {
      // MISSION 52 — un concurrent importé peut compléter le dernier critère → bascule
      // automatique du dossier dans le Live (draft → ready).
      const becameReady = await maybePromoteToReady(supabase, projectId, profile.agency_id);
      revalidatePath(`/builder/${projectId}/comparables`);
      revalidatePath(`/builder/${projectId}`);
      revalidatePath('/builder');
      revalidatePath('/live');
      return { ok: true, name: input.title, becameReady };
    }
    if (error.code !== '23505') {
      return { ok: false, error: GENERIC_ERROR };
    }
  }
  return { ok: false, error: GENERIC_ERROR };
}
