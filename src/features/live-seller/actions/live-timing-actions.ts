'use server';

import { revalidatePath } from 'next/cache';

import { liveRhythm } from '@/features/live-seller/services/build-live-pages';
import {
  canChangeLiveRhythm,
  RHYTHM_LOCKED_MESSAGE,
} from '@/features/live-seller/services/live-timing';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

type Result = { ok: true } | { ok: false; error: string };

// Mission 95 — le Live relève son heure de début, UNE fois : seul un dossier sans début est
// écrit (et la base garde de toute façon le premier). Cadré sur l'agence de l'appelant.
export async function markLiveStarted(projectId: string): Promise<Result> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('projects')
    .update({ live_started_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .is('live_started_at', null);
  return error ? { ok: false, error: 'L’heure de début n’a pas pu être notée.' } : { ok: true };
}

// « Terminer le rendez-vous » : l'heure de fin suit le dernier « Terminer ».
export async function markLiveEnded(projectId: string): Promise<Result> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('projects')
    .update({ live_ended_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .not('live_started_at', 'is', null);
  if (error) {
    return { ok: false, error: 'L’heure de fin n’a pas pu être notée.' };
  }
  revalidatePath('/suivi');
  revalidatePath('/aujourdhui');
  return { ok: true };
}

// Le rythme du Live, choisi sur « Avant le rendez-vous ». Revalidé ici : la valeur est bornée
// à la liste, et le choix est refusé une fois le Live commencé (la base le refuse aussi).
export async function setLiveRhythm(projectId: string, formData: FormData): Promise<Result> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const requested = String(formData.get('live_rhythm') ?? '');
  if (requested !== 'accelerated' && requested !== 'complete') {
    return { ok: false, error: 'Rythme inconnu.' };
  }
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, live_started_at')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .neq('status', 'archived')
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Projet introuvable pour votre agence.' };
  }
  const [{ count: responses }, { count: summaries }] = await Promise.all([
    supabase
      .from('live_seller_responses')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id),
    supabase
      .from('live_seller_summary')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id),
  ]);
  if (
    !canChangeLiveRhythm({
      liveStartedAt: project.live_started_at,
      hasSellerAnswers: (responses ?? 0) + (summaries ?? 0) > 0,
    })
  ) {
    return { ok: false, error: RHYTHM_LOCKED_MESSAGE };
  }
  const { error } = await supabase
    .from('projects')
    .update({ live_rhythm: liveRhythm(requested) })
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id);
  if (error) {
    return { ok: false, error: 'Le rythme n’a pas pu être enregistré.' };
  }
  revalidatePath(`/builder/${projectId}/avant-rendez-vous`);
  revalidatePath('/live');
  return { ok: true };
}
