'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  guaranteeLine,
  LEGAL_TEXT_FIELDS,
  type LegalIdentity,
} from '@/features/legal-identity/services/legal-identity';
import { requireManagerProfile } from '@/features/team/services/require-manager';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SaveLegalIdentityResult = { ok: true } | { ok: false; error: string };

const FAILED = 'L’identité légale n’a pas pu être enregistrée. Réessayez.';

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null);

const schema = z.object({
  ...Object.fromEntries(LEGAL_TEXT_FIELDS.map((field) => [field.key, text(field.max)])),
  agencyEmail: z
    .string()
    .trim()
    .max(200)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null)
    .refine((value) => value == null || z.email().safeParse(value).success),
  guaranteeAmount: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s  ]/g, '').replace(',', '.'))
    .nullable()
    .optional()
    .transform((value) => (value == null || value === '' ? null : Number(value)))
    .refine((value) => value == null || (Number.isFinite(value) && value > 0 && value < 1e12)),
});

// Mission 137 — l'identité légale de l'agence (Administration → Identité), par le manager seul
// (M88) ; le serveur relit tout. La garantie structurée remplace le texte libre de la charte : il
// est recomposé ici (`guaranteeLine`), et les documents qui le lisent (M102) ne changent pas.
export async function saveLegalIdentity(raw: unknown): Promise<SaveLegalIdentityResult> {
  const guard = await requireManagerProfile();
  if (!guard.ok) return { ok: false, error: guard.error };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        'Un champ est trop long, l’e-mail est invalide ou le montant de la garantie n’est pas un nombre.',
    };
  }
  const value = parsed.data as unknown as LegalIdentity;
  const agencyId = guard.profile.agency_id;
  const client = createServiceRoleClient();
  const { error } = await client.from('agency_legal_identities').upsert(
    {
      agency_id: agencyId,
      company_name: value.companyName,
      company_form: value.companyForm,
      share_capital: value.shareCapital,
      company_seat: value.companySeat,
      rcs_city: value.rcsCity,
      rcs_number: value.rcsNumber,
      vat_number: value.vatNumber,
      agency_phone: value.agencyPhone,
      agency_email: value.agencyEmail,
      rcp_insurer: value.rcpInsurer,
      rcp_address: value.rcpAddress,
      rcp_number: value.rcpNumber,
      guarantee_body: value.guaranteeBody,
      guarantee_address: value.guaranteeAddress,
      guarantee_number: value.guaranteeNumber,
      guarantee_amount: value.guaranteeAmount,
      representative_name: value.representativeName,
      representative_title: value.representativeTitle,
      updated_by: guard.profile.id,
    },
    { onConflict: 'agency_id' },
  );
  if (error) return { ok: false, error: FAILED };
  const line = guaranteeLine(value);
  if (line) {
    await client
      .from('agency_branding')
      .update({ financial_guarantee: line })
      .eq('agency_id', agencyId);
  }
  revalidatePath('/admin/identite');
  return { ok: true };
}
