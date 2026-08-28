'use server';

import { revalidatePath } from 'next/cache';

import { MAX_PROPERTY_PHOTOS } from '@/features/subject-property-photos/constants';
import { removePropertyPhotos } from '@/features/subject-property-photos/services/property-photo-storage';
import {
  loadPropertyPhotosContext,
  writePropertyPhotoPaths,
} from '@/features/subject-property-photos/services/load-property-photos-context';

export type UpdatePropertyPhotosResult = { ok: true } | { ok: false; error: string };

// Single action for BOTH deletion and reordering: the client sends the desired
// ordered list of paths. The server keeps only paths that already belong to this
// project (a client can never inject a foreign path), deletes the files that were
// dropped (no orphans), and writes the new order. A delete is "the same list
// minus one path"; a reorder is "the same set in a new order".
export async function updatePropertyPhotos(
  projectId: string,
  desiredPaths: string[],
): Promise<UpdatePropertyPhotosResult> {
  if (!Array.isArray(desiredPaths) || desiredPaths.length > MAX_PROPERTY_PHOTOS) {
    return { ok: false, error: 'Liste de photos invalide.' };
  }

  const context = await loadPropertyPhotosContext(projectId);
  if (!context.ok) {
    return { ok: false, error: context.error };
  }
  const { supabase, agencyId, currentPaths } = context;

  const currentSet = new Set(currentPaths);
  // Keep only known paths, de-duplicated, preserving the client's order.
  const kept: string[] = [];
  const keptSet = new Set<string>();
  for (const path of desiredPaths) {
    if (currentSet.has(path) && !keptSet.has(path)) {
      kept.push(path);
      keptSet.add(path);
    }
  }

  const removed = currentPaths.filter((path) => !keptSet.has(path));

  const written = await writePropertyPhotoPaths(supabase, { projectId, agencyId, paths: kept });
  if (!written.ok) {
    return { ok: false, error: 'La mise à jour des photos a échoué.' };
  }

  // Delete the dropped files only after the DB no longer references them.
  await removePropertyPhotos(supabase, removed);

  revalidatePath(`/builder/${projectId}/property`);
  return { ok: true };
}
