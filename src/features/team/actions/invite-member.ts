'use server';

import { revalidatePath } from 'next/cache';

import { deliverInvitation } from '@/features/team/services/deliver-invitation';
import { parseInviteInput } from '@/features/team/services/parse-invite-input';
import { isManagerRole } from '@/features/team/services/role';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type InviteResult = { ok: true } | { ok: false; error: string };

// Mission 60 §1 — inviter. Réservé au manager (écran ET adresse : le garde est ici). L'agence et
// le rôle voyagent avec l'invitation. L'ÉCHEC DE LIVRAISON est une issue de première classe :
// l'invitation est d'abord enregistrée « non envoyée » (sent_at null), puis marquée envoyée
// seulement si l'e-mail est réellement parti — jamais l'inverse. Un envoi qui échoue laisse
// l'invitation « non envoyée », visible et renvoyable ; le manager le voit tout de suite.
export async function inviteMember(formData: FormData): Promise<InviteResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  if (!isManagerRole(profile.role)) {
    return { ok: false, error: 'Réservé au manager de l’agence.' };
  }

  const parsed = parseInviteInput(formData);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const { email, role } = parsed.value;

  const service = createServiceRoleClient();

  // Cette adresse a déjà un compte dans une agence : un profil appartient à une seule agence, on
  // ne déplace personne en silence. On le dit, on n'invite pas (§1).
  const { data: existing } = await service
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: 'Cette adresse a déjà un compte dans une agence.' };
  }

  // On enregistre l'invitation AVANT l'envoi, en « non envoyée ».
  const { data: inv, error: insErr } = await service
    .from('agency_invitations')
    .insert({ agency_id: profile.agency_id, email, role, invited_by: profile.id })
    .select('id')
    .single();
  if (insErr) {
    if (insErr.code === '23505') {
      return { ok: false, error: 'Une invitation est déjà en attente pour cette adresse.' };
    }
    return { ok: false, error: 'L’enregistrement de l’invitation a échoué.' };
  }

  const delivery = await deliverInvitation(service, email);
  if (!delivery.ok) {
    if (delivery.alreadyRegistered) {
      // Compte auth existant hors de toute agence : on n'invite pas en silence, on le dit, et on
      // retire l'invitation qu'on venait de poser (elle n'a pas lieu d'être).
      await service.from('agency_invitations').delete().eq('id', inv.id);
      return { ok: false, error: 'Cette adresse a déjà un compte.' };
    }
    // Échec de livraison : l'invitation RESTE, « non envoyée » (sent_at null). Le manager le voit
    // immédiatement et pourra la renvoyer. Aucun faux « en attente / envoyée ».
    revalidatePath('/admin/equipe');
    return {
      ok: false,
      error:
        'L’invitation n’a pas pu être envoyée (service e-mail indisponible). Elle apparaît « non envoyée » : renvoyez-la quand l’e-mail refonctionne.',
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
