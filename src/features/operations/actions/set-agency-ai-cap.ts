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

import type { SetAgencySearchCapResult } from '@/features/operations/actions/set-agency-search-cap';

// Mission 151 — le plafond mensuel d'IA d'une agence (lecture des notes, classement des annonces),
// 10 € par défaut, réglable par les SEULS opérateurs (M100), comme celui de la recherche : ni un
// conseiller ni un manager ne le règle (M55) ; l'écriture passe par la clé service après le garde.
export async function setAgencyAiCap(
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
  const { error } = await admin.from('agency_ai_budgets').upsert(
    {
      agency_id: agencyId,
      monthly_cap_cents: parsed.cents,
      updated_by: guard.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'agency_id' },
  );
  if (error) {
    await reportServerError('setAgencyAiCap', error);
    return { ok: false, error: 'Le plafond n’a pas été enregistré. Réessayez.' };
  }

  revalidatePath('/erreurs');
  return { ok: true };
}
