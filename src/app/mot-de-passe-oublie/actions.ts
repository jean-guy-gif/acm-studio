'use server';

import { redirect } from 'next/navigation';

import { siteUrl } from '@/lib/site-url';
import { createClient } from '@/lib/supabase/server';

// Mission 88 — « Mot de passe oublié ? » : l'e-mail de réinitialisation part par le même SMTP
// que les invitations, et son lien revient par /auth/confirm (jeton vérifié, session ouverte),
// puis ouvre « Choisir un nouveau mot de passe ».
//
// La réponse est TOUJOURS la même — adresse connue ou non, envoi réussi ou non : on ne dit à
// personne si une adresse a un compte. Le résultat de l'envoi n'est donc pas lu ici.
export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320) {
    try {
      const supabase = await createClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl()}/auth/confirm?next=/nouveau-mot-de-passe`,
      });
    } catch {
      // Même réponse : rien à dire de plus.
    }
  }

  redirect('/login?envoye=1');
}
