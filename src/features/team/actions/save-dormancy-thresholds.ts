'use server';

import { revalidatePath } from 'next/cache';

import { parseDormancyThresholds } from '@/features/team/services/parse-dormancy-thresholds';
import { isManagerRole } from '@/features/team/services/role';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type SaveThresholdsResult = { ok: true } | { ok: false; error: string };

// Mission 59 (seuils) — réglage RÉSERVÉ AU MANAGER, écran ET adresse : le garde de rôle est ici,
// dans l'action, pas seulement dans la page. Un conseiller qui appellerait l'action directement
// est refusé. L'écriture est cadrée sur SA propre agence (RLS `id = get_current_agency_id()` +
// filtre explicite), donc un manager ne touche jamais les seuils d'une autre agence.
export async function saveDormancyThresholds(formData: FormData): Promise<SaveThresholdsResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  if (!isManagerRole(profile.role)) {
    return { ok: false, error: 'Réservé au manager de l’agence.' };
  }

  const parsed = parseDormancyThresholds(formData);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('agencies')
    .update({
      preparation_dormant_days: parsed.value.preparationDays,
      follow_up_dormant_days: parsed.value.followUpDays,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.agency_id);
  if (error) {
    return { ok: false, error: 'L’enregistrement des seuils a échoué. Réessayez.' };
  }

  revalidatePath('/admin/equipe');
  return { ok: true };
}
