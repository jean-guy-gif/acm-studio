import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { getAgencyBranding } from '@/features/branding/queries/get-agency-branding';
import { buildBuyerDeck } from '@/features/buyer-deck/services/buyer-deck';
import { deckForReading } from '@/features/buyer-deck/services/frozen-deck';
import { toItemResponse } from '@/features/buyer-deck/services/response-row';
import type { AvailabilitySlot, BuyerDeck, ItemResponse } from '@/features/buyer-deck/types';
import { presentedItems } from '@/features/buyer-presentation/queries/load-presentation';
import {
  isPendingVisit,
  toVisitRequest,
} from '@/features/buyer-presentation/services/visit-request-row';
import { getBuyer } from '@/features/buyers/queries/get-buyers';
import type { BuyerInput } from '@/features/buyers/types';
import { getIdealSelection } from '@/features/ideal-properties/queries/get-ideal-selection';
import type { IdealSelection } from '@/features/ideal-properties/types';
import { getAgency } from '@/lib/auth/get-agency';
import { getProfile } from '@/lib/auth/get-profile';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

export type LoadedDeck = {
  deck: BuyerDeck;
  // Ses réponses données pendant la présentation de cette sélection.
  responses: ItemResponse[];
  // Ses créneaux déjà portés par les demandes vivantes (relecture) : rien d'autre des demandes de
  // visite ne part vers la page — ni le retour de visite du conseiller, ni son issue.
  initialAvailability: AvailabilitySlot[];
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  agencyName: string | null;
  // « Ce que je fais ensuite » : le conseiller qui présente, et son téléphone.
  advisorName: string | null;
  advisorPhone: string | null;
};

// Mission 122 — le déroulé calculé sur la fiche et les faits du moment : ce qu'affiche la
// présentation tant qu'elle n'est pas terminée, et ce que « Terminer » fige (le serveur le
// recalcule lui-même, jamais depuis le navigateur). Cadré sur l'agence quel que soit le client.
export async function computeDeck(
  supabase: SupabaseClient<Database>,
  buyer: BuyerInput & { id: string },
  selection: IdealSelection,
  agencyId: string,
  now: Date = new Date(),
): Promise<BuyerDeck> {
  const items = await presentedItems(supabase, selection.items, agencyId);
  const pitchById = new Map(selection.items.map((item) => [item.id, item.pitch]));
  return buildBuyerDeck({
    buyerId: buyer.id,
    buyer,
    selectionId: selection.id,
    selectedAt: selection.createdAt,
    presentedAt: selection.presentedAt,
    buyerWords: selection.buyerWords,
    items: items.map((item) => ({ ...item, pitch: pitchById.get(item.itemId) ?? null })),
    now,
  });
}

// La présentation d'un acquéreur de l'agence, sur sa dernière sélection. Terminée, elle se relit
// telle qu'elle a été affichée (décision de Jean-Guy, 25/10) : seuls les liens des photos, signés
// pour une heure (M37), sont renouvelés. Une présentation terminée avant la mission 122 n'a pas de
// déroulé figé : elle se recalcule, faute de mieux. null : fiche archivée, d'une autre agence, ou
// sans sélection.
export async function loadDeck(buyerId: string): Promise<LoadedDeck | null> {
  const [buyer, profile] = await Promise.all([getBuyer(buyerId), getProfile()]);
  if (!buyer || !profile) return null;
  const selection = await getIdealSelection(buyer.id);
  if (!selection || selection.items.length === 0) return null;
  const supabase = await createClient();
  const itemIds = selection.items.map((item) => item.id);
  const [computed, { data: responseRows }, { data: requestRows }, branding, agency] =
    await Promise.all([
      computeDeck(supabase, buyer, selection, profile.agency_id),
      supabase
        .from('buyer_item_responses')
        .select('*')
        .eq('answered_during', 'presentation')
        .in('selection_item_id', itemIds),
      supabase.from('buyer_visit_requests').select('*').in('buyer_selection_item_id', itemIds),
      getAgencyBranding(),
      getAgency(profile.agency_id),
    ]);
  const deck = deckForReading({
    presentedAt: selection.presentedAt,
    presentedDeck: selection.presentedDeck,
    computed,
  });
  const advisorName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  return {
    deck,
    responses: (responseRows ?? []).map(toItemResponse),
    initialAvailability: [
      ...new Set(
        (requestRows ?? [])
          .map(toVisitRequest)
          .filter(isPendingVisit)
          .flatMap((request) => request.availability),
      ),
    ],
    logoLightUrl: branding?.logoLightUrl ?? null,
    logoDarkUrl: branding?.logoDarkUrl ?? null,
    agencyName: agency?.name ?? null,
    advisorName: advisorName || null,
    advisorPhone: profile.phone ?? null,
  };
}
