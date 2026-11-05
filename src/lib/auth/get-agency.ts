import { cache } from 'react';

import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

type Agency = Database['public']['Tables']['agencies']['Row'];

// Returns the agency for the given id, or null when not found.
// Reads only public.agencies; never queries any business table.
// Mission 128 B — mémorisé pour UNE requête (`cache` de React) : la mise en page et la page ne
// le lisent qu'une fois ; rien n'est gardé d'une requête à l'autre ni d'un utilisateur à l'autre.
export const getAgency = cache(async (agencyId: string): Promise<Agency | null> => {
  const supabase = await createClient();

  const { data } = await supabase.from('agencies').select('*').eq('id', agencyId).maybeSingle();

  return data ?? null;
});
