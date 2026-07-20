'use server';

import { revalidatePath } from 'next/cache';

import { normalizeSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/services/normalize-subject-property-diagnostics';
import { validateSubjectPropertyDiagnostics } from '@/features/subject-property-diagnostics/services/validate-subject-property-diagnostics';
import type { DiagnosticsInput } from '@/features/subject-property-diagnostics/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type SaveDiagnosticsResult =
  { ok: true } | { ok: false; error?: string; fieldErrors?: Record<string, string> };

function textOrNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}
function integerOrNull(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim();
  return raw === '' ? null : Number.parseInt(raw, 10);
}

// The client sends only the diagnostic fields — never id / agency_id / created_at
// / updated_at. Authorisation runs on the RLS-scoped user client; the UPSERT is
// atomic on subject_property_id.
export async function saveSubjectPropertyDiagnostics(
  projectId: string,
  formData: FormData,
): Promise<SaveDiagnosticsResult> {
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

  const raw: DiagnosticsInput = {
    dpe_date: textOrNull(formData.get('dpe_date')),
    energy_consumption: integerOrNull(formData.get('energy_consumption')),
    ges_emissions: integerOrNull(formData.get('ges_emissions')),
    asbestos_status: textOrNull(formData.get('asbestos_status')),
    lead_status: textOrNull(formData.get('lead_status')),
    electricity_status: textOrNull(formData.get('electricity_status')),
    gas_status: textOrNull(formData.get('gas_status')),
    termites_status: textOrNull(formData.get('termites_status')),
    erp_status: textOrNull(formData.get('erp_status')),
    diagnostics_completed_at: textOrNull(formData.get('diagnostics_completed_at')),
    diagnostics_valid_until: textOrNull(formData.get('diagnostics_valid_until')),
    notes: textOrNull(formData.get('notes')),
  };

  const normalized = normalizeSubjectPropertyDiagnostics(raw);
  const validation = validateSubjectPropertyDiagnostics(normalized);
  if (!validation.ok) {
    return {
      ok: false,
      error: 'Corrigez les champs indiqués.',
      fieldErrors: validation.fieldErrors,
    };
  }

  const { error } = await supabase.from('subject_property_diagnostics').upsert(
    {
      ...validation.value,
      subject_property_id: property.id,
      agency_id: profile.agency_id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'subject_property_id' },
  );
  if (error) {
    return { ok: false, error: 'L’enregistrement des diagnostics a échoué.' };
  }

  revalidatePath(`/builder/${projectId}/property`);
  return { ok: true };
}
