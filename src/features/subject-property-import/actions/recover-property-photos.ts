'use server';

import { revalidatePath } from 'next/cache';

import { fetchListingImage } from '@/features/subject-property-import/services/fetch-listing-image';
import { MAX_PROPERTY_PHOTOS } from '@/features/subject-property-photos/constants';
import {
  depositPropertyPhoto,
  removePropertyPhotos,
} from '@/features/subject-property-photos/services/property-photo-storage';
import {
  loadPropertyPhotosContext,
  writePropertyPhotoPaths,
} from '@/features/subject-property-photos/services/load-property-photos-context';
import { validatePhotoBytes } from '@/features/subject-property-photos/services/validate-photo-upload';

export type RecoverPropertyPhotoResult =
  { ok: true; url: string; path: string } | { ok: false; url: string; error: string };

// PRODUCT DECISION — NE PAS « simplifier » en copie automatique.
// Récupérer les photos de l'annonce dans le bucket du bien vendeur ne se fait
// JAMAIS tout seul : uniquement au clic explicite du conseiller, UNE image par
// appel. Le navigateur pilote la file image par image, car une action serveur
// Vercel s'arrête vers 10-15 s et une annonce peut porter 20 photos — les
// enchaîner toutes dans un seul appel dépasserait la limite.
//
// projectId est lié côté serveur (jamais du client). Chaque image passe par
// EXACTEMENT les mêmes validations qu'un téléversement manuel (octets magiques,
// formats autorisés, borne de taille) et la même borne de nombre. Les photos
// récupérées s'AJOUTENT aux photos existantes, sans les remplacer. En cas
// d'échec d'enregistrement, le fichier déposé est retiré (aucun orphelin),
// comme dans upload-property-photos.
export async function recoverPropertyPhoto(
  projectId: string,
  rawUrl: string,
): Promise<RecoverPropertyPhotoResult> {
  const context = await loadPropertyPhotosContext(projectId);
  if (!context.ok) {
    return { ok: false, url: rawUrl, error: context.error };
  }
  const { supabase, agencyId, currentPaths } = context;

  // Count bound re-read on every call: the browser drives the queue serially, so
  // this always reflects the photos added by the previous images.
  if (currentPaths.length >= MAX_PROPERTY_PHOTOS) {
    return { ok: false, url: rawUrl, error: `Maximum ${MAX_PROPERTY_PHOTOS} photos atteint.` };
  }

  const image = await fetchListingImage(rawUrl);
  if (!image.ok) {
    return { ok: false, url: rawUrl, error: image.error };
  }

  const validation = validatePhotoBytes(image.bytes);
  if (!validation.ok) {
    return { ok: false, url: rawUrl, error: validation.error };
  }

  const deposit = await depositPropertyPhoto(supabase, {
    agencyId,
    projectId,
    bytes: image.bytes,
    format: validation.format,
  });
  if (!deposit.ok) {
    return { ok: false, url: rawUrl, error: deposit.error };
  }

  const written = await writePropertyPhotoPaths(supabase, {
    projectId,
    agencyId,
    paths: [...currentPaths, deposit.path],
  });
  if (!written.ok) {
    await removePropertyPhotos(supabase, [deposit.path]);
    return { ok: false, url: rawUrl, error: 'L’enregistrement de la photo a échoué.' };
  }

  revalidatePath(`/builder/${projectId}/property`);
  return { ok: true, url: rawUrl, path: deposit.path };
}
