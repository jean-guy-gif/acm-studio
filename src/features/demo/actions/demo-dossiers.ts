'use server';

import { randomUUID } from 'node:crypto';

import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  buyerLetterOriginsOf,
  removeBuyerLetterPhotos,
} from '@/features/buyer-prospecting/services/remove-buyer-letter-photos';
import { buyerColumns } from '@/features/buyers/services/buyer-row';
import { importedToComparableInput } from '@/features/comparables/utils/imported-to-comparable-input';
import { parseLocatorProperty } from '@/features/competitor-locator/schemas/locator-property';
import { importedMandateColumns } from '@/features/competitor-mandate/services/mandate-columns';
import { insertCompetitor } from '@/features/competitor-search/services/insert-competitor';
import { DEMO_LISTINGS } from '@/features/demo/data/scenarios';
import { DEMO_BUYERS } from '@/features/demo/services/demo-buyers';
import {
  DEMO_AGENCY_ADDRESS,
  DEMO_AGENCY_NAME,
  DEMO_LEGAL_IDENTITY,
} from '@/features/demo/data/demo-legal-identity';
import { DEMO_SIGNATURE_PNG_BASE64 } from '@/features/demo/data/demo-signature';
import { readLegalIdentity } from '@/features/legal-identity/queries/get-legal-identity';
import {
  cityOfAddress,
  parisDateLabel,
  visitorsLabel,
  voucherAgency,
  voucherPrice,
} from '@/features/visit-voucher/services/voucher-fields';
import type { StoredVoucherFields } from '@/features/visit-voucher/services/voucher-input';
import type { StoredOfferFields } from '@/features/purchase-offer/services/offer-input';
import {
  OFFER_TEMPLATE_VERSION,
  renderOffer,
  type OfferAgency,
} from '@/features/purchase-offer/services/offer-text';
import { SIGNATURE_BUCKET } from '@/features/visit-voucher/services/voucher-link';
import {
  documentToText,
  renderVoucher,
  VISITOR_PIECES,
  VOUCHER_TEMPLATE_VERSION,
} from '@/features/visit-voucher/services/voucher-text';
import { demoLocatorEntry } from '@/features/demo/services/demo-listing-data';
import {
  DEMO_DANGEROUS_REASON,
  DEMO_FOLLOW_UP_CONTACT,
  DEMO_FOLLOW_UP_DAYS,
  oneMonthAgo,
  DEMO_FOLLOW_UP_NOTE,
  DEMO_JUSTIFICATION,
  DEMO_LIVE_MINUTES,
  DEMO_READINESS_MISSING,
  DEMO_SEEDS,
  DEMO_KELLER_REFUSALS_DAYS_AGO,
  DEMO_LAMBERT_SHARED_DAYS_AGO,
  demoKellerRefusalsPlan,
  demoKellerWatchFinds,
  DEMO_VOUCHER_DAYS_AGO,
  demoKellerOfferPlan,
  DEMO_VOUCHER_FEEDBACK,
  DEMO_KELLER_VISIT_REPORT,
  demoLambertDismissalPlan,
  DEMO_VOUCHER_MANDATE,
  DEMO_VOUCHER_VISITOR,
  DEMO_VOUCHER_VISITOR_ADDRESS,
  DEMO_WATCH_DAYS_AGO,
  demoKellerSelectionPlan,
  demoWilsonSelectionPlan,
  DEMO_WILSON_SELECTED_DAYS_AGO,
  demoLambertSelectionPlan,
  demoSeedPlan,
  mouginsMandateId,
  type DemoSeedKey,
  type DemoSeedPlan,
} from '@/features/demo/services/demo-seed';
import { demoListingUrl, demoPhotoUrl } from '@/features/demo/services/demo-urls';
import { deleteLivingHereSheets } from '@/features/comparables/services/delete-living-here-sheets';
import { dismissalKey } from '@/features/buyer-dismissals/services/dismissal-key';
import { coveredWeek } from '@/features/buyer-messages/week';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { readDemoPhoto } from '@/features/demo/services/read-demo-photo';
import { addressKey } from '@/features/prospecting/services/address-key';
import { PROPERTY_PHOTO_BUCKET } from '@/features/subject-property-photos/constants';
import { depositPropertyPhoto } from '@/features/subject-property-photos/services/property-photo-storage';
import { validatePhotoBytes } from '@/features/subject-property-photos/services/validate-photo-upload';
import { hashDossierToken, newDossierToken } from '@/features/buyer-dossier/services/dossier-token';
import { exampleDecisionRow } from '@/features/welcome/services/example-decision';
import { getProfile } from '@/lib/auth/get-profile';
import type { Database, Json } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

type Client = SupabaseClient<Database>;

const DEMO_PAGE = '/ma-demo';
// Mission 134 — l'ancienneté des concurrents semés, au-delà de la fenêtre des nouveaux biens.
const DEMO_COMPETITORS_AGE_DAYS = 30;
const FAILED = `${DEMO_PAGE}?error=${encodeURIComponent('La démo n’a pas pu être préparée. Réessayez.')}`;

// Mission 114 (partie B) — « Préparer ma démo » et « Remettre ma démo à zéro ». Réservé à un
// closer de l'AGENCE DE DÉMONSTRATION (repère `is_demo`, lu en base) ; l'écriture passe par la
// clé service après ce garde, dans cette seule agence, pour le seul closer connecté : chaque
// dossier porte sa marque (`projects.demo_stage`) et son conseiller. Les dossiers de démo
// entrent dans les mêmes tables, par les mêmes services, que ceux de l'outil : l'insertion d'un
// concurrent, la décision de prix (M110), la fonction `conclude_meeting`, les adresses, la
// relance, l'opposition.

type Closer = { id: string; agencyId: string };

async function requireDemoCloser(): Promise<Closer> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    redirect('/onboarding');
  }
  if (!(await isDemoAgency(profile.agency_id))) {
    redirect('/builder');
  }
  return { id: profile.id, agencyId: profile.agency_id };
}

function revalidateDemo(): void {
  for (const path of [
    DEMO_PAGE,
    '/builder',
    '/live',
    '/suivi',
    '/prospection',
    '/acquereurs',
    '/bienvenue',
  ]) {
    revalidatePath(path);
  }
}

