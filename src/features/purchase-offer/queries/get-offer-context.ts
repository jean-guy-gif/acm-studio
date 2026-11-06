import 'server-only';

import { readVisitLines } from '@/features/buyer-presentation/queries/get-visit-requests';
import { readLegalIdentity } from '@/features/legal-identity/queries/get-legal-identity';
import { legalIdentityGaps } from '@/features/legal-identity/services/legal-identity';
import {
  readOfferFields,
  type StoredOfferFields,
} from '@/features/purchase-offer/services/offer-input';
import type { OfferAgency } from '@/features/purchase-offer/services/offer-text';
import { voucherAgency } from '@/features/visit-voucher/services/voucher-fields';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 137 (partie B) — ce que l'écran de l'offre d'achat sait déjà : les visites de l'acquéreur
// « Offre envisagée » (M119) sur un bien en MANDAT SIGNÉ de l'agence (« l'Agence titulaire d'un
// mandat de négociation régulièrement inscrit sur son Registre des mandats » : un bien du marché ou
// en collaboration n'est pas sous le mandat de l'agence, il dit pourquoi) ; pour chacune, le dossier
// vendeur (adresse, copropriété, photo), le prix de commercialisation, le n° de mandat et les
// honoraires déjà saisis ; l'agence (identité légale complète, sinon ce qui manque) ; et les offrants
// de la dernière offre de la fiche, pour pré-remplir.

export const OFFER_NOT_MANDATE =
  'Offre d’achat : seulement pour un bien en mandat signé de l’agence, après une visite « Offre envisagée ».';

export type OfferVisit = {
  visitId: string;
  label: string;
  eligible: boolean;
  note: string | null;
  projectId: string | null;
  price: number | null;
  propertyAddress: string | null;
  condominium: boolean;
  mandateNumber: string | null;
  fees: number | null;
  feesPaidBy: 'seller' | 'buyer' | null;
  photoPath: string | null;
  visitedAt: string | null;
  // Les coordonnées du vendeur (dossier), pour lui envoyer son lien (l'outil n'envoie rien).
  sellerEmail: string | null;
  sellerPhone: string | null;
};

export type OfferContext = {
  buyer: { id: string; name: string; email: string | null };
  visits: OfferVisit[];
  agency: OfferAgency | null;
  gaps: string[];
  cover: { site: string | null };
  advisorFirstName: string | null;
  last: StoredOfferFields | null;
};

