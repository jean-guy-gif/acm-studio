import type { LiveComparableResponse, LiveSellerSummary } from '@/features/live-seller/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Reads are RLS-scoped to the caller's agency (plus an explicit agency_id filter,
// repo convention). Never invents values.
export async function getLiveComparableResponses(
  projectId: string,
): Promise<LiveComparableResponse[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from('live_seller_responses')
    .select('*')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id);
  return data ?? [];
}

export async function getLiveSellerSummary(projectId: string): Promise<LiveSellerSummary | null> {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from('live_seller_summary')
    .select('*')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  return data ?? null;
}