// Les dossiers de démo du closer : marqués, à lui, dans son agence.
export async function ownDemoDossierIds(supabase: Client, closer: Closer): Promise<string[]> {
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('agency_id', closer.agencyId)
    .eq('advisor_id', closer.id)
    .not('demo_stage', 'is', null);
  return (data ?? []).map((row) => row.id);
}

// Supprime les dossiers de démo du closer et ce qui en dépend — jamais ceux d'un collègue, jamais
// un dossier sans marque. Les photos déposées dans le stockage partent aussi. Les oppositions
// de l'agence restent : la liste « Ne plus solliciter » est commune (M98), et « Préparer » la
// retrouve.
// Mission 117 — les deux acquéreurs de la démo du closer : marqués, à lui, dans son agence.
export async function deleteDemoBuyers(supabase: Client, closer: Closer): Promise<number> {
  // Mission 120 — les courriers nés de leurs recherches partent en cascade : leurs photos aussi.
  const { data: own } = await supabase
    .from('buyers')
    .select('id')
    .eq('agency_id', closer.agencyId)
    .eq('advisor_id', closer.id)
    .eq('demo', true);
  const letterOrigins = await buyerLetterOriginsOf(supabase, closer.agencyId, {
    buyerIds: (own ?? []).map((buyer) => buyer.id),
  });
  // Mission 137 — un bon signé ne part plus avec sa fiche (il reste, sans fiche) : ceux des
  // acquéreurs de démo sont des données de démonstration, retirés ici avec leurs signatures.
  await deleteDemoVouchers(
    supabase,
    closer,
    (own ?? []).map((buyer) => buyer.id),
  );
  const { data } = await supabase
    .from('buyers')
    .delete()
    .eq('agency_id', closer.agencyId)
    .eq('advisor_id', closer.id)
    .eq('demo', true)
    .select('id');
  await removeBuyerLetterPhotos(supabase.storage, closer.agencyId, letterOrigins);
  await deleteOrphanDemoProspects(supabase, closer);
  return data?.length ?? 0;
}

async function nameDemoAgency(supabase: Client, closer: Closer): Promise<void> {
  await supabase.from('agencies').update({ name: DEMO_AGENCY_NAME }).eq('id', closer.agencyId);
  await supabase
    .from('agency_branding')
    .update({ postal_address: DEMO_AGENCY_ADDRESS })
    .eq('agency_id', closer.agencyId);
}

async function deleteDemoVouchers(
  supabase: Client,
  closer: Closer,
  buyerIds: string[],
): Promise<void> {
  if (buyerIds.length === 0) return;
  const { data: documents } = await supabase
    .from('buyer_documents')
    .select('id, signature_paths')
    .eq('agency_id', closer.agencyId)
    .in('buyer_id', buyerIds);
  if (!documents || documents.length === 0) return;
  // Mission 137 B — les signatures du vendeur d'une offre partent aussi (sa réponse suit l'offre).
  const { data: answers } = await supabase
    .from('buyer_document_acceptances')
    .select('signature_paths')
    .eq('agency_id', closer.agencyId)
    .in(
      'document_id',
      documents.map((document) => document.id),
    );
  await supabase
    .from('buyer_documents')
    .delete()
    .eq('agency_id', closer.agencyId)
    .in(
      'id',
      documents.map((document) => document.id),
    );
  const paths = [
    ...documents.flatMap((document) => document.signature_paths),
    ...(answers ?? []).flatMap((answer) => answer.signature_paths ?? []),
  ].filter((path) => path.startsWith(`${closer.agencyId}/`));
  if (paths.length > 0) await supabase.storage.from(SIGNATURE_BUCKET).remove(paths);
}

