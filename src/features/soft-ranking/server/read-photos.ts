import 'server-only';

import type { BuyerSoftCriterionKey } from '@/features/buyers/types';
import {
  PHOTO_FIXED_INPUT_TOKENS,
  PHOTO_INPUT_TOKENS,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_OUTPUT_TOKENS,
  PHOTOS_PER_LISTING,
  photoInstructions,
  photoSchema,
} from '@/features/soft-ranking/photo-request';
import { guardPhotoJudgments } from '@/features/soft-ranking/services/judgments';
import type { PhotoJudgment } from '@/features/soft-ranking/types';
import { fetchListingImage } from '@/features/subject-property-import/services/fetch-listing-image';
import { IMAGE_CONTENT_TYPE } from '@/features/subject-property-photos/constants';
import { sniffImageFormat } from '@/features/subject-property-photos/services/validate-photo-upload';
import { callStructured, type AiContentBlock } from '@/lib/ai/bedrock';
import { costMillicents, worstCaseMillicents } from '@/lib/ai/models';

// Lancement, mission 9 — la lecture des photos des biens les mieux classés, côté serveur : les
// premières photos de l'annonce, chargées par le chargeur d'images des annonces (M38 : protocole,
// hôte et redirections vérifiés, délai, taille), reconnues à leurs octets, puis une annonce par
// appel. Une photo que son hébergeur refuse garde son numéro et n'est pas envoyée ; rien n'est
// contourné. Rien n'est gardé : ni une photo, ni une adresse de photo — seulement un verdict et des
// numéros, relus (`guardPhotoJudgments`). Jamais plus que ce que la réservation couvre (M105).

export type PhotoPick = { key: string; urls: string[] };
export type PhotoRead = {
  byKey: Map<string, Map<BuyerSoftCriterionKey, PhotoJudgment>>;
  spent: number;
};

const MIN_CALL_MS = 4_000;

// Le pire cas d'une annonce : toutes ses photos, la consigne, toute la sortie permise.
export const photoWorstCase = (model: string): number =>
  worstCaseMillicents(model, {
    estimatedInputTokens: PHOTO_FIXED_INPUT_TOKENS + PHOTOS_PER_LISTING * PHOTO_INPUT_TOKENS,
    maxOutputTokens: PHOTO_MAX_OUTPUT_TOKENS,
  }) ?? 0;

type Loaded = { number: number; block: AiContentBlock };

async function loadPhoto(
  url: string,
  number: number,
  fetchImage: typeof fetchListingImage,
): Promise<Loaded | null> {
  const fetched = await fetchImage(url);
  if (!fetched.ok || fetched.bytes.byteLength > PHOTO_MAX_BYTES) return null;
  const format = sniffImageFormat(fetched.bytes);
  if (!format) return null;
  return {
    number,
    block: {
      type: 'image',
      source: {
        type: 'base64',
        media_type: IMAGE_CONTENT_TYPE[format] as 'image/jpeg' | 'image/png' | 'image/webp',
        data: Buffer.from(fetched.bytes).toString('base64'),
      },
    },
  };
}

export async function readListingPhotos(input: {
  picks: readonly PhotoPick[];
  // Les critères de la fiche qu'une photo peut montrer (`photoCriteria`).
  criteria: readonly BuyerSoftCriterionKey[];
  model: string;
  // L'heure limite du classement (planche 4 b) : au-delà, les photos ne sont pas lues.
  deadline: number;
  // Ce que la réservation couvre encore, en millièmes de centime.
  room: number;
  fetchImage?: typeof fetchListingImage;
}): Promise<PhotoRead> {
  const byKey: PhotoRead['byKey'] = new Map();
  let spent = 0;
  if (input.criteria.length === 0) return { byKey, spent };
  const worst = photoWorstCase(input.model);
  const fetchImage = input.fetchImage ?? fetchListingImage;
  let room = input.room;
  const covered = input.picks.filter((pick) => {
    if (pick.urls.length === 0 || worst > room) return false;
    room -= worst;
    return true;
  });

  await Promise.all(
    covered.map(async (pick) => {
      const loadTime = input.deadline - Date.now() - MIN_CALL_MS;
      if (loadTime <= 0) return;
      // Le chargement ne déborde jamais du délai du classement : au-delà, ce bien n'a pas de
      // photos lues, et le texte reste jugé.
      const all = await Promise.race([
        Promise.all(
          pick.urls
            .slice(0, PHOTOS_PER_LISTING)
            .map((url, index) => loadPhoto(url, index + 1, fetchImage)),
        ),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), loadTime)),
      ]);
      const loaded = (all ?? []).filter((photo): photo is Loaded => photo != null);
      const left = input.deadline - Date.now();
      if (loaded.length === 0 || left < MIN_CALL_MS) return;
      const answer = await callStructured({
        system: photoInstructions(input.criteria),
        content: loaded.flatMap((photo): AiContentBlock[] => [
          { type: 'text', text: `Photo ${photo.number} :` },
          photo.block,
        ]),
        schema: photoSchema(input.criteria),
        maxTokens: PHOTO_MAX_OUTPUT_TOKENS,
        model: input.model,
        timeoutMs: left,
      });
      spent += answer.usage ? (costMillicents(input.model, answer.usage) ?? worst) : worst;
      if (!answer.ok) return;
      const seen = guardPhotoJudgments(
        answer.json,
        input.criteria,
        new Set(loaded.map((photo) => photo.number)),
      );
      if (seen.size > 0) byKey.set(pick.key, seen);
    }),
  );
  return { byKey, spent };
}
