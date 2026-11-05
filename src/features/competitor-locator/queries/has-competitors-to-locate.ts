import 'server-only';

import { needsLocatorQuery } from '@/features/competitor-locator/services/location-action';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 128 B — reste-t-il, parmi les concurrents retenus du dossier, une adresse à demander au
// Localisateur (M75) ? Sans elle, la veille ne part pas à l'ouverture : elle relançait une
// action serveur et six lectures pour rien quand toutes les adresses étaient déjà confirmées.
export async function hasSelectedCompetitorsToLocate(projectId: string): Promise<boolean> {
  const profile = await getProfile();
  if (!profile) {
    return false;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from('comparables')
    .select('listing_url, locator_state, locator_confirmed, locator_purged_at')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .eq('is_selected', true);
  // Une lecture en échec ne retient rien : la veille part, comme avant la mission.
  return data == null || data.some(needsLocatorQuery);
}
