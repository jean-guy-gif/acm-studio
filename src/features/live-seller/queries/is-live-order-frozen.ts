import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { canChangeLiveRhythm } from '@/features/live-seller/services/live-timing';
import type { Database } from '@/lib/supabase/database.types';

// Mission 110 — l'ordre des concurrents est figé une fois le Live commencé : heure de début relevée
// ou réponse du vendeur enregistrée (la règle du rythme, M95, et celle du verrou en base). Une
// lecture en échec ne vaut pas « pas commencé » : l'ordre reste figé.
export async function isLiveOrderFrozen(
  supabase: SupabaseClient<Database>,
  project: { id: string; agency_id: string; live_started_at: string | null },
): Promise<boolean> {
  if (project.live_started_at != null) return true;
  const { count, error } = await supabase
    .from('live_seller_responses')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project.id)
    .eq('agency_id', project.agency_id);
  if (error) return true;
  return !canChangeLiveRhythm({ liveStartedAt: null, hasSellerAnswers: (count ?? 0) > 0 });
}
