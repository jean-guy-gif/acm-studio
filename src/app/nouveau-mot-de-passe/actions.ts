'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE } from '@/lib/auth/auth-messages';
import { createClient } from '@/lib/supabase/server';

export type NewPasswordResult = { ok: false; error: string };

// Mission 88 — « Choisir un nouveau mot de passe ». La session vient du lien reçu par e-mail
// (vérifié par /auth/confirm) ; sans session, rien ne se change. Succès → /builder, connecté.
export async function chooseNewPassword(formData: FormData): Promise<NewPasswordResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Ce lien n’est plus valable. Demandez-en un nouveau.' };
  }

  const password = String(formData.get('password') ?? '');
  const confirmation = String(formData.get('confirmation') ?? '');
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, error: PASSWORD_TOO_SHORT_MESSAGE };
  }
  if (password !== confirmation) {
    return { ok: false, error: 'Les deux mots de passe ne sont pas identiques.' };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    const code = (error as { code?: string }).code ?? '';
    if (code === 'same_password') {
      return { ok: false, error: 'Choisissez un mot de passe différent de l’ancien.' };
    }
    if (code === 'weak_password') {
      return { ok: false, error: 'Ce mot de passe est trop simple. Choisissez-en un plus long.' };
    }
    return { ok: false, error: 'Le mot de passe n’a pas pu être enregistré. Réessayez.' };
  }

  revalidatePath('/', 'layout');
  // Mission 145 — par `/` : « Aujourd'hui », ou « Bienvenue » pour un conseiller sans dossier.
  redirect('/');
}
