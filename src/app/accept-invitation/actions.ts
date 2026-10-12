'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE } from '@/lib/auth/auth-messages';
import { createClient } from '@/lib/supabase/server';

export type AcceptResult = { ok: false; error: string };

// Mission 60 — accepter l'invitation : l'invité (déjà authentifié par le lien e-mail) choisit son
// mot de passe et son nom ; son PROFIL est créé dans l'agence et avec le rôle de SON invitation
// (accept_invitation, SECURITY DEFINER — l'agence et le rôle viennent de l'invitation, jamais du
// client). Succès → il arrive dans la bonne agence.
export async function acceptInvitation(formData: FormData): Promise<AcceptResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Session expirée. Rouvrez le lien reçu par e-mail.' };
  }

  const firstName = String(formData.get('first_name') ?? '').trim();
  const lastName = String(formData.get('last_name') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!firstName || !lastName) {
    return { ok: false, error: 'Indiquez votre prénom et votre nom.' };
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: PASSWORD_TOO_SHORT_MESSAGE };
  }

  // Mission 88 — le PROFIL d'abord, le mot de passe ensuite : jamais un compte avec mot de
  // passe mais sans profil. Si la création du profil échoue, rien n'est enregistré : l'invité
  // relance l'acceptation depuis son lien ou depuis cette page.
  const { error: rpcError } = await supabase.rpc('accept_invitation', {
    first_name: firstName,
    last_name: lastName,
  });
  if (rpcError) {
    // P0002 : aucune invitation en attente pour cette adresse (annulée, ou déjà acceptée).
    return rpcError.code === 'P0002'
      ? { ok: false, error: 'Aucune invitation valide pour cette adresse.' }
      : { ok: false, error: 'Votre inscription n’a pas pu être finalisée. Réessayez.' };
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  revalidatePath('/', 'layout');
  if (passwordError) {
    // Le profil existe, la session aussi : il ne reste qu'à choisir le mot de passe.
    redirect('/nouveau-mot-de-passe?raison=invitation');
  }

  redirect('/');
}
