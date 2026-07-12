import { getUser } from '@/lib/auth/get-user';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Returns the authenticated user's profile row, or null when none exists.
// Reads only public.profiles — never writes, never loads any other table.
export async function getProfile(): Promise<Profile | null> {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

  return data ?? null;
}
