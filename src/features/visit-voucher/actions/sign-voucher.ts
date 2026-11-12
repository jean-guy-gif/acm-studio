'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';

import { hashDossierToken, newDossierToken } from '@/features/buyer-dossier/services/dossier-token';
import { getVoucherContext } from '@/features/visit-voucher/queries/get-voucher-context';
import {
  parisDateLabel,
  visitorsLabel,
  voucherPrice,
} from '@/features/visit-voucher/services/voucher-fields';
import {
  decodeSignature,
  voucherInputSchema,
  type StoredVoucherFields,
} from '@/features/visit-voucher/services/voucher-input';
import {
  documentToText,
  renderVoucher,
  VISITOR_PIECES,
  VOUCHER_OUTSIDE_TEMPLATE_VERSION,
  VOUCHER_TEMPLATE_VERSION,
} from '@/features/visit-voucher/services/voucher-text';
import {
  OUTSIDE_TITLE_MISSING,
  OUTSIDE_TITLE_MIXED,
} from '@/features/visit-voucher/services/outside-mandate';
import { SIGNATURE_BUCKET, voucherPath } from '@/features/visit-voucher/services/voucher-link';
import { getProfile } from '@/lib/auth/get-profile';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Json } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SignVoucherResult =
  { ok: true; documentId: string; linkPath: string } | { ok: false; error: string };

const FAILED = 'Le bon de visite n’a pas pu être enregistré. Réessayez.';

// Le jour à Paris, AAAA-MM-JJ.
const parisToday = (): string => {
  const [day, month, year] = parisDateLabel(new Date()).split('/');
  return `${year}-${month}-${day}`;
};

