import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import { addressKey } from '@/features/prospecting/services/address-key';
import { buildOppositions } from '@/features/prospecting/services/opposition';

// Mission 109 — une annonce « Ne plus solliciter » dont l'adresse a été confirmée ensuite doit
// bloquer aussi l'immeuble (M107). Si l'ajout de la clé d'adresse a échoué au moment de la
// confirmation, la tâche de la nuit le rattrape : pour chaque agence, les adresses confirmées des
// concurrents dont l'annonce est opposée, absentes de la liste. Pur. Une opposition n'est jamais
// retirée ni affaiblie : on ne fait qu'ajouter.

export type BackfillOpposition = {
  agency_id: string;
  address_key: string | null;
  listing_key: string | null;
  requested_at: string;
};

export type BackfillCompetitor = {
  agency_id: string;
  listing_url: string | null;
  locator_address: string | null;
  locator_confirmed: boolean | null;
};

export function missingOppositionAddresses(
  oppositions: BackfillOpposition[],
  competitors: BackfillCompetitor[],
): { agencyId: string; addressKey: string }[] {
  const byAgency = new Map<string, BackfillOpposition[]>();
  for (const row of oppositions) {
    byAgency.set(row.agency_id, [...(byAgency.get(row.agency_id) ?? []), row]);
  }
  const missing = new Map<string, { agencyId: string; addressKey: string }>();
  for (const [agencyId, rows] of byAgency) {
    const list = buildOppositions(rows);
    for (const competitor of competitors) {
      if (competitor.agency_id !== agencyId || competitor.locator_confirmed !== true) continue;
      const listing = listingIdentityKey(competitor.listing_url);
      if (listing == null || !list.listings.has(listing)) continue;
      const key = addressKey(competitor.locator_address ?? '');
      if (key == null || list.addresses.has(key)) continue;
      missing.set(`${agencyId}|${key}`, { agencyId, addressKey: key });
    }
  }
  return [...missing.values()];
}
