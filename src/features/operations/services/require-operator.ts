import 'server-only';

import { isOperatorEmail } from '@/features/operations/services/operators';
import { getProfile } from '@/lib/auth/get-profile';
import { getUser } from '@/lib/auth/get-user';

export type OperatorGuard = { ok: true; userId: string } | { ok: false };

// Mission 100 — le garde des comptes autorisés, à l'ADRESSE : chaque page et chaque action
// l'appelle avant toute lecture par la clé service. L'adresse est celle du compte connecté (la
// session vérifiée), jamais une valeur reçue ; un membre retiré n'y a plus droit.
export async function requireOperator(): Promise<OperatorGuard> {
  const user = await getUser();
  if (!user || !isOperatorEmail(user.email)) {
    return { ok: false };
  }
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false };
  }
  return { ok: true, userId: user.id };
}
