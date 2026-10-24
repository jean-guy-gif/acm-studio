'use server';

import { revalidatePath } from 'next/cache';

import { demoImportedData } from '@/features/demo/services/demo-listing-data';
import { findDemoListing } from '@/features/demo/services/demo-urls';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import {
  readSelectionInput,
  toSelection,
} from '@/features/ideal-properties/services/ideal-selection';
import type { IdealSelection } from '@/features/ideal-properties/types';
import { getProfile } from '@/lib/auth/get-profile';
import type { Json } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SaveIdealSelectionResult =
  | { ok: true; selection: IdealSelection; toImport: { itemId: string; url: string }[] }
  | { ok: false; error: string };

const FAILED = 'La sélection n’a pas pu être enregistrée. Réessayez.';

// Mission 118 — « Retenir la sélection » : jusqu'à trois biens, enregistrés d'un coup pour la fiche
// (une sélection précédente reste lisible, la nouvelle vaut). Les annonces du marché retenues
// gardent ce que la recherche en a dit ; en démonstration (M114), leurs données importées viennent
// du jeu de données côté serveur ; ailleurs, l'écran lit ensuite chaque page par l'extension
// (`importIdealListing`). Le serveur seul écrit, dans l'agence de l'appelant.
export async function saveIdealSelection(
  buyerId: string,
  rawItems: unknown,
  seenOn: unknown,
): Promise<SaveIdealSelectionResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  const read = readSelectionInput(rawItems);
  if (!read.ok) return { ok: false, error: read.error };
  const priceSeenOn =
    typeof seenOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(seenOn) ? seenOn : null;

  const client = createServiceRoleClient();
  const { data: buyer } = await client
    .from('buyers')
    .select('id')
    .eq('id', buyerId)
    .eq('agency_id', profile.agency_id)
    .is('archived_at', null)
    .maybeSingle();
  if (!buyer) return { ok: false, error: 'Cette fiche acquéreur n’existe plus.' };

  const demo = await isDemoAgency(profile.agency_id);
  const { data: selection, error } = await client
    .from('buyer_selections')
    .insert({ agency_id: profile.agency_id, buyer_id: buyerId, created_by: profile.id })
    .select('*')
    .single();
  if (error || !selection) return { ok: false, error: FAILED };

  const now = new Date();
  const rows = read.items.map((item, index) => {
    const demoListing = demo && item.source === 'listing' ? findDemoListing(item.reference) : null;
    return {
      agency_id: profile.agency_id,
      selection_id: selection.id,
      position: index + 1,
      source: item.source,
      reference: item.reference,
      label: item.label,
      listed_price: item.listedPrice,
      price_seen_on: item.source === 'listing' ? priceSeenOn : null,
      category: item.category,
      gaps: item.gaps,
      snapshot: (item.snapshot ?? null) as Json | null,
      imported: (demoListing ? demoImportedData(demoListing, now) : null) as unknown as Json | null,
    };
  });
  const { data: items, error: itemsError } = await client
    .from('buyer_selection_items')
    .insert(rows)
    .select('*');
  if (itemsError || !items) {
    await client.from('buyer_selections').delete().eq('id', selection.id);
    return { ok: false, error: FAILED };
  }
  revalidatePath(`/acquereurs/${buyerId}`);
  revalidatePath(`/acquereurs/${buyerId}/biens-ideaux`);
  return {
    ok: true,
    selection: toSelection(selection, items),
    toImport: demo
      ? []
      : items
          .filter((item) => item.source === 'listing')
          .map((item) => ({ itemId: item.id, url: item.reference })),
  };
}
