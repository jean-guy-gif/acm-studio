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
import type { VisitorPiece, VoucherAgency } from '@/features/visit-voucher/services/voucher-text';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 137 — ce que l'écran du bon de visite sait déjà d'un acquéreur : ses visites (non
// annulées) et, pour chacune, si elle peut porter un bon (§ 9 : un bien de l'agence en mandat
// signé, ou un bien démarché dont le mandat est rentré ou la collaboration obtenue), son prix et son
// adresse ; l'agence (identité légale complète, sinon ce qui manque) ; le conseiller connecté ; et,
// pour pré-remplir, ce que le dernier bon de la fiche disait du visiteur. Cadré sur l'agence de
// l'appelant, côté conseiller seulement.

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
    piece: VisitorPiece;
  } | null;
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
  const [conclusions, subjects, competitors, previous] = await Promise.all([
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
  ]);
  if (conclusions.error || subjects.error || competitors.error || previous.error) {
    return { ok: false, error: 'Le bon de visite n’a pas pu être préparé : rechargez la page.' };
  }
  const conclusionOf = new Map((conclusions.data ?? []).map((row) => [row.project_id, row]));
  const subjectOf = new Map((subjects.data ?? []).map((row) => [row.project_id, row]));
  const competitorOf = new Map((competitors.data ?? []).map((row) => [row.id, row]));
  const knownMandate = new Map<string, string>();
  for (const row of previous.data ?? []) {
    const fields = readVoucherFields(row.fields);
    for (const bien of fields?.biens ?? []) {
      if (bien.reference && !knownMandate.has(bien.reference)) {
        knownMandate.set(bien.reference, bien.mandate);
      }
    }
  }

  const visits: VoucherVisit[] = lines.map((line) => {
    let eligible = false;
    let note: string | null = VOUCHER_NOT_AGENCY;
    let price: number | null = line.itemPrice;
    let address: string | null = null;
    if (line.itemSource === 'project') {
      const conclusion = conclusionOf.get(line.itemReference);
      eligible = conclusion?.outcome === 'signed';
      note = eligible ? 'Mandat signé' : VOUCHER_NOT_AGENCY;
      price = conclusion?.commercialization_price ?? price;
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
    };
  });

  const last = readVoucherFields(lastDocument.data?.fields);
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
      city: cityOfAddress(mentions.postalAddress),
      lastVisitor: last
        ? { visitors: last.visitors, address: last.visitorAddress, piece: last.piece }
        : null,
    },
  };
}
