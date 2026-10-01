'use server';

import { revalidatePath } from 'next/cache';

import { requireManagerProfile } from '@/features/team/services/require-manager';
import { isLastManager, type MemberRole } from '@/features/team/services/team-guards';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type ActionResult = { ok: true } | { ok: false; error: string };

// Mission 60 §3 — donner le rôle de manager, ou le reprendre. Garde non négociable : le DERNIER
// manager actif ne peut pas être rétrogradé (l'agence resterait fermée à clé, sans personne pour
// inviter). Refusé à l'adresse, pas seulement à l'écran.
export async function setMemberRole(
  memberId: string,
  role: 'manager' | 'advisor',
): Promise<ActionResult> {
  if (role !== 'manager' && role !== 'advisor') {
    return { ok: false, error: 'Rôle invalide.' };
  }
  const guard = await requireManagerProfile();
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const service = createServiceRoleClient();

  const { data: rows } = await service
    .from('profiles')
    .select('id, role, removed_at')
    .eq('agency_id', guard.profile.agency_id);
  const members: MemberRole[] = (rows ?? []).map((r) => ({
    id: r.id,
    role: r.role,
    removedAt: r.removed_at,
  }));

  const target = members.find((m) => m.id === memberId);
  if (!target || target.removedAt) {
    return { ok: false, error: 'Membre introuvable dans votre agence.' };
  }
  if (target.role === role) {
    return { ok: true };
  }
  if (role === 'advisor' && isLastManager(members, memberId)) {
    return { ok: false, error: 'Le dernier manager ne peut pas être rétrogradé.' };
  }

  const { error } = await service
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('agency_id', guard.profile.agency_id);
  if (error) {
    return { ok: false, error: 'Le changement de rôle a échoué. Réessayez.' };
  }
  revalidatePath('/admin/equipe');
  return { ok: true };
}
