import { z } from 'zod';

import { FOLLOW_UP_MOTIVES, MANDATE_TYPES } from '@/features/meeting-conclusion/types';

// Mission 53 — validation des saisies de conclusion. Le navigateur ne fournit jamais un
// montant figé ni le status : seulement le prix convenu, l'issue, le motif et — mission 90 —
// le type de mandat.

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

const reason = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

// Champ absent, vide, ou valeur : « vide » n'est pas une erreur, c'est « pas de saisie ».
const optionalPrice = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((raw) => (typeof raw === 'string' && raw.trim() !== '' ? raw : null))
  .pipe(z.union([z.null(), priceFromForm]));

const optionalMandateType = z
  .union([z.enum(MANDATE_TYPES), z.literal(''), z.undefined(), z.null()])
  .transform((value) => (value ? value : null));

// Mission 96 — le motif de relance (boutons) et la ligne de texte de « Autre ».
const optionalMotive = z
  .union([z.enum(FOLLOW_UP_MOTIVES), z.literal(''), z.undefined(), z.null()])
  .transform((value) => (value ? value : null));

const motiveDetail = z
  .string()
  .max(200)
  .optional()
  .transform((value) => {
    const line = value?.replace(/\s+/g, ' ').trim();
    return line ? line : null;
  });

// Ce que le formulaire d'issue envoie (conclusion et « Changer l'issue » : mêmes champs).
// Ce qui est EXIGÉ selon l'issue se décide ensuite, avec ce que la base sait déjà du dossier
// (conclusion-requirements.ts) : ici on ne vérifie que la forme.
export const conclusionDecisionSchema = z
  .object({
    outcome: outcomeEnum,
    follow_up_reason: reason,
    follow_up_motive: optionalMotive,
    follow_up_motive_detail: motiveDetail,
    mandate_type: optionalMandateType,
    commercialization_price: optionalPrice,
  })
  .transform((input) => ({
    outcome: input.outcome,
    reason: input.follow_up_reason,
    motive: input.follow_up_motive,
    motiveDetail: input.follow_up_motive_detail,
    mandateType: input.mandate_type,
    price: input.commercialization_price,
  }));

// Le changement d'issue depuis le Suivi : mêmes règles que la conclusion.
export const changeOutcomeSchema = conclusionDecisionSchema;

export type ConclusionDecision = z.infer<typeof conclusionDecisionSchema>;

// Les champs du formulaire, tels que les deux actions les lisent.
export function readDecisionForm(formData: FormData) {
  return conclusionDecisionSchema.safeParse({
    outcome: formData.get('outcome'),
    follow_up_reason: formData.get('follow_up_reason') ?? undefined,
    follow_up_motive: formData.get('follow_up_motive') ?? undefined,
    follow_up_motive_detail: formData.get('follow_up_motive_detail') ?? undefined,
    mandate_type: formData.get('mandate_type') ?? undefined,
    commercialization_price: formData.get('commercialization_price') ?? undefined,
  });
}
