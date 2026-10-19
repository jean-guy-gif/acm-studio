import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { fetchListingImage } from '@/features/subject-property-import/services/fetch-listing-image';
import {
  IMAGE_CONTENT_TYPE,
  IMAGE_EXTENSION,
  PROPERTY_PHOTO_BUCKET,
} from '@/features/subject-property-photos/constants';
import { validatePhotoBytes } from '@/features/subject-property-photos/services/validate-photo-upload';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';

// Mission 87 — une photo du bien concurrent entre dans le stockage de l'agence, sous le dossier
// de ce concurrent, comme les autres photos : vérifiée par ses octets (JPEG, PNG, WebP), à un
// chemin imposé ici. Deux provenances : le fichier importé par le conseiller (« Ma photo ») et
// la copie de la photo d'annonce qu'il a choisie — un lien de portail expire avec l'annonce
// (mesuré sur Bien'ici), la copie tient.

type Client = SupabaseClient<Database>;

export type StoreTheirPhotoResult = { ok: true; path: string } | { ok: false; error: string };

export async function storeTheirPhotoBytes(
  supabase: Client,
  prefix: string,
  bytes: Uint8Array,
): Promise<StoreTheirPhotoResult> {
  const validation = validatePhotoBytes(bytes);
  if (!validation.ok) {
    return validation;
  }
  const path = `${prefix}${crypto.randomUUID()}.${IMAGE_EXTENSION[validation.format]}`;
  const { error } = await supabase.storage.from(PROPERTY_PHOTO_BUCKET).upload(path, bytes, {
    contentType: IMAGE_CONTENT_TYPE[validation.format],
    upsert: false,
  });
  if (error) {
    return { ok: false, error: 'Le dépôt de la photo a échoué.' };
  }
  return { ok: true, path };
}

// L'adresse a déjà été vérifiée : c'est l'une des photos de l'annonce de ce concurrent. Le
// téléchargement garde la garde SSRF et les bornes de la récupération de photos (M38, M76).
export async function copyListingPhoto(
  supabase: Client,
  prefix: string,
  url: string,
): Promise<StoreTheirPhotoResult> {
  const fetched = await fetchListingImage(url);
  if (!fetched.ok) {
    return fetched;
  }
  return storeTheirPhotoBytes(supabase, prefix, fetched.bytes);
}

// Mission 108 — un fichier que le stockage refuse de retirer ne passe plus en silence : le journal
// le note (la photo d'annonce appartient à son auteur, M105).
export async function removeTheirPhoto(supabase: Client, path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(PROPERTY_PHOTO_BUCKET).remove([path]);
  if (error) {
    await reportServerError('retrait de la photo d’un courrier', error);
    return false;
  }
  return true;
}
