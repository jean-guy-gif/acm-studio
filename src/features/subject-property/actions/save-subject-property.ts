'use server';

import { revalidatePath } from 'next/cache';

import {
  validateSubjectProperty,
  type RawSubjectPropertyInput,
} from '@/features/subject-property/services/validate-subject-property';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type SaveSubjectPropertyResult =
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

function stringArray(formData: FormData, name: string): string[] {
  return formData.getAll(name).map((value) => String(value));
}

// projectId is bound server-side from the URL; never taken from the client form.
// Extends the single existing save action: parses every field, validates and
// normalises with the shared services, then upserts through the RLS-scoped user
// client (no service role needed). Returns a result so the form can keep the
// entered values and show field errors.
export async function saveSubjectProperty(
  projectId: string,
  formData: FormData,
): Promise<SaveSubjectPropertyResult> {
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

  const raw: RawSubjectPropertyInput = {
    property_type: textOrNull(formData.get('property_type')),
    surface_area: numberOrNull(formData.get('surface_area')),
    land_area: numberOrNull(formData.get('land_area')),
    rooms_count: integerOrNull(formData.get('rooms_count')),
    bedrooms_count: integerOrNull(formData.get('bedrooms_count')),
    bathrooms_count: integerOrNull(formData.get('bathrooms_count')),
    energy_rating: textOrNull(formData.get('energy_rating')),
    address: textOrNull(formData.get('address')),
    postal_code: textOrNull(formData.get('postal_code')),
    city: textOrNull(formData.get('city')),
    description: textOrNull(formData.get('description')),
    district: textOrNull(formData.get('district')),
    floor: integerOrNull(formData.get('floor')),
    building_floors: integerOrNull(formData.get('building_floors')),
    ges_rating: textOrNull(formData.get('ges_rating')),
    heating_type: textOrNull(formData.get('heating_type')),
    exposure: textOrNull(formData.get('exposure')),
    construction_year: integerOrNull(formData.get('construction_year')),
    general_condition: textOrNull(formData.get('general_condition')),
    outdoor_spaces: stringArray(formData, 'outdoor_spaces'),
    parking_types: stringArray(formData, 'parking_types'),
    monthly_charges: numberOrNull(formData.get('monthly_charges')),
    property_tax: numberOrNull(formData.get('property_tax')),
    strengths: stringArray(formData, 'strengths'),
    watch_points: stringArray(formData, 'watch_points'),
  };

  const validation = validateSubjectProperty(raw);
  if (!validation.ok) {
    return {
      ok: false,
      error: 'Corrigez les champs indiqués.',
      fieldErrors: validation.fieldErrors,
    };
  }

  // One project has exactly one subject property. Upsert on the unique
  // project_id constraint so two concurrent saves cannot create two rows.
  const { error } = await supabase.from('subject_properties').upsert(
    {
      ...validation.value,
      project_id: projectId,
      agency_id: profile.agency_id,
    },
    { onConflict: 'project_id' },
  );

  if (error) {
    return { ok: false, error: 'L’enregistrement du bien a échoué.' };
  }

  revalidatePath(`/builder/${projectId}`);
  revalidatePath(`/builder/${projectId}/property`);
  return { ok: true };
}
