'use server';

import { revalidatePath } from 'next/cache';

import { normalizeSubjectPropertyCondominium } from '@/features/subject-property-condominium/services/normalize-subject-property-condominium';
import { validateSubjectPropertyCondominium } from '@/features/subject-property-condominium/services/validate-subject-property-condominium';
import type { CondominiumInput } from '@/features/subject-property-condominium/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type SaveCondominiumResult =
  { ok: true } | { ok: false; error?: string; fieldErrors?: Record<string, string> };

function textOrNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}
function numberOrNull(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim();
  return raw === '' ? null : Number(raw);
}
function integerOrNull(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim();
  return raw === '' ? null : Number.parseInt(raw, 10);
}
// Tri-state boolean: 'true' -> true, 'false' -> false, anything else -> null.
function triState(value: FormDataEntryValue | null): boolean | null {
  const raw = String(value ?? '').trim();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

export async function saveSubjectPropertyCondominium(
  projectId: string,
  formData: FormData,
): Promise<SaveCondominiumResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }

  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Projet introuvable pour votre agence.' };
  }

  const { data: property } = await supabase
    .from('subject_properties')
    .select('id')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!property) {
    return { ok: false, error: 'Renseignez d’abord le bien vendeur.' };
  }

  const raw: CondominiumInput = {
    is_condominium: String(formData.get('is_condominium') ?? '') === 'true',
    total_lots: integerOrNull(formData.get('total_lots')),
    residential_lots: integerOrNull(formData.get('residential_lots')),
    annual_charges: numberOrNull(formData.get('annual_charges')),
    works_fund: numberOrNull(formData.get('works_fund')),
    syndic_name: textOrNull(formData.get('syndic_name')),
    ongoing_procedures: triState(formData.get('ongoing_procedures')),
    procedures_details: textOrNull(formData.get('procedures_details')),
    voted_works: triState(formData.get('voted_works')),
    voted_works_details: textOrNull(formData.get('voted_works_details')),
    planned_works: triState(formData.get('planned_works')),
    planned_works_details: textOrNull(formData.get('planned_works_details')),
    known_unpaid_charges: triState(formData.get('known_unpaid_charges')),
    known_unpaid_charges_amount: numberOrNull(formData.get('known_unpaid_charges_amount')),
    last_general_assembly_date: textOrNull(formData.get('last_general_assembly_date')),
    notes: textOrNull(formData.get('notes')),
  };

  // Normalise (coherence rules) BEFORE validation so out-of-condominium data is
  // neutralised and never triggers a spurious error.
  const normalized = normalizeSubjectPropertyCondominium(raw);
  const validation = validateSubjectPropertyCondominium(normalized);
  if (!validation.ok) {
    return {
      ok: false,
      error: 'Corrigez les champs indiqués.',
      fieldErrors: validation.fieldErrors,
    };
  }

  const { error } = await supabase.from('subject_property_condominiums').upsert(
    {
      ...validation.value,
      subject_property_id: property.id,
      agency_id: profile.agency_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'subject_property_id' },
  );
  if (error) {
    return { ok: false, error: 'L’enregistrement de la copropriété a échoué.' };
  }

  revalidatePath(`/builder/${projectId}/property`);
  return { ok: true };
}