// Mission 137 — l'identité légale de l'agence de démonstration (inventée), si elle n'en a pas ; et
// un bon de visite signé sur la visite des Keller au mandat de Mougins (visitée il y a 2 jours,
// « Offre envisagée »), par les mêmes services que l'écran : le texte validé, la signature dans
// le stockage privé, l'heure et l'empreinte posées par la base.
async function seedKellerVoucher(
  supabase: Client,
  closer: Closer,
  kellerId: string,
  mouginsProjectId: string,
  now: Date,
): Promise<boolean> {
  await supabase
    .from('agency_legal_identities')
    .upsert(
      { agency_id: closer.agencyId, ...DEMO_LEGAL_IDENTITY },
      { onConflict: 'agency_id', ignoreDuplicates: true },
    );
  const [{ data: item }, legal, branding, agency, profile, conclusion, subject] = await Promise.all(
    [
      supabase
        .from('buyer_selection_items')
        .select('id, label, buyer_selections!inner(buyer_id)')
        .eq('agency_id', closer.agencyId)
        .eq('source', 'project')
        .eq('reference', mouginsProjectId)
        .eq('buyer_selections.buyer_id', kellerId)
        .limit(1)
        .maybeSingle(),
      readLegalIdentity(supabase, closer.agencyId),
      supabase
        .from('agency_branding')
        .select('document_name, postal_address, professional_card, professional_card_issuer')
        .eq('agency_id', closer.agencyId)
        .maybeSingle(),
      supabase.from('agencies').select('name').eq('id', closer.agencyId).maybeSingle(),
      supabase.from('profiles').select('first_name, last_name').eq('id', closer.id).maybeSingle(),
      supabase
        .from('project_meeting_conclusions')
        .select('commercialization_price')
        .eq('project_id', mouginsProjectId)
        .maybeSingle(),
      supabase
        .from('subject_properties')
        .select('address, postal_code, city, photo_urls')
        .eq('project_id', mouginsProjectId)
        .maybeSingle(),
    ],
  );
  if (!item || !legal.ok) return false;
  const voucherAgencyFields = voucherAgency({
    identity: legal.identity,
    branding: {
      documentName: branding.data?.document_name ?? null,
      postalAddress: branding.data?.postal_address ?? null,
      professionalCard: branding.data?.professional_card ?? null,
      professionalCardIssuer: branding.data?.professional_card_issuer ?? null,
    },
    agencyName: agency.data?.name ?? '',
  });
  // Visitée aujourd'hui, demandée il y a 2 jours : le bon se signe le jour de la visite.
  const visitedAt = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const { data: visit, error: visitError } = await supabase
    .from('buyer_visit_requests')
    .insert({
      agency_id: closer.agencyId,
      buyer_id: kellerId,
      buyer_selection_item_id: item.id,
      requested_during: 'presentation',
      requested_at: daysBefore(now, DEMO_VOUCHER_DAYS_AGO),
      visited_at: visitedAt,
      outcome: 'offer',
      feedback: DEMO_VOUCHER_FEEDBACK,
      // Mission 139 — le compte rendu : « Intéressé · aimé : piscine, extérieur · gêné : prix ».
      ...DEMO_KELLER_VISIT_REPORT,
    })
    .select('id')
    .single();
  if (visitError || !visit) return false;
  // Identité légale ou charte incomplètes (une agence de démo réglée à la main) : la visite reste,
  // sans bon — l'écran dira ce qui manque, comme pour une vraie agence.
  if (!voucherAgencyFields) return true;
  const address = [
    subject.data?.address,
    [subject.data?.postal_code, subject.data?.city].filter(Boolean).join(' '),
  ]
    .filter((part) => part && part.trim())
    .join(', ');
  const price = Number(conclusion.data?.commercialization_price ?? 0);
  if (!address || !(price > 0)) return true;
  const fields: StoredVoucherFields = {
    agency: voucherAgencyFields,
    visitors: [{ civility: 'M.', name: DEMO_VOUCHER_VISITOR }],
    visitorAddress: DEMO_VOUCHER_VISITOR_ADDRESS,
    piece: 'cni',
    biens: [
      {
        visitId: visit.id,
        reference: `project:${mouginsProjectId}`,
        label: item.label,
        mandate: DEMO_VOUCHER_MANDATE,
        price,
        address,
      },
    ],
    advisorName:
      [profile.data?.first_name, profile.data?.last_name].filter(Boolean).join(' ').trim() ||
      'Le conseiller',
    city: cityOfAddress(voucherAgencyFields.address) || 'Mougins',
    date: parisDateLabel(now),
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
    }),
  );
  const documentId = randomUUID();
  const path = `${closer.agencyId}/${documentId}/signature-1.png`;
  const { error: uploadError } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .upload(path, Buffer.from(DEMO_SIGNATURE_PNG_BASE64, 'base64'), {
      contentType: 'image/png',
      upsert: false,
    });
  if (uploadError) return false;
  const { error: documentError } = await supabase.from('buyer_documents').insert({
    id: documentId,
    agency_id: closer.agencyId,
    buyer_id: kellerId,
    kind: 'visit_voucher',
    template_version: VOUCHER_TEMPLATE_VERSION,
    fields: fields as unknown as Json,
    rendered_text: text,
    content_sha256: '0'.repeat(64),
    signature_paths: [path],
    created_by: closer.id,
  });
  if (documentError) {
    await supabase.storage.from(SIGNATURE_BUCKET).remove([path]);
    return false;
  }
  const { error: linkError } = await supabase.from('buyer_document_visits').insert({
    document_id: documentId,
    visit_request_id: visit.id,
    agency_id: closer.agencyId,
  });
  if (linkError) return false;
  // Mission 137 B — et l'offre d'achat qui en est née.
  return seedKellerOffer(supabase, closer, {
    kellerId,
    mouginsProjectId,
    visitId: visit.id,
    agency:
      legal.identity.guaranteeAmount != null
        ? { ...voucherAgencyFields, guaranteeAmount: legal.identity.guaranteeAmount }
        : null,
    propertyAddress: address,
    price,
    // La couverture : la première photo du bien vendeur (stockage privé, signée à l'affichage).
    photoPath:
      (Array.isArray(subject.data?.photo_urls) ? subject.data.photo_urls : []).find(
        (path): path is string =>
          typeof path === 'string' && path.startsWith(`${closer.agencyId}/${mouginsProjectId}/`),
      ) ?? null,
    now,
  });
}

// Mission 137 B — l'offre d'achat complète des Keller sur le mandat de Mougins : deux offrants
// inventés, sans prêt, signée aujourd'hui, valable jusqu'à demain ; acceptée par le vendeur
// (mission 138, décision de Jean-Guy du 06/11) ; le n° de mandat et les honoraires posés sur la conclusion.
// Par les mêmes services que l'écran ; rien d'un modèle d'origine.
const DEMO_MOUGINS_SELLER = 'M. Lefebvre';

async function seedKellerOffer(
  supabase: Client,
  closer: Closer,
  input: {
    kellerId: string;
    mouginsProjectId: string;
    visitId: string;
    agency: OfferAgency | null;
    propertyAddress: string;
    price: number;
    photoPath: string | null;
    now: Date;
  },
): Promise<boolean> {
  if (!input.agency) return true;
  const plan = demoKellerOfferPlan(input.price, input.now);
  const text = documentToText(
    renderOffer({
      ...plan.text,
      agency: input.agency,
      propertyAddress: input.propertyAddress,
    }),
  );
  const fields: StoredOfferFields = {
    agency: input.agency,
    offrants: plan.offrants,
    address: plan.text.address,
    matrimonial: plan.text.matrimonial,
    fiscalResidenceFrance: plan.text.fiscalResidenceFrance,
    mandateNumber: plan.text.mandateNumber,
    propertyAddress: input.propertyAddress,
    price: plan.text.price,
    validUntil: plan.validUntil,
    cover: {
      agencyName: input.agency.name,
      agencyAddress: input.agency.address,
      agencyPhone: input.agency.phone,
      agencyEmail: input.agency.email,
      agencySite: null,
      photoPath: input.photoPath,
    },
    visitId: input.visitId,
    projectId: input.mouginsProjectId,
  };
  const documentId = randomUUID();
  const paths = [1, 2].map((index) => `${closer.agencyId}/${documentId}/signature-${index}.png`);
  for (const path of paths) {
    const { error } = await supabase.storage
      .from(SIGNATURE_BUCKET)
      .upload(path, Buffer.from(DEMO_SIGNATURE_PNG_BASE64, 'base64'), {
        contentType: 'image/png',
        upsert: false,
      });
    if (error) return false;
  }
  const { error } = await supabase.from('buyer_documents').insert({
    id: documentId,
    agency_id: closer.agencyId,
    buyer_id: input.kellerId,
    kind: 'purchase_offer',
    template_version: OFFER_TEMPLATE_VERSION,
    fields: fields as unknown as Json,
    rendered_text: text,
    content_sha256: '0'.repeat(64),
    signature_paths: paths,
    valid_until: plan.validUntil,
    created_by: closer.id,
  });
  if (error) {
    await supabase.storage.from(SIGNATURE_BUCKET).remove(paths);
    return false;
  }
  const { error: visitError } = await supabase.from('buyer_document_visits').insert({
    document_id: documentId,
    visit_request_id: input.visitId,
    agency_id: closer.agencyId,
  });
  if (visitError) return false;
  // Mission 138 — le vendeur a accepté l'offre, par son « Bon pour acceptation » signé (un tracé
  // inventé) : la tâche « Le vendeur a accepté l'offre de la famille Keller » est due aujourd'hui, et
  // la base fait passer les Keller « Sous offre ».
  const sellerPath = `${closer.agencyId}/${documentId}/vendeur-1.png`;
  const { error: sellerUpload } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .upload(sellerPath, Buffer.from(DEMO_SIGNATURE_PNG_BASE64, 'base64'), {
      contentType: 'image/png',
      upsert: false,
    });
  if (sellerUpload) return false;
  const { error: answerError } = await supabase.from('buyer_document_acceptances').insert({
    agency_id: closer.agencyId,
    document_id: documentId,
    decision: 'accepted',
    signer_names: [DEMO_MOUGINS_SELLER],
    signature_paths: [sellerPath],
  });
  if (answerError) {
    await supabase.storage.from(SIGNATURE_BUCKET).remove([sellerPath]);
    return false;
  }
  await supabase
    .from('project_meeting_conclusions')
    .update({
      mandate_number: plan.text.mandateNumber,
      fees_amount: plan.text.fees,
      fees_paid_by: plan.text.feesPaidBy,
    })
    .eq('project_id', input.mouginsProjectId)
    .eq('agency_id', closer.agencyId);
  return true;
}

