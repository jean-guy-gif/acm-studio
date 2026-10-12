'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireOperator } from '@/features/operations/services/require-operator';
import {
  MAX_MONTHLY_CAP_EUR,
  parseMonthlyCapEuros,
} from '@/features/search-budget/services/budget';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SetAgencySearchCapResult = { ok: true } | { ok: false; error: string };

// Mission 100 — le plafond mensuel de recherche d'une agence, réglable par les SEULS comptes
// autorisés (ACM_OPERATOR_EMAILS) : le garde est ici, dans l'action. Ni un conseiller ni un
// manager ne règle le plafond de son agence — la table n'est pas inscriptible depuis le
// navigateur, et l'écriture passe par la clé service après le garde.
export async function setAgencySearchCap(
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
  const parsed = parseMonthlyCapEuros(formData.get('cap'));
  if (!parsed.ok) {
    return {
      ok: false,
      error: `Indiquez un plafond en euros entiers, de 0 à ${MAX_MONTHLY_CAP_EUR}.`,
    };
  }

  const admin = createServiceRoleClient();
  const { data: agency, error: agencyError } = await admin
    .from('agencies')
    .select('id')
    .eq('id', agencyId)
    .maybeSingle();
  if (agencyError || !agency) {
    return { ok: false, error: 'Agence introuvable.' };
  }
  const { error } = await admin.from('agency_search_budgets').upsert(
    {
      agency_id: agencyId,
      monthly_cap_cents: parsed.cents,
      updated_by: guard.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'agency_id' },
  );
  if (error) {
    await reportServerError('setAgencySearchCap', error);
    return { ok: false, error: 'Le plafond n’a pas été enregistré. Réessayez.' };
  }

  revalidatePath('/erreurs');
  return { ok: true };
}
