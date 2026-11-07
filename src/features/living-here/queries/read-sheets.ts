import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { dismissalKey } from '@/features/buyer-dismissals/services/dismissal-key';
import { readLivingHereBlocks } from '@/features/living-here/services/sheet-schema';
import type { LivingHereSheet, StartOrigin } from '@/features/living-here/types';
import type { Database } from '@/lib/supabase/database.types';

type Client = SupabaseClient<Database>;
type ItemRef = { id: string; source: string; reference: string };

// Mission 142 — la clé de bien de chaque bien retenu (celle de la boucle, M134) ; un concurrent
// se reconnaît à son annonce. Cadré sur l'agence.
export async function propertyKeysForItems(
  client: Client,
  agencyId: string,
  items: ItemRef[],
): Promise<{ keys: Map<string, string>; failed: boolean }> {
  const competitorIds = items
    .filter((item) => item.source === 'competitor')
    .map((item) => item.reference);
  const { data: competitors, error } = competitorIds.length
    ? await client
        .from('comparables')
        .select('id, listing_url')
        .eq('agency_id', agencyId)
        .in('id', competitorIds)
    : { data: [], error: null };
  const listingOf = new Map((competitors ?? []).map((row) => [row.id, row.listing_url]));
  const keys = new Map<string, string>();
  for (const item of items) {
    if (item.source === 'project') {
      keys.set(item.id, dismissalKey({ source: 'project', projectId: item.reference }));
    } else if (item.source === 'competitor') {
      keys.set(
        item.id,
        dismissalKey({
          source: 'competitor',
          competitorId: item.reference,
          listingUrl: listingOf.get(item.reference) ?? null,
        }),
      );
    } else {
      keys.set(item.id, dismissalKey({ source: 'listing', url: item.reference }));
    }
  }
  // Une lecture en échec n'est jamais lue comme « pas encore de fiche » (M98).
  return { keys, failed: error != null };
}

const ORIGINS: readonly StartOrigin[] = ['address', 'district', 'commune'];

// Les fiches « Vivre ici » de l'agence pour ces clés, relues par liste d'autorisation. `failed` :
// la lecture a échoué — jamais lue comme « pas de fiche » (M98).
export async function readLivingHereSheets(
  client: Client,
  agencyId: string,
  keys: string[],
): Promise<{ sheets: Map<string, LivingHereSheet>; failed: boolean }> {
  const sheets = new Map<string, LivingHereSheet>();
  if (keys.length === 0) return { sheets, failed: false };
  const { data, error } = await client
    .from('living_here_sheets')
    .select('property_key, origin, built_at, blocks')
    .eq('agency_id', agencyId)
    .in('property_key', [...new Set(keys)]);
  if (error) return { sheets, failed: true };
  for (const row of data ?? []) {
    if (!ORIGINS.includes(row.origin as StartOrigin)) continue;
    const record = (row.blocks ?? {}) as Record<string, unknown>;
    const commune = typeof record.commune === 'string' ? record.commune.slice(0, 120) : '';
    sheets.set(row.property_key, {
      propertyKey: row.property_key,
      origin: row.origin as StartOrigin,
      commune,
      builtAt: row.built_at,
      blocks: readLivingHereBlocks(row.blocks, row.built_at),
    });
  }
  return { sheets, failed: false };
}
