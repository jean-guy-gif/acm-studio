'use server';

import { revalidatePath } from 'next/cache';

import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { getMandateAmendments } from '@/features/mandate-life/queries/get-mandate-amendments';
import {
  gestureAllowed,
  MANDATE_INPUT_ERRORS,
  parseAmendmentDay,
  parseCompromise,
  parseEndedOn,
  parseMandateEnd,
  parseSale,
  type MandateGesture,
} from '@/features/mandate-life/services/mandate-inputs';
import { mandateOfferOf } from '@/features/mandate-life/services/mandate-offer';
import { amendmentRefusal, mandatePrice } from '@/features/mandate-life/services/mandate-price';
import { toAmount, toMandateLife } from '@/features/mandate-life/services/mandate-row';
import { mandateStage } from '@/features/mandate-life/services/mandate-stage';
import type { MandateLife, MandateOffer, MandateStage } from '@/features/mandate-life/types';
import { getAgencyOfferAnswers } from '@/features/purchase-offer/queries/get-offer-answers';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Lot C (Jean-Guy, 27/11 et 28/11, maquette C0) — les gestes de « Son mandat » : la fin du mandat
// et sa reconduction tacite, les avenants de baisse, le compromis et l'acte prévu, la vente, la fin
// sans vente. Chacun passe le même garde (un membre actif, un dossier de son agence, conclu, non
// archivé, un mandat signé), relit ce qui vient du navigateur, vérifie que le geste est de son
// étape (relue en base, l'offre acceptée comprise), puis écrit par la clé de service. La base
// garde ses propres refus (migration `vie_du_mandat`).

export type MandateActionResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_CONNECTED = 'Vous devez être connecté.';
const NOT_FOUND = 'Ce mandat n’est plus dans vos dossiers.';
const NOT_SIGNED = 'Ce dossier n’est pas un mandat signé.';
const FAILED = 'L’enregistrement n’a pas abouti : réessayez.';
const OFFERS_UNREADABLE =
  'Les offres de ce bien n’ont pas pu être lues : rechargez la page, puis réessayez.';

type Context = {
  admin: ReturnType<typeof createServiceRoleClient>;
  agencyId: string;
  profileId: string;
  projectId: string;
  life: MandateLife;
  offer: MandateOffer | null | 'unknown';
  stage: MandateStage | 'unknown' | null;
  signedOn: string;
  today: string;
  signedPrice: number | null;
};

async function mandateContext(
  projectId: unknown,
  gesture: MandateGesture,
): Promise<{ ok: true; context: Context } | { ok: false; error: string }> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: NOT_CONNECTED };
  if (typeof projectId !== 'string' || !UUID.test(projectId)) {
    return { ok: false, error: NOT_FOUND };
  }
  const admin = createServiceRoleClient();
  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('id, status')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (projectError) return { ok: false, error: FAILED };
  if (!project || project.status !== 'meeting_completed') return { ok: false, error: NOT_FOUND };
  const { data: conclusion, error: conclusionError } = await admin
    .from('project_meeting_conclusions')
    .select(
      'outcome, signed_at, concluded_at, commercialization_price, mandate_ends_on, mandate_tacit_renewal, compromise_signed_on, deed_planned_on, sale_buyer_origin, compromise_buyer_id, deed_signed_on, sale_price, mandate_ended_on',
    )
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (conclusionError) return { ok: false, error: FAILED };
  if (!conclusion || conclusion.outcome !== 'signed') return { ok: false, error: NOT_SIGNED };
  const signedAt = conclusion.signed_at ?? conclusion.concluded_at;
  if (!signedAt) return { ok: false, error: NOT_SIGNED };
  const answers = await getAgencyOfferAnswers(admin, profile.agency_id);
  const life = toMandateLife(conclusion);
  const offer = mandateOfferOf(answers, projectId);
  const stage = mandateStage({ outcome: 'signed', life, offer });
  if (stage === 'unknown') return { ok: false, error: OFFERS_UNREADABLE };
  if (!gestureAllowed(gesture, stage)) return { ok: false, error: MANDATE_INPUT_ERRORS.stage };
  return {
    ok: true,
    context: {
      admin,
      agencyId: profile.agency_id,
      profileId: profile.id,
      projectId,
      life,
      offer,
      stage,
      signedOn: parisDay(new Date(signedAt)),
      today: parisDay(new Date()),
      signedPrice: toAmount(conclusion.commercialization_price),
    },
  };
}

