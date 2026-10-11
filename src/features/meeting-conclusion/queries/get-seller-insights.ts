import 'server-only';

import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import {
  sortContacts,
  type FollowUpContact,
} from '@/features/meeting-conclusion/services/follow-up-contacts';
import type { GuessedCompetitor } from '@/features/meeting-conclusion/services/seller-said';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 96 — ce que le Suivi et la conclusion lisent en plus de la conclusion elle-même, pour
// un ou plusieurs dossiers de l'agence : les devinettes du vendeur face aux prix (révélé figé,
// puis actuel), le concurrent le plus dangereux qu'il a choisi, et l'historique des relances.
// Écran conseiller seulement. Colonnes nommées une à une : ni adresse ni annonce d'un concurrent
// ne sont lues ici (M75) — un concurrent se nomme par son libellé neutre.
export type SellerInsights = {
  competitors: GuessedCompetitor[];
  dangerous: { label: string; revealedPrice: number | null; currentPrice: number | null } | null;
  contacts: FollowUpContact[];
};

const EMPTY: SellerInsights = { competitors: [], dangerous: null, contacts: [] };

export function emptySellerInsights(): SellerInsights {
  return EMPTY;
}

export async function getSellerInsights(
  projectIds: string[],
): Promise<Map<string, SellerInsights>> {
  const result = new Map<string, SellerInsights>();
  const profile = await getProfile();
  if (!profile || projectIds.length === 0) {
    return result;
  }
  const supabase = await createClient();
  const agencyId = profile.agency_id;

  const [responsesRes, summariesRes, contactsRes, profilesRes] = await Promise.all([
    supabase
      .from('live_seller_responses')
      .select('project_id, comparable_id, seller_estimated_listing_price, revealed_listing_price')
      .in('project_id', projectIds)
      .eq('agency_id', agencyId),
    supabase
      .from('live_seller_summary')
      .select('project_id, seller_most_dangerous_comparable_id')
      .in('project_id', projectIds)
      .eq('agency_id', agencyId),
    supabase
      .from('follow_up_contacts')
      .select('id, project_id, contacted_at, note, author_id')
      .in('project_id', projectIds)
      .eq('agency_id', agencyId),
    supabase.from('profiles').select('id, first_name, last_name').eq('agency_id', agencyId),
  ]);

  const responses = responsesRes.data ?? [];
  const summaries = summariesRes.data ?? [];
  const comparableIds = [
    ...new Set(
      [
        ...responses.map((row) => row.comparable_id),
        ...summaries.map((row) => row.seller_most_dangerous_comparable_id),
      ].filter((id): id is string => id != null),
    ),
  ];
  const { data: comparables } =
    comparableIds.length > 0
      ? await supabase
          .from('comparables')
          .select('id, price, property_type, rooms_count, surface_area, city, district')
          .in('id', comparableIds)
          .eq('agency_id', agencyId)
      : { data: [] };
  const comparableById = new Map((comparables ?? []).map((row) => [row.id, row]));
  const authorById = new Map(
    (profilesRes.data ?? []).map((row) => [
      row.id,
      [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || null,
    ]),
  );

  const entry = (projectId: string): SellerInsights => {
    let insights = result.get(projectId);
    if (!insights) {
      insights = { competitors: [], dangerous: null, contacts: [] };
      result.set(projectId, insights);
    }
    return insights;
  };

  const revealedByComparable = new Map<string, number | null>();
  for (const row of responses) {
    if (row.comparable_id == null) {
      continue;
    }
    revealedByComparable.set(row.comparable_id, row.revealed_listing_price);
    entry(row.project_id).competitors.push({
      guess: row.seller_estimated_listing_price,
      revealedPrice: row.revealed_listing_price,
      currentPrice: comparableById.get(row.comparable_id)?.price ?? null,
    });
  }

  for (const row of summaries) {
    const comparable = row.seller_most_dangerous_comparable_id
      ? comparableById.get(row.seller_most_dangerous_comparable_id)
      : undefined;
    if (!comparable) {
      continue;
    }
    entry(row.project_id).dangerous = {
      label: neutralComparableLabel({
        propertyType: comparable.property_type,
        roomsCount: comparable.rooms_count,
        surfaceArea: comparable.surface_area,
        city: comparable.city,
        district: comparable.district,
      }),
      revealedPrice: revealedByComparable.get(comparable.id) ?? null,
      currentPrice: comparable.price,
    };
  }

  for (const row of contactsRes.data ?? []) {
    entry(row.project_id).contacts.push({
      id: row.id,
      contactedAt: row.contacted_at,
      note: row.note,
      author: row.author_id ? (authorById.get(row.author_id) ?? null) : null,
    });
  }
  for (const insights of result.values()) {
    insights.contacts = sortContacts(insights.contacts);
  }

  return result;
}
