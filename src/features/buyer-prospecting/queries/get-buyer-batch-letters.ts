import 'server-only';

import {
  getBuyerLetter,
  type BuyerLetterContext,
} from '@/features/buyer-prospecting/queries/get-buyer-letter';
import { getBuyerProspecting } from '@/features/buyer-prospecting/queries/get-buyer-prospecting';
import type { ProspectingRow } from '@/features/competitor-locator/services/build-prospecting-rows';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import {
  excludedFromBatch,
  isBatchPreparable,
  splitBatchLetters,
} from '@/features/prospecting-file/services/batch-letters';
import { getProspectingCards } from '@/features/prospecting/queries/prospecting-card-store';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

type Printable = { originId: string; label: string; prospectId: string | null };

export type BuyerBatchLetters = {
  buyerId: string;
  buyerName: string;
  letters: { item: Printable; context: Extract<BuyerLetterContext, { status: 'ready' }> }[];
  held: { item: Printable; reason: string }[];
};

const rowLabel = (row: ProspectingRow): string =>
  neutralComparableLabel({
    propertyType: normalizePropertyType(row.propertyType),
    roomsCount: row.roomsCount,
    surfaceArea: row.surfaceArea,
    city: row.city,
    district: null,
  });

// Mission 120 B — « Préparer tous les courriers » d'une recherche acquéreur : UN document à
// imprimer, avec le courrier de chaque bien prêt — au propriétaire, ou le dossier au confrère —,
// tel qu'enregistré ou tel que proposé. Les mêmes règles que le lot d'un bien vendeur (M98, M102,
// M105) : un courrier retenu est listé en tête avec sa raison et n'est pas imprimé. Chaque
// courrier passe par `getBuyerLetter`, cadré sur l'agence de l'appelant. Côté conseiller.
export async function getBuyerBatchLetters(buyerId: string): Promise<BuyerBatchLetters | null> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !/^[0-9a-f-]{36}$/i.test(buyerId)) {
    return null;
  }
  const agencyId = profile.agency_id;
  const supabase = await createClient();
  const { data: buyer } = await supabase
    .from('buyers')
    .select('id, name, archived_at')
    .eq('id', buyerId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (!buyer || buyer.archived_at != null) {
    return null;
  }
  const { data: origins } = await supabase
    .from('buyer_prospect_origins')
    .select('id, prospect_id, comparable_id')
    .eq('buyer_id', buyerId)
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: true });
  const prospecting = await getBuyerProspecting(supabase, agencyId);
  const cards = await getProspectingCards();

  const entries = (origins ?? []).flatMap((origin) => {
    const row = origin.prospect_id
      ? prospecting.cards.find((card) => card.prospectId === origin.prospect_id)?.row
      : cards.find((card) => card.copies.some((copy) => copy.row.id === origin.comparable_id))?.row;
    if (!row) return [];
    const item: Printable = {
      originId: origin.id,
      label: rowLabel(row),
      prospectId: origin.prospect_id,
    };
    return [{ item, row }];
  });
  const preparable = entries.filter(({ row }) =>
    isBatchPreparable({ status: row.status, step: row.step, opposed: row.opposedOn != null }),
  );
  const prepared = await Promise.all(
    preparable.map(async ({ item }) => ({
      row: item,
      context: await getBuyerLetter(item.originId),
    })),
  );
  const split = splitBatchLetters(prepared);
  return {
    buyerId: buyer.id,
    buyerName: buyer.name,
    letters: split.letters.map(({ row, context }) => ({ item: row, context })),
    held: [
      ...excludedFromBatch(
        entries.map(({ item, row }) => ({
          row: item,
          status: row.status,
          step: row.step,
          opposed: row.opposedOn != null,
        })),
      ).map(({ row, reason }) => ({ item: row, reason })),
      ...split.held.map(({ row, reason }) => ({ item: row, reason })),
    ],
  };
}
