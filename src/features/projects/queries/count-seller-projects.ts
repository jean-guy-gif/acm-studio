import 'server-only';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// La refonte, lot E (maquette REFONTE-7) — « Tous mes vendeurs · 18 » compte ce que le lien ouvre :
// les dossiers de Préparation, du Live et du Suivi, ceux de toute l'agence (M59), hors archivés ;
// un dossier d'exemple s'y voit mais ne compte pas (M97). null : la lecture a échoué, le nombre ne
// se dit pas (M98).
export async function countSellerProjects(): Promise<number | null> {
  const profile = await getProfile();
  if (!profile) return null;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', profile.agency_id)
    .neq('status', 'archived')
    .eq('is_example', false);
  return error ? null : (count ?? 0);
}
