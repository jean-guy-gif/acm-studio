'use server';

import { revalidatePath } from 'next/cache';

import { requireManagerProfile } from '@/features/team/services/require-manager';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type ReinstateResult = { ok: true } | { ok: false; error: string };

// Mission 108 — « Réintégrer » : le manager rend l'accès à un membre retiré de SON agence (M60 :
// retirer retire l'accès, pas la personne). Son rôle et ses dossiers sont ceux d'avant. Un membre
// d'une autre agence, ou qui n'est pas retiré, est refusé.
export async function reinstateMember(memberId: string): Promise<ReinstateResult> {
  const guard = await requireManagerProfile();
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from('profiles')
    .update({ removed_at: null, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('agency_id', guard.profile.agency_id)
    .not('removed_at', 'is', null)
    .select('id');
  if (error) {
    return { ok: false, error: 'La réintégration a échoué. Réessayez.' };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: 'Membre retiré introuvable dans votre agence.' };
  }
  revalidatePath('/admin/equipe');
  return { ok: true };
}
