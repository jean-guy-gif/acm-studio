import 'server-only';

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';

// Server-only Supabase client using the SERVICE ROLE key. It BYPASSES RLS, so it
// must be used exclusively inside a Server Action AFTER the caller has been
// authenticated and authorised (agency + project ownership verified).
//
// The `server-only` import guarantees this module can never be bundled for the
// browser. The service role key is read from a non-public env var and is never
// referenced by any client module.
export function createServiceRoleClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase service role configuration.');
  }
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
