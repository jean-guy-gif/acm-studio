import { z } from 'zod';

import { THEIR_PHOTO_URL_MAX_LENGTH } from '@/features/prospecting-file/services/their-photo';
import { PROSPECTING_FILE_VERSIONS } from '@/features/prospecting-file/types';

// Mission 84 — ce que l'écran d'édition envoie. Tout vient du navigateur : revalidé ici. Les
// longueurs sont celles des contraintes de la table.

const text = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => value.replace(/\r\n/g, '\n').trim());

export const prospectingFileInputSchema = z.object({
  version: z.enum(PROSPECTING_FILE_VERSIONS),
  title: text(300),
  letter: text(2000),
  keyMessage: text(400),
  proposals: z.tuple([text(300), text(300), text(300)]),
  contactHook: text(120),
  showPrices: z.boolean(),
  photoPath: z.string().max(300).nullable(),
  // Mission 87 — la photo du bien concurrent : une photo de son annonce, « Ma photo », ou
  // « Sans photo ». Ce qui est permis est revérifié contre l'annonce et le stockage.
  theirPhoto: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('listing'), url: z.string().url().max(THEIR_PHOTO_URL_MAX_LENGTH) }),
    z.object({ mode: z.literal('upload'), path: z.string().min(1).max(300) }),
    z.object({ mode: z.literal('none') }),
  ]),
});

export type ProspectingFileInput = z.infer<typeof prospectingFileInputSchema>;
