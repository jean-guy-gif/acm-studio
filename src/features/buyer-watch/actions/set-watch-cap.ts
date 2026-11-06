'use server';

import { revalidatePath } from 'next/cache';

import { parseWatchCapEuros } from '@/features/buyer-watch/services/watch-schedule';
import { DEFAULT_MONTHLY_CAP_CENTS } from '@/features/search-budget/services/budget';
import { isManagerRole } from '@/features/team/services/role';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SetWatchCapResult = { ok: true; cents: number } | { ok: false; error: string };

const FAILED = 'Le plafond de la veille n’a pas pu être enregistré. Réessayez.';

// Mission 136 — « Veille des acquéreurs : jusqu'à … € par mois », réglé par le manager : une part du
// budget de recherche de l'agence, jamais plus de la moitié (la base le garantit aussi), jamais le
// budget lui-même (M100 : seul un opérateur le règle). La colonne n'est pas modifiable depuis le
// navigateur (M88, M114) : le serveur l'écrit, après le garde.
export async function setBuyerWatchCap(raw: unknown): Promise<SetWatchCapResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !isManagerRole(profile.role)) {
    return { ok: false, error: 'Seul un manager de l’agence peut régler la veille.' };
  }
  const admin = createServiceRoleClient();
  const { data: budget, error: budgetError } = await admin
    .from('agency_search_budgets')
    .select('monthly_cap_cents')
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (budgetError) return { ok: false, error: FAILED };
  const parsed = parseWatchCapEuros(raw, budget?.monthly_cap_cents ?? DEFAULT_MONTHLY_CAP_CENTS);
  if (!parsed.ok) return parsed;
  const { error } = await admin
    .from('agencies')
    .update({ buyer_watch_cap_cents: parsed.cents })
    .eq('id', profile.agency_id);
  if (error) return { ok: false, error: FAILED };
  revalidatePath('/admin');
  return { ok: true, cents: parsed.cents };
}
