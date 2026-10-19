import 'server-only';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 109 — l'état d'un dossier de l'agence, archivé compris, pour décider de l'écran du Live :
// conclu ou archivé, c'est l'écran neutre de pause. Rien d'autre du dossier n'en sort.
export async function getLiveProjectStatus(projectId: string): Promise<string | null> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  return data?.status ?? null;
}
