import { z } from 'zod';

import { OFFRE_AVEC_PRET_VALIDEE } from '@/features/purchase-offer/services/offer-text';

// Mission 137 (partie B) — ce que l'écran de l'offre d'achat envoie, et ce que l'offre signée garde.
// Relus au serveur, par liste d'autorisation : deux offrants au plus ; le cadastre exigé (la phrase
// du texte validé n'est pas conditionnelle) ; les lots seulement en copropriété ; « avec prêt »
// refusé tant que la clause n'est pas validée ; dates en AAAA-MM-JJ.

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const euros = z.number().int().min(1).max(9_999_999);

export const offrantSchema = z.object({
  civility: z.enum(['M.', 'Mme']),
  lastName: trimmed(1, 80),
  firstNames: trimmed(1, 120),
  birthDate: day,
  birthPlace: trimmed(1, 120),
  nationality: trimmed(2, 60),
  profession: trimmed(2, 120),
});

export const parcelSchema = z.object({
  prefix: z.string().trim().max(10),
  section: trimmed(1, 10),
  number: trimmed(1, 10),
  lieudit: z.string().trim().max(120),
  area: trimmed(1, 40),
});

export const lotSchema = z.object({
  number: z.number().int().min(1).max(99_999),
  description: trimmed(2, 400),
  shares: z.number().int().min(1).max(9_999_999),
  base: z.number().int().min(1).max(9_999_999),
});

export const offerInputSchema = z
  .object({
    buyerId: z.uuid(),
    visitId: z.uuid(),
    offrants: z.array(offrantSchema).min(1).max(2),
    address: trimmed(5, 300),
    matrimonial: z.string().trim().max(300).nullable(),
    fiscalResidenceFrance: z.boolean(),
    mandateNumber: trimmed(1, 40),
    agent: z.object({ name: trimmed(2, 160), rsac: trimmed(2, 60) }).nullable(),
    parcels: z.array(parcelSchema).min(1).max(10),
    totalArea: trimmed(1, 40),
    lots: z.array(lotSchema).max(10),
    price: euros,
    fees: euros,
    feesPaidBy: z.enum(['seller', 'buyer']),
    deposit: euros,
    financing: z.enum(['cash', 'loan']),
    validUntil: day,
    contractDeadline: day,
    signatures: z.array(z.string().startsWith('data:image/png;base64,').max(400_000)).min(1).max(2),
  })
  .refine((input) => input.signatures.length === input.offrants.length, {
    message: 'Une signature par offrant.',
  })
  .refine((input) => input.contractDeadline >= input.validUntil, {
    message: 'L’avant-contrat se signe après la fin de validité de l’offre.',
  })
  .refine((input) => OFFRE_AVEC_PRET_VALIDEE || input.financing === 'cash', {
    message: 'L’offre avec prêt attend la validation du juriste.',
  });
export type OfferInput = z.infer<typeof offerInputSchema>;

const agencySchema = z.record(z.string(), z.union([z.string(), z.number()]));

// Les champs d'une offre signée (`buyer_documents.fields`), relus pour pré-remplir la suivante et
// pour la couverture.
export const storedOfferFieldsSchema = z.object({
  agency: agencySchema,
  offrants: z.array(offrantSchema).min(1).max(2),
  address: z.string().max(300),
  matrimonial: z.string().max(300).nullable(),
  fiscalResidenceFrance: z.boolean(),
  mandateNumber: z.string().max(40),
  propertyAddress: z.string().max(300),
  price: z.number(),
  validUntil: day,
  cover: z.object({
    agencyName: z.string().max(200),
    agencyAddress: z.string().max(300),
    agencyPhone: z.string().max(60),
    agencyEmail: z.string().max(200),
    agencySite: z.string().max(300).nullable(),
    // Le chemin de la photo du bien vendeur dans le stockage privé (M37), signé à l'affichage.
    photoPath: z.string().max(400).nullable(),
  }),
  visitId: z.string(),
  projectId: z.string(),
});
export type StoredOfferFields = z.infer<typeof storedOfferFieldsSchema>;

export function readOfferFields(raw: unknown): StoredOfferFields | null {
  const parsed = storedOfferFieldsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

// Réponse du vendeur sur son lien : « Bon pour acceptation » signé par chaque propriétaire (deux au
// plus), ou « Je refuse ».
export const offerResponseSchema = z.discriminatedUnion('decision', [
  z.object({
    decision: z.literal('accepted'),
    signers: z.array(trimmed(2, 160)).min(1).max(2),
    signatures: z.array(z.string().startsWith('data:image/png;base64,').max(400_000)).min(1).max(2),
  }),
  z.object({ decision: z.literal('refused') }),
]);
export type OfferResponse = z.infer<typeof offerResponseSchema>;

export { frenchDay } from '@/features/purchase-offer/services/offer-dates';