// Mission 120 — les biens démarchés depuis les recherches de ses acquéreurs de démo : leurs origines
// sont parties avec les fiches (cascade) ; les biens que plus aucune recherche ne vise, et que le
// closer a fait naître, partent aussi — une démo neuve ne retrouve pas un courrier déjà « remis ».
// Un bien visé par la recherche d'un collègue reste.
async function deleteOrphanDemoProspects(supabase: Client, closer: Closer): Promise<void> {
  const { data: prospects } = await supabase
    .from('buyer_prospects')
    .select('id')
    .eq('agency_id', closer.agencyId)
    .eq('created_by', closer.id);
  const ids = (prospects ?? []).map((prospect) => prospect.id);
  if (ids.length === 0) return;
  const { data: origins } = await supabase
    .from('buyer_prospect_origins')
    .select('prospect_id')
    .eq('agency_id', closer.agencyId)
    .in('prospect_id', ids);
  const kept = new Set((origins ?? []).map((origin) => origin.prospect_id));
  const orphans = ids.filter((id) => !kept.has(id));
  if (orphans.length > 0) {
    await supabase
      .from('buyer_prospects')
      .delete()
      .in('id', orphans)
      .eq('agency_id', closer.agencyId);
  }
}

export async function seedDemoBuyers(supabase: Client, closer: Closer): Promise<boolean> {
  return (await insertDemoBuyers(supabase, closer)) != null;
}

async function insertDemoBuyers(
  supabase: Client,
  closer: Closer,
): Promise<{ id: string; name: string }[] | null> {
  const { data, error } = await supabase
    .from('buyers')
    .insert(
      DEMO_BUYERS.map((buyer) => {
        // Mission 132 — le financement et le dernier contact, comme les gestes de la fiche.
        const contactedAt =
          buyer.contactedDaysAgo != null
            ? new Date(Date.now() - buyer.contactedDaysAgo * 86_400_000).toISOString()
            : null;
        // Mission 133 — la fiche existe depuis quelques semaines, son statut posé à sa création.
        // Chaque ligne porte les deux dates : dans une insertion groupée, une colonne absente d'une
        // ligne mais présente sur une autre vaut NULL, pas sa valeur par défaut.
        const createdAt = new Date(
          Date.now() - (buyer.createdDaysAgo ?? 0) * 86_400_000,
        ).toISOString();
        return {
          ...buyerColumns(buyer),
          // Mission 139 — la langue sur chaque ligne (la même raison que les deux dates).
          language: buyer.language ?? 'fr',
          created_at: createdAt,
          status_changed_at: createdAt,
          agency_id: closer.agencyId,
          advisor_id: closer.id,
          demo: true,
          financing: buyer.financing ?? 'unknown',
          financing_changed_at: buyer.financing ? contactedAt : null,
          contacted_at: contactedAt,
        };
      }),
    )
    .select('id, name');
  return error ? null : (data ?? []);
}

// Essai de Jean-Guy (25/10) — la sélection des Keller retenue par « Préparer ma démo » : le mandat
// de Mougins, un bon compromis au budget en orange, un bien à vérifier (`demoKellerSelectionPlan`).
// Les mêmes tables que « Retenir la sélection » (M118), par la clé service après le garde.
async function seedKellerSelection(
  supabase: Client,
  closer: Closer,
  buyerId: string,
  mouginsProjectId: string,
  now: Date,
): Promise<boolean> {
  const { data: selection, error } = await supabase
    .from('buyer_selections')
    .insert({ agency_id: closer.agencyId, buyer_id: buyerId, created_by: closer.id })
    .select('id')
    .single();
  if (error || !selection) return false;
  const rows = demoKellerSelectionPlan(now).map((item, index) => {
    const listing = item.listingId
      ? DEMO_LISTINGS.find((entry) => entry.id === item.listingId)
      : null;
    return {
      agency_id: closer.agencyId,
      selection_id: selection.id,
      position: index + 1,
      source: item.source,
      reference: listing ? demoListingUrl(listing) : mouginsProjectId,
      label: item.label,
      listed_price: item.listedPrice,
      price_seen_on: item.priceSeenOn,
      category: item.category,
      gaps: item.gaps,
      snapshot: (item.snapshot ?? null) as Json | null,
      imported: (item.imported ?? null) as unknown as Json | null,
    };
  });
  const { error: itemsError } = await supabase.from('buyer_selection_items').insert(rows);
  return !itemsError;
}

const daysBefore = (now: Date, days: number) =>
  new Date(now.getTime() - days * 86_400_000).toISOString();

