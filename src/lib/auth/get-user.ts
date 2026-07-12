import type { User } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';

// Returns the currently authenticated user, or null.
// Uses only supabase.auth.getUser(); never queries business tables.
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
