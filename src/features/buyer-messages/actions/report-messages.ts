'use server';

import { revalidatePath } from 'next/cache';

import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import { buyerLanguage } from '@/features/buyer-messages/languages';
import {
  TEMPLATES,
  meetingProposalMessage,
  weeklyReportMessage,
  type WeekFigures,
} from '@/features/buyer-messages/messages';
import { isDismissReason } from '@/features/buyer-messages/report';
import { coveredWeek, weekFigures, type WeekFacts } from '@/features/buyer-messages/week';
import { readWatchFinds } from '@/features/buyer-watch/services/watch-finds';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 139 — le point de la semaine et le point proposé, depuis « À faire aujourd'hui » : le
// message prêt, dans la langue du client, aux coordonnées de sa fiche ; « Envoyé » note l'envoi
// (`buyer_events`, jamais un échange : seul ce qui vient de l'acquéreur en est un, M135). Les
// chiffres se relisent ici, en base, pour la semaine écoulée : rien n'est reçu du navigateur.

export type PreparedReport =
  | {
      ok: true;
      message: string;
      phone: string | null;
      email: string | null;
      // L'objet de l'e-mail, dans la langue du client.
      subject: string;
      figures?: WeekFigures;
    }
  | { ok: false; error: string };
export type NotedResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Admin = ReturnType<typeof createServiceRoleClient>;

async function readBuyer(admin: Admin, agencyId: string, buyerId: unknown) {
  if (typeof buyerId !== 'string' || !UUID.test(buyerId)) return null;
  const { data } = await admin
    .from('buyers')
    .select('id, name, language, phone, email')
    .eq('id', buyerId)
    .eq('agency_id', agencyId)
    .is('archived_at', null)
    .maybeSingle();
  return data;
}

// `listing:<portail>:<numéro>` pour une annonce, comme la boucle (M134) : un même bien ne compte
// qu'une fois, qu'il vienne de la veille, d'un écart ou d'une sélection.
const listingKey = (url: string): string => `listing:${listingIdentityKey(url) ?? url.trim()}`;

// Les faits de la semaine d'un acquéreur, lus en base ; null si une lecture échoue (jamais un
// point faux, M98).
async function readWeekFacts(
  admin: Admin,
  agencyId: string,
  buyerId: string,
  since: string,
): Promise<WeekFacts | null> {
  const [runs, dismissals, selections, proposals, visits] = await Promise.all([
    admin
      .from('buyer_watch_runs')
      .select('ran_at, finds')
      .eq('agency_id', agencyId)
      .eq('buyer_id', buyerId)
      .gte('ran_at', since),
    admin
      .from('buyer_dismissals')
      .select('property_key, reason, dismissed_at')
      .eq('agency_id', agencyId)
      .eq('buyer_id', buyerId)
      .gte('dismissed_at', since),
    admin
      .from('buyer_selections')
      .select('created_at, buyer_selection_items(source, reference, removed_at)')
      .eq('agency_id', agencyId)
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: true }),
    admin
      .from('buyer_proposals')
      .select('property_key, sent_at')
      .eq('agency_id', agencyId)
      .eq('buyer_id', buyerId)
      .gte('sent_at', since),
    admin
      .from('buyer_visit_requests')
      .select('visited_at')
      .eq('agency_id', agencyId)
      .eq('buyer_id', buyerId)
      .gte('visited_at', since),
  ]);
  if (runs.error || dismissals.error || selections.error || proposals.error || visits.error) {
    return null;
  }
  // Un bien « retenu » : la première sélection où il entre, et les biens proposés (M134). Un
  // concurrent porte la clé de son annonce, comme une proposition ou un écart (M134) : un même bien
  // ne compte qu'une fois.
  const competitorIds = (selections.data ?? []).flatMap((selection) =>
    ((selection.buyer_selection_items ?? []) as { source: string; reference: string }[])
      .filter((item) => item.source === 'competitor')
      .map((item) => item.reference),
  );
  const competitors =
    competitorIds.length > 0
      ? await admin
          .from('comparables')
          .select('id, listing_url')
          .eq('agency_id', agencyId)
          .in('id', competitorIds)
      : { data: [], error: null };
  if (competitors.error) return null;
  const competitorUrl = new Map(
    (competitors.data ?? []).map((row) => [row.id, row.listing_url ?? null]),
  );
  const keyOf = (item: { source: string; reference: string }): string => {
    if (item.source === 'listing') return listingKey(item.reference);
    if (item.source === 'competitor') {
      const url = competitorUrl.get(item.reference);
      return url ? listingKey(url) : `competitor:${item.reference}`;
    }
    return `project:${item.reference}`;
  };
  const firstSeen = new Map<string, string>();
  for (const selection of selections.data ?? []) {
    const items = (selection.buyer_selection_items ?? []) as {
      source: string;
      reference: string;
    }[];
    for (const item of items) {
      const key = keyOf(item);
      if (!firstSeen.has(key)) firstSeen.set(key, selection.created_at);
    }
  }
  return {
    finds: (runs.data ?? []).flatMap((run) =>
      readWatchFinds(run.finds).map((find) => ({ key: listingKey(find.url), at: run.ran_at })),
    ),
    dismissals: (dismissals.data ?? []).flatMap((row) =>
      isDismissReason(row.reason)
        ? [{ key: row.property_key, reason: row.reason, at: row.dismissed_at }]
        : [],
    ),
    retained: [
      ...[...firstSeen].map(([key, at]) => ({ key, at })),
      ...(proposals.data ?? []).map((row) => ({ key: row.property_key, at: row.sent_at })),
    ],
    visits: (visits.data ?? []).flatMap((row) => (row.visited_at ? [{ at: row.visited_at }] : [])),
  };
}

