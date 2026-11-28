'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';

import { hashDossierToken, newDossierToken } from '@/features/buyer-dossier/services/dossier-token';
import { getOfferContext } from '@/features/purchase-offer/queries/get-offer-context';
import {
  frenchDay,
  offerInputSchema,
  type StoredOfferFields,
} from '@/features/purchase-offer/services/offer-input';
import { offerGate, offerGateRefusal } from '@/features/purchase-offer/services/offer-gate';
import { offerPath } from '@/features/purchase-offer/services/offer-link';
import {
  OFFER_OUTSIDE_TEMPLATE_VERSION,
  OFFER_TEMPLATE_VERSION,
  OFFRE_AVEC_PRET_VALIDEE,
  renderOffer,
} from '@/features/purchase-offer/services/offer-text';
import { OUTSIDE_TITLE_MISSING } from '@/features/visit-voucher/services/outside-mandate';
import { parisDateLabel } from '@/features/visit-voucher/services/voucher-fields';
import { decodeSignature } from '@/features/visit-voucher/services/voucher-input';
import { SIGNATURE_BUCKET } from '@/features/visit-voucher/services/voucher-link';
import { documentToText } from '@/features/visit-voucher/services/voucher-text';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import type { Json } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SignOfferResult =
  | { ok: true; documentId: string; buyerLinkPath: string; sellerLinkPath: string }
  | { ok: false; error: string };

const FAILED = 'L’offre d’achat n’a pas pu être enregistrée. Réessayez.';

const parisToday = (): string => {
  const [day, month, year] = parisDateLabel(new Date()).split('/');
  return `${year}-${month}-${day}`;
};

