import { z } from 'zod';

import { EMBEDDED_FONTS } from '@/features/branding/fonts/font-registry';

const fontKeys = EMBEDDED_FONTS.map((font) => font.key) as [string, ...string[]];

// Mission 57 jalon 2 — ce que le navigateur peut fournir sur la typo : une clé de police
// (parmi la liste embarquée, ou rien → défaut produit) et l'adresse du site (conservée,
// jamais ouverte). Les deux tolèrent le vide et le rendent null. Le site est validé en FORME
// d'URL http(s) — c'est tout ce qu'on garantit, puisqu'on ne l'ouvre jamais.
export const typographyInputSchema = z.object({
  fontFamily: z
    .union([z.enum(fontKeys), z.literal(''), z.null()])
    .transform((value) => (value ? value : null)),
  siteUrl: z
    .union([z.string().trim().url(), z.literal(''), z.null()])
    .transform((value) => (value ? value : null)),
});

export type TypographyInput = z.infer<typeof typographyInputSchema>;
