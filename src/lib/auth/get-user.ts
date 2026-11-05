import { cache } from 'react';

import type { User } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';

// Returns the currently authenticated user, or null.
// Uses only supabase.auth.getUser(); never queries business tables.
// Mission 128 B — mémorisé pour UNE requête (`cache` de React) : la mise en page et la page ne
// le lisent qu'une fois ; rien n'est gardé d'une requête à l'autre ni d'un utilisateur à l'autre.
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});
