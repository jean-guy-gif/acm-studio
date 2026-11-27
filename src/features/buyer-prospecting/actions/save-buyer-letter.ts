'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getBuyerLetter } from '@/features/buyer-prospecting/queries/get-buyer-letter';
import {
  BUYER_LETTER_FORBIDDEN_MESSAGE,
  buyerLetterForbidden,
} from '@/features/buyer-prospecting/services/buyer-letter';
import { FILE_BLOCKER_MESSAGES } from '@/features/prospecting-file/services/file-access';
import {
  copyListingPhoto,
  removeTheirPhoto,
} from '@/features/prospecting-file/services/store-their-photo';
import {
  THEIR_PHOTO_URL_MAX_LENGTH,
  staleTheirPhotoPath,
  validTheirPhotoChoice,
  type SavedTheirPhoto,
} from '@/features/prospecting-file/services/their-photo';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SaveBuyerLetterResult = { ok: true; warning?: string } | { ok: false; error: string };

const FAILURE = 'Le courrier n’a pas été enregistré. Réessayez.';

const text = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => value.replace(/\r\n/g, '\n').trim());

const inputSchema = z.object({
  title: text(200),
  letter: text(3000),
  // Mission 120 B — la question du dossier au confrère ; vide pour le propriétaire.
  question: text(300).default(''),
  contactHook: text(200),
  theirPhoto: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('listing'), url: z.string().url().max(THEIR_PHOTO_URL_MAX_LENGTH) }),
    z.object({ mode: z.literal('none') }),
  ]),
});

// Un texte vidé reprend le texte proposé (M84) ; seul ce qui en diffère est gardé.
const kept = (value: string, proposed: string): string | null =>
  value === '' || value === proposed ? null : value;

// Mission 120 — le conseiller enregistre le courrier au propriétaire d'une recherche acquéreur.
// Mission 120 B — ou le dossier de collaboration au confrère : la version est relue sur la carte,
// jamais reçue du navigateur.
// Tout vient du navigateur : revalidé ici ; le texte proposé est recalculé, jamais reçu ; un texte
// qui nomme l'acquéreur, dit son budget ou promet est refusé (dossier du 22/10, §10.2). La photo
// de l'annonce reste au choix du conseiller, « Sans photo » par défaut, copiée dans le stockage de
// l'agence (M87, M115). Écrit par le serveur seul, sur l'origine de cette agence.
export async function saveBuyerLetter(
  originId: string,
  raw: unknown,
): Promise<SaveBuyerLetterResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Un texte est trop long ou invalide.' };
  }
  const input = parsed.data;
  const context = await getBuyerLetter(originId);
  if (context.status === 'blocked') {
    return { ok: false, error: FILE_BLOCKER_MESSAGES[context.blocker] };
  }
  if (context.status !== 'ready') {
    return { ok: false, error: FAILURE };
  }
  const texts = {
    title: input.title || context.defaults.title,
    letter: input.letter || context.defaults.letter,
    question: input.question || context.defaults.question,
    contactHook: input.contactHook || context.defaults.contactHook,
  };
  if (
    buyerLetterForbidden(
      [texts.title, texts.letter, texts.question, texts.contactHook],
      context.buyer,
    )
  ) {
    return { ok: false, error: BUYER_LETTER_FORBIDDEN_MESSAGE };
  }

  const { listing, saved, prefix } = context.theirPhoto;
  if (!validTheirPhotoChoice(input.theirPhoto, listing, prefix)) {
    return { ok: false, error: 'Cette photo ne peut pas être retenue. Choisissez-en une autre.' };
  }
  const supabase = await createClient();
  let theirPhoto: SavedTheirPhoto;
  let warning: string | undefined;
  if (input.theirPhoto.mode === 'none') {
    theirPhoto = { mode: 'none', sourceUrl: null, path: null };
  } else if (
    saved.mode === 'listing' &&
    saved.sourceUrl === input.theirPhoto.url &&
    saved.path != null
  ) {
    theirPhoto = saved;
  } else {
    const copied = await copyListingPhoto(supabase, prefix, input.theirPhoto.url);
    theirPhoto = {
      mode: 'listing',
      sourceUrl: input.theirPhoto.url,
      path: copied.ok ? copied.path : null,
    };
    if (!copied.ok) {
      warning = `La photo de l’annonce n’a pas pu être copiée (${copied.error})\u00a0: si elle ne s’affiche pas à l’impression, choisissez-en une autre.`;
    }
  }

  const { data, error } = await createServiceRoleClient()
    .from('buyer_prospect_origins')
    .update({
      letter_version: context.version,
      letter_title: kept(input.title, context.defaults.title),
      letter_body: kept(input.letter, context.defaults.letter),
      letter_question:
        context.version === 'colleague' ? kept(input.question, context.defaults.question) : null,
      letter_contact_hook: kept(input.contactHook, context.defaults.contactHook),
      their_photo_mode: theirPhoto.mode,
      their_photo_source_url: theirPhoto.sourceUrl,
      their_photo_path: theirPhoto.path,
      letter_saved_at: new Date().toISOString(),
      letter_saved_by: context.profileId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', context.originId)
    .eq('agency_id', context.agencyId)
    .select('id');
  if (error || !data || data.length !== 1) {
    if (theirPhoto.path && theirPhoto.path !== saved.path) {
      await removeTheirPhoto(supabase, theirPhoto.path);
    }
    return { ok: false, error: FAILURE };
  }
  const stale = staleTheirPhotoPath(saved.path, theirPhoto.path);
  if (stale) {
    await removeTheirPhoto(supabase, stale);
  }
  revalidatePath(`/acquereurs/courrier/${context.originId}`);
  revalidatePath('/visites');
  revalidatePath(`/acquereurs/${context.buyerId}`);
  return warning ? { ok: true, warning } : { ok: true };
}
