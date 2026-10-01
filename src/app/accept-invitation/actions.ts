'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
  if (password.length < 8) {
    return { ok: false, error: 'Choisissez un mot de passe d’au moins 8 caractères.' };
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) {
    return { ok: false, error: 'Le mot de passe n’a pas pu être enregistré.' };
  }

  const { error: rpcError } = await supabase.rpc('accept_invitation', {
    first_name: firstName,
    last_name: lastName,
  });
  if (rpcError) {
    return { ok: false, error: 'Aucune invitation valide pour cette adresse.' };
  }

  revalidatePath('/', 'layout');
  redirect('/builder');
}
