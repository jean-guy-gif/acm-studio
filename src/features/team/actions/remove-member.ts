'use server';

import { revalidatePath } from 'next/cache';

import { requireManagerProfile } from '@/features/team/services/require-manager';
import { isLastManager, type MemberRole } from '@/features/team/services/team-guards';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type ActionResult = { ok: true } | { ok: false; error: string };

// Mission 60 §2 — retirer quelqu'un = lui retirer l'ACCÈS, pas supprimer la personne. On pose
// `removed_at` : son profil reste, son nom reste sur les dossiers qu'il a préparés (repris par
// tout le monde). Garde non négociable (§3) : le dernier manager actif ne peut pas être retiré —
// y compris lui-même. Refusé à l'adresse.
export async function removeMember(memberId: string): Promise<ActionResult> {
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
  if (isLastManager(members, memberId)) {
    return {
      ok: false,
      error: 'Le dernier manager ne peut pas être retiré : l’agence resterait sans manager.',
    };
  }

  const { error } = await service
    .from('profiles')
    .update({ removed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('agency_id', guard.profile.agency_id);
  if (error) {
    return { ok: false, error: 'Le retrait a échoué. Réessayez.' };
  }
  revalidatePath('/admin/equipe');
  return { ok: true };
}
