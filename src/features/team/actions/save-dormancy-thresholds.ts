'use server';

import { revalidatePath } from 'next/cache';

import { parseDormancyThresholds } from '@/features/team/services/parse-dormancy-thresholds';
import { requireManagerProfile } from '@/features/team/services/require-manager';
import { createClient } from '@/lib/supabase/server';

export type SaveThresholdsResult = { ok: true } | { ok: false; error: string };

// Mission 59 (seuils) — réglage RÉSERVÉ AU MANAGER, écran ET adresse : le garde de rôle est ici,
// dans l'action, pas seulement dans la page. Un conseiller qui appellerait l'action directement
// est refusé. L'écriture est cadrée sur SA propre agence (RLS `id = get_current_agency_id()` +
// filtre explicite), donc un manager ne touche jamais les seuils d'une autre agence.
export async function saveDormancyThresholds(formData: FormData): Promise<SaveThresholdsResult> {
  // Mission 88 — manager NON RETIRÉ : le même garde que les autres gestes d'équipe.
  const guard = await requireManagerProfile();
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const profile = guard.profile;

  const parsed = parseDormancyThresholds(formData);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const supabase = await createClient();
  // La base ne laisse modifier l'agence qu'à un manager non retiré (politique
  // `agencies_manager_update`) : une écriture qui ne touche aucune ligne est un refus, on le dit.
  const { data, error } = await supabase
    .from('agencies')
    .update({
      preparation_dormant_days: parsed.value.preparationDays,
      follow_up_dormant_days: parsed.value.followUpDays,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.agency_id)
    .select('id');
  if (error || !data || data.length === 0) {
    return { ok: false, error: 'L’enregistrement des seuils a échoué. Réessayez.' };
  }

  revalidatePath('/admin/equipe');
  return { ok: true };
}
