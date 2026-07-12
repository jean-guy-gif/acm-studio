'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { textareaToArray } from '@/features/subject-property/utils/textarea-array';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

function textOrNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}

// projectId is bound server-side from the URL; it is never taken from the client form.
export async function saveSubjectProperty(projectId: string, formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }

  const supabase = await createClient();

  // The project must belong to the current agency (multi-tenant guard).
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();

  if (!project) {
    redirect('/builder');
  }

  const errorRedirect = `/builder/${projectId}/property?error=${encodeURIComponent(
    'Les valeurs numériques doivent être positives.',
  )}`;

  // Numeric fields: empty -> null, otherwise must be a finite number >= 0.
  const numericFields = [
    'surface_area',
    'land_area',
    'rooms_count',
    'bedrooms_count',
    'bathrooms_count',
  ];
  for (const field of numericFields) {
    const raw = String(formData.get(field) ?? '').trim();
    if (raw !== '' && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) {
      redirect(errorRedirect);
    }
  }

  const toNumber = (field: string): number | null => {
    const raw = String(formData.get(field) ?? '').trim();
    return raw === '' ? null : Number(raw);
  };
  const toInteger = (field: string): number | null => {
    const raw = String(formData.get(field) ?? '').trim();
    return raw === '' ? null : Number.parseInt(raw, 10);
  };

  const payload = {
    property_type: textOrNull(formData.get('property_type')),
    surface_area: toNumber('surface_area'),
    land_area: toNumber('land_area'),
    rooms_count: toInteger('rooms_count'),
    bedrooms_count: toInteger('bedrooms_count'),
    bathrooms_count: toInteger('bathrooms_count'),
    energy_rating: textOrNull(formData.get('energy_rating')),
    address: textOrNull(formData.get('address')),
    postal_code: textOrNull(formData.get('postal_code')),
    city: textOrNull(formData.get('city')),
    description: textOrNull(formData.get('description')),
    strengths: textareaToArray(String(formData.get('strengths') ?? '')),
    weaknesses: textareaToArray(String(formData.get('weaknesses') ?? '')),
  };

  // One project has exactly one subject property. Upsert on the unique
  // project_id constraint so two concurrent saves cannot create two rows.
  const { error } = await supabase.from('subject_properties').upsert(
    {
      ...payload,
      project_id: projectId,
      agency_id: profile.agency_id,
    },
    { onConflict: 'project_id' },
  );

  if (error) {
    redirect(
      `/builder/${projectId}/property?error=${encodeURIComponent(
        "L'enregistrement du bien a échoué.",
      )}`,
    );
  }

  revalidatePath(`/builder/${projectId}`);
  revalidatePath(`/builder/${projectId}/property`);
  redirect(`/builder/${projectId}/property`);
}
