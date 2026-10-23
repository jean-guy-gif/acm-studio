'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireOperator } from '@/features/operations/services/require-operator';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SetAgencyDemoResult = { ok: true; isDemo: boolean } | { ok: false; error: string };

// Mission 114 — le repère « Agence de démonstration », posé ou retiré par les SEULS comptes
// autorisés (ACM_OPERATOR_EMAILS, M100) : le garde est ici, dans l'action. Ni un conseiller ni un
// manager ne le règle — la colonne est retirée au navigateur (migration `agence_demo`) — et
// l'écriture passe par la clé service après le garde. C'est ce repère, lu en base côté serveur,
// qui bascule l'agence vers les fournisseurs simulés.
export async function setAgencyDemo(
  agencyId: string,
  formData: FormData,
): Promise<SetAgencyDemoResult> {
  const guard = await requireOperator();
  if (!guard.ok) {
    return { ok: false, error: 'Réservé aux comptes autorisés.' };
  }
  if (!z.uuid().safeParse(agencyId).success) {
    return { ok: false, error: 'Agence introuvable.' };
  }
  const raw = formData.get('demo');
  if (raw !== 'true' && raw !== 'false') {
    return { ok: false, error: 'Choix invalide.' };
  }
  const isDemo = raw === 'true';

  const admin = createServiceRoleClient();
  const { data: agency, error: agencyError } = await admin
    .from('agencies')
    .select('id')
    .eq('id', agencyId)
    .maybeSingle();
  if (agencyError || !agency) {
    return { ok: false, error: 'Agence introuvable.' };
  }
  const { error } = await admin
    .from('agencies')
    .update({ is_demo: isDemo, updated_at: new Date().toISOString() })
    .eq('id', agencyId);
  if (error) {
    await reportServerError('setAgencyDemo', error);
    return { ok: false, error: 'Le repère n’a pas été enregistré. Réessayez.' };
  }

  revalidatePath('/erreurs');
  return { ok: true, isDemo };
}
