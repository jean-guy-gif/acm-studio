import 'server-only';

import { suggestedCities } from '@/features/buyers/services/buyer-criteria';
import { createClient } from '@/lib/supabase/server';

// Mission 132 — les villes de l'agence, pour la saisie rapide : celles de ses biens vendeurs (hors
// dossier d'exemple et dossiers archivés) et de ses fiches acquéreur. Lues par le navigateur du
// conseiller (la RLS cloisonne). Une lecture en échec ne propose rien : le champ libre suffit.
export async function getAgencyCities(): Promise<string[]> {
  const supabase = await createClient();
  const [{ data: projects }, { data: buyers }] = await Promise.all([
    supabase.from('projects').select('id').eq('is_example', false).neq('status', 'archived'),
    supabase.from('buyers').select('cities').is('archived_at', null),
  ]);
  const projectIds = (projects ?? []).map((project) => project.id);
  const { data: properties } =
    projectIds.length > 0
      ? await supabase.from('subject_properties').select('city').in('project_id', projectIds)
      : { data: [] };
  return suggestedCities([
    ...(properties ?? []).map((row) => row.city),
    ...(buyers ?? []).flatMap((row) => row.cities ?? []),
  ]);
}
