'use server';

import { revalidatePath } from 'next/cache';

import { LONE_BOUND_ERROR } from '@/features/subject-property/services/advisor-range';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 158 — « Votre fourchette », modifiable aussi sur « Avant le rendez-vous » (décision de
// Jean-Guy, 17/11) : la même valeur que celle de Bien vendeur (M38), enregistrée au même endroit,
// jamais une copie. Seules ses deux bornes s'écrivent, saisies par le conseiller (ou reprises de la
// valeur indicative d'Academia par son geste) : jamais la valeur d'Academia elle-même, qui n'a
// aucune colonne. Deux bornes ou aucune (M93), positives, le bas sous le haut ; relu ici.
export type SaveAdvisorRangeResult =
  { ok: true; min: number | null; max: number | null } | { ok: false; error: string };

const MAX_PRICE = 1_000_000_000;

function bound(value: unknown): number | null | 'invalid' {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[\s  ]/g, ''));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_PRICE) return 'invalid';
  return Math.round(parsed);
}

export async function saveAdvisorRange(
  projectId: unknown,
  rawMin: unknown,
  rawMax: unknown,
): Promise<SaveAdvisorRangeResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  if (typeof projectId !== 'string') return { ok: false, error: 'Dossier introuvable.' };
  const min = bound(rawMin);
  const max = bound(rawMax);
  if (min === 'invalid' || max === 'invalid') {
    return { ok: false, error: 'Indiquez des montants en euros.' };
  }
  if ((min == null) !== (max == null)) return { ok: false, error: LONE_BOUND_ERROR };
  if (min != null && max != null && min > max) {
    return { ok: false, error: 'Le haut de la fourchette doit être supérieur au bas.' };
  }
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project || project.status === 'archived') {
    return { ok: false, error: 'Dossier introuvable.' };
  }
  const { data: written, error } = await supabase
    .from('subject_properties')
    .update({ advisor_price_min: min, advisor_price_max: max })
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .select('id');
  if (error || !written || written.length !== 1) {
    if (error) await reportServerError('subject-property:save-advisor-range', error);
    return { ok: false, error: 'La fourchette n’a pas pu être enregistrée. Réessayez.' };
  }
  revalidatePath(`/builder/${projectId}/avant-rendez-vous`);
  revalidatePath(`/builder/${projectId}/property`);
  return { ok: true, min, max };
}
