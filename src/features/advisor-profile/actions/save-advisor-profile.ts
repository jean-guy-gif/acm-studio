'use server';

import { revalidatePath } from 'next/cache';

import {
  advisorPhotoPrefix,
  parseAdvisorPhone,
} from '@/features/advisor-profile/services/parse-advisor-phone';
import {
  IMAGE_CONTENT_TYPE,
  IMAGE_EXTENSION,
  PROPERTY_PHOTO_BUCKET,
} from '@/features/subject-property-photos/constants';
import { validatePhotoBytes } from '@/features/subject-property-photos/services/validate-photo-upload';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type SaveAdvisorProfileResult = { ok: true } | { ok: false; error: string };

// Mission 84 — « Mon profil » : le conseiller renseigne son téléphone et sa photo, imprimés sur
// ses dossiers de prospection. Il n'écrit que SON profil ; la photo est vérifiée par ses
// octets (JPEG, PNG, WebP) et déposée sous le dossier de son agence, à un chemin imposé ici.
export async function saveAdvisorProfile(formData: FormData): Promise<SaveAdvisorProfileResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const phone = parseAdvisorPhone(formData.get('phone'));
  if (!phone.ok) {
    return phone;
  }

  const supabase = await createClient();
  const file = formData.get('photo');
  let photoPath = profile.photo_path;
  let uploadedPath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const validation = validatePhotoBytes(bytes);
    if (!validation.ok) {
      return { ok: false, error: `Photo : ${validation.error}` };
    }
    uploadedPath = `${advisorPhotoPrefix(profile.agency_id)}${profile.id}-${crypto.randomUUID()}.${IMAGE_EXTENSION[validation.format]}`;
    const { error } = await supabase.storage
      .from(PROPERTY_PHOTO_BUCKET)
      .upload(uploadedPath, bytes, {
        contentType: IMAGE_CONTENT_TYPE[validation.format],
        upsert: false,
      });
    if (error) {
      return { ok: false, error: 'Le dépôt de la photo a échoué. Réessayez.' };
    }
    photoPath = uploadedPath;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ phone: phone.phone, photo_path: photoPath, updated_at: new Date().toISOString() })
    .eq('id', profile.id)
    .select('id');
  if (error || !data || data.length === 0) {
    // Rien d'orphelin : la photo déposée à l'instant est retirée.
    if (uploadedPath) {
      await supabase.storage.from(PROPERTY_PHOTO_BUCKET).remove([uploadedPath]);
    }
    return { ok: false, error: 'Le profil n’a pas été enregistré. Réessayez.' };
  }

  // L'ancienne photo ne sert plus : elle est retirée du stockage.
  const previous = profile.photo_path;
  if (
    uploadedPath &&
    previous &&
    previous !== uploadedPath &&
    previous.startsWith(advisorPhotoPrefix(profile.agency_id))
  ) {
    await supabase.storage.from(PROPERTY_PHOTO_BUCKET).remove([previous]);
  }

  revalidatePath('/profil');
  return { ok: true };
}