// Mission 137 — « Signer le bon de visite » : tout est relu au serveur — la fiche de l'agence, chaque
// visite (de cette fiche, non annulée, et qui peut porter un bon : § 9), l'identité légale complète,
// les signatures (des PNG, une par visiteur) ; le texte validé est rendu ici, figé avec ses champs et
// sa version, l'empreinte et l'heure posées par la base ; puis le lien du visiteur (30 jours). Un
// document signé ne se modifie plus (`buyer_documents`, M137).
export async function signVisitVoucher(raw: unknown): Promise<SignVoucherResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  const parsed = voucherInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Le bon est incomplet : vérifiez le visiteur, les biens et la signature.',
    };
  }
  const input = parsed.data;
  if (input.signatures.length !== input.visitors.length) {
    return { ok: false, error: 'Chaque visiteur signe : une signature par visiteur.' };
  }
  const read = await getVoucherContext(input.buyerId);
  if (!read.ok) return { ok: false, error: read.error };
  const { context } = read;
  if (!context.agency) {
    return {
      ok: false,
      error: `Identité légale de l’agence à compléter (Administration → Identité) : ${context.gaps.join(', ')}.`,
    };
  }
  const visits = new Map(context.visits.map((visit) => [visit.visitId, visit]));
  const ids = new Set<string>();
  for (const bien of input.biens) {
    const visit = visits.get(bien.visitId);
    if (!visit || ids.has(bien.visitId)) return { ok: false, error: FAILED };
    if (!visit.eligible) return { ok: false, error: visit.note ?? FAILED };
    ids.add(bien.visitId);
  }
  // Mission 153 — un bon est sous mandat OU hors mandat, jamais les deux (chacun porte exactement un
  // texte validé) ; hors mandat, le titre est obligatoire et vaut pour tous ses biens ; sous mandat,
  // chaque bien a son n° de mandat.
  const outside = input.biens.map((bien) => visits.get(bien.visitId)!.outside);
  if (outside.some(Boolean) && !outside.every(Boolean)) {
    return { ok: false, error: OUTSIDE_TITLE_MIXED };
  }
  const title = outside[0] ? input.title : null;
  if (outside[0] && !title) return { ok: false, error: OUTSIDE_TITLE_MISSING };
  if (!outside[0] && input.title) return { ok: false, error: FAILED };
  if (!outside[0] && input.biens.some((bien) => !bien.mandate)) {
    return { ok: false, error: 'Indiquez le n° de mandat de chaque bien.' };
  }
  if (title?.kind === 'search' && title.signedOn > parisToday()) {
    return { ok: false, error: 'Le mandat de recherche ne peut pas être signé dans le futur.' };
  }
  const signatures = input.signatures.map(decodeSignature);
  if (signatures.some((bytes) => bytes == null)) {
    return { ok: false, error: 'La signature n’a pas pu être lue : signez de nouveau.' };
  }

  const admin = createServiceRoleClient();
  const { data: references, error: referencesError } = await admin
    .from('buyer_visit_requests')
    .select('id, buyer_selection_items!inner(source, reference)')
    .eq('agency_id', profile.agency_id)
    .eq('buyer_id', input.buyerId)
    .in('id', [...ids]);
  if (referencesError || (references ?? []).length !== ids.size)
    return { ok: false, error: FAILED };
  const referenceOf = new Map(
    (references ?? []).map((row) => {
      const item = row.buyer_selection_items as unknown as { source: string; reference: string };
      return [row.id, `${item.source}:${item.reference}`];
    }),
  );
  const now = new Date();
  const fields: StoredVoucherFields = {
    agency: context.agency,
    visitors: input.visitors,
    visitorAddress: input.visitorAddress,
    piece: input.piece,
    // Ce qu'ACM sait se remplit seul (§ 7) : le prix et l'adresse connus du serveur l'emportent sur
    // ce que dit le navigateur ; seul ce qu'il ne sait pas vient de la saisie.
    biens: input.biens.map((bien) => {
      const visit = visits.get(bien.visitId)!;
      return {
        visitId: bien.visitId,
        reference: referenceOf.get(bien.visitId) ?? '',
        label: visit.label,
        mandate: title ? '' : bien.mandate,
        price: visit.price != null && visit.price > 0 ? Math.round(visit.price) : bien.price,
        address: visit.address?.trim() ? visit.address.trim() : bien.address,
      };
    }),
    advisorName: context.advisorName,
    city: context.city.trim() ? context.city.trim() : input.city,
    date: parisDateLabel(now),
    title,
  };
  const text = documentToText(
    renderVoucher({
      agency: fields.agency,
      visitorName: visitorsLabel(fields.visitors),
      visitorAddress: fields.visitorAddress,
      visitorPiece: VISITOR_PIECES[fields.piece],
      biens: fields.biens.map((bien) => ({
        mandate: bien.mandate,
        price: voucherPrice(bien.price),
        address: bien.address,
      })),
      advisorName: fields.advisorName,
      city: fields.city,
      date: fields.date,
      title,
    }),
  );

  const documentId = randomUUID();
  const paths = signatures.map(
    (_, index) => `${profile.agency_id}/${documentId}/signature-${index + 1}.png`,
  );
  for (const [index, bytes] of signatures.entries()) {
    const { error } = await admin.storage
      .from(SIGNATURE_BUCKET)
      .upload(paths[index]!, bytes!, { contentType: 'image/png', upsert: false });
    if (error) {
      await reportServerError('signVisitVoucher', error);
      await admin.storage.from(SIGNATURE_BUCKET).remove(paths.slice(0, index));
      return { ok: false, error: FAILED };
    }
  }
  const { error: insertError } = await admin.from('buyer_documents').insert({
    id: documentId,
    agency_id: profile.agency_id,
    buyer_id: input.buyerId,
    kind: 'visit_voucher',
    template_version: title ? VOUCHER_OUTSIDE_TEMPLATE_VERSION : VOUCHER_TEMPLATE_VERSION,
    fields: fields as unknown as NonNullable<Json>,
    rendered_text: text,
    // Recalculée par la base sur le texte figé.
    content_sha256: '0'.repeat(64),
    signature_paths: paths,
    created_by: profile.id,
  });
  if (insertError) {
    await reportServerError('signVisitVoucher', insertError);
    await admin.storage.from(SIGNATURE_BUCKET).remove(paths);
    return { ok: false, error: FAILED };
  }
  const { error: visitsError } = await admin.from('buyer_document_visits').insert(
    [...ids].map((visitId) => ({
      document_id: documentId,
      visit_request_id: visitId,
      agency_id: profile.agency_id,
    })),
  );
  if (visitsError) {
    // Un bon gardé sur la visite (§ 10) : sans son rattachement, il n'est pas enregistré.
    await reportServerError('signVisitVoucher', visitsError);
    await admin
      .from('buyer_documents')
      .delete()
      .eq('id', documentId)
      .eq('agency_id', profile.agency_id);
    await admin.storage.from(SIGNATURE_BUCKET).remove(paths);
    return { ok: false, error: FAILED };
  }
  const token = newDossierToken();
  const { error: linkError } = await admin.from('buyer_document_links').insert({
    agency_id: profile.agency_id,
    document_id: documentId,
    created_by: profile.id,
    token_hash: hashDossierToken(token),
  });
  if (linkError) await reportServerError('signVisitVoucher', linkError);
  revalidatePath(`/acquereurs/${input.buyerId}`);
  revalidatePath('/visites');
  return { ok: true, documentId, linkPath: linkError ? '' : voucherPath(token) };
}
