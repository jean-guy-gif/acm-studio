import 'server-only';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// La refonte, lot E (maquette REFONTE-7) — « Tous mes vendeurs · 18 » : les dossiers dont le
// conseiller est le titulaire (`projects.advisor_id`, M145 B), hors archivés et hors dossiers
// d'exemple (M97). null : la lecture a échoué, le nombre ne se dit pas (M98).
export async function countMyDossiers(): Promise<number | null> {
  const profile = await getProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', profile.agency_id)
    .eq('advisor_id', profile.id)
    .neq('status', 'archived')
    .eq('is_example', false);
  return error ? null : (count ?? 0);
}
