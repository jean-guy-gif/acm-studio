import { z } from 'zod';

// Mission 53 — validation des saisies de conclusion. Le navigateur ne fournit jamais un
// montant figé ni le status : seulement le prix convenu, l'issue et le motif.

// Un prix « à la française » : espaces fines, séparateur virgule tolérés.
const priceFromForm = z
  .string()
  .transform((raw) => Number(raw.replace(/\s/g, '').replace(',', '.')))
  .pipe(z.number().finite().positive());

export const commercializationPriceSchema = z.object({
  commercialization_price: priceFromForm,
});

export const conclusionDecisionSchema = z
  .object({
    outcome: z.enum(['signed', 'follow_up']),
    // Note de travail, seulement pour « à relancer ». ≤ 2000 (contrainte base).
    follow_up_reason: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
  })
  .transform((input) => ({
    outcome: input.outcome,
    followUpReason: input.outcome === 'follow_up' ? input.follow_up_reason : null,
  }));

export type ConclusionDecision = z.infer<typeof conclusionDecisionSchema>;
