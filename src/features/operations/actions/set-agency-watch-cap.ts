'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { parseWatchCapEuros } from '@/features/buyer-watch/services/watch-schedule';
import { requireOperator } from '@/features/operations/services/require-operator';
import { DEFAULT_MONTHLY_CAP_CENTS } from '@/features/search-budget/services/budget';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

import type { SetAgencySearchCapResult } from '@/features/operations/actions/set-agency-search-cap';

// Lancement, mission 5 — le plafond mensuel de la veille d'une agence (M136), en euros : réglé par
// les SEULS opérateurs, comme celui de la recherche (M100) et de l'IA (M151). Le manager ne voit
// plus de montant : il coupe ou reprend la veille (`setBuyerWatchActive`). Jamais plus de la moitié
// du plafond de recherche de l'agence (la base le garantit aussi).
export async function setAgencyWatchCap(
  agencyId: string,
  formData: FormData,
): Promise<SetAgencySearchCapResult> {
  const guard = await requireOperator();
  if (!guard.ok) {
    return { ok: false, error: 'Réservé aux comptes autorisés.' };
  }
  if (!z.uuid().safeParse(agencyId).success) {
    return { ok: false, error: 'Agence introuvable.' };
  }
  const admin = createServiceRoleClient();
  const agency = await admin.from('agencies').select('id').eq('id', agencyId).maybeSingle();
  if (agency.error || !agency.data) {
    return { ok: false, error: 'Agence introuvable.' };
  }
  const budget = await admin
    .from('agency_search_budgets')
    .select('monthly_cap_cents')
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (budget.error) {
    return { ok: false, error: 'Le plafond n’a pas été enregistré. Réessayez.' };
  }
  const parsed = parseWatchCapEuros(
    formData.get('cap'),
    budget.data?.monthly_cap_cents ?? DEFAULT_MONTHLY_CAP_CENTS,
  );
  if (!parsed.ok) return parsed;
  const { error } = await admin
    .from('agencies')
    .update({ buyer_watch_cap_cents: parsed.cents })
    .eq('id', agencyId);
  if (error) {
    await reportServerError('setAgencyWatchCap', error);
    return { ok: false, error: 'Le plafond n’a pas été enregistré. Réessayez.' };
  }
  revalidatePath('/erreurs');
  return { ok: true };
}
