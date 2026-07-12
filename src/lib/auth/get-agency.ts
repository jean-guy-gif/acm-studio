import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

type Agency = Database['public']['Tables']['agencies']['Row'];

// Returns the agency for the given id, or null when not found.
// Reads only public.agencies; never queries any business table.
export async function getAgency(agencyId: string): Promise<Agency | null> {
  const supabase = await createClient();

  const { data } = await supabase.from('agencies').select('*').eq('id', agencyId).maybeSingle();

  return data ?? null;
}
