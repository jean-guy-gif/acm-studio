import 'server-only';

import { createClient } from '@/lib/supabase/server';

// Mission 114 — LE repère de la bascule vers les fournisseurs simulés : `agencies.is_demo`, lu en
// base côté serveur, jamais un paramètre du navigateur. Une lecture en échec vaut « agence
// réelle » : on ne simule jamais par accident, et une agence réelle n'atteint jamais un
// fournisseur simulé.
export async function isDemoAgency(agencyId: string | null | undefined): Promise<boolean> {
  if (!agencyId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from('agencies')
    .select('is_demo')
    .eq('id', agencyId)
    .maybeSingle();
  return data?.is_demo === true;
}
