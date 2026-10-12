import 'server-only';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 97 — combien de dossiers ce conseiller a-t-il créés (exemple et archivés compris) ?
// Zéro : il n'a jamais rien préparé, « Bienvenue » l'accueille. Une lecture en échec ne renvoie
// pas vers « Bienvenue » : on ne sait pas, donc on ne détourne pas un conseiller de ses dossiers.
export async function countOwnDossiers(): Promise<number | null> {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', profile.agency_id)
    .eq('advisor_id', profile.id);
  return error ? null : (count ?? 0);
}
