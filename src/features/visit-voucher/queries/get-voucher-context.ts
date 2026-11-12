import 'server-only';

import { getVisitLetters } from '@/features/buyer-prospecting/queries/get-visit-letters';
import { readVisitLines } from '@/features/buyer-presentation/queries/get-visit-requests';
import { readLegalIdentity } from '@/features/legal-identity/queries/get-legal-identity';
import { legalIdentityGaps } from '@/features/legal-identity/services/legal-identity';
import {
  cityOfAddress,
  voucherAgency,
  type VisitorCivility,
} from '@/features/visit-voucher/services/voucher-fields';
import { readVoucherFields } from '@/features/visit-voucher/services/voucher-input';
import { readOfferFields } from '@/features/purchase-offer/services/offer-input';
import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import { tourVoucherOpen } from '@/features/visit-voucher/services/tour-voucher';
import {
  HORS_MANDAT_OUVERT,
  readOutsideTitle,
  type OutsideTitle,
} from '@/features/visit-voucher/services/outside-mandate';
import type { VisitorPiece, VoucherAgency } from '@/features/visit-voucher/services/voucher-text';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 137 — ce que l'écran du bon de visite sait déjà d'un acquéreur : ses visites (non
// annulées) et, pour chacune, si elle peut porter un bon (§ 9 : un bien de l'agence en mandat
// signé, ou un bien démarché dont le mandat est rentré ou la collaboration obtenue), son prix et son
// adresse ; l'agence (identité légale complète, sinon ce qui manque) ; le conseiller connecté ; et,
// pour pré-remplir, ce que le dernier bon de la fiche disait du visiteur. Cadré sur l'agence de
// l'appelant, côté conseiller seulement.

// Le seul état de carte qui met un bien hors mandat sous mandat de l'agence (M115, M120).
const MANDATE_IN = 'Mandat rentré';

export const VOUCHER_NOT_AGENCY =
  'Bon de visite : seulement pour un bien de l’agence (mandat signé ou rentré) ou en collaboration obtenue.';

export type VoucherVisit = {
  visitId: string;
  label: string;
  eligible: boolean;
  // Pourquoi le bon n'est pas proposé, ou l'état du bien (« Mandat rentré »).
  note: string | null;
  price: number | null;
  address: string | null;
  // Le n° de mandat du dernier bon de ce bien, s'il y en a un.
  mandate: string | null;
  visited: boolean;
  // Le jour de la visite si elle est faite, sinon celui de la demande (ISO).
  day: string;
  // Mission 153 — un bien hors mandat de l'agence (annonce du marché, concurrent) : son bon dit à
  // quel titre l'Agence intervient, jamais un n° de mandat de vente.
  outside: boolean;
  // Le titre proposé d'avance, à vérifier : la collaboration obtenue sur sa carte de Prospection
  // (l'agence et le n° du confrère, repris d'un bon précédent du même bien s'il y en a un).
  suggestion: OutsideTitle | { kind: 'colleague'; agency: ''; number: '' } | null;
};

export type VoucherContext = {
  buyer: { id: string; name: string; email: string | null };
  visits: VoucherVisit[];
  agency: VoucherAgency | null;
  gaps: string[];
  advisorName: string;
  city: string;
  lastVisitor: {
    visitors: { civility: VisitorCivility; name: string }[];
    address: string;
    // Mission 154 — inconnu quand le visiteur vient d'une offre (elle ne dit pas la pièce).
    piece: VisitorPiece | null;
  } | null;
  // Mission 153 — le mandat de recherche du dernier bon ou de la dernière offre de la fiche (jamais
  // gardé sur la fiche, M137 A).
  lastSearchTitle: Extract<OutsideTitle, { kind: 'search' }> | null;
  // Mission 154 (point 3) — le bon de la tournée (plusieurs titres), éteint en production.
  tourOpen: boolean;
};

export async function getVoucherContext(
  buyerId: string,
): Promise<{ ok: true; context: VoucherContext } | { ok: false; error: string }> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  if (!/^[0-9a-f-]{36}$/i.test(buyerId)) return { ok: false, error: 'Fiche introuvable.' };
  const supabase = await createClient();
  const agencyId = profile.agency_id;
  const [buyer, agency, branding, legal, visitRead, lastDocument] = await Promise.all([
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
      .select('document_name, postal_address, professional_card, professional_card_issuer')
      .eq('agency_id', agencyId)
      .maybeSingle(),
    readLegalIdentity(supabase, agencyId),
    readVisitLines(),
    supabase
      .from('buyer_documents')
      .select('fields')
      .eq('agency_id', agencyId)
      .eq('buyer_id', buyerId)
      .eq('kind', 'visit_voucher')
      .order('signed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!buyer.data) return { ok: false, error: 'Fiche introuvable.' };
  // Mission 153 — le mandat de recherche de la fiche, s'il a déjà été saisi (bon ou offre).
  const buyerDocuments = await supabase
    .from('buyer_documents')
    .select('kind, fields')
    .eq('agency_id', agencyId)
    .eq('buyer_id', buyerId)
    .order('signed_at', { ascending: false })
    .limit(20);
  if (!legal.ok || branding.error || visitRead.failed) {
    return { ok: false, error: 'Le bon de visite n’a pas pu être préparé : rechargez la page.' };
  }
  const mentions = {
    documentName: branding.data?.document_name ?? null,
    postalAddress: branding.data?.postal_address ?? null,
    professionalCard: branding.data?.professional_card ?? null,
    professionalCardIssuer: branding.data?.professional_card_issuer ?? null,
  };
  const gaps = legalIdentityGaps(legal.identity, mentions);

  const lines = visitRead.lines.filter((line) => line.buyerId === buyerId && !line.buyerArchived);
  const letters = await getVisitLetters(lines);
  const projectIds = [
    ...new Set(lines.filter((line) => line.itemSource === 'project').map((l) => l.itemReference)),
  ];
  const competitorIds = [
    ...new Set(
      lines.filter((line) => line.itemSource === 'competitor').map((l) => l.itemReference),
    ),
  ];
  // Mission 154 — l'adresse d'une annonce démarchée, confirmée sur sa carte de Prospection.
  const listingKeys = [
    ...new Set(
      lines
        .filter((line) => line.itemSource === 'listing')
        .map((line) => listingIdentityKey(line.itemReference))
        .filter((key): key is string => key != null),
    ),
  ];
  const [conclusions, subjects, competitors, previous, prospects] = await Promise.all([
    projectIds.length > 0
      ? supabase
          .from('project_meeting_conclusions')
          .select('project_id, outcome, commercialization_price')
          .eq('agency_id', agencyId)
          .in('project_id', projectIds)
      : Promise.resolve({ data: [], error: null }),
    projectIds.length > 0
      ? supabase
          .from('subject_properties')
          .select('project_id, address, postal_code, city')
          .eq('agency_id', agencyId)
          .in('project_id', projectIds)
      : Promise.resolve({ data: [], error: null }),
    competitorIds.length > 0
      ? supabase
          .from('comparables')
          .select('id, address, locator_address')
          .eq('agency_id', agencyId)
          .in('id', competitorIds)
      : Promise.resolve({ data: [], error: null }),
    // Le n° de mandat des bons déjà signés pour ces visites (le même bien, une fois saisi).
    supabase
      .from('buyer_documents')
      .select('fields')
      .eq('agency_id', agencyId)
      .eq('kind', 'visit_voucher')
      .order('signed_at', { ascending: false })
      .limit(200),
    listingKeys.length > 0
      ? supabase
          .from('buyer_prospects')
          .select('listing_key, locator_address, locator_confirmed')
          .eq('agency_id', agencyId)
          .in('listing_key', listingKeys)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (
    conclusions.error ||
    subjects.error ||
    competitors.error ||
    previous.error ||
    prospects.error ||
    buyerDocuments.error
  ) {
    return { ok: false, error: 'Le bon de visite n’a pas pu être préparé : rechargez la page.' };
  }
  const conclusionOf = new Map((conclusions.data ?? []).map((row) => [row.project_id, row]));
  const subjectOf = new Map((subjects.data ?? []).map((row) => [row.project_id, row]));
  const competitorOf = new Map((competitors.data ?? []).map((row) => [row.id, row]));
  const confirmedProspectAddress = new Map(
    (prospects.data ?? [])
      .filter((row) => row.locator_confirmed === true && row.locator_address?.trim())
      .map((row) => [row.listing_key, row.locator_address!.trim()]),
  );
  const knownMandate = new Map<string, string>();
  // Mission 153 — le confrère d'un bien hors mandat, une fois saisi sur un bon.
  const knownColleague = new Map<string, Extract<OutsideTitle, { kind: 'colleague' }>>();
  for (const row of previous.data ?? []) {
    const fields = readVoucherFields(row.fields);
    for (const bien of fields?.biens ?? []) {
      const bienTitle = bien.title ?? fields?.title ?? null;
      if (bienTitle) {
        if (
          bienTitle.kind === 'colleague' &&
          bien.reference &&
          !knownColleague.has(bien.reference)
        ) {
          knownColleague.set(bien.reference, bienTitle);
        }
      } else if (bien.reference && !knownMandate.has(bien.reference)) {
        knownMandate.set(bien.reference, bien.mandate);
      }
    }
  }
  const lastSearchTitle =
    (buyerDocuments.data ?? [])
      .flatMap((row) => {
        const raw = row.fields as { title?: unknown; biens?: { title?: unknown }[] } | null;
        return [raw?.title, ...(Array.isArray(raw?.biens) ? raw.biens.map((b) => b?.title) : [])];
      })
      .map((title) => readOutsideTitle(title))
      .find(
        (title): title is Extract<OutsideTitle, { kind: 'search' }> => title?.kind === 'search',
      ) ?? null;

  const visits: VoucherVisit[] = lines.map((line) => {
    let eligible = false;
    let note: string | null = VOUCHER_NOT_AGENCY;
    let price: number | null = line.itemPrice;
    let address: string | null = null;
    let outside = false;
    let suggestion: VoucherVisit['suggestion'] = null;
    if (line.itemSource === 'project') {
      const conclusion = conclusionOf.get(line.itemReference);
      eligible = conclusion?.outcome === 'signed';
      note = eligible ? 'Mandat signé' : VOUCHER_NOT_AGENCY;
      // `numeric` arrive en texte de l'API (M134).
      const agreed = Number(conclusion?.commercialization_price ?? Number.NaN);
      price = Number.isFinite(agreed) && agreed > 0 ? agreed : price;
      const subject = subjectOf.get(line.itemReference);
      address =
        [subject?.address, [subject?.postal_code, subject?.city].filter(Boolean).join(' ')]
          .filter((part) => part && part.trim())
          .join(', ') || null;
    } else {
      const state = letters.get(line.id)?.state;
      eligible = state?.kind === 'done';
      note = eligible && state?.kind === 'done' ? state.label : VOUCHER_NOT_AGENCY;
      if (line.itemSource === 'competitor') {
        const competitor = competitorOf.get(line.itemReference);
        address = competitor?.locator_address ?? competitor?.address ?? null;
      } else {
        const key = listingIdentityKey(line.itemReference);
        address = (key ? confirmedProspectAddress.get(key) : null) ?? null;
      }
      // Mission 153 — hors mandat : le bon se signe au titre du mandat de recherche ou de la
      // collaboration ; seul un mandat rentré met le bien sous mandat de l'agence. Un propriétaire
      // qui ne veut plus être sollicité, ou pas intéressé, n'a pas de bon.
      if (HORS_MANDAT_OUVERT && !(state?.kind === 'done' && state.label === MANDATE_IN)) {
        if (state?.kind === 'closed') {
          eligible = false;
          note = `${state.label} : pas de bon de visite pour ce bien.`;
        } else {
          eligible = true;
          outside = true;
          const collaboration = state?.kind === 'done';
          const reference = `${line.itemSource}:${line.itemReference}`;
          note = collaboration
            ? 'Collaboration obtenue · hors mandat de l’agence'
            : `${line.itemSource === 'competitor' ? 'Concurrent' : 'Annonce du marché'}, hors mandat de l’agence`;
          suggestion =
            knownColleague.get(reference) ??
            (collaboration ? { kind: 'colleague', agency: '', number: '' } : null);
        }
      }
    }
    return {
      visitId: line.id,
      label: line.itemLabel,
      eligible,
      note,
      price,
      address,
      mandate: knownMandate.get(`${line.itemSource}:${line.itemReference}`) ?? null,
      visited: line.visitedAt != null,
      day: line.visitedAt ?? line.requestedAt,
      outside,
      suggestion,
    };
  });

  const last = readVoucherFields(lastDocument.data?.fields);
  // Mission 154 — sans bon, les offrants et l'adresse de la dernière offre de la fiche (prénoms et
  // nom) ; la pièce d'identité, que l'offre ne dit pas, reste à choisir.
  const lastOffer = last
    ? null
    : readOfferFields(
        (buyerDocuments.data ?? []).find((row) => row.kind === 'purchase_offer')?.fields,
      );
  const identityAgency = voucherAgency({
    identity: legal.identity,
    branding: mentions,
    agencyName: agency.data?.name ?? '',
  });
  return {
    ok: true,
    context: {
      buyer: { id: buyer.data.id, name: buyer.data.name, email: buyer.data.email },
      visits,
      agency: identityAgency,
      gaps,
      advisorName: [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim(),
      // La commune de l'adresse de l'agence ; sans code postal lisible, celle du dernier bon de la
      // fiche ; sinon le conseiller la saisit.
      city: cityOfAddress(mentions.postalAddress) || last?.city || '',
      lastVisitor: last
        ? { visitors: last.visitors, address: last.visitorAddress, piece: last.piece }
        : lastOffer
          ? {
              visitors: lastOffer.offrants.map((offrant) => ({
                civility: offrant.civility,
                name: `${offrant.firstNames} ${offrant.lastName}`.trim(),
              })),
              address: lastOffer.address,
              piece: null,
            }
          : null,
      lastSearchTitle,
      tourOpen: tourVoucherOpen(),
    },
  };
}
