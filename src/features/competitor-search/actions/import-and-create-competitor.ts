'use server';

import {
  COMPETITOR_VERIFIABLE_FIELDS,
  importedFields,
} from '@/features/imported-fields/services/fields-to-verify';
import { revalidatePath } from 'next/cache';

import { maybePromoteToReady } from '@/features/projects/services/project-readiness';

import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';
import { observeListing } from '@/features/comparable-import/services/record-listing-observation';
import { detectSource } from '@/features/comparable-import/utils/detect-source';
import { parseListingUrl } from '@/features/comparable-import/utils/normalize-listing-url';
import { isAllowedProtocol } from '@/features/comparable-import/utils/normalize-url';
import { importedToComparableInput } from '@/features/comparables/utils/imported-to-comparable-input';
import { importedMandateColumns } from '@/features/competitor-mandate/services/mandate-columns';
import { insertCompetitor } from '@/features/competitor-search/services/insert-competitor';
import { readListingPayload } from '@/features/competitor-search/services/listing-payload';
import { emptyPageCode } from '@/features/competitor-search/services/withdrawn-proof';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type ImportAndCreateResult =
  // Mission 108 — `dismissedExisting` : l'annonce avait déjà sa fiche, écartée ; rien n'est créé.
  | { ok: true; name: string | null; becameReady?: boolean; dismissedExisting?: string }
  // La page relue ne porte ni prix ni donnée. Mission 103 — ce n'est une annonce retirée que sur
  // une PREUVE (`listing_withdrawn` : page 404, mention explicite du portail) ; sans preuve
  // (`listing_empty`), c'est un échec de lecture ordinaire — une page captcha se présente ainsi.
  | { ok: false; error: string; code?: 'listing_empty' | 'listing_withdrawn' };

const GENERIC_ERROR = 'L’import de cette annonce a échoué.';
const MAX_HTML_BYTES = 4 * 1024 * 1024;

// MISSION 50 §8 — import EN LOT : crée un concurrent dans le dossier à partir du code
// d'une fiche lue PAR L'EXTENSION (le HTML arrive du navigateur, aucune requête ici).
// Même pipeline d'extraction que l'import unitaire (extract + normalize + observation
// datée), puis insertion directe (le mapping remplace le formulaire pré-rempli).
// Ne redirige pas et ne jette pas : renvoie un résultat, pour que le lot isole chaque
// fiche — une qui échoue n'emporte pas les autres. Rien n'est écrit tant que le
// conseiller n'a pas cliqué : cet appel EST déclenché par ce clic.
//
// Correctif du 12/10 — l'adresse, la page et le type arrivent dans un FORMULAIRE
// (`listingPayload`) : une page de plus d'un million de caractères passée en argument faisait
// rejeter l'appel par React avant d'arriver ici. Le type est celui lu sur la CARTE de recherche
// (déjà canonique), normalisé ici par sécurité ; absent = inconnu.
export async function importAndCreateComparable(
  projectId: string,
  payload: FormData,
): Promise<ImportAndCreateResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: GENERIC_ERROR };
  }
  const listing = readListingPayload(payload);
  if (!listing) {
    return { ok: false, error: GENERIC_ERROR };
  }
  const { url: rawUrl, html, propertyType } = listing;

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

  const url = parseListingUrl(rawUrl);
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
    return {
      ok: false,
      error: 'Prix introuvable sur la fiche.',
      code: emptyPageCode(html, url.hostname),
    };
  }
  if (foundFields.length === 0) {
    return {
      ok: false,
      error: 'Aucune information exploitable n’a été détectée.',
      code: emptyPageCode(html, url.hostname),
    };
  }

  // Observation datée (mission 47), best effort — comme l'import unitaire.
  await observeListing(supabase, profile.agency_id, url.href, data);

  // Type canonique écrit en base (apartment/house/…) ; jamais le texte libre.
  const canonicalType = normalizePropertyType(propertyType);

  const created = await insertCompetitor(supabase, projectId, profile.agency_id, {
    ...input,
    // Mission 83 — vendeur et exclusivité tels que l'annonce les dit, avec leur provenance.
    ...importedMandateColumns(data),
    property_type: canonicalType,
    // Mission 97 — tout ce que l'import vient de remplir reste « à vérifier » jusqu'à relecture.
    fields_to_verify: importedFields(input, COMPETITOR_VERIFIABLE_FIELDS),
    is_selected: true,
  });
  if (created.status === 'failed') {
    return { ok: false, error: GENERIC_ERROR };
  }
  // Mission 101 — le bien n'est plus « en attente d'import » : sa ligne part avec sa création.
  await supabase
    .from('pending_competitor_imports')
    .delete()
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .eq('listing_url', url.href);
  // MISSION 52 — un concurrent importé peut compléter le dernier critère → bascule
  // automatique du dossier dans le Live (draft → ready).
  const becameReady = await maybePromoteToReady(supabase, projectId, profile.agency_id);
  revalidatePath(`/builder/${projectId}/comparables`);
  revalidatePath(`/builder/${projectId}`);
  revalidatePath('/builder');
  revalidatePath('/live');
  return {
    ok: true,
    name: input.title,
    becameReady,
    ...(created.status === 'existing' && !created.selected
      ? { dismissedExisting: created.id }
      : {}),
  };
}