export async function prepareWeeklyReport(buyerId: unknown): Promise<PreparedReport> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  const admin = createServiceRoleClient();
  const buyer = await readBuyer(admin, profile.agency_id, buyerId);
  if (!buyer) return { ok: false, error: 'Fiche introuvable.' };
  const week = coveredWeek(new Date());
  const facts = await readWeekFacts(admin, profile.agency_id, buyer.id, week.startAt.toISOString());
  if (!facts)
    return { ok: false, error: 'Les chiffres de la semaine n’ont pas pu être lus. Réessayez.' };
  const figures = weekFigures(facts, week);
  return {
    ok: true,
    message: weeklyReportMessage({
      language: buyerLanguage(buyer.language),
      buyerName: buyer.name,
      figures,
      advisorFirstName: profile.first_name,
    }),
    phone: buyer.phone,
    email: buyer.email,
    subject: TEMPLATES[buyerLanguage(buyer.language)].subjects.weekly,
    figures,
  };
}

export async function prepareMeetingProposal(buyerId: unknown): Promise<PreparedReport> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  const admin = createServiceRoleClient();
  const buyer = await readBuyer(admin, profile.agency_id, buyerId);
  if (!buyer) return { ok: false, error: 'Fiche introuvable.' };
  return {
    ok: true,
    message: meetingProposalMessage({
      language: buyerLanguage(buyer.language),
      buyerName: buyer.name,
      advisorFirstName: profile.first_name,
    }),
    phone: buyer.phone,
    email: buyer.email,
    subject: TEMPLATES[buyerLanguage(buyer.language)].subjects.meeting,
  };
}

// « Envoyé » : le point de la semaine écoulée (une fois, la base le garantit), ou le point proposé.
export async function noteReportSent(buyerId: unknown, kind: unknown): Promise<NotedResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  if (kind !== 'weekly_report' && kind !== 'meeting_proposed') {
    return { ok: false, error: 'Envoi inconnu.' };
  }
  const admin = createServiceRoleClient();
  const buyer = await readBuyer(admin, profile.agency_id, buyerId);
  if (!buyer) return { ok: false, error: 'Fiche introuvable.' };
  const { error } = await admin.from('buyer_events').insert({
    agency_id: profile.agency_id,
    buyer_id: buyer.id,
    kind,
    week_start: kind === 'weekly_report' ? coveredWeek(new Date()).start : null,
    created_by: profile.id,
  });
  // Déjà noté pour cette semaine : c'est ce qui était demandé.
  if (error && error.code !== '23505') {
    await reportServerError('noteReportSent', error);
    return { ok: false, error: 'L’envoi n’a pas pu être noté. Réessayez.' };
  }
  revalidatePath('/suivi');
  revalidatePath(`/acquereurs/${buyer.id}`);
  return { ok: true };
}
