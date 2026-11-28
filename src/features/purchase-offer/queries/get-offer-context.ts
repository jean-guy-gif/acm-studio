import 'server-only';

import { canTurnIntoOffer, NEXT_STEP_LABELS } from '@/features/buyer-messages/report';
import {
  readVisitLines,
  type VisitLine,
} from '@/features/buyer-presentation/queries/get-visit-requests';
import { VISIT_OUTCOME_LABELS } from '@/features/buyer-presentation/types';
import { BUYER_FINANCING_MODES, type BuyerFinancingMode } from '@/features/buyers/types';
import { getVisitLetters } from '@/features/buyer-prospecting/queries/get-visit-letters';
import {
  HORS_MANDAT_OUVERT,
  readOutsideTitle,
  type OutsideTitle,
} from '@/features/visit-voucher/services/outside-mandate';
import { readVoucherFields } from '@/features/visit-voucher/services/voucher-input';
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
import { getProjectOfferAnswers } from '@/features/purchase-offer/queries/get-offer-answers';
import { parisDateLabel } from '@/features/visit-voucher/services/voucher-fields';

// Mission 137 (partie B) — ce que l'écran de l'offre d'achat sait déjà : les visites de l'acquéreur
// « Offre envisagée » (M119) sur un bien en MANDAT SIGNÉ de l'agence (« l'Agence titulaire d'un
// mandat de négociation régulièrement inscrit sur son Registre des mandats » : un bien du marché ou
// en collaboration n'est pas sous le mandat de l'agence, il dit pourquoi) ; pour chacune, le dossier
// vendeur (adresse, copropriété, photo), le prix de commercialisation, le n° de mandat et les
// honoraires déjà saisis ; l'agence (identité légale complète, sinon ce qui manque) ; et les offrants
// de la dernière offre de la fiche, pour pré-remplir.

export const OFFER_NOT_MANDATE =
  'Offre d’achat\u00a0: seulement pour un bien en mandat signé de l’agence, après une visite «\u00a0Offre envisagée\u00a0».';

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
  // Mission 138 — une offre déjà acceptée sur ce bien : le jour de l'acceptation (JJ/MM/AAAA), pour
  // prévenir ; rien n'est bloqué.
  acceptedOfferOn: string | null;
  // Mission 153 — un bien hors mandat de l'agence : le titre remplace le n° de mandat, l'adresse et
  // les honoraires se saisissent ; le titre du bon de cette visite, s'il y en a un, est proposé.
  outside: boolean;
  suggestion: OutsideTitle | { kind: 'colleague'; agency: string; number: string } | null;
  // L'annonce dit le bien commercialisé par une agence (« Vendu par » ou une exclusivité) : un
  // rappel sur les honoraires au mandat de recherche (Jean-Guy, 12/11), à l'écran seulement.
  soldByAgency: boolean;
  // Correctif du 13/11 — une visite faite, pas encore « Offre envisagée », sur un bien qui la
  // permettrait : l'écran propose de la passer en « Offre envisagée » et de faire l'offre.
  switchable: boolean;
};

// Pourquoi la visite n'ouvre pas l'offre, quand le bien la permettrait : pas encore faite, ou une
// autre suite notée (celle qui se change, `switchable`).
function notOfferYet(line: VisitLine): string {
  if (line.visitedAt == null) {
    return 'Visite pas encore faite\u00a0: notez d’abord son compte rendu (Visites).';
  }
  if (!canTurnIntoOffer({ ...line, opinion: line.report?.opinion ?? null })) {
    return 'Son avis était «\u00a0Pas pour moi\u00a0»\u00a0: pas d’offre d’achat pour ce bien.';
  }
  const next = line.report?.nextStep;
  return `Suite notée\u00a0: «\u00a0${next ? NEXT_STEP_LABELS[next] : VISIT_OUTCOME_LABELS[line.outcome]}\u00a0».`;
}

function switchableToOffer(line: VisitLine): boolean {
  return canTurnIntoOffer({ ...line, opinion: line.report?.opinion ?? null });
}

