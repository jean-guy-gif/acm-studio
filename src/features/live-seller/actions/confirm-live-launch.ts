'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { isLiveClosed } from '@/features/live-seller/services/live-closed';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// MISSION 112 — « Lancer devant le vendeur » : le serveur garde la trace de la confirmation (heure,
// conseiller), puis ouvre le Live. C'est elle que la page du Live vérifie avant de s'ouvrir sur un
// vrai dossier jamais lancé : une adresse tapée ou reprise de l'historique ne la contourne plus.
// Le dossier est cadré sur l'agence de l'appelant ; un dossier conclu ou archivé n'a plus de Live.
export async function confirmLiveLaunch(projectId: string): Promise<void> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(projectId).success) {
    redirect('/live');
  }
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, status')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project || isLiveClosed(project.status)) {
    redirect('/live');
  }
  const { error } = await supabase
    .from('projects')
    .update({ live_confirmed_at: new Date().toISOString(), live_confirmed_by: profile.id })
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id);
  if (error) {
    redirect(`/builder/${projectId}/lancer-le-live`);
  }
  redirect(`/live/${projectId}`);
}
