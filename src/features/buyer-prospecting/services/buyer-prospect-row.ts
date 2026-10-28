import {
  canAcceptProposedAddress,
  confirmedByAdvisor,
} from '@/features/competitor-locator/services/advisor-address';
import type { ProspectingRow } from '@/features/competitor-locator/services/build-prospecting-rows';
import { prospectingStep } from '@/features/competitor-mandate/services/mandate-columns';
import { displayCommune } from '@/features/competitor-search/utils/arrondissements';
import {
  LISTING_PORTAL_LABELS,
  extractListingKey,
} from '@/features/comparable-import/utils/extract-listing-key';
import { storedFacts } from '@/features/buyer-prospecting/services/prospect-facts';
import type { BuyerProspectRecord } from '@/features/buyer-prospecting/types';
import {
  NO_OPPOSITIONS,
  opposedOn,
  type Oppositions,
} from '@/features/prospecting/services/opposition';
import {
  collaborationDeclined,
  prospectingStatus,
} from '@/features/prospecting/services/prospecting-status';

const clean = (value: string | null): string | null => value?.trim() || null;

// Mission 120 — un bien démarché depuis une recherche acquéreur, sous la forme d'une ligne de
// Prospection : la même adresse, le même statut, le même « à qui s'adresser » qu'un concurrent
// (M75, M83, M86, M115), pour que la carte, ses colonnes, ses compteurs et ses filtres soient les
// mêmes. Pur. Ce que la ligne d'un concurrent sait de plus (ancienneté, baisses observées) n'y est
// pas : rien n'est inventé.
export function buildBuyerProspectRow(
  prospect: BuyerProspectRecord,
  oppositions: Oppositions = NO_OPPOSITIONS,
): ProspectingRow {
  const facts = storedFacts(prospect.facts);
  const identity = extractListingKey(prospect.listing_url);
  const address = clean(prospect.locator_address);
  return {
    id: prospect.id,
    title: null,
    address,
    label: clean(prospect.locator_label),
    confirmed: prospect.locator_confirmed === true,
    canAcceptAddress: canAcceptProposedAddress(prospect),
    confirmedByAdvisor: confirmedByAdvisor(prospect),
    price: facts.price,
    surfaceArea: facts.surfaceArea,
    roomsCount: facts.roomsCount,
    onlineSince: null,
    priceDrop: null,
    listingUrl: clean(prospect.listing_url),
    listingKey: prospect.listing_key,
    listingNumber: identity?.listingKey ?? null,
    opposedOn: opposedOn({ address, listingKey: prospect.listing_key }, oppositions),
    goneSinceMeeting: false,
    propertyType: facts.propertyType,
    city: displayCommune(facts.city, null),
    portal: identity ? (LISTING_PORTAL_LABELS[identity.portal] ?? identity.portal) : null,
    status: prospectingStatus(prospect, prospect.locator_confirmed === true && address != null),
    handedAt: prospect.prospecting_handed_at,
    meetingAt: prospect.prospecting_meeting_at,
    mandateAt: prospect.prospecting_mandate_at,
    declinedAt: prospect.prospecting_declined_at,
    collaborationAt: prospect.prospecting_collaboration_at,
    collaborationDeclinedAt: prospect.prospecting_collaboration_declined_at,
    step: collaborationDeclined(prospect) ? 'owner' : prospectingStep(prospect),
    // Une carte acquéreur n'a pas de dossier vendeur : « à qui s'adresser » se lit, il ne se
    // corrige pas sur la ligne d'un concurrent (`CompetitorMandateLine` n'y est pas rendu).
    mandate: {
      id: prospect.id,
      project_id: '',
      sold_by: prospect.sold_by,
      sold_by_source: null,
      exclusivity: prospect.exclusivity,
      exclusivity_source: null,
    },
  };
}
