'use server';

import { revalidatePath } from 'next/cache';

import { requireManagerProfile } from '@/features/team/services/require-manager';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type ActionResult = { ok: true } | { ok: false; error: string };

// Mission 60 §1 — annuler une invitation en attente : on la retire, et on libère le compte auth
// pendant qu'elle avait créé (l'adresse redevient invitable). N'annule que dans SON agence.
export async function cancelInvitation(invitationId: string): Promise<ActionResult> {
  const guard = await requireManagerProfile();
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const service = createServiceRoleClient();

  const { data: inv } = await service
    .from('agency_invitations')
    .select('id, agency_id, auth_user_id, accepted_at')
    .eq('id', invitationId)
    .maybeSingle();
  if (!inv || inv.agency_id !== guard.profile.agency_id || inv.accepted_at) {
    return { ok: false, error: 'Invitation introuvable.' };
  }

  if (inv.auth_user_id) {
    // Compte auth pendant (jamais accepté, donc sans profil) → on le supprime pour libérer
    // l'adresse. Best effort : l'annulation de l'invitation reste l'objectif.
    await service.auth.admin.deleteUser(inv.auth_user_id).catch(() => undefined);
  }
  const { error } = await service.from('agency_invitations').delete().eq('id', inv.id);
  if (error) {
    return { ok: false, error: 'L’annulation a échoué. Réessayez.' };
  }
  revalidatePath('/admin/equipe');
  return { ok: true };
}
