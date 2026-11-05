import { cache } from 'react';

import { getUser } from '@/lib/auth/get-user';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Returns the authenticated user's profile row, or null when none exists.
// Reads only public.profiles — never writes, never loads any other table.
// Mission 128 B — mémorisé pour UNE requête (`cache` de React) : la mise en page et la page ne
// le lisent qu'une fois ; rien n'est gardé d'une requête à l'autre ni d'un utilisateur à l'autre.
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

  return data ?? null;
});
