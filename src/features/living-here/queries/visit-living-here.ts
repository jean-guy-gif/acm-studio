import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { VisitLine } from '@/features/buyer-presentation/queries/get-visit-requests';
import {
  propertyKeysForItems,
  readLivingHereSheets,
} from '@/features/living-here/queries/read-sheets';
import { sectorPrioritiesOf } from '@/features/living-here/services/living-here-rules';
import type { LivingHereSheet, SectorPriority } from '@/features/living-here/types';
import { getProfile } from '@/lib/auth/get-profile';
import type { Database } from '@/lib/supabase/database.types';

export type VisitLivingHere = {
  sheet: LivingHereSheet | null;
  failed: boolean;
  priorities: SectorPriority[];
  livingPlace: string | null;
};

// Mission 142 — pour chaque visite à faire de l'agence : la fiche « Vivre ici » de son bien, et ce
// qui compte pour son acquéreur (★ du secteur, son lieu). Une lecture en échec le dit (M98).
export async function loadVisitLivingHere(
  supabase: SupabaseClient<Database>,
  lines: VisitLine[],
): Promise<Map<string, VisitLivingHere>> {
  const result = new Map<string, VisitLivingHere>();
  const profile = await getProfile();
  if (!profile || lines.length === 0) return result;
  const keys = await propertyKeysForItems(
    supabase,
    profile.agency_id,
    lines.map((line) => ({
      id: line.itemId,
      source: line.itemSource,
      reference: line.itemReference,
    })),
  );
  const [{ sheets, failed }, { data: buyers, error }] = await Promise.all([
    readLivingHereSheets(supabase, profile.agency_id, [...keys.values()]),
    supabase
      .from('buyers')
      .select('id, sector_priorities, living_place')
      .eq('agency_id', profile.agency_id)
      .in('id', [...new Set(lines.map((line) => line.buyerId))]),
  ]);
  const buyerOf = new Map((buyers ?? []).map((buyer) => [buyer.id, buyer]));
  for (const line of lines) {
    const key = keys.get(line.itemId);
    const buyer = buyerOf.get(line.buyerId);
    result.set(line.id, {
      sheet: key ? (sheets.get(key) ?? null) : null,
      failed: failed || error != null,
      priorities: sectorPrioritiesOf(buyer?.sector_priorities),
      livingPlace: buyer?.living_place ?? null,
    });
  }
  return result;
}
