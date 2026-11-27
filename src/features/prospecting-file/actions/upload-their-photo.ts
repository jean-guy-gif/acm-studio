'use server';

import { getProspectingFile } from '@/features/prospecting-file/queries/get-prospecting-file';
import { storeTheirPhotoBytes } from '@/features/prospecting-file/services/store-their-photo';
import { signPropertyPhotos } from '@/features/subject-property-photos/services/property-photo-storage';
import { createClient } from '@/lib/supabase/server';

export type UploadTheirPhotoResult =
  { ok: true; path: string; url: string | null } | { ok: false; error: string };

const PREVIEW_TTL_SECONDS = 60 * 60 * 12;

// Mission 87 — « Ma photo » : le conseiller importe une photo du bien concurrent (la façade
// prise sur place). Le dossier doit être ouvert à l'appelant (son agence, mandat signé,
// concurrent retenu) ; la photo est vérifiée par ses octets et déposée sous le dossier de ce
// concurrent. Elle n'est retenue qu'à l'enregistrement du dossier.
export async function uploadTheirPhoto(
  projectId: string,
  competitorId: string,
  formData: FormData,
): Promise<UploadTheirPhotoResult> {
  const context = await getProspectingFile(projectId, competitorId, formData.get('version'));
  if (context.status !== 'ready') {
    return { ok: false, error: 'Ce dossier n’est pas ouvert.' };
  }
  const file = formData.get('photo');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Choisissez une photo.' };
  }

  const supabase = await createClient();
  const stored = await storeTheirPhotoBytes(
    supabase,
    context.theirPhoto.prefix,
    new Uint8Array(await file.arrayBuffer()),
  );
  if (!stored.ok) {
    return { ok: false, error: `Photo\u00a0: ${stored.error}` };
  }
  const [signed] = await signPropertyPhotos(supabase, [stored.path], PREVIEW_TTL_SECONDS);
  return { ok: true, path: stored.path, url: signed?.url ?? null };
}