// Une sélection de démo, datée, avec ses biens (annonces de la démo).
async function insertDatedSelection(
  supabase: Client,
  closer: Closer,
  buyerId: string,
  createdAt: string,
  plan: ReturnType<typeof demoLambertSelectionPlan>,
): Promise<{ selectionId: string; itemIds: string[] } | null> {
  const { data: selection, error } = await supabase
    .from('buyer_selections')
    .insert({
      agency_id: closer.agencyId,
      buyer_id: buyerId,
      created_by: closer.id,
      created_at: createdAt,
    })
    .select('id')
    .single();
  if (error || !selection) return null;
  const rows = plan.map((item, index) => {
    const listing = DEMO_LISTINGS.find((entry) => entry.id === item.listingId)!;
    return {
      agency_id: closer.agencyId,
      selection_id: selection.id,
      position: index + 1,
      source: item.source,
      reference: demoListingUrl(listing),
      label: item.label,
      listed_price: item.listedPrice,
      price_seen_on: item.priceSeenOn,
      category: item.category,
      gaps: item.gaps,
      snapshot: (item.snapshot ?? null) as Json | null,
      imported: (item.imported ?? null) as unknown as Json | null,
    };
  });
  const { data: items, error: itemsError } = await supabase
    .from('buyer_selection_items')
    .insert(rows)
    .select('id, position');
  if (itemsError || !items) return null;
  return {
    selectionId: selection.id,
    itemIds: [...items].sort((a, b) => a.position - b.position).map((item) => item.id),
  };
}

// Mission 135 — les Lambert : leur sélection partagée il y a 3 jours (un lien valable, un partage
// noté), sans réponse : « Relancer M. et Mme Lambert » est dû. Le jeton du lien n'est jamais montré.
async function seedLambertSharedSelection(
  supabase: Client,
  closer: Closer,
  buyerId: string,
  now: Date,
): Promise<boolean> {
  const at = daysBefore(now, DEMO_LAMBERT_SHARED_DAYS_AGO);
  const seeded = await insertDatedSelection(
    supabase,
    closer,
    buyerId,
    at,
    demoLambertSelectionPlan(now),
  );
  if (!seeded) return false;
  const { error: linkError } = await supabase.from('buyer_dossier_links').insert({
    agency_id: closer.agencyId,
    buyer_id: buyerId,
    selection_id: seeded.selectionId,
    created_by: closer.id,
    token_hash: hashDossierToken(newDossierToken()),
    created_at: at,
    expires_at: new Date(now.getTime() + 27 * 86_400_000).toISOString(),
  });
  if (linkError) return false;
  const { error: eventError } = await supabase.from('buyer_events').insert({
    agency_id: closer.agencyId,
    buyer_id: buyerId,
    kind: 'link_shared',
    selection_id: seeded.selectionId,
    occurred_at: at,
    created_by: closer.id,
  });
  return !eventError;
}

// Mission 135 — les Keller : une sélection présentée il y a 21 jours, deux biens refusés pour « Le
// prix » (la base refuse une réponse sur une sélection présentée : les réponses d'abord).
async function seedKellerRefusals(
  supabase: Client,
  closer: Closer,
  buyerId: string,
  now: Date,
): Promise<boolean> {
  const at = daysBefore(now, DEMO_KELLER_REFUSALS_DAYS_AGO);
  const seeded = await insertDatedSelection(
    supabase,
    closer,
    buyerId,
    at,
    demoKellerRefusalsPlan(now),
  );
  if (!seeded) return false;
  const { error: answersError } = await supabase.from('buyer_item_responses').insert(
    seeded.itemIds.map((itemId) => ({
      agency_id: closer.agencyId,
      buyer_id: buyerId,
      selection_item_id: itemId,
      answer: 'no',
      reasons: ['price'],
      answered_during: 'presentation',
      answered_at: at,
    })),
  );
  if (answersError) return false;
  const { error: presentedError } = await supabase
    .from('buyer_selections')
    .update({ presented_at: at })
    .eq('id', seeded.selectionId)
    .eq('agency_id', closer.agencyId);
  return !presentedError;
}

export async function deleteDemoDossiers(supabase: Client, closer: Closer): Promise<number> {
  const ids = await ownDemoDossierIds(supabase, closer);
  if (ids.length === 0) return 0;
  // Mission 142 — les fiches « Vivre ici » de ses dossiers et de leurs concurrents, par leur clé.
  const { data: ownComparables } = await supabase
    .from('comparables')
    .select('id')
    .in('project_id', ids)
    .eq('agency_id', closer.agencyId);
  await deleteLivingHereSheets(closer.agencyId, [
    ...ids.map((id) => `project:${id}`),
    ...(ownComparables ?? []).map((row) => `competitor:${row.id}`),
  ]);
  const { data: properties } = await supabase
    .from('subject_properties')
    .select('id, photo_urls')
    .in('project_id', ids)
    .eq('agency_id', closer.agencyId);
  const photoPaths = (properties ?? []).flatMap((row) =>
    Array.isArray(row.photo_urls)
      ? row.photo_urls.filter((path): path is string => typeof path === 'string')
      : [],
  );
  if (photoPaths.length > 0) {
    await supabase.storage.from(PROPERTY_PHOTO_BUCKET).remove(photoPaths);
  }
  const propertyIds = (properties ?? []).map((row) => row.id);
  const byProject = [
    'live_reopenings',
    'stream_estate_results',
    'competitor_prospecting_files',
    'live_seller_responses',
    'live_seller_summary',
    'follow_up_contacts',
    'seller_synthesis_links',
    'project_meeting_conclusions',
    'project_price_positionings',
    'pending_competitor_imports',
    'competitor_decisions',
    'comparables',
  ] as const;
  for (const table of byProject) {
    await supabase.from(table).delete().in('project_id', ids).eq('agency_id', closer.agencyId);
  }
  if (propertyIds.length > 0) {
    await supabase
      .from('subject_property_condominiums')
      .delete()
      .in('subject_property_id', propertyIds);
    await supabase
      .from('subject_property_diagnostics')
      .delete()
      .in('subject_property_id', propertyIds);
  }
  await supabase
    .from('subject_properties')
    .delete()
    .in('project_id', ids)
    .eq('agency_id', closer.agencyId);
  const { data: removed } = await supabase
    .from('projects')
    .delete()
    .in('id', ids)
    .eq('agency_id', closer.agencyId)
    .eq('advisor_id', closer.id)
    .not('demo_stage', 'is', null)
    .select('id');
  return removed?.length ?? 0;
}