const number = (value: unknown): number | null => {
  const parsed = Number(value);
  return value != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export async function getOfferContext(
  buyerId: string,
): Promise<{ ok: true; context: OfferContext } | { ok: false; error: string }> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  if (!/^[0-9a-f-]{36}$/i.test(buyerId)) return { ok: false, error: 'Fiche introuvable.' };
  const supabase = await createClient();
  const agencyId = profile.agency_id;
  const [buyer, agency, branding, legal, visitRead, lastOffer] = await Promise.all([
    supabase
      .from('buyers')
      .select('id, name, email')
      .eq('id', buyerId)
      .eq('agency_id', agencyId)
      .is('archived_at', null)
      .maybeSingle(),
    supabase.from('agencies').select('name').eq('id', agencyId).maybeSingle(),
    supabase
      .from('agency_branding')
      .select(
        'document_name, postal_address, professional_card, professional_card_issuer, site_url',
      )
      .eq('agency_id', agencyId)
      .maybeSingle(),
    readLegalIdentity(supabase, agencyId),
    readVisitLines(),
    supabase
      .from('buyer_documents')
      .select('fields')
      .eq('agency_id', agencyId)
      .eq('buyer_id', buyerId)
      .eq('kind', 'purchase_offer')
      .order('signed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!buyer.data) return { ok: false, error: 'Fiche introuvable.' };
  if (!legal.ok || branding.error || visitRead.failed) {
    return { ok: false, error: 'L’offre d’achat n’a pas pu être préparée : rechargez la page.' };
  }
  const mentions = {
    documentName: branding.data?.document_name ?? null,
    postalAddress: branding.data?.postal_address ?? null,
    professionalCard: branding.data?.professional_card ?? null,
    professionalCardIssuer: branding.data?.professional_card_issuer ?? null,
  };
  const gaps = legalIdentityGaps(legal.identity, mentions);
  const base = voucherAgency({
    identity: legal.identity,
    branding: mentions,
    agencyName: agency.data?.name ?? '',
  });
  const offerAgency: OfferAgency | null =
    base && legal.identity.guaranteeAmount != null
      ? { ...base, guaranteeAmount: legal.identity.guaranteeAmount }
      : null;

  const lines = visitRead.lines.filter((line) => line.buyerId === buyerId && !line.buyerArchived);
  const projectIds = [
    ...new Set(lines.filter((line) => line.itemSource === 'project').map((l) => l.itemReference)),
  ];
  const [conclusions, subjects, projects] = await Promise.all([
    projectIds.length > 0
      ? supabase
          .from('project_meeting_conclusions')
          .select(
            'project_id, outcome, commercialization_price, mandate_number, fees_amount, fees_paid_by',
          )
          .eq('agency_id', agencyId)
          .in('project_id', projectIds)
      : Promise.resolve({ data: [], error: null }),
    projectIds.length > 0
      ? supabase
          .from('subject_properties')
          .select('id, project_id, address, postal_code, city, photo_urls')
          .eq('agency_id', agencyId)
          .in('project_id', projectIds)
      : Promise.resolve({ data: [], error: null }),
    projectIds.length > 0
      ? supabase
          .from('projects')
          .select('id, seller_email, seller_phone, status')
          .eq('agency_id', agencyId)
          .in('id', projectIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (conclusions.error || subjects.error || projects.error) {
    return { ok: false, error: 'L’offre d’achat n’a pas pu être préparée : rechargez la page.' };
  }
  const subjectIds = (subjects.data ?? []).map((row) => row.id);
  const condos =
    subjectIds.length > 0
      ? await supabase
          .from('subject_property_condominiums')
          .select('subject_property_id, is_condominium')
          .eq('agency_id', agencyId)
          .in('subject_property_id', subjectIds)
      : { data: [], error: null };
  const conclusionOf = new Map((conclusions.data ?? []).map((row) => [row.project_id, row]));
  const projectOf = new Map((projects.data ?? []).map((row) => [row.id, row]));
  const subjectOf = new Map((subjects.data ?? []).map((row) => [row.project_id, row]));
  const condoOf = new Map(
    (condos.data ?? []).map((row) => [row.subject_property_id, row.is_condominium]),
  );

  const visits: OfferVisit[] = lines.map((line) => {
    const projectId = line.itemSource === 'project' ? line.itemReference : null;
    const conclusion = projectId ? conclusionOf.get(projectId) : undefined;
    const subject = projectId ? subjectOf.get(projectId) : undefined;
    const signed =
      conclusion?.outcome === 'signed' &&
      (projectId ? projectOf.get(projectId)?.status !== 'archived' : false);
    const eligible = signed && line.outcome === 'offer';
    const photos = Array.isArray(subject?.photo_urls) ? (subject.photo_urls as unknown[]) : [];
    const photoPath =
      typeof photos[0] === 'string' && photos[0].startsWith(`${agencyId}/${projectId}/`)
        ? photos[0]
        : null;
    return {
      visitId: line.id,
      label: line.itemLabel,
      eligible,
      note: eligible
        ? 'Offre envisagée · mandat signé'
        : signed
          ? 'Marquez d’abord la visite « Offre envisagée » (Visites).'
          : OFFER_NOT_MANDATE,
      projectId,
      price: number(conclusion?.commercialization_price) ?? line.itemPrice,
      propertyAddress:
        [subject?.address, [subject?.postal_code, subject?.city].filter(Boolean).join(' ')]
          .filter((part) => part && part.trim())
          .join(', ') || null,
      condominium: subject ? condoOf.get(subject.id) === true : false,
      mandateNumber: conclusion?.mandate_number ?? null,
      fees: number(conclusion?.fees_amount),
      feesPaidBy:
        conclusion?.fees_paid_by === 'seller' || conclusion?.fees_paid_by === 'buyer'
          ? conclusion.fees_paid_by
          : null,
      photoPath,
      visitedAt: line.visitedAt,
      sellerEmail: projectId ? (projectOf.get(projectId)?.seller_email ?? null) : null,
      sellerPhone: projectId ? (projectOf.get(projectId)?.seller_phone ?? null) : null,
    };
  });

  return {
    ok: true,
    context: {
      buyer: { id: buyer.data.id, name: buyer.data.name, email: buyer.data.email },
      visits,
      agency: offerAgency,
      gaps,
      cover: { site: branding.data?.site_url ?? null },
      advisorFirstName: profile.first_name ?? null,
      last: readOfferFields(lastOffer.data?.fields),
    },
  };
}
