'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createDossierLink } from '@/features/buyer-dossier/actions/dossier-links';
import { presentedItems } from '@/features/buyer-presentation/queries/load-presentation';
import { propertyPhrase } from '@/features/buyers/services/loop-properties';
import { toSelectionItem } from '@/features/ideal-properties/services/ideal-selection';
import { buildLivingHereForItem } from '@/features/living-here/services/build-for-item';
import { visitMoment } from '@/features/living-here/services/visit-moment';
import { spokenLanguage } from '@/lib/client-language';
import { clientTexts, textLanguage } from '@/lib/client-texts';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const FAILED = 'L’action n’a pas abouti. Réessayez.';
const BUILD_REASONS: Record<string, string> = {
  city: 'La commune du bien manque : « Vivre ici » ne peut pas partir de lui.',
  commune: 'Commune du bien non reconnue : « Vivre ici » ne peut pas partir de lui.',
  start: 'Aucun point de départ sûr pour ce bien.',
};

// La visite d'un acquéreur non archivé de l'agence, encore vivante (ni annulée).
async function liveVisit(visitId: unknown) {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(visitId).success) return null;
  const { data } = await createServiceRoleClient()
    .from('buyer_visit_requests')
    .select(
      'id, buyer_id, buyer_selection_item_id, cancelled_at, buyers!inner(name, phone, email, language, archived_at)',
    )
    .eq('id', visitId as string)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  const buyer = data?.buyers as unknown as {
    name: string;
    phone: string | null;
    email: string | null;
    language: string | null;
    archived_at: string | null;
  } | null;
  if (!data || data.cancelled_at || !buyer || buyer.archived_at) return null;
  return { profile, visit: data, buyer };
}

export type BuildLivingHereResult = { ok: true } | { ok: false; error: string };

// Mission 142 — « Construire Vivre ici » / « Actualiser », sur Visites, en secours de la tâche de
// fond : le même geste, refait à neuf.
export async function buildLivingHereForVisit(visitId: unknown): Promise<BuildLivingHereResult> {
  const context = await liveVisit(visitId);
  if (!context) return { ok: false, error: FAILED };
  const result = await buildLivingHereForItem({
    agencyId: context.profile.agency_id,
    itemId: context.visit.buyer_selection_item_id,
    builtBy: context.profile.id,
  });
  if (!result.ok) return { ok: false, error: BUILD_REASONS[result.reason] ?? FAILED };
  revalidatePath('/visites');
  return { ok: true };
}

export type ConfirmVisitResult =
  | { ok: true; message: string; phone: string | null; email: string | null; subject: string }
  | { ok: false; error: string };

// Mission 142 (décision de Jean-Guy, 07/11) — « Confirmer la visite » : le jour et l'heure gardés
// sur la visite ; un message dans la langue de l'acquéreur, avec un lien neuf vers sa sélection,
// où il lit « Vivre ici ». L'outil n'envoie rien.
export async function confirmVisit(
  visitId: unknown,
  rawDay: unknown,
  rawTime: unknown,
): Promise<ConfirmVisitResult> {
  const context = await liveVisit(visitId);
  if (!context) return { ok: false, error: FAILED };
  const moment = visitMoment(rawDay, rawTime, new Date());
  if (!moment.ok) return { ok: false, error: moment.error };
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from('buyer_visit_requests')
    .update({ scheduled_at: moment.at })
    .eq('id', context.visit.id)
    .eq('agency_id', context.profile.agency_id);
  if (error) return { ok: false, error: FAILED };

  const language = textLanguage(spokenLanguage(context.buyer.language));
  const { data: item } = await admin
    .from('buyer_selection_items')
    .select('*')
    .eq('id', context.visit.buyer_selection_item_id)
    .eq('agency_id', context.profile.agency_id)
    .maybeSingle();
  const presented = item
    ? ((await presentedItems(admin, [toSelectionItem(item)], context.profile.agency_id))[0] ?? null)
    : null;
  const link = await createDossierLink(context.visit.buyer_id, false);
  if (!link.ok) return { ok: false, error: link.error };
  const t = clientTexts(language).buyer.messages;
  const property = propertyPhrase(
    { propertyType: presented?.propertyType ?? null, city: presented?.city ?? null },
    language,
  );
  const signature = context.profile.first_name?.trim();
  const message = [
    t.hello(context.buyer.name),
    ...t.visitConfirm.lines(property, moment.day(language), moment.time(language), link.url),
    ...(signature ? [signature] : []),
  ].join('\n');
  revalidatePath('/visites');
  return {
    ok: true,
    message,
    phone: context.buyer.phone,
    email: context.buyer.email,
    subject: t.visitConfirm.subject,
  };
}
