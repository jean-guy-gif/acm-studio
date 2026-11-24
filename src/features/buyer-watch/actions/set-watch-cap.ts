'use server';

import { revalidatePath } from 'next/cache';

import { resumedWatchCapCents } from '@/features/buyer-watch/services/watch-schedule';
import { DEFAULT_MONTHLY_CAP_CENTS } from '@/features/search-budget/services/budget';
import { isManagerRole } from '@/features/team/services/role';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SetWatchActiveResult = { ok: true; active: boolean } | { ok: false; error: string };

const FAILED = 'La veille n’a pas pu être réglée. Réessayez.';

// Mission 136 — la veille des acquéreurs, réglée par le manager. Lancement, mission 5 (Jean-Guy,
// 23/11) — plus aucun montant devant lui : il la COUPE ou la REPREND. Coupée, son plafond passe à
// 0 (la base n'appelle alors plus personne, M155) ; reprise, il revient à sa valeur par défaut,
// jamais plus de la moitié du plafond de recherche de l'agence. Le montant lui-même se règle par
// l'opérateur (`setAgencyWatchCap`, `/erreurs`). La colonne n'est pas modifiable depuis le
// navigateur (M88, M114) : le serveur l'écrit, après le garde.
export async function setBuyerWatchActive(active: unknown): Promise<SetWatchActiveResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !isManagerRole(profile.role)) {
    return { ok: false, error: 'Seul un manager de l’agence peut régler la veille.' };
  }
  if (typeof active !== 'boolean') return { ok: false, error: FAILED };
  const admin = createServiceRoleClient();
  let cents = 0;
  if (active) {
    const { data: budget, error: budgetError } = await admin
      .from('agency_search_budgets')
      .select('monthly_cap_cents')
      .eq('agency_id', profile.agency_id)
      .maybeSingle();
    if (budgetError) return { ok: false, error: FAILED };
    cents = resumedWatchCapCents(budget?.monthly_cap_cents ?? DEFAULT_MONTHLY_CAP_CENTS);
  }
  const { error } = await admin
    .from('agencies')
    .update({ buyer_watch_cap_cents: cents })
    .eq('id', profile.agency_id);
  if (error) return { ok: false, error: FAILED };
  revalidatePath('/admin');
  return { ok: true, active: cents > 0 };
}
