import { z } from 'zod';

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
});

export type ProspectingFileInput = z.infer<typeof prospectingFileInputSchema>;

export const publicListingUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (value === '') {
      return true;
    }
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  });