const minutesAgo = (now: Date, minutes: number): string =>
  new Date(now.getTime() - minutes * 60_000).toISOString();
const daysAgo = (now: Date, days: number): string =>
  new Date(now.getTime() - days * 86_400_000).toISOString();
const dayIn = (now: Date, days: number): string =>
  new Date(now.getTime() + days * 86_400_000).toISOString().slice(0, 10);

async function depositDemoPhotos(
  supabase: Client,
  closer: Closer,
  projectId: string,
  files: string[],
): Promise<string[]> {
  const paths: string[] = [];
  for (const file of files) {
    const bytes = await readDemoPhoto(demoPhotoUrl(file), closer.agencyId);
    if (!bytes) continue;
    const validation = validatePhotoBytes(bytes);
    if (!validation.ok) continue;
    const deposit = await depositPropertyPhoto(supabase, {
      agencyId: closer.agencyId,
      projectId,
      bytes,
      format: validation.format,
    });
    if (deposit.ok) paths.push(deposit.path);
  }
  return paths;
}

// Un dossier de démo, à son étape. Rend l'identifiant du dossier, ou null si une écriture a
// échoué (le dossier à moitié créé est alors retiré).
async function seedDemoDossier(
  supabase: Client,
  closer: Closer,
  plan: DemoSeedPlan,
  now: Date,
): Promise<string | null> {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      agency_id: closer.agencyId,
      advisor_id: closer.id,
      seller_name: plan.sellerName,
      language: plan.language,
      // Mission 130 — le vendeur à relancer a de quoi être joint : SMS, WhatsApp et E-mail
      // s'ouvrent devant le closer (coordonnées fictives, décision de Jean-Guy, 05/11).
      ...(plan.stage === 'follow_up'
        ? { seller_phone: DEMO_FOLLOW_UP_CONTACT.phone, seller_email: DEMO_FOLLOW_UP_CONTACT.email }
        : {}),
      status: 'draft',
      demo_stage: plan.stage,
      // Mission 131 — le dossier de démo en présentation directe.
      ...(plan.stage === 'direct' ? { live_presentation_mode: 'direct' } : {}),
    })
    .select('id')
    .single();
  if (projectError || !project) return null;
  const projectId = project.id;
  const failed = async (): Promise<null> => {
    await deleteOne(supabase, closer, projectId);
    return null;
  };
  if (!plan.property) return projectId;

  // Le bien vendeur, avec ses photos déposées dans le stockage de l'agence (M37).
  const photos = await depositDemoPhotos(supabase, closer, projectId, plan.photoFiles);
  const { error: propertyError } = await supabase.from('subject_properties').insert({
    ...(plan.property as Database['public']['Tables']['subject_properties']['Insert']),
    project_id: projectId,
    agency_id: closer.agencyId,
    photo_urls: photos,
  });
  if (propertyError) return failed();

  // Les concurrents, comme un import les crée (M83, M101) ; relus sans pastille « À vérifier ».
  for (const competitor of plan.competitors) {
    const input = importedToComparableInput(competitor.data);
    if (!input) return failed();
    const inserted = await insertCompetitor(supabase, projectId, closer.agencyId, {
      ...input,
      ...importedMandateColumns(competitor.data),
      property_type: competitor.listing.propertyType,
      fields_to_verify: [],
      is_selected: true,
    });
    if (inserted.status === 'failed') return failed();
  }
  // Mission 134 — les concurrents de la démo sont retenus depuis plus de 14 jours : ils n'appellent
  // plus leurs acquéreurs (seul un bien retenu pendant la démo fait naître sa tâche).
  const { error: agedError } = await supabase
    .from('comparables')
    .update({
      created_at: new Date(now.getTime() - DEMO_COMPETITORS_AGE_DAYS * 86_400_000).toISOString(),
    })
    .eq('project_id', projectId)
    .eq('agency_id', closer.agencyId);
  if (agedError) return failed();
  const { data: comparables } = await supabase
    .from('comparables')
    .select('*')
    .eq('project_id', projectId)
    .eq('agency_id', closer.agencyId)
    .order('display_order', { ascending: true });
  if (!comparables || comparables.length !== plan.competitors.length) return failed();
  const rowOf = (index: number) =>
    comparables.find((row) =>
      (row.listing_url ?? '').endsWith(`/${plan.competitors[index].listing.id}`),
    ) ?? null;

  // Les adresses, comme le Localisateur simulé les rend : confirmées, avec leur étiquette (M75).
  for (const [index, competitor] of plan.competitors.entries()) {
    const row = rowOf(index);
    const location = parseLocatorProperty(demoLocatorEntry(competitor.listing, now).raw);
    if (!row || !location) return failed();
    const { error } = await supabase
      .from('comparables')
      .update({
        locator_state: location.state,
        locator_label: location.label,
        locator_label_key: location.labelKey,
        locator_address: location.address,
        locator_source: location.source,
        locator_confirmed: location.confirmed,
        locator_property_id: location.propertyId,
        locator_latitude: location.latitude,
        locator_longitude: location.longitude,
        locator_analyzed_at: location.analyzedAt,
      })
      .eq('id', row.id);
    if (error) return failed();
  }

  // La décision de prix, calculée par le moteur de l'outil (M110), avec sa justification.
  const decision = exampleDecisionRow({
    projectId,
    agencyId: closer.agencyId,
    validatedBy: closer.id,
    sellerSurface: plan.scenario.subject.surfaceArea,
    comparables,
    now,
  });
  if (!decision) return failed();
  const { error: decisionError } = await supabase
    .from('project_price_positionings')
    .upsert({ ...decision, justification: DEMO_JUSTIFICATION }, { onConflict: 'project_id' });
  if (decisionError) return failed();

  // Prêt pour le Live (M52) : le closer n'a rien à déclarer.
  const { error: readyError } = await supabase
    .from('projects')
    .update({ status: 'ready_for_meeting', updated_at: now.toISOString() })
    .eq('id', projectId);
  if (readyError) return failed();
  if (!plan.live || !plan.conclusion) return projectId;

  // Le Live, mené : heures de début et de fin (M95), confirmation « devant le vendeur » (M112),
  // les réponses du vendeur (prix révélé figé à la devinette, M96), son résumé.
  const live = plan.live;
  const dangerous = rowOf(live.dangerousIndex);
  const { error: liveError } = await supabase
    .from('projects')
    .update({
      live_confirmed_at: minutesAgo(now, DEMO_LIVE_MINUTES.startedAgo + 1),
      live_confirmed_by: closer.id,
      live_started_at: minutesAgo(now, DEMO_LIVE_MINUTES.startedAgo),
      live_ended_at: minutesAgo(now, DEMO_LIVE_MINUTES.endedAgo),
    })
    .eq('id', projectId);
  if (liveError || !dangerous) return failed();
  const { error: summaryError } = await supabase.from('live_seller_summary').insert({
    project_id: projectId,
    agency_id: closer.agencyId,
    seller_property_confirmed: 'yes',
    seller_perceived_property_price: live.perceivedPrice,
    seller_revised_property_price: live.revisedPrice,
    seller_most_dangerous_comparable_id: dangerous.id,
    seller_most_dangerous_reason: DEMO_DANGEROUS_REASON,
    seller_launch_readiness_first: live.readinessFirst,
    seller_launch_readiness_last: live.readinessLast,
    seller_launch_readiness_missing: DEMO_READINESS_MISSING,
  });
  if (summaryError) return failed();
  for (const [index, competitor] of plan.competitors.entries()) {
    const row = rowOf(index);
    if (!row) return failed();
    const { error } = await supabase.from('live_seller_responses').insert({
      project_id: projectId,
      agency_id: closer.agencyId,
      comparable_id: row.id,
      seller_serious_competitor: 'yes',
      seller_estimated_listing_price: competitor.guess,
      seller_price_coherence: 'coherent',
      seller_estimated_days_on_market: live.daysGuess,
      seller_market_duration_reason: 'price_too_high',
    });
    if (error) return failed();
  }

  // La conclusion, par la fonction de la base (M53, M56, M90, M110).
  const { error: concludeError } = await supabase.rpc('conclude_meeting', {
    p_project_id: projectId,
    p_agency_id: closer.agencyId,
    p_outcome: plan.conclusion.outcome,
    p_reason: null as unknown as string,
    p_price: live.agreedPrice,
    p_market_computed: decision.range_central as number,
    p_advisor_analysis: decision.advisor_price as number,
    p_advisor_price: decision.advisor_price as number,
    p_seller_perceived: live.perceivedPrice,
    p_retained: plan.competitors.length,
    p_exploitable: plan.competitors.length,
    ...(plan.conclusion.outcome === 'signed'
      ? { p_mandate_type: plan.conclusion.mandateType }
      : {
          p_follow_up_motive: plan.conclusion.motive,
          p_next_follow_up_on: dayIn(now, DEMO_FOLLOW_UP_DAYS.nextIn),
          p_objections: plan.conclusion.objections,
        }),
  });
  if (concludeError) return failed();

  if (plan.conclusion.outcome === 'signed') {
    // Mission 127 — un rendez-vous d'il y a un mois ; Mission 130 — signé le jour même : le
    // premier Point marché (mensuel) est dû, la tâche du jour le montre. Mission 145 — le mandat de
    // Vence (M. et Mme Lopez) est signé il y a 3 jours : la boucle le propose à ses acquéreurs.
    const signedAt =
      plan.signedDaysAgo != null ? daysAgo(now, plan.signedDaysAgo) : oneMonthAgo(now);
    await supabase
      .from('project_meeting_conclusions')
      .update({ concluded_at: signedAt, signed_at: signedAt })
      .eq('project_id', projectId);
  }
  if (plan.conclusion.outcome === 'follow_up') {
    // Un rendez-vous d'il y a neuf jours, une relance passée, un concurrent qui a baissé depuis.
    await supabase
      .from('project_meeting_conclusions')
      .update({ concluded_at: daysAgo(now, DEMO_FOLLOW_UP_DAYS.meetingAgo) })
      .eq('project_id', projectId);
    const { error: contactError } = await supabase.from('follow_up_contacts').insert({
      project_id: projectId,
      agency_id: closer.agencyId,
      author_id: closer.id,
      note: DEMO_FOLLOW_UP_NOTE,
      contacted_at: daysAgo(now, DEMO_FOLLOW_UP_DAYS.contactAgo),
      next_follow_up_on: dayIn(now, DEMO_FOLLOW_UP_DAYS.nextIn),
    });
    if (contactError) return failed();
    const dropped = plan.priceDrop ? rowOf(plan.priceDrop.index) : null;
    if (plan.priceDrop && dropped) {
      await supabase
        .from('comparables')
        .update({ price: plan.priceDrop.price })
        .eq('id', dropped.id);
    }
  }
  if (plan.opposedAddress) {
    // Une adresse « Ne plus solliciter » (M98, M102) : celle d'un concurrent, pour l'agence.
    const key = addressKey(plan.opposedAddress);
    if (key) {
      await supabase
        .from('prospecting_oppositions')
        .upsert(
          { agency_id: closer.agencyId, address_key: key, created_by: closer.id },
          { onConflict: 'agency_id,address_key', ignoreDuplicates: true },
        );
    }
  }
  return projectId;
}