function refresh(projectId: string): void {
  revalidatePath(`/builder/${projectId}`);
  revalidatePath('/suivi');
  revalidatePath('/aujourdhui');
  revalidatePath('/vendeurs');
}

async function writeLife(
  context: Context,
  columns: Record<string, string | number | boolean | null>,
): Promise<MandateActionResult> {
  const { error } = await context.admin
    .from('project_meeting_conclusions')
    .update({ ...columns, updated_at: new Date().toISOString() })
    .eq('project_id', context.projectId)
    .eq('agency_id', context.agencyId);
  if (error) return { ok: false, error: FAILED };
  refresh(context.projectId);
  return { ok: true };
}

// La fin du mandat : une durée en mois depuis la signature, ou une date ; la reconduction tacite
// (retouche 4).
export async function setMandateEnd(
  projectId: string,
  raw: { months?: unknown; endsOn?: unknown; tacit?: unknown },
): Promise<MandateActionResult> {
  const read = await mandateContext(projectId, 'end');
  if (!read.ok) return read;
  const parsed = parseMandateEnd(raw ?? {}, read.context.signedOn);
  if (!parsed.ok) return parsed;
  return writeLife(read.context, {
    mandate_ends_on: parsed.endsOn,
    mandate_tacit_renewal: parsed.tacit,
  });
}

// Un avenant de baisse : sa date et le nouveau prix, sous le prix du mandat (question 22).
export async function addMandateAmendment(
  projectId: string,
  raw: { amendedOn?: unknown; price?: unknown },
): Promise<MandateActionResult> {
  const read = await mandateContext(projectId, 'amendment');
  if (!read.ok) return read;
  const { context } = read;
  const day = parseAmendmentDay(raw?.amendedOn, context.signedOn, context.today);
  if (!day.ok) return day;
  const amendments = await getMandateAmendments(context.admin, context.agencyId, [projectId]);
  if (!amendments) return { ok: false, error: FAILED };
  const current = mandatePrice(context.signedPrice, amendments.get(projectId) ?? []).current;
  const price = typeof raw?.price === 'number' ? raw.price : Number.NaN;
  const refusal = amendmentRefusal(price, current);
  if (refusal) return { ok: false, error: refusal };
  const { error } = await context.admin.from('mandate_price_amendments').insert({
    agency_id: context.agencyId,
    project_id: projectId,
    amended_on: day.amendedOn,
    price,
    created_by: context.profileId,
  });
  if (error) return { ok: false, error: FAILED };
  refresh(projectId);
  return { ok: true };
}

// Question 22 — retirer le dernier avenant, mal saisi (confirmé dans l'écran).
export async function removeLastMandateAmendment(projectId: string): Promise<MandateActionResult> {
  const read = await mandateContext(projectId, 'amendment');
  if (!read.ok) return read;
  const { context } = read;
  const amendments = await getMandateAmendments(context.admin, context.agencyId, [projectId]);
  if (!amendments) return { ok: false, error: FAILED };
  const last = mandatePrice(context.signedPrice, amendments.get(projectId) ?? []).lastAmendment;
  if (!last) return { ok: false, error: 'Ce mandat n’a pas d’avenant.' };
  const { error } = await context.admin
    .from('mandate_price_amendments')
    .delete()
    .eq('id', last.id)
    .eq('agency_id', context.agencyId);
  if (error) return { ok: false, error: FAILED };
  refresh(projectId);
  return { ok: true };
}

