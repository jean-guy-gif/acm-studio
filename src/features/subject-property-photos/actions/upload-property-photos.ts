'use server';

import { revalidatePath } from 'next/cache';

import {
  MAX_PROPERTY_PHOTOS,
  type ImageFormat,
} from '@/features/subject-property-photos/constants';
import {
  depositPropertyPhoto,
  removePropertyPhotos,
} from '@/features/subject-property-photos/services/property-photo-storage';
import {
  loadPropertyPhotosContext,
  writePropertyPhotoPaths,
} from '@/features/subject-property-photos/services/load-property-photos-context';
import { validatePhotoBytes } from '@/features/subject-property-photos/services/validate-photo-upload';

export type UploadPropertyPhotosResult = { ok: true } | { ok: false; error: string };

type ValidatedPhoto = { bytes: Uint8Array; format: ImageFormat };

// projectId is bound server-side from the route; never trusted from the client.
// Validates every file server-side by its magic bytes, uploads the accepted ones
// to the private bucket, then records their paths on the subject property. All or
// nothing: if one file is invalid, nothing is uploaded; if the DB write fails,
// the just-uploaded files are removed so no orphan remains.
export async function uploadPropertyPhotos(
  projectId: string,
  formData: FormData,
): Promise<UploadPropertyPhotosResult> {
  const context = await loadPropertyPhotosContext(projectId);
  if (!context.ok) {
    return { ok: false, error: context.error };
  }
  const { supabase, agencyId, currentPaths } = context;

  const files = formData.getAll('photos').filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) {
    return { ok: false, error: 'Aucun fichier reçu.' };
  }
  if (currentPaths.length + files.length > MAX_PROPERTY_PHOTOS) {
    return {
      ok: false,
      error: `Maximum ${MAX_PROPERTY_PHOTOS} photos. Supprimez-en avant d’en ajouter.`,
    };
  }

  // Read and validate ALL files first — nothing is uploaded if any is invalid.
  const validated: ValidatedPhoto[] = [];
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const validation = validatePhotoBytes(bytes);
    if (!validation.ok) {
      return { ok: false, error: `« ${file.name} » : ${validation.error}` };
    }
    validated.push({ bytes, format: validation.format });
  }

  // Upload the accepted files; on any failure, remove what was already uploaded.
  const uploadedPaths: string[] = [];
  for (const item of validated) {
    const result = await depositPropertyPhoto(supabase, {
      agencyId,
      projectId,
      bytes: item.bytes,
      format: item.format,
    });
    if (!result.ok) {
      await removePropertyPhotos(supabase, uploadedPaths);
      return { ok: false, error: result.error };
    }
    uploadedPaths.push(result.path);
  }

  const written = await writePropertyPhotoPaths(supabase, {
    projectId,
    agencyId,
    paths: [...currentPaths, ...uploadedPaths],
  });
  if (!written.ok) {
    await removePropertyPhotos(supabase, uploadedPaths);
    return { ok: false, error: 'L’enregistrement des photos a échoué.' };
  }

  revalidatePath(`/builder/${projectId}/property`);
  return { ok: true };
}
