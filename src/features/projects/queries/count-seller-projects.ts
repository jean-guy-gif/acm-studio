import 'server-only';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// La refonte, lot E (maquette REFONTE-7) — le nombre de « Tous mes vendeurs · 18 ». Remarques de
// Jean-Guy (26/11) : il suit la vue choisie — « Mes dossiers » compte les dossiers dont le
// conseiller est le titulaire (`projects.advisor_id`, M145 B) ; « Toute l'agence », ceux de
// l'agence (« Tous les vendeurs de l'agence »). Hors archivés et hors dossiers d'exemple (M97).
// null : une lecture a échoué, le nombre ne se dit pas (M98).
export async function countSellerProjects(): Promise<{ mine: number; agency: number } | null> {
  const profile = await getProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const base = () =>
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', profile.agency_id)
      .neq('status', 'archived')
      .eq('is_example', false);
  const [mine, agency] = await Promise.all([base().eq('advisor_id', profile.id), base()]);
  if (mine.error || agency.error) return null;
  return { mine: mine.count ?? 0, agency: agency.count ?? 0 };
}
