'use server';

import {
  SUBJECT_VERIFIABLE_FIELDS,
  sanitizeFieldsToVerify,
} from '@/features/imported-fields/services/fields-to-verify';
import { revalidatePath } from 'next/cache';

import { maybePromoteToReady } from '@/features/projects/services/project-readiness';
import { normalizeSubjectPropertyCondominium } from '@/features/subject-property-condominium/services/normalize-subject-property-condominium';
import { parseCondominiumForm } from '@/features/subject-property-condominium/services/parse-condominium-form';
import { validateSubjectPropertyCondominium } from '@/features/subject-property-condominium/services/validate-subject-property-condominium';
import { normalizeSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/services/normalize-subject-property-diagnostics';
import { parseDiagnosticsForm } from '@/features/subject-property-diagnostics/services/parse-diagnostics-form';
import { validateSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/services/validate-subject-property-diagnostics';
import {
  LONE_BOUND_ERROR,
  missingRangeBound,
} from '@/features/subject-property/services/advisor-range';
import { parseSubjectPropertyForm } from '@/features/subject-property/services/parse-subject-property-form';
import {
  splitSheetForm,
  type SheetFieldErrors,
} from '@/features/subject-property/services/sheet-form';
import { validateSubjectProperty } from '@/features/subject-property/services/validate-subject-property';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type SaveSubjectPropertySheetResult =
  // `notSaved` (mission 93) : la fiche est enregistrée, sauf le champ désigné — une fourchette
  // à une seule borne. L'écran le dit et garde la saisie comme « non enregistrée ».
  | { ok: true; becameReady?: boolean; notSaved?: SheetFieldErrors }
  | { ok: false; error?: string; fieldErrors?: SheetFieldErrors };

// MISSION 77 — UN enregistrement pour toute la fiche : le bien, puis ses diagnostics et sa
// copropriété quand le conseiller les a touchés. Tout est validé AVANT la première écriture :
// une erreur de saisie dans une partie n'enregistre aucune des trois.
//
// projectId is bound server-side from the URL; never taken from the client form. Every write
// goes through the RLS-scoped user client (no service role needed).
export async function saveSubjectPropertySheet(
  projectId: string,
  formData: FormData,
): Promise<SaveSubjectPropertySheetResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }

  const supabase = await createClient();

  // Multi-tenant guard: the project must belong to the caller's agency (RLS).
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Projet introuvable pour votre agence.' };
  }

  const parts = splitSheetForm(formData);
  const property = validateSubjectProperty(parseSubjectPropertyForm(parts.property));
  const diagnostics = parts.diagnostics
    ? validateSubjectPropertyDiagnostics(
        normalizeSubjectPropertyDiagnostics(parseDiagnosticsForm(parts.diagnostics)),
      )
    : null;
  // Normalise (coherence rules) BEFORE validation so out-of-condominium data is
  // neutralised and never triggers a spurious error.
  const condominium = parts.condominium
    ? validateSubjectPropertyCondominium(
        normalizeSubjectPropertyCondominium(parseCondominiumForm(parts.condominium)),
      )
    : null;

  // Mission 93 — une borne seule : « Indiquez les deux montants ». Ce champ ne s'enregistre pas ;
  // le reste de la fiche, si.
  const parsedProperty = parseSubjectPropertyForm(parts.property);
  const loneBound = missingRangeBound(
    parsedProperty.advisor_price_min,
    parsedProperty.advisor_price_max,
  );
  const rangeError: Record<string, string> = loneBound ? { [loneBound]: LONE_BOUND_ERROR } : {};

  const fieldErrors: SheetFieldErrors = {
    property: property.ok ? rangeError : { ...rangeError, ...property.fieldErrors },
    diagnostics: diagnostics == null || diagnostics.ok ? {} : diagnostics.fieldErrors,
    condominium: condominium == null || condominium.ok ? {} : condominium.fieldErrors,
  };
  if (
    !property.ok ||
    (diagnostics != null && !diagnostics.ok) ||
    (condominium != null && !condominium.ok)
  ) {
    return { ok: false, error: 'Corrigez les champs indiqués.', fieldErrors };
  }

  // One project has exactly one subject property. Upsert on the unique
  // project_id constraint so two concurrent saves cannot create two rows.
  // Sans ses deux bornes, la fourchette n'est pas écrite : absente de l'UPSERT, elle garde la
  // valeur déjà en base.
  const { advisor_price_min, advisor_price_max, ...withoutRange } = property.value;
  const { data: saved, error } = await supabase
    .from('subject_properties')
    .upsert(
      {
        ...(loneBound ? withoutRange : { ...withoutRange, advisor_price_min, advisor_price_max }),
        // Mission 97 — ce qu'il reste à vérifier après un import, revalidé (liste d'autorisation).
        fields_to_verify: sanitizeFieldsToVerify(
          parts.property.getAll('fields_to_verify'),
          SUBJECT_VERIFIABLE_FIELDS,
        ),
        project_id: projectId,
        agency_id: profile.agency_id,
      },
      { onConflict: 'project_id' },
    )
    .select('id')
    .single();
  if (error || !saved) {
    return { ok: false, error: 'L’enregistrement du bien a échoué.' };
  }

  if (diagnostics != null) {
    const { error: diagnosticsError } = await supabase.from('subject_property_diagnostics').upsert(
      {
        ...diagnostics.value,
        subject_property_id: saved.id,
        agency_id: profile.agency_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'subject_property_id' },
    );
    if (diagnosticsError) {
      revalidatePath(`/builder/${projectId}/property`);
      return {
        ok: false,
        error: 'Le bien est enregistré, mais l’enregistrement des diagnostics a échoué.',
      };
    }
  }

  if (condominium != null) {
    const { error: condominiumError } = await supabase.from('subject_property_condominiums').upsert(
      {
        ...condominium.value,
        subject_property_id: saved.id,
        agency_id: profile.agency_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'subject_property_id' },
    );
    if (condominiumError) {
      revalidatePath(`/builder/${projectId}/property`);
      return {
        ok: false,
        error: 'Le bien est enregistré, mais l’enregistrement de la copropriété a échoué.',
      };
    }
  }

  // MISSION 52 — le bien vendeur vient d'être enregistré : si les trois critères sont
  // désormais réunis, le dossier bascule tout seul dans le Live (draft → ready). La liste
  // de Préparation et celle du Live changent donc aussi.
  const becameReady = await maybePromoteToReady(supabase, projectId, profile.agency_id);

  revalidatePath(`/builder/${projectId}`);
  revalidatePath(`/builder/${projectId}/property`);
  revalidatePath('/builder');
  revalidatePath('/live');
  if (loneBound) {
    return {
      ok: true,
      becameReady,
      notSaved: { property: rangeError, diagnostics: {}, condominium: {} },
    };
  }
  return { ok: true, becameReady };
}
