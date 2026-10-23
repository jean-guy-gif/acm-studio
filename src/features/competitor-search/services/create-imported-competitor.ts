import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

import type { ImportedComparableData } from '@/features/comparable-import/types';
import { observeListing } from '@/features/comparable-import/services/record-listing-observation';
import type { ComparableInput } from '@/features/comparables/utils/comparable-input';
import { importedMandateColumns } from '@/features/competitor-mandate/services/mandate-columns';
import { insertCompetitor } from '@/features/competitor-search/services/insert-competitor';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import {
  COMPETITOR_VERIFIABLE_FIELDS,
  importedFields,
} from '@/features/imported-fields/services/fields-to-verify';
import { maybePromoteToReady } from '@/features/projects/services/project-readiness';
import type { Database } from '@/lib/supabase/database.types';

export type CreateImportedCompetitorResult =
  // Mission 108 — `dismissedExisting` : l'annonce avait déjà sa fiche, écartée ; rien n'est créé.
  | { ok: true; name: string | null; becameReady?: boolean; dismissedExisting?: string }
  | { ok: false; error: string };

const GENERIC_ERROR = 'L’import de cette annonce a échoué.';

// Ce qui suit la LECTURE d'une annonce, quelle qu'en soit la source : l'observation datée (M47), le
// concurrent créé RETENU avec ses champs « à vérifier » (M97) et son vendeur (M83), la ligne
// d'attente retirée (M101), la bascule « prêt » (M52). Partagé par l'import d'une page lue par
// l'extension et par l'import de démonstration (M114) : la démo entre ici, pas avant.
export async function createImportedCompetitor(options: {
  supabase: SupabaseClient<Database>;
  projectId: string;
  agencyId: string;
  url: URL;
  data: ImportedComparableData;
  input: ComparableInput;
  // Le type lu sur la carte de recherche (canonique ou texte libre) ; absent = inconnu.
  propertyType: string | null;
}): Promise<CreateImportedCompetitorResult> {
  const { supabase, projectId, agencyId, url, data, input } = options;

  // Observation datée (mission 47), best effort — comme l'import unitaire.
  await observeListing(supabase, agencyId, url.href, data);

  // Type canonique écrit en base (apartment/house/…) ; jamais le texte libre.
  const canonicalType = normalizePropertyType(options.propertyType);

  const created = await insertCompetitor(supabase, projectId, agencyId, {
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
    .eq('agency_id', agencyId)
    .eq('listing_url', url.href);
  // MISSION 52 — un concurrent importé peut compléter le dernier critère → bascule
  // automatique du dossier dans le Live (draft → ready).
  const becameReady = await maybePromoteToReady(supabase, projectId, agencyId);
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
