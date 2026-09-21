'use server';

import { revalidatePath } from 'next/cache';

import {
  collectLiveValues,
  type LiveActionState,
} from '@/features/live-seller/actions/live-action-state';
import { writeLiveComparableResponse } from '@/features/live-seller/services/write-live-comparable-response';

// CONTRAT HISTORIQUE (useActionState) des 7 écrans non encore migrés (mission 51 §3.1) :
// écrit la réponse PUIS revalide toute la page. C'est cette revalidation qui coûte les
// 3 s ; elle disparaît écran par écran à mesure qu'ils passent au contrat « Valider et
// continuer » (enregistrement en arrière-plan, revalidation à des points nommés).
export async function saveLiveComparableResponse(
  projectId: string,
  comparableId: string,
  _prevState: LiveActionState,
  formData: FormData,
): Promise<LiveActionState> {
  const values = collectLiveValues(formData);
  const result = await writeLiveComparableResponse(projectId, comparableId, formData);
  if (!result.ok) {
    return { ok: false, error: result.error, fieldErrors: result.fieldErrors ?? {}, values };
  }
  revalidatePath(`/live/${projectId}`);
  return { ok: true, error: null, fieldErrors: {}, values: null };
}

// CONTRAT PILOTE (mission 51 §3.2) — enregistrement EN ARRIÈRE-PLAN : écrit la réponse
// SANS revalidatePath, pour que l'écran avance immédiatement. Appelé impérativement par
// le shell, qui suit l'issue (pending/ok/échec) et bloque la fin de séance tant qu'une
// réponse affichée n'est pas confirmée en base.
export type PersistLiveResponseResult = { ok: boolean; error?: string };

export async function persistLiveComparableResponse(
  projectId: string,
  comparableId: string,
  formData: FormData,
): Promise<PersistLiveResponseResult> {
  const result = await writeLiveComparableResponse(projectId, comparableId, formData);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
