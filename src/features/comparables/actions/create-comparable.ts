'use server';

import { revalidatePath } from 'next/cache';

import { insertCompetitor } from '@/features/competitor-search/services/insert-competitor';
import { redirect } from 'next/navigation';

import { maybePromoteToReady } from '@/features/projects/services/project-readiness';

import type { CreateComparableState } from '@/features/comparables/actions/create-comparable-state';
import {
  COMPETITOR_VERIFIABLE_FIELDS,
  sanitizeFieldsToVerify,
} from '@/features/imported-fields/services/fields-to-verify';
import { parseImportedMandateForm } from '@/features/competitor-mandate/services/mandate-columns';
import { parseComparableForm } from '@/features/comparables/utils/comparable-input';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// useActionState-compatible action. On a validation or business error it RETURNS
// its state (no redirect, no URL params) so the form keeps every value the user
// typed and can surface errors next to their fields. A successful creation
// redirects to the comparables list instead of returning. The state type and its
// initial value live in ./create-comparable-state (a 'use server' file may only
// export async functions).

// Collect the raw string fields so the form can repopulate exactly what was
// typed — including values a validation rejected, so they can be corrected.
function collectValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of new Set(formData.keys())) {
    if (key === '__importGen') {
      continue;
    }
    const all = formData.getAll(key).filter((v): v is string => typeof v === 'string');
    // Repeated fields (checkbox groups) are joined with newlines so the form can
    // re-check exactly what the user selected.
    values[key] = all.length > 1 ? all.join('\n') : (all[0] ?? '');
  }
  return values;
}

const DUPLICATE_RETAINED_MESSAGE =
  'Déjà dans le dossier\u00a0: cette annonce a déjà sa fiche, retenue. Aucune fiche n’a été ajoutée.';

// projectId is bound server-side from the route; never taken from the client.
export async function createComparable(
  projectId: string,
  _prevState: CreateComparableState,
  formData: FormData,
): Promise<CreateComparableState> {
  const importGen = String(formData.get('__importGen') ?? '') || null;

  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }

  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();

  if (!project) {
    redirect('/builder');
  }

  const parsed = parseComparableForm(formData);
  if (!parsed.ok) {
    return {
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
      values: collectValues(formData),
      importGen,
    };
  }

  const failureState: CreateComparableState = {
    error: 'La création du bien concurrent a échoué.',
    fieldErrors: {},
    values: collectValues(formData),
    importGen,
  };

  // Mission 108 — l'insertion partagée : l'adresse de l'annonce est nettoyée comme sur tous les
  // chemins d'import, et un doublon se dit au lieu d'être avalé.
  const created = await insertCompetitor(supabase, projectId, profile.agency_id, {
    ...parsed.input,
    // Mission 83 — ce que l'annonce importée disait du vendeur et de l'exclusivité (champs
    // cachés, revalidés). Une saisie à la main n'en porte pas : inconnu.
    ...parseImportedMandateForm(formData),
    // Mission 97 — les champs remplis par l'import et pas encore relus (champ caché, revalidé).
    fields_to_verify: sanitizeFieldsToVerify(
      formData.get('fields_to_verify'),
      COMPETITOR_VERIFIABLE_FIELDS,
    ),
    is_selected: true,
  });

  if (created.status === 'failed') {
    return failureState;
  }
  if (created.status === 'existing') {
    return {
      ...failureState,
      error: created.selected ? DUPLICATE_RETAINED_MESSAGE : null,
      duplicate: { id: created.id, selected: created.selected },
    };
  }

  // MISSION 52 — un concurrent de plus peut compléter le dernier critère : le dossier
  // bascule alors dans le Live (draft → ready). L'action redirige (pas de retour possible),
  // donc la bascule s'annonce par un paramètre lu sur la liste des concurrents.
  const becameReady = await maybePromoteToReady(supabase, projectId, profile.agency_id);

  revalidatePath(`/builder/${projectId}/comparables`);
  revalidatePath(`/builder/${projectId}`);
  revalidatePath('/builder');
  revalidatePath('/live');
  redirect(`/builder/${projectId}/comparables${becameReady ? '?bascule=1' : ''}`);
}
