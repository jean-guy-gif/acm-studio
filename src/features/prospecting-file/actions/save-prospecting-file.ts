'use server';

import { revalidatePath } from 'next/cache';

import { getProspectingFile } from '@/features/prospecting-file/queries/get-prospecting-file';
import { prospectingFileInputSchema } from '@/features/prospecting-file/schemas/prospecting-file-input';
import { defaultTexts } from '@/features/prospecting-file/services/build-prospecting-file';
import { defaultShowPrices } from '@/features/prospecting-file/services/compare-properties';
import { FILE_BLOCKER_MESSAGES } from '@/features/prospecting-file/services/file-access';
import {
  OWNER_FORBIDDEN_MESSAGE,
  fileOverrides,
  ownerForbiddenWord,
} from '@/features/prospecting-file/services/file-overrides';
import {
  copyListingPhoto,
  removeTheirPhoto,
} from '@/features/prospecting-file/services/store-their-photo';
import {
  staleTheirPhotoPath,
  validTheirPhotoChoice,
  type SavedTheirPhoto,
} from '@/features/prospecting-file/services/their-photo';
import { createClient } from '@/lib/supabase/server';

// `warning` : le dossier est enregistré, mais un point demande l'attention du conseiller.
export type SaveProspectingFileResult =
  { ok: true; warning?: string } | { ok: false; error: string };

const FAILURE = 'Le dossier n’a pas été enregistré. Réessayez.';

// Mission 84 — le conseiller enregistre les textes de son dossier. Tout ce qui vient du
// navigateur est revalidé ; le texte proposé est recalculé ici, jamais reçu : seul ce qui en
// diffère est gardé, par concurrent et par version.
export async function saveProspectingFile(
  projectId: string,
  competitorId: string,
  raw: unknown,
): Promise<SaveProspectingFileResult> {
  const parsed = prospectingFileInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Un texte est trop long ou invalide.' };
  }
  const input = parsed.data;

  const context = await getProspectingFile(projectId, competitorId, input.version);
  if (context.status === 'blocked') {
    return { ok: false, error: FILE_BLOCKER_MESSAGES[context.blocker] };
  }
  if (context.status !== 'ready' || context.version !== input.version) {
    return { ok: false, error: FAILURE };
  }
  if (ownerForbiddenWord(input.version, input)) {
    return { ok: false, error: OWNER_FORBIDDEN_MESSAGE };
  }

  const photoPaths = context.photos.map((photo) => photo.path);
  const overrides = fileOverrides(input, {
    texts: defaultTexts(context.facts, context.version),
    showPrices: defaultShowPrices(context.facts),
    photoPath: photoPaths[0] ?? null,
    photoPaths,
  });

  // Mission 87 — la photo du bien concurrent. Une photo d'annonce doit être l'une de celles de
  // CETTE annonce, un fichier doit être dans le dossier de ce concurrent : sinon, refus.
  const { listing, saved, prefix, storedPath } = context.theirPhoto;
  if (!validTheirPhotoChoice(input.theirPhoto, listing, prefix)) {
    return { ok: false, error: 'Cette photo ne peut pas être retenue. Choisissez-en une autre.' };
  }
  const supabase = await createClient();
  let theirPhoto: SavedTheirPhoto;
  let warning: string | undefined;
  if (input.theirPhoto.mode === 'none') {
    theirPhoto = { mode: 'none', sourceUrl: null, path: null };
  } else if (input.theirPhoto.mode === 'upload') {
    theirPhoto = { mode: 'upload', sourceUrl: null, path: input.theirPhoto.path };
  } else if (
    saved.mode === 'listing' &&
    saved.sourceUrl === input.theirPhoto.url &&
    saved.path != null
  ) {
    // Déjà copiée : rien à retélécharger.
    theirPhoto = saved;
  } else {
    // Un lien de portail expire avec l'annonce : la photo choisie est copiée dans le stockage
    // de l'agence. Si la copie échoue, le choix est gardé quand même, et l'écran le dit.
    const copied = await copyListingPhoto(supabase, prefix, input.theirPhoto.url);
    theirPhoto = {
      mode: 'listing',
      sourceUrl: input.theirPhoto.url,
      path: copied.ok ? copied.path : null,
    };
    if (!copied.ok) {
      warning = `La photo de l’annonce n’a pas pu être copiée (${copied.error}) : si elle ne s’affiche pas à l’impression, choisissez-en une autre ou « Ma photo ».`;
    }
  }

  const { error } = await supabase.from('competitor_prospecting_files').upsert(
    {
      agency_id: context.agencyId,
      project_id: projectId,
      comparable_id: competitorId,
      version: context.version,
      title: overrides.title,
      letter: overrides.letter,
      key_message: overrides.keyMessage,
      proposal_1: overrides.proposals[0],
      proposal_2: overrides.proposals[1],
      proposal_3: overrides.proposals[2],
      contact_hook: overrides.contactHook,
      show_prices: overrides.showPrices,
      photo_path: overrides.photoPath,
      their_photo_mode: theirPhoto.mode,
      their_photo_source_url: theirPhoto.sourceUrl,
      their_photo_path: theirPhoto.path,
      updated_by: context.profileId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'comparable_id,version' },
  );
  if (error) {
    // Rien d'orphelin : la copie faite à l'instant est retirée.
    if (theirPhoto.path && theirPhoto.path !== saved.path) {
      await removeTheirPhoto(supabase, theirPhoto.path);
    }
    return { ok: false, error: FAILURE };
  }
  // Le fichier que ce dossier ne montre plus est retiré du stockage. Mission 108 — y compris la
  // photo d'annonce d'un courrier préparé avant M105, que `saved` ne montre plus.
  const stale = staleTheirPhotoPath(storedPath, theirPhoto.path);
  if (stale) {
    await removeTheirPhoto(supabase, stale);
  }

  revalidatePath(`/builder/${projectId}/prospection/${competitorId}`);
  return warning ? { ok: true, warning } : { ok: true };
}
