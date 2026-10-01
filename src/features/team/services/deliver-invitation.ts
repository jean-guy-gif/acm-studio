import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/supabase/database.types';

type Service = SupabaseClient<Database>;

export type DeliveryResult =
  | { ok: true; authUserId: string | null }
  | { ok: false; alreadyRegistered: boolean; error: string };

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

async function findAuthUserId(service: Service, email: string): Promise<string | null> {
  // Base locale/petite : une page suffit. On cherche un compte auth SANS profil (invitation
  // pendante ou compte à moitié créé par un envoi qui a échoué) pour repartir propre.
  const { data } = await service.auth.admin.listUsers({ page: 1, perPage: 200 });
  const match = data?.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}

// Mission 60 — la LIVRAISON de l'invitation, via le mailer Supabase (Mailpit en local ; un SMTP
// à brancher en prod). Idempotente : on repart d'un état propre (on supprime un éventuel compte
// auth pendant sans profil) puis on (re)crée + envoie. Ainsi un renvoi après un échec fonctionne.
// L'appelant a DÉJÀ vérifié qu'aucun PROFIL n'existe pour cette adresse.
export async function deliverInvitation(service: Service, email: string): Promise<DeliveryResult> {
  const dangling = await findAuthUserId(service, email);
  if (dangling) {
    await service.auth.admin.deleteUser(dangling);
  }

  const redirectTo = `${siteUrl()}/auth/confirm?next=/accept-invitation`;
  const { data, error } = await service.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error) {
    const message = (error.message ?? '').toLowerCase();
    const alreadyRegistered =
      (error as { code?: string }).code === 'email_exists' ||
      message.includes('already been registered') ||
      message.includes('already registered');
    return { ok: false, alreadyRegistered, error: error.message ?? 'Envoi impossible.' };
  }
  return { ok: true, authUserId: data.user?.id ?? null };
}
