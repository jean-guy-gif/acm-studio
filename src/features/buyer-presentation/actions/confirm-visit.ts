'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { readMandateAcademiaLinks } from '@/features/academia/queries/read-academia-links';
import { createDossierLink } from '@/features/buyer-dossier/actions/dossier-links';
import { presentedItems } from '@/features/buyer-presentation/queries/load-presentation';
import { visitMoment } from '@/features/buyer-presentation/services/visit-moment';
import { propertyPhrase } from '@/features/buyers/services/loop-properties';
import { toSelectionItem } from '@/features/ideal-properties/services/ideal-selection';
import { getProfile } from '@/lib/auth/get-profile';
import { spokenLanguage } from '@/lib/client-language';
import { clientTexts, textLanguage } from '@/lib/client-texts';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const FAILED = 'L’action n’a pas abouti. Réessayez.';

// La visite d'un acquéreur non archivé de l'agence, encore vivante (ni annulée).
async function liveVisit(visitId: unknown) {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !z.uuid().safeParse(visitId).success) return null;
  const { data } = await createServiceRoleClient()
    .from('buyer_visit_requests')
    .select(
      'id, buyer_id, buyer_selection_item_id, cancelled_at, visited_at, buyers!inner(name, phone, email, language, archived_at)',
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

export type ConfirmVisitResult =
  | { ok: true; message: string; phone: string | null; email: string | null; subject: string }
  | { ok: false; error: string };

// Mission 142 (décision de Jean-Guy, 07/11) — « Confirmer la visite » : le jour et l'heure gardés
// sur la visite ; un message dans la langue de l'acquéreur, avec un lien neuf vers sa sélection.
// Mission 147 (partie A) — et le lien client « Vivre ici » d'Academia du bien, s'il est collé sur
// son mandat signé ; sinon, la sélection seule. L'outil n'envoie rien.
export async function confirmVisit(
  visitId: unknown,
  rawDay: unknown,
  rawTime: unknown,
): Promise<ConfirmVisitResult> {
  const context = await liveVisit(visitId);
  if (!context) return { ok: false, error: FAILED };
  if (context.visit.visited_at) return { ok: false, error: 'Cette visite est déjà faite.' };
  const moment = visitMoment(rawDay, rawTime, new Date());
  if (!moment.ok) return { ok: false, error: moment.error };
  const admin = createServiceRoleClient();

  const language = textLanguage(spokenLanguage(context.buyer.language));
  const { data: item } = await admin
    .from('buyer_selection_items')
    .select('*')
    .eq('id', context.visit.buyer_selection_item_id)
    .eq('agency_id', context.profile.agency_id)
    .maybeSingle();
  if (!item || item.removed_at)
    return { ok: false, error: 'Ce bien n’est plus dans sa sélection.' };
  const presented =
    (await presentedItems(admin, [toSelectionItem(item)], context.profile.agency_id))[0] ?? null;
  let livingHereUrl: string | null = null;
  if (item.source === 'project') {
    const read = await readMandateAcademiaLinks(admin, context.profile.agency_id, [item.reference]);
    // Jamais un message sans le lien parce qu'il n'a pas pu être lu (M98).
    if (!read.ok) return { ok: false, error: FAILED };
    livingHereUrl = read.links.get(item.reference) ?? null;
  }
  // Un lien vers la sélection de CE bien (relecture du 07/11), créé avant d'écrire le jour : un
  // lien en échec ne laisse rien d'écrit.
  const link = await createDossierLink(context.visit.buyer_id, false, item.selection_id);
  if (!link.ok) return { ok: false, error: link.error };
  const { error } = await admin
    .from('buyer_visit_requests')
    .update({ scheduled_at: moment.at })
    .eq('id', context.visit.id)
    .eq('agency_id', context.profile.agency_id);
  if (error) return { ok: false, error: FAILED };
  const t = clientTexts(language).buyer.messages;
  const property = propertyPhrase(
    { propertyType: presented?.propertyType ?? null, city: presented?.city ?? null },
    language,
  );
  const signature = context.profile.first_name?.trim();
  const message = [
    t.hello(context.buyer.name),
    ...t.visitConfirm.lines(
      property,
      moment.day(language),
      moment.time(language),
      link.url,
      livingHereUrl,
    ),
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