async function deleteOne(supabase: Client, closer: Closer, projectId: string): Promise<void> {
  const scoped = { id: projectId, agencyId: closer.agencyId };
  for (const table of [
    'live_seller_responses',
    'live_seller_summary',
    'project_meeting_conclusions',
    'project_price_positionings',
    'comparables',
    'subject_properties',
  ] as const) {
    await supabase
      .from(table)
      .delete()
      .eq('project_id', scoped.id)
      .eq('agency_id', scoped.agencyId);
  }
  await supabase.from('projects').delete().eq('id', projectId).eq('agency_id', closer.agencyId);
}

export async function seedDemoDossiers(
  supabase: Client,
  closer: Closer,
  now: Date,
): Promise<boolean> {
  // Décision de Jean-Guy (06/11) : le nom et l'adresse de l'agence de démonstration, que les
  // documents impriment (« Agence Horizon Côte d'Azur », jamais « Démo »).
  await nameDemoAgency(supabase, closer);
  // Mission 145 — deux dossiers portent la marque « signed » (Mougins, et Vence chez M. et Mme
  // Lopez) : le mandat des Keller se retrouve par sa clé et son scénario, jamais par la marque seule.
  const created: { key: DemoSeedKey; id: string }[] = [];
  for (const key of DEMO_SEEDS) {
    const id = await seedDemoDossier(supabase, closer, demoSeedPlan(key, now), now);
    if (!id) return false;
    created.push({ key, id });
  }
  const mouginsProjectId = mouginsMandateId(created);
  // Mission 117 — et ses deux acquéreurs, qui vont avec les scénarios ; les Keller avec leur
  // sélection (essai de Jean-Guy, 25/10).
  const buyers = await insertDemoBuyers(supabase, closer);
  if (!buyers) return false;
  const keller = buyers.find((buyer) => buyer.name === 'Famille Keller');
  if (!keller || !mouginsProjectId) return true;
  if (!(await seedKellerSelection(supabase, closer, keller.id, mouginsProjectId, now))) {
    return false;
  }
  // Mission 135 — la relance des Lambert et les refus des Keller.
  const lambert = buyers.find((buyer) => buyer.name === 'M. et Mme Lambert');
  if (!lambert) return false;
  return (
    (await seedLambertSharedSelection(supabase, closer, lambert.id, now)) &&
    (await seedKellerRefusals(supabase, closer, keller.id, now)) &&
    (await seedWatchRuns(supabase, closer, buyers, keller.id, now)) &&
    (await seedKellerVoucher(supabase, closer, keller.id, mouginsProjectId, now)) &&
    (await seedLambertDismissals(supabase, closer, lambert.id, now)) &&
    (await seedWilsonVisit(supabase, closer, buyers, now))
  );
}

