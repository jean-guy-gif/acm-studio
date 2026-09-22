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

// Mission 54 — quatre issues posables.
const outcomeEnum = z.enum(['signed', 'follow_up', 'sold_elsewhere', 'withdrawn']);

const followUpReason = z
  .string()
  .trim()
  .max(2000)
  .optional()
  // Motif seulement pour « à relancer » (contrainte base pmc_reason_only_follow_up).
  .transform((value) => (value && value.length > 0 ? value : null));

export const conclusionDecisionSchema = z
  .object({ outcome: outcomeEnum, follow_up_reason: followUpReason })
  .transform((input) => ({
    outcome: input.outcome,
    followUpReason: input.outcome === 'follow_up' ? input.follow_up_reason : null,
  }));

// Le changement d'issue depuis le Suivi : mêmes règles que la conclusion.
export const changeOutcomeSchema = conclusionDecisionSchema;

export type ConclusionDecision = z.infer<typeof conclusionDecisionSchema>;