export type OfferContext = {
  // Lot B — comment il finance, et s'il est encore « À vérifier » (lu dans ses notes) : la porte
  // de l'offre (`offerGate`), relue en base à chaque ouverture et à la signature.
  buyer: {
    id: string;
    name: string;
    email: string | null;
    financingMode: BuyerFinancingMode;
    modeToVerify: boolean;
  };
  visits: OfferVisit[];
  agency: OfferAgency | null;
  gaps: string[];
  cover: { site: string | null };
  advisorFirstName: string | null;
  last: StoredOfferFields | null;
  // Mission 153 — le mandat de recherche du dernier bon ou de la dernière offre de la fiche.
  lastSearchTitle: Extract<OutsideTitle, { kind: 'search' }> | null;
  // Mission 154 — sans offre précédente, le visiteur et son adresse du dernier bon de la fiche : son
  // nom n'est qu'une suggestion à confirmer (le bon ne sépare pas nom et prénoms).
  lastVoucher: {
    visitors: {
      civility: 'M.' | 'Mme';
      name: string;
      firstName?: string;
      lastName?: string;
    }[];
    address: string;
  } | null;
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
      .select('id, name, email, financing_mode, fields_to_verify')
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
    return {
      ok: false,
      error: 'L’offre d’achat n’a pas pu être préparée\u00a0: rechargez la page.',
    };
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
  const competitorIds = [
    ...new Set(
      lines.filter((line) => line.itemSource === 'competitor').map((l) => l.itemReference),
    ),
  ];
  const projectIds = [
    ...new Set(lines.filter((line) => line.itemSource === 'project').map((l) => l.itemReference)),
  ];
  const [conclusions, subjects, projects, answers, letters, competitors, buyerDocuments] =
    await Promise.all([
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
      getProjectOfferAnswers(supabase, agencyId, projectIds),
      HORS_MANDAT_OUVERT ? getVisitLetters(lines) : Promise.resolve(new Map()),
      HORS_MANDAT_OUVERT && competitorIds.length > 0
        ? supabase
            .from('comparables')
            .select('id, address, locator_address, sold_by, exclusivity')
            .eq('agency_id', agencyId)
            .in('id', competitorIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('buyer_documents')
        .select('kind, fields')
        .eq('agency_id', agencyId)
        .eq('buyer_id', buyerId)
        .order('signed_at', { ascending: false })
        .limit(20),
    ]);
  // Une lecture en échec n'est jamais lue comme « aucune offre acceptée » (M98).
  if (
    conclusions.error ||
    subjects.error ||
    projects.error ||
    answers == null ||
    competitors.error ||
    buyerDocuments.error
  ) {
    return {
      ok: false,
      error: 'L’offre d’achat n’a pas pu être préparée\u00a0: rechargez la page.',
    };
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
  // La plus récente offre acceptée sur chaque bien (les réponses arrivent de la plus récente).
  const acceptedOn = (projectId: string | null): string | null => {
    const accepted = (answers ?? []).find(
      (answer) => answer.projectId === projectId && answer.decision === 'accepted',
    );
    return accepted ? parisDateLabel(new Date(accepted.decidedAt)) : null;
  };
  const conclusionOf = new Map((conclusions.data ?? []).map((row) => [row.project_id, row]));
  const projectOf = new Map((projects.data ?? []).map((row) => [row.id, row]));
  const subjectOf = new Map((subjects.data ?? []).map((row) => [row.project_id, row]));
  const condoOf = new Map(
    (condos.data ?? []).map((row) => [row.subject_property_id, row.is_condominium]),
  );
  const competitorOf = new Map((competitors.data ?? []).map((row) => [row.id, row]));
  // Le titre du bon déjà signé pour une visite, et le mandat de recherche de la fiche.
  const voucherTitleOf = new Map<string, OutsideTitle>();
  let lastSearchTitle: Extract<OutsideTitle, { kind: 'search' }> | null = null;
  let lastVoucherFields: ReturnType<typeof readVoucherFields> = null;
  for (const row of buyerDocuments.data ?? []) {
    const title = readOutsideTitle((row.fields as { title?: unknown } | null)?.title);
    if (title?.kind === 'search' && !lastSearchTitle) lastSearchTitle = title;
    if (row.kind !== 'visit_voucher') continue;
    const voucher = readVoucherFields(row.fields);
    if (!lastVoucherFields) lastVoucherFields = voucher;
    // Mission 154 — dans un bon de la tournée, chaque bien porte son titre.
    for (const bien of voucher?.biens ?? []) {
      const bienTitle = bien.title ?? title;
      if (bienTitle?.kind === 'search' && !lastSearchTitle) lastSearchTitle = bienTitle;
      if (bienTitle && !voucherTitleOf.has(bien.visitId))
        voucherTitleOf.set(bien.visitId, bienTitle);
    }
  }

  // Mission 153 — une visite sur un bien hors mandat (annonce du marché, concurrent) : l'offre se
  // prépare après « Offre envisagée », au titre du mandat de recherche ou de la collaboration ;
  // jamais pour un propriétaire qui ne veut plus être sollicité ; un mandat rentré (sans dossier
  // vendeur dans ACM) reste hors de l'offre, comme avant.
  function outsideVisit(line: (typeof lines)[number]): OfferVisit {
    const state = letters.get(line.id)?.state;
    const closed = state?.kind === 'closed';
    const mandateIn = state?.kind === 'done' && state.label === 'Mandat rentré';
    const collaboration = state?.kind === 'done' && !mandateIn;
    const competitor =
      line.itemSource === 'competitor' ? competitorOf.get(line.itemReference) : undefined;
    const eligible = !closed && !mandateIn && line.outcome === 'offer';
    const soldBy = competitor ? competitor.sold_by : line.itemSoldBy;
    const exclusivity = competitor ? competitor.exclusivity : line.itemExclusivity;
    return {
      visitId: line.id,
      label: line.itemLabel,
      eligible,
      note: closed
        ? `${state.label}\u00a0: pas d’offre d’achat pour ce bien.`
        : mandateIn
          ? OFFER_NOT_MANDATE
          : eligible
            ? 'Offre envisagée · hors mandat de l’agence'
            : notOfferYet(line),
      projectId: null,
      price: line.itemPrice,
      propertyAddress: competitor?.locator_address ?? competitor?.address ?? null,
      condominium: false,
      mandateNumber: null,
      fees: null,
      feesPaidBy: null,
      photoPath: null,
      visitedAt: line.visitedAt,
      sellerEmail: null,
      sellerPhone: null,
      acceptedOfferOn: null,
      outside: true,
      suggestion:
        voucherTitleOf.get(line.id) ??
        (collaboration ? { kind: 'colleague', agency: '', number: '' } : null),
      soldByAgency: soldBy === 'agency' || exclusivity === 'yes',
      switchable: !closed && !mandateIn && switchableToOffer(line),
    };
  }

  const visits: OfferVisit[] = lines.map((line) => {
    if (line.itemSource !== 'project' && HORS_MANDAT_OUVERT) {
      return outsideVisit(line);
    }
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
          ? notOfferYet(line)
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
      acceptedOfferOn: acceptedOn(projectId),
      outside: false,
      suggestion: null,
      soldByAgency: false,
      switchable: signed && switchableToOffer(line),
    };
  });

  return {
    ok: true,
    context: {
      buyer: {
        id: buyer.data.id,
        name: buyer.data.name,
        email: buyer.data.email,
        // Une valeur hors liste vaut « Pas encore dit » : l'offre la demande.
        financingMode: (BUYER_FINANCING_MODES as readonly string[]).includes(
          buyer.data.financing_mode,
        )
          ? (buyer.data.financing_mode as BuyerFinancingMode)
          : 'not_said',
        modeToVerify: (buyer.data.fields_to_verify ?? []).includes('financing_mode'),
      },
      visits,
      agency: offerAgency,
      gaps,
      cover: { site: branding.data?.site_url ?? null },
      advisorFirstName: profile.first_name ?? null,
      last: readOfferFields(lastOffer.data?.fields),
      lastSearchTitle,
      lastVoucher: lastVoucherFields
        ? { visitors: lastVoucherFields.visitors, address: lastVoucherFields.visitorAddress }
        : null,
    },
  };
}
