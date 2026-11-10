import { cache } from 'react';

import { getUser } from '@/lib/auth/get-user';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Returns the authenticated user's profile row, or null when none exists.
// Reads only public.profiles — never writes, never loads any other table.
// Mission 128 B — mémorisé pour UNE requête (`cache` de React) : la mise en page et la page ne
// le lisent qu'une fois ; rien n'est gardé d'une requête à l'autre ni d'un utilisateur à l'autre.
// Mission 147 (partie B) — une lecture en échec n'est jamais « pas de profil » (M98) : elle se
// relit une fois, puis mène à la page d'erreur ; jamais à « Première connexion » (`/onboarding`),
// qui proposerait d'ouvrir une agence à un conseiller qui en a déjà une.
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const read = () => supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  let result = await read();
  if (result.error) {
    result = await read();
  }
  if (result.error) {
    throw new Error('Le profil n’a pas pu être lu.');
  }

  return result.data ?? null;
});
