import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  IMAGE_CONTENT_TYPE,
  IMAGE_EXTENSION,
  PROPERTY_PHOTO_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  type ImageFormat,
} from '@/features/subject-property-photos/constants';
import type { Database } from '@/lib/supabase/database.types';

// Reusable server-side deposit / removal / signing for subject-property photos.
// Deliberately NOT enclosed in a component or an action: Mission 38 (PDF import)
// will call `depositPropertyPhoto` with images extracted from a PDF. The caller
// passes the Supabase client so the same RLS-scoped session is used end to end.

type Client = SupabaseClient<Database>;

// Storage path: {agency_id}/{project_id}/property/{uuid}.{ext}. The first segment
// (agency_id) is what the Storage RLS policies key on — a conseiller only ever
// touches files under his own agency's folder.
export function buildPropertyPhotoPath(
  agencyId: string,
  projectId: string,
  format: ImageFormat,
): string {
  return `${agencyId}/${projectId}/property/${crypto.randomUUID()}.${IMAGE_EXTENSION[format]}`;
}

// The prefix every photo of a project lives under. Used to reject any client-sent
// path that does not belong to this project (defence in depth beyond RLS).
export function propertyPhotoPrefix(agencyId: string, projectId: string): string {
  return `${agencyId}/${projectId}/property/`;
}

export type DepositResult = { ok: true; path: string } | { ok: false; error: string };

// Uploads one already-validated image and returns its storage path. `upsert:false`
// so a fresh uuid path never collides with an existing object.
export async function depositPropertyPhoto(
  supabase: Client,
  params: { agencyId: string; projectId: string; bytes: Uint8Array; format: ImageFormat },
): Promise<DepositResult> {
  const path = buildPropertyPhotoPath(params.agencyId, params.projectId, params.format);
  const { error } = await supabase.storage.from(PROPERTY_PHOTO_BUCKET).upload(path, params.bytes, {
    contentType: IMAGE_CONTENT_TYPE[params.format],
    upsert: false,
  });
  if (error) {
    return { ok: false, error: 'Le téléversement de la photo a échoué.' };
  }
  return { ok: true, path };
}

// Removes files from the bucket so nothing is orphaned when a photo is deleted.
export async function removePropertyPhotos(supabase: Client, paths: string[]): Promise<void> {
  if (paths.length === 0) {
    return;
  }
  await supabase.storage.from(PROPERTY_PHOTO_BUCKET).remove(paths);
}

export type SignedPhoto = { path: string; url: string | null };

// Signs the given paths for read, short-lived. A path that cannot be signed
// (deleted, expired) yields url:null rather than throwing — the UI shows an
// "unavailable" frame, never a broken image.
export async function signPropertyPhotos(
  supabase: Client,
  paths: string[],
  expiresIn: number = SIGNED_URL_TTL_SECONDS,
): Promise<SignedPhoto[]> {
  if (paths.length === 0) {
    return [];
  }
  const { data, error } = await supabase.storage
    .from(PROPERTY_PHOTO_BUCKET)
    .createSignedUrls(paths, expiresIn);
  if (error || !data) {
    return paths.map((path) => ({ path, url: null }));
  }
  const byPath = new Map(data.map((entry) => [entry.path, entry.signedUrl ?? null]));
  // Preserve the caller's order (createSignedUrls does not guarantee it).
  return paths.map((path) => ({ path, url: byPath.get(path) ?? null }));
}
