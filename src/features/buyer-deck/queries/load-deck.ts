import 'server-only';

import { getAgencyBranding } from '@/features/branding/queries/get-agency-branding';
import { buildBuyerDeck } from '@/features/buyer-deck/services/buyer-deck';
import { toItemResponse } from '@/features/buyer-deck/services/response-row';
import type { BuyerDeck, ItemResponse } from '@/features/buyer-deck/types';
import { presentedItems } from '@/features/buyer-presentation/queries/load-presentation';
import { toVisitRequest } from '@/features/buyer-presentation/services/visit-request-row';
import type { VisitRequest } from '@/features/buyer-presentation/types';
import { getBuyer } from '@/features/buyers/queries/get-buyers';
import { getIdealSelection } from '@/features/ideal-properties/queries/get-ideal-selection';
import { getAgency } from '@/lib/auth/get-agency';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type LoadedDeck = {
  deck: BuyerDeck;
  // Ses réponses données pendant la présentation de cette sélection.
  responses: ItemResponse[];
  requests: VisitRequest[];
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  agencyName: string | null;
  // « Ce que je fais ensuite » : le conseiller qui présente, et son téléphone.
  advisorName: string | null;
  advisorPhone: string | null;
};

// Mission 122 — le déroulé d'un acquéreur de l'agence, sur sa dernière sélection : la fiche, les
// biens (liste d'autorisation, prix du 24/10, M119), ses mots et les phrases « Pourquoi », ses
// réponses et ses demandes de visite. Lu par le navigateur du conseiller (la RLS cloisonne).
// null : fiche archivée, d'une autre agence, ou sans sélection.
export async function loadDeck(buyerId: string): Promise<LoadedDeck | null> {
  const [buyer, profile] = await Promise.all([getBuyer(buyerId), getProfile()]);
  if (!buyer || !profile) return null;
  const selection = await getIdealSelection(buyer.id);
  if (!selection || selection.items.length === 0) return null;
  const supabase = await createClient();
  const itemIds = selection.items.map((item) => item.id);
  const [items, { data: responseRows }, { data: requestRows }, branding, agency] =
    await Promise.all([
      presentedItems(supabase, selection.items, profile.agency_id),
      supabase
        .from('buyer_item_responses')
        .select('*')
        .eq('answered_during', 'presentation')
        .in('selection_item_id', itemIds),
      supabase
        .from('buyer_visit_requests')
        .select('*')
        .in('buyer_selection_item_id', itemIds)
        .order('requested_at'),
      getAgencyBranding(),
      getAgency(profile.agency_id),
    ]);
  const pitchById = new Map(selection.items.map((item) => [item.id, item.pitch]));
  const advisorName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  return {
    deck: buildBuyerDeck({
      buyerId: buyer.id,
      buyer,
      selectionId: selection.id,
      selectedAt: selection.createdAt,
      presentedAt: selection.presentedAt,
      buyerWords: selection.buyerWords,
      items: items.map((item) => ({ ...item, pitch: pitchById.get(item.itemId) ?? null })),
      now: new Date(),
    }),
    responses: (responseRows ?? []).map(toItemResponse),
    requests: (requestRows ?? []).map(toVisitRequest),
    logoLightUrl: branding?.logoLightUrl ?? null,
    logoDarkUrl: branding?.logoDarkUrl ?? null,
    agencyName: agency?.name ?? null,
    advisorName: advisorName || null,
    advisorPhone: profile.phone ?? null,
  };
}
