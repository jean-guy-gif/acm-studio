'use server';

import { revalidatePath } from 'next/cache';

import { deliverInvitation } from '@/features/team/services/deliver-invitation';
import { requireManagerProfile } from '@/features/team/services/require-manager';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type ActionResult = { ok: true } | { ok: false; error: string };

// Mission 60 §1 — renvoyer une invitation « non envoyée » (ou à re-tenter). Même chemin que
// l'envoi initial : on ne marque « envoyée » que si l'e-mail part vraiment.
export async function resendInvitation(invitationId: string): Promise<ActionResult> {
  const guard = await requireManagerProfile();
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const service = createServiceRoleClient();

  const { data: inv } = await service
    .from('agency_invitations')
    .select('id, email, agency_id, accepted_at')
    .eq('id', invitationId)
    .maybeSingle();
  if (!inv || inv.agency_id !== guard.profile.agency_id || inv.accepted_at) {
    return { ok: false, error: 'Invitation introuvable.' };
  }

  const delivery = await deliverInvitation(service, inv.email);
  if (!delivery.ok) {
    revalidatePath('/admin/equipe');
    return {
      ok: false,
      error: 'L’invitation n’a toujours pas pu être envoyée. Elle reste « non envoyée ».',
    };
  }

  await service
    .from('agency_invitations')
    .update({
      auth_user_id: delivery.authUserId,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', inv.id);
  revalidatePath('/admin/equipe');
  return { ok: true };
}