// Mission 137 (partie B) — « Signer l'offre d'achat » : tout est relu au serveur — la fiche, la
// visite (« Offre envisagée », mandat signé de l'agence), l'identité légale complète, le cadastre,
// les lots d'une copropriété, une signature par offrant ; le texte validé rendu ici et figé ; le n° de
// mandat et les honoraires gardés sur la conclusion s'ils n'y étaient pas ; puis deux liens de
// 30 jours : la copie des offrants, et celui du vendeur, qui accepte ou refuse.
export async function signPurchaseOffer(raw: unknown): Promise<SignOfferResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  const parsed = offerInputSchema.safeParse(raw);
  if (typeof raw !== 'object' || raw == null || (raw as { approved?: unknown }).approved !== true) {
    return {
      ok: false,
      error: 'Les offrants relisent l’offre et cochent «\u00a0Lu et approuvé\u00a0».',
    };
  }
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues.find((issue) => issue.code === 'custom')?.message ??
        'L’offre est incomplète\u00a0: vérifiez les offrants, le prix, les dates, le cadastre et la signature.',
    };
  }
  const input = parsed.data;
  if (input.validUntil < parisToday()) {
    return { ok: false, error: 'La date de validité est déjà passée.' };
  }
  const read = await getOfferContext(input.buyerId);
  if (!read.ok) return { ok: false, error: read.error };
  const { context } = read;
  // Lot B (Jean-Guy, 27/11) — comment il finance, relu en base : pas encore dit ou encore « À
  // vérifier », avec prêt (tant que la clause n'est pas validée), rien ne se signe, l'offre hors
  // mandat comprise. Une offre comptant renonce à recourir à un prêt.
  const refusal = offerGateRefusal(
    offerGate({
      mode: context.buyer.financingMode,
      toVerify: context.buyer.modeToVerify,
      loanClauseValidated: OFFRE_AVEC_PRET_VALIDEE,
    }),
  );
  if (refusal) return { ok: false, error: refusal };
  if (!context.agency) {
    return {
      ok: false,
      error: `Identité légale de l’agence à compléter (Administration → Identité)\u00a0: ${context.gaps.join(', ')}.`,
    };
  }
  const visit = context.visits.find((entry) => entry.visitId === input.visitId);
  if (!visit || !visit.eligible || (!visit.outside && !visit.projectId)) {
    return { ok: false, error: visit?.note ?? FAILED };
  }
  // Mission 153 — hors mandat : le titre est obligatoire, et l'adresse du bien se saisit quand ACM
  // ne la connaît pas ; sous mandat, aucun titre, et le n° de mandat est exigé.
  const title = visit.outside ? input.title : null;
  if (visit.outside && !title) return { ok: false, error: OUTSIDE_TITLE_MISSING };
  if (!visit.outside && input.title) return { ok: false, error: FAILED };
  if (title?.kind === 'search' && title.signedOn > parisToday()) {
    return { ok: false, error: 'Le mandat de recherche ne peut pas être signé dans le futur.' };
  }
  const propertyAddress = visit.outside
    ? visit.propertyAddress?.trim() || input.propertyAddress?.trim() || null
    : visit.propertyAddress;
  if (!propertyAddress || propertyAddress.length < 5) {
    return {
      ok: false,
      error: visit.outside
        ? 'Indiquez l’adresse du bien.'
        : 'Adresse du bien vendeur manquante\u00a0: complétez la fiche du bien.',
    };
  }
  // Mission 153 (relecteur) — hors mandat, la copropriété est celle que déclare le conseiller.
  const condominium = visit.outside ? input.condominium : visit.condominium;
  if (condominium && input.lots.length === 0) {
    return { ok: false, error: 'Le bien est en copropriété\u00a0: indiquez au moins un lot.' };
  }
  const signatures = input.signatures.map(decodeSignature);
  if (signatures.some((bytes) => bytes == null)) {
    return { ok: false, error: 'Une signature n’a pas pu être lue\u00a0: signez de nouveau.' };
  }
  // Le n° de mandat déjà gardé sur la conclusion l'emporte (il se remplit seul, § 12).
  const mandateNumber = title ? '' : visit.mandateNumber?.trim() || input.mandateNumber;
  if (!title && !mandateNumber) return { ok: false, error: 'Indiquez le n° de mandat.' };

  const text = documentToText(
    renderOffer({
      agency: context.agency,
      offrants: input.offrants.map((offrant) => ({
        ...offrant,
        birthDate: frenchDay(offrant.birthDate),
      })),
      address: input.address,
      matrimonial: input.matrimonial,
      fiscalResidenceFrance: input.fiscalResidenceFrance,
      mandateNumber,
      agent: input.agent,
      condominium,
      propertyAddress,
      parcels: input.parcels,
      totalArea: input.totalArea,
      lots: condominium ? input.lots : [],
      price: input.price,
      feesPaidBy: input.feesPaidBy,
      fees: input.fees,
      financing: input.financing,
      loan: null,
      validUntil: frenchDay(input.validUntil),
      contractDeadline: frenchDay(input.contractDeadline),
      deposit: input.deposit,
      title,
    }),
  );
  const fields: StoredOfferFields = {
    agency: context.agency,
    offrants: input.offrants,
    address: input.address,
    matrimonial: input.matrimonial,
    fiscalResidenceFrance: input.fiscalResidenceFrance,
    mandateNumber,
    propertyAddress,
    price: input.price,
    validUntil: input.validUntil,
    cover: {
      agencyName: context.agency.name,
      agencyAddress: context.agency.address,
      agencyPhone: context.agency.phone,
      agencyEmail: context.agency.email,
      agencySite: context.cover.site,
      photoPath: visit.photoPath,
    },
    visitId: visit.visitId,
    projectId: visit.projectId ?? '',
    title,
  };

  const admin = createServiceRoleClient();
  const documentId = randomUUID();
  const paths = signatures.map(
    (_, index) => `${profile.agency_id}/${documentId}/signature-${index + 1}.png`,
  );
  for (const [index, bytes] of signatures.entries()) {
    const { error } = await admin.storage
      .from(SIGNATURE_BUCKET)
      .upload(paths[index]!, bytes!, { contentType: 'image/png', upsert: false });
    if (error) {
      await reportServerError('signPurchaseOffer', error);
      await admin.storage.from(SIGNATURE_BUCKET).remove(paths.slice(0, index));
      return { ok: false, error: FAILED };
    }
  }
  const { error: insertError } = await admin.from('buyer_documents').insert({
    id: documentId,
    agency_id: profile.agency_id,
    buyer_id: input.buyerId,
    kind: 'purchase_offer',
    template_version: title ? OFFER_OUTSIDE_TEMPLATE_VERSION : OFFER_TEMPLATE_VERSION,
    fields: fields as unknown as NonNullable<Json>,
    rendered_text: text,
    content_sha256: '0'.repeat(64),
    signature_paths: paths,
    valid_until: input.validUntil,
    created_by: profile.id,
  });
  if (insertError) {
    await reportServerError('signPurchaseOffer', insertError);
    await admin.storage.from(SIGNATURE_BUCKET).remove(paths);
    return { ok: false, error: FAILED };
  }
  const { error: visitError } = await admin.from('buyer_document_visits').insert({
    document_id: documentId,
    visit_request_id: visit.visitId,
    agency_id: profile.agency_id,
  });
  if (visitError) {
    await reportServerError('signPurchaseOffer', visitError);
    await admin
      .from('buyer_documents')
      .delete()
      .eq('id', documentId)
      .eq('agency_id', profile.agency_id);
    await admin.storage.from(SIGNATURE_BUCKET).remove(paths);
    return { ok: false, error: FAILED };
  }
  // Le n° de mandat et les honoraires, saisis une fois, repris ensuite : gardés sur la conclusion
  // du mandat s'ils n'y étaient pas (jamais une valeur déjà posée réécrite).
  const patch = {
    ...(visit.mandateNumber == null ? { mandate_number: mandateNumber } : {}),
    ...(visit.fees == null ? { fees_amount: input.fees } : {}),
    ...(visit.feesPaidBy == null ? { fees_paid_by: input.feesPaidBy } : {}),
  };
  if (visit.projectId && Object.keys(patch).length > 0) {
    const { error } = await admin
      .from('project_meeting_conclusions')
      .update(patch)
      .eq('project_id', visit.projectId)
      .eq('agency_id', profile.agency_id);
    if (error) await reportServerError('signPurchaseOffer', error);
  }
  const buyerToken = newDossierToken();
  const sellerToken = newDossierToken();
  const { error: linksError } = await admin.from('buyer_document_links').insert([
    {
      agency_id: profile.agency_id,
      document_id: documentId,
      created_by: profile.id,
      token_hash: hashDossierToken(buyerToken),
      audience: 'visitor',
    },
    {
      agency_id: profile.agency_id,
      document_id: documentId,
      created_by: profile.id,
      token_hash: hashDossierToken(sellerToken),
      audience: 'seller',
    },
  ]);
  if (linksError) await reportServerError('signPurchaseOffer', linksError);
  revalidatePath(`/acquereurs/${input.buyerId}`);
  revalidatePath('/visites');
  revalidatePath('/suivi');
  revalidatePath('/aujourdhui');
  return {
    ok: true,
    documentId,
    buyerLinkPath: linksError ? '' : offerPath(buyerToken),
    sellerLinkPath: linksError ? '' : offerPath(sellerToken),
  };
}