// Le compromis (question 17) : l'acquéreur de l'offre acceptée (relu en base), un acquéreur de
// l'agence (sa fiche, de l'agence, non archivée), ou un acquéreur venu d'ailleurs.
export async function recordCompromise(
  projectId: string,
  raw: {
    compromiseSignedOn?: unknown;
    deedPlannedOn?: unknown;
    buyer?: unknown;
    buyerId?: unknown;
  },
): Promise<MandateActionResult> {
  const read = await mandateContext(projectId, 'compromise');
  if (!read.ok) return read;
  const { context } = read;
  const dates = parseCompromise(raw ?? {}, context.signedOn, context.today);
  if (!dates.ok) return dates;
  let origin: 'agency' | 'outside';
  let buyerId: string | null = null;
  if (raw?.buyer === 'offer') {
    if (!context.offer || context.offer === 'unknown' || !context.offer.buyerId) {
      return { ok: false, error: 'Aucune offre acceptée ne tient ce mandat.' };
    }
    origin = 'agency';
    buyerId = context.offer.buyerId;
  } else if (raw?.buyer === 'agency') {
    if (typeof raw.buyerId !== 'string' || !UUID.test(raw.buyerId)) {
      return { ok: false, error: 'Choisissez l’acquéreur de l’agence.' };
    }
    const { data: buyer, error } = await context.admin
      .from('buyers')
      .select('id')
      .eq('id', raw.buyerId)
      .eq('agency_id', context.agencyId)
      .is('archived_at', null)
      .maybeSingle();
    if (error) return { ok: false, error: FAILED };
    if (!buyer) return { ok: false, error: 'Cette fiche acquéreur n’existe plus.' };
    origin = 'agency';
    buyerId = buyer.id;
  } else if (raw?.buyer === 'outside') {
    origin = 'outside';
  } else {
    return { ok: false, error: 'Dites qui est l’acquéreur.' };
  }
  return writeLife(context, {
    compromise_signed_on: dates.compromiseSignedOn,
    deed_planned_on: dates.deedPlannedOn,
    sale_buyer_origin: origin,
    compromise_buyer_id: buyerId,
  });
}

// Question 18 — le compromis tombé : le dossier revient à l'étape d'avant (l'offre acceptée, si
// elle tient encore, sinon « Mandat signé »), et le Point marché reprend.
export async function compromiseFell(projectId: string): Promise<MandateActionResult> {
  const read = await mandateContext(projectId, 'compromise_fell');
  if (!read.ok) return read;
  return writeLife(read.context, {
    compromise_signed_on: null,
    deed_planned_on: null,
    sale_buyer_origin: null,
    compromise_buyer_id: null,
  });
}

// La vente : la date de l'acte et le prix de vente (une vente notée se corrige de même).
export async function recordSale(
  projectId: string,
  raw: { deedSignedOn?: unknown; salePrice?: unknown },
): Promise<MandateActionResult> {
  const read = await mandateContext(projectId, 'sale');
  if (!read.ok) return read;
  const { context } = read;
  if (!context.life.compromiseSignedOn) return { ok: false, error: MANDATE_INPUT_ERRORS.stage };
  const sale = parseSale(raw ?? {}, context.life.compromiseSignedOn, context.today);
  if (!sale.ok) return sale;
  return writeLife(context, { deed_signed_on: sale.deedSignedOn, sale_price: sale.salePrice });
}

// La sortie : le mandat terminé sans vente (seulement sans offre acceptée ni compromis).
export async function endMandateWithoutSale(
  projectId: string,
  raw: { endedOn?: unknown },
): Promise<MandateActionResult> {
  const read = await mandateContext(projectId, 'ended');
  if (!read.ok) return read;
  const { context } = read;
  const ended = parseEndedOn(raw?.endedOn, context.signedOn, context.today);
  if (!ended.ok) return ended;
  return writeLife(context, { mandate_ended_on: ended.endedOn });
}

// Annuler la fin sans vente, notée par erreur.
export async function cancelMandateEnd(projectId: string): Promise<MandateActionResult> {
  const read = await mandateContext(projectId, 'end_cancelled');
  if (!read.ok) return read;
  return writeLife(read.context, { mandate_ended_on: null });
}
