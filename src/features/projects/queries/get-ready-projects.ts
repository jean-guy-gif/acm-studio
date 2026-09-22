import type { Project } from '@/features/projects/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// MISSION 52 — le Live ne contient QUE des dossiers prêts. Aucun agrégat : un simple
// filtre sur `status = 'ready_for_meeting'`, la seule vérité de « prêt ». Le détail (bien,
// fourchette, ce qui manque) n'a de sens qu'en Préparation, pas ici.
export async function getReadyProjects(): Promise<Project[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from('projects')
    .select(
      'id, seller_name, seller_email, seller_phone, status, created_at, updated_at, advisor_id, agency_id',
    )
    .eq('agency_id', profile.agency_id)
    .eq('status', 'ready_for_meeting')
    .order('created_at', { ascending: false });

  return data ?? [];
}
