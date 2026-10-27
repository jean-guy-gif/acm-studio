import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { buildBuyerProspectRow } from '@/features/buyer-prospecting/services/buyer-prospect-row';
import type {
  BuyerOriginLabel,
  BuyerProspectCard,
  BuyerProspectOriginRecord,
  BuyerProspectRecord,
} from '@/features/buyer-prospecting/types';
import { getOppositions } from '@/features/prospecting/queries/get-oppositions';
import type { Oppositions } from '@/features/prospecting/services/opposition';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;

export type BuyerOrigin = BuyerOriginLabel & {
  selectionItemId: string;
  prospectId: string | null;
  comparableId: string | null;
  letterVersion: 'owner' | 'colleague' | null;
};

export type BuyerProspecting = {
  // Les cartes nées d'une recherche acquéreur, sans concurrent : une par annonce.
  cards: BuyerProspectCard[];
  // Les origines « Recherche acquéreur » des cartes de concurrents (M98), par concurrent.
  byComparable: Map<string, BuyerOriginLabel[]>;
  // L'origine de chaque bien retenu, pour la visite qui le porte.
  bySelectionItem: Map<string, BuyerOrigin>;
};

const ORIGIN_COLUMNS =
  'id, buyer_id, selection_item_id, prospect_id, comparable_id, letter_version, buyers!inner(name)';

// Mission 120 — les biens démarchés depuis une recherche acquéreur, et les origines de toutes les
// cartes, cadrés sur l'agence de l'appelant. Une lecture en échec n'est jamais lue comme « rien » :
// la liste d'opposition se relit par `getOppositions`, qui s'arrête plutôt (M98).
export async function getBuyerProspecting(
  supabase: Client,
  agencyId: string,
  oppositions?: Oppositions,
): Promise<BuyerProspecting> {
  const [{ data: originRows }, { data: prospectRows }, opposed] = await Promise.all([
    supabase
      .from('buyer_prospect_origins')
      .select(ORIGIN_COLUMNS)
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: true }),
    supabase
      .from('buyer_prospects')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: true }),
    oppositions ? Promise.resolve(oppositions) : getOppositions(supabase, agencyId),
  ]);
  const origins: BuyerOrigin[] = (originRows ?? []).map((row) => {
    const origin = row as unknown as Pick<
      BuyerProspectOriginRecord,
      'id' | 'buyer_id' | 'selection_item_id' | 'prospect_id' | 'comparable_id' | 'letter_version'
    > & { buyers: { name: string } };
    return {
      originId: origin.id,
      buyerId: origin.buyer_id,
      buyerName: origin.buyers.name,
      selectionItemId: origin.selection_item_id,
      prospectId: origin.prospect_id,
      comparableId: origin.comparable_id,
      letterVersion:
        origin.letter_version === 'owner' || origin.letter_version === 'colleague'
          ? origin.letter_version
          : null,
    };
  });
  const label = ({ originId, buyerId, buyerName }: BuyerOrigin): BuyerOriginLabel => ({
    originId,
    buyerId,
    buyerName,
  });

  const byComparable = new Map<string, BuyerOriginLabel[]>();
  for (const origin of origins) {
    if (origin.comparableId) {
      byComparable.set(origin.comparableId, [
        ...(byComparable.get(origin.comparableId) ?? []),
        label(origin),
      ]);
    }
  }
  // Un bien démarché sans origine (sa fiche est partie) ne fait plus de carte.
  const cards = ((prospectRows ?? []) as BuyerProspectRecord[]).flatMap((prospect) => {
    const own = origins.filter((origin) => origin.prospectId === prospect.id).map(label);
    return own.length > 0
      ? [{ prospectId: prospect.id, row: buildBuyerProspectRow(prospect, opposed), origins: own }]
      : [];
  });
  return {
    cards,
    byComparable,
    bySelectionItem: new Map(origins.map((origin) => [origin.selectionItemId, origin])),
  };
}
