'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// MISSION 52 — les deux transitions MANUELLES de `projects.status`, agence-cadrées.
// L'outil INFORME, il ne barre pas la route (§2) : « Déclarer prêt » fonctionne même si
// un critère manque. Et un dossier prêt reste modifiable : « Remettre en préparation »
// le renvoie en brouillon. On n'écrit que 'draft' et 'ready_for_meeting'.

// Déclaration manuelle : le conseiller décide qu'un dossier est prêt malgré un manque.
export async function declareProjectReady(formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }
  const projectId = String(formData.get('projectId') ?? '').trim();
  if (projectId) {
    const supabase = await createClient();
    await supabase
      .from('projects')
      .update({ status: 'ready_for_meeting', updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('agency_id', profile.agency_id)
      .eq('status', 'draft');
  }
  revalidatePath('/builder');
  revalidatePath('/live');
  redirect('/builder?prets=1');
}

// Remettre en préparation : un dossier prêt (corriger une coquille, ajouter un concurrent)
// redevient brouillon et sort du Live.
export async function revertProjectToPreparation(formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }
  const projectId = String(formData.get('projectId') ?? '').trim();
  if (projectId) {
    const supabase = await createClient();
    await supabase
      .from('projects')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('agency_id', profile.agency_id)
      .eq('status', 'ready_for_meeting');
  }
  revalidatePath('/builder');
  revalidatePath('/live');
  redirect('/builder?prets=1');
}
