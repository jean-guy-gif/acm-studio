import { z } from 'zod';

import {
  VISIT_NEXT_STEPS,
  VISIT_OPINIONS,
  VISIT_TAGS,
} from '@/features/buyer-messages/templates/types';

// Mission 139 — le compte rendu de visite, relu au serveur : des listes fermées, la note libre de
// 2 000 caractères (M119), les étiquettes dédoublonnées.
export const visitReportSchema = z
  .object({
    opinion: z.enum(VISIT_OPINIONS),
    liked: z.array(z.enum(VISIT_TAGS)).max(VISIT_TAGS.length),
    disliked: z.array(z.enum(VISIT_TAGS)).max(VISIT_TAGS.length),
    nextStep: z.enum(VISIT_NEXT_STEPS),
    note: z.string().trim().max(2000),
  })
  // « Pas pour moi » puis « Offre envisagée » se contredisent : l'écran ne le propose pas.
  .refine((report) => !(report.opinion === 'not_for_me' && report.nextStep === 'offer'), {
    message: '« Pas pour moi » et « Offre envisagée » se contredisent.',
  })
  .transform((report) => ({
    ...report,
    // Dédoublonnées, dans l'ordre de la liste (la base n'en refuse pas les doublons).
    liked: VISIT_TAGS.filter((tag) => report.liked.includes(tag)),
    disliked: VISIT_TAGS.filter((tag) => report.disliked.includes(tag)),
  }));
export type VisitReportInput = z.infer<typeof visitReportSchema>;

// Correctif du 13/11 — la suite seule, quand elle se change après la visite.
export const visitNextStepSchema = z.enum(VISIT_NEXT_STEPS);
