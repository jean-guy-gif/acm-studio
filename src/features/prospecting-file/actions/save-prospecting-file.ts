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
import { createClient } from '@/lib/supabase/server';

export type SaveProspectingFileResult = { ok: true } | { ok: false; error: string };

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

  const supabase = await createClient();
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
      updated_by: context.profileId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'comparable_id,version' },
  );
  if (error) {
    return { ok: false, error: FAILURE };
  }

  revalidatePath(`/builder/${projectId}/prospection/${competitorId}`);
  return { ok: true };
}
