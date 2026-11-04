'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  buyerLetterOriginsOf,
  removeBuyerLetterPhotos,
} from '@/features/buyer-prospecting/services/remove-buyer-letter-photos';
import { removeCompetitorPhotos } from '@/features/prospecting-file/services/remove-their-photos';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import { detachBuyerOrigins } from '@/features/buyer-prospecting/services/detach-buyer-origins';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function deleteComparable(projectId: string, formData: FormData): Promise<void> {
  const profile = await getProfile();
  if (!profile) {
    redirect('/onboarding');
  }

  const comparableId = String(formData.get('comparableId') ?? '').trim();

  if (comparableId) {
    const supabase = await createClient();
    // Mission 120 B — avant la suppression, ses recherches acquéreur passent sur une autre copie ou
    // sur un bien démarché, avec leurs courriers : elles ne partent plus en cascade.
    await detachBuyerOrigins(createServiceRoleClient(), profile.agency_id, [comparableId], {
      beforeDelete: true,
    });
    // Mission 120 — ce qui n'a pas pu se détacher part en cascade : les origines se lisent avant,
    // leurs photos se retirent après.
    const buyerOrigins = await buyerLetterOriginsOf(supabase, profile.agency_id, {
      comparableIds: [comparableId],
    });

    const { error } = await supabase
      .from('comparables')
      .delete()
      .eq('id', comparableId)
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id);

    if (error) {
      redirect(
        `/builder/${projectId}/comparables?error=${encodeURIComponent(
          'La suppression du bien concurrent a échoué.',
        )}`,
      );
    }
    // Mission 87 — son dossier de prospection est parti avec lui (cascade) : ses photos aussi.
    await removeCompetitorPhotos(supabase.storage, profile.agency_id, projectId, [comparableId]);
    await removeBuyerLetterPhotos(supabase.storage, profile.agency_id, buyerOrigins);
  }

  revalidatePath(`/builder/${projectId}/comparables`);
  redirect(`/builder/${projectId}/comparables`);
}
