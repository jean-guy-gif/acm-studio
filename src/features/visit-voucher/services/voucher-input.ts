import { z } from 'zod';

import { outsideTitleSchema } from '@/features/visit-voucher/services/outside-mandate';
import { VISITOR_CIVILITIES } from '@/features/visit-voucher/services/voucher-fields';
import { VISITOR_PIECES, type VoucherAgency } from '@/features/visit-voucher/services/voucher-text';

// Mission 137 — ce que l'écran du bon de visite envoie, et ce que le document signé garde de ses
// champs. Relus au serveur, par liste d'autorisation : jamais le numéro ni l'image d'une pièce
// d'identité (le type seul), deux visiteurs au plus, cinq biens au plus.

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
const piece = z.enum(Object.keys(VISITOR_PIECES) as [keyof typeof VISITOR_PIECES]);
// Mission 154 — le visiteur saisi : sa civilité, son prénom et son nom, chacun exigé (jamais « M.
// Famille Keller ») ; gardé aussi en un nom (`name`) pour le texte figé.
const visitorInput = z.object({
  civility: z.enum(VISITOR_CIVILITIES),
  firstName: trimmed(1, 80),
  lastName: trimmed(1, 80),
});
// Un bon signé avant la mission n'a que `name`.
const visitor = z.object({
  civility: z.enum(VISITOR_CIVILITIES),
  name: trimmed(2, 120),
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
});

export const MAX_VOUCHER_BIENS = 5;
export const MAX_SIGNATURE_BYTES = 256 * 1024;

export const voucherInputSchema = z.object({
  buyerId: z.uuid(),
  visitors: z.array(visitorInput).min(1).max(2),
  visitorAddress: trimmed(5, 300),
  piece,
  city: trimmed(1, 80),
  biens: z
    .array(
      z.object({
        visitId: z.uuid(),
        // Un bien sous mandat de l'agence : son n° (exigé au serveur). Hors mandat : vide, le titre
        // le remplace (Mission 153).
        mandate: z.string().trim().max(40),
        price: z.number().int().min(1).max(999_999_999),
        address: trimmed(5, 300),
        // Mission 154 (point 3) — le bon de la tournée : le titre de CE bien hors mandat.
        title: outsideTitleSchema.nullable().default(null),
      }),
    )
    .min(1)
    .max(MAX_VOUCHER_BIENS),
  // Mission 153 — un bon hors mandat : le titre auquel l'Agence intervient, un seul pour le bon.
  title: outsideTitleSchema.nullable().default(null),
  // Une image PNG par visiteur, tracée au doigt (`data:image/png;base64,…`).
  signatures: z.array(z.string().startsWith('data:image/png;base64,').max(400_000)).min(1).max(2),
  approved: z.literal(true),
});
export type VoucherInput = z.infer<typeof voucherInputSchema>;

const agencySchema = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  companyName: z.string(),
  companyForm: z.string(),
  shareCapital: z.string(),
  companySeat: z.string(),
  rcsCity: z.string(),
  rcsNumber: z.string(),
  cardNumber: z.string(),
  cardIssuer: z.string(),
  vatNumber: z.string(),
  rcpInsurer: z.string(),
  rcpAddress: z.string(),
  rcpNumber: z.string(),
  guaranteeBody: z.string(),
  guaranteeAddress: z.string(),
  guaranteeNumber: z.string(),
  representativeName: z.string(),
  representativeTitle: z.string(),
}) satisfies z.ZodType<VoucherAgency>;

// Les champs d'un bon signé, tels que la base les garde (`buyer_documents.fields`).
export const storedVoucherFieldsSchema = z.object({
  agency: agencySchema,
  visitors: z.array(visitor).min(1).max(2),
  visitorAddress: z.string().max(300),
  piece,
  biens: z
    .array(
      z.object({
        visitId: z.string(),
        // `source:référence` du bien retenu, pour pré-remplir le n° de mandat la fois suivante.
        reference: z.string().max(2100),
        label: z.string().max(300),
        mandate: z.string().max(40),
        price: z.number(),
        address: z.string().max(300),
        // Mission 154 — le titre de ce bien, dans un bon de la tournée.
        title: outsideTitleSchema.nullable().optional(),
      }),
    )
    .min(1)
    .max(MAX_VOUCHER_BIENS),
  advisorName: z.string().max(200),
  city: z.string().max(80),
  date: z.string().max(10),
  // Mission 153 — absent d'un bon signé avant la mission (sous mandat).
  title: outsideTitleSchema.nullable().optional(),
});
export type StoredVoucherFields = z.infer<typeof storedVoucherFieldsSchema>;

export function readVoucherFields(raw: unknown): StoredVoucherFields | null {
  const parsed = storedVoucherFieldsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

// Une signature : un PNG (vérifié par ses octets), pas plus de 256 Ko.
export function decodeSignature(dataUrl: string): Uint8Array | null {
  const base64 = dataUrl.slice('data:image/png;base64,'.length);
  if (!/^[A-Za-z0-9+/]+=*$/.test(base64)) return null;
  const bytes = Uint8Array.from(Buffer.from(base64, 'base64'));
  const magic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 64 || bytes.length > MAX_SIGNATURE_BYTES) return null;
  if (!magic.every((value, index) => bytes[index] === value)) return null;
  return bytes;
}