// Mission 142 — Mr and Mrs Wilson : leur sélection (un appartement d'Antibes) et une visite
// demandée sur lui. Mission 147 (partie A) — ce qui comptait pour eux ne servait qu'au « Vivre ici »
// d'ACM : il n'est plus semé.
async function seedWilsonVisit(
  supabase: Client,
  closer: Closer,
  buyers: { id: string; name: string }[],
  now: Date,
): Promise<boolean> {
  const wilson = buyers.find((buyer) => buyer.name === 'Mr and Mrs Wilson');
  if (!wilson) return true;
  const seeded = await insertDatedSelection(
    supabase,
    closer,
    wilson.id,
    daysBefore(now, DEMO_WILSON_SELECTED_DAYS_AGO),
    demoWilsonSelectionPlan(now),
  );
  if (!seeded) return false;
  const { error: visitError } = await supabase.from('buyer_visit_requests').insert({
    agency_id: closer.agencyId,
    buyer_id: wilson.id,
    buyer_selection_item_id: seeded.itemIds[0]!,
    requested_during: 'conseiller',
    requested_at: daysBefore(now, 1),
  });
  return !visitError;
}

// Mission 139 — la semaine écoulée des Lambert : six biens écartés pour eux par le conseiller,
// datés de la semaine que raconte le point du lundi (la date d'un bien écarté n'est pas forcée par
// la base, pour la démo seule) ; des villas de Mougins, hors de leur secteur et de leur budget.
async function seedLambertDismissals(
  supabase: Client,
  closer: Closer,
  lambertId: string,
  now: Date,
): Promise<boolean> {
  const week = coveredWeek(now);
  const rows = demoLambertDismissalPlan().flatMap((entry, index) => {
    const listing = DEMO_LISTINGS.find((candidate) => candidate.id === entry.listingId);
    if (!listing) return [];
    return [
      {
        agency_id: closer.agencyId,
        buyer_id: lambertId,
        property_key: dismissalKey({ source: 'listing', url: demoListingUrl(listing) }),
        label: `Maison · ${listing.roomsCount} pièces · ${listing.surfaceArea} m² · Mougins`,
        reason: entry.reason,
        dismissed_by: closer.id,
        // Du mardi au samedi de la semaine écoulée, à 10 h (Paris, à l'heure près).
        dismissed_at: new Date(
          week.startAt.getTime() + ((index % 5) + 1) * 86_400_000 + 10 * 3_600_000,
        ).toISOString(),
      },
    ];
  });
  const { error } = await supabase.from('buyer_dismissals').insert(rows);
  return !error;
}

// Mission 136 — la veille de la démo, simulée (aucun appel, M114) : un passage d'il y a 2 jours
// pour chaque acquéreur prêt à visiter, deux nouveaux biens pour les Keller, rien pour les autres.
// Écrit directement, jamais par `start_buyer_watch`, qui compterait une consommation.
async function seedWatchRuns(
  supabase: Client,
  closer: Closer,
  buyers: { id: string; name: string }[],
  kellerId: string,
  now: Date,
): Promise<boolean> {
  const ready = new Set(
    DEMO_BUYERS.filter((buyer) => buyer.financing === 'validated').map((buyer) => buyer.name),
  );
  const ranAt = daysBefore(now, DEMO_WATCH_DAYS_AGO);
  const seenSince = daysBefore(now, DEMO_WATCH_DAYS_AGO + 7);
  const kellerFinds = demoKellerWatchFinds(now);
  const rows = buyers
    .filter((buyer) => ready.has(buyer.name))
    .map((buyer) => {
      const finds = buyer.id === kellerId ? kellerFinds : [];
      return {
        agency_id: closer.agencyId,
        buyer_id: buyer.id,
        ran_at: ranAt,
        status: 'done',
        seen_since: seenSince,
        adverts: 0,
        found_count: finds.length,
        finds: finds as unknown as Json,
      };
    });
  if (rows.length === 0) return true;
  const { error } = await supabase.from('buyer_watch_runs').insert(rows);
  return !error;
}

// « Préparer ma démo » : six dossiers, s'il n'en a pas encore.
export async function prepareDemoDossiers(): Promise<void> {
  const closer = await requireDemoCloser();
  const supabase = createServiceRoleClient();
  if ((await ownDemoDossierIds(supabase, closer)).length === 0) {
    await deleteDemoBuyers(supabase, closer);
    const ok = await seedDemoDossiers(supabase, closer, new Date());
    if (!ok) redirect(FAILED);
  }
  revalidateDemo();
  redirect(DEMO_PAGE);
}

// « Remettre ma démo à zéro » : les siens disparaissent, quatre neufs les remplacent.
export async function resetDemoDossiers(): Promise<void> {
  const closer = await requireDemoCloser();
  const supabase = createServiceRoleClient();
  await deleteDemoDossiers(supabase, closer);
  await deleteDemoBuyers(supabase, closer);
  const ok = await seedDemoDossiers(supabase, closer, new Date());
  revalidateDemo();
  redirect(ok ? DEMO_PAGE : FAILED);
}
