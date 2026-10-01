import 'server-only';

import { isManagerRole } from '@/features/team/services/role';
import { getProfile } from '@/lib/auth/get-profile';
import type { Database } from '@/lib/supabase/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Mission 60 — le garde des gestes d'équipe, à l'ADRESSE (chaque action l'appelle avant d'agir,
// pas seulement l'écran). Un conseiller, un utilisateur retiré ou non connecté est refusé.
export type ManagerGuard = { ok: true; profile: Profile } | { ok: false; error: string };

export async function requireManagerProfile(): Promise<ManagerGuard> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  if (!isManagerRole(profile.role)) {
    return { ok: false, error: 'Réservé au manager de l’agence.' };
  }
  return { ok: true, profile };
}
