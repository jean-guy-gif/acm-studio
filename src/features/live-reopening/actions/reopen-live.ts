'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  REOPEN_REASON_MAX,
  REOPEN_REASON_MIN,
  type ReopenLiveResult,
} from '@/features/live-reopening/types';
import { requireOperator } from '@/features/operations/services/require-operator';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getUser } from '@/lib/auth/get-user';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const reasonSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(REOPEN_REASON_MIN).max(REOPEN_REASON_MAX));

// Mission 104 — rouvrir un Live figé PAR ERREUR (un vrai dossier essayé en Live). La méthode reste
// infalsifiable (M92) : le garde est ici — les SEULS comptes autorisés (ACM_OPERATOR_EMAILS), ni
// un conseiller ni un manager — et la base ne laisse appeler `reopen_live` qu'au serveur. Un motif
// est exigé ; la base garde la trace (qui, quand, motif) et les réponses effacées.
export async function reopenLive(projectId: string, rawReason: unknown): Promise<ReopenLiveResult> {
  const guard = await requireOperator();
  if (!guard.ok) {
    return { ok: false, error: 'Réservé aux comptes autorisés.' };
  }
  if (!z.uuid().safeParse(projectId).success) {
    return { ok: false, error: 'Dossier introuvable.' };
  }
  const reason = reasonSchema.safeParse(typeof rawReason === 'string' ? rawReason : '');
  if (!reason.success) {
    return {
      ok: false,
      error: `Indiquez le motif de la réouverture (${REOPEN_REASON_MIN} à ${REOPEN_REASON_MAX} caractères).`,
    };
  }
  const user = await getUser();
  if (!user?.email) {
    return { ok: false, error: 'Réservé aux comptes autorisés.' };
  }

  const { data, error } = await createServiceRoleClient().rpc('reopen_live', {
    p_project_id: projectId,
    p_operator_id: guard.userId,
    p_operator_email: user.email,
    p_reason: reason.data,
  });
  if (error) {
    // P0001 : dossier conclu ou archivé, ou rien à rouvrir — une réponse, pas une panne.
    if (error.code === 'P0001' || error.code === 'P0002') {
      return {
        ok: false,
        error:
          'Ce Live ne se rouvre pas\u00a0: le dossier est conclu, archivé, ou son Live n’a pas commencé.',
      };
    }
    await reportServerError('reopenLive', error);
    return { ok: false, error: 'La réouverture a échoué. Réessayez.' };
  }

  const responses = Number((data as { responses?: unknown } | null)?.responses ?? 0);
  revalidatePath(`/builder/${projectId}`);
  revalidatePath(`/builder/${projectId}/avant-rendez-vous`);
  revalidatePath('/live');
  return { ok: true, responses: Number.isFinite(responses) ? responses : 0 };
}
