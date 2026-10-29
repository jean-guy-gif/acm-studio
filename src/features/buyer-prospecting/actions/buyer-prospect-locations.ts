'use server';

import { revalidatePath } from 'next/cache';

import { parseLocatorProperty } from '@/features/competitor-locator/schemas/locator-property';
import { needsLocatorQuery } from '@/features/competitor-locator/services/location-action';
import type { SyncOutcome } from '@/features/competitor-locator/services/sync-competitor-locations';
import type {
  CompetitorLocation,
  CompetitorToLocate,
  RawLocatorEntry,
} from '@/features/competitor-locator/types';
import { demoDelay } from '@/features/demo/services/demo-delay';
import { demoLocatorEntry } from '@/features/demo/services/demo-listing-data';
import { findDemoListing } from '@/features/demo/services/demo-urls';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { getOppositions } from '@/features/prospecting/queries/get-oppositions';
import { insertOppositions } from '@/features/prospecting/queries/insert-oppositions';
import { addressKey } from '@/features/prospecting/services/address-key';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const MAX_ENTRIES = 200;

// Mission 120 — l'adresse d'un bien démarché depuis une recherche acquéreur vient du Localisateur,
// comme celle d'un concurrent (M75) : demandée tant qu'elle n'est pas confirmée, jamais après une
// purge (M102). Le Localisateur n'est pas modifié : il reçoit les annonces, comme toujours.
async function loadRows(agencyId: string) {
  const { data } = await (
    await createClient()
  )
    .from('buyer_prospects')
    .select(
      'id, listing_url, locator_state, locator_label, locator_label_key, locator_address, locator_source, locator_confirmed, locator_property_id, locator_latitude, locator_longitude, locator_analyzed_at, locator_purged_at',
    )
    .eq('agency_id', agencyId);
  return (data ?? []).filter(needsLocatorQuery);
}

export async function loadBuyerProspectsToLocate(): Promise<CompetitorToLocate[]> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return [];
  }
  return (await loadRows(profile.agency_id)).map((row) => ({
    id: row.id,
    listingUrl: row.listing_url.trim(),
  }));
}

const same = (a: string | null, b: string | null): boolean =>
  a === null || b === null ? a === b : new Date(a).getTime() === new Date(b).getTime();

// Les réponses viennent du navigateur : revalidées ici, rattachées à un bien démarché de l'agence
// par l'adresse de SON annonce (jamais par un identifiant envoyé par la page) ; une adresse déjà
// confirmée n'est pas réécrite. Écrit par le serveur seul.
export async function saveBuyerProspectLocations(
  entries: RawLocatorEntry[],
): Promise<{ ok: boolean; changed: number }> {
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > MAX_ENTRIES) {
    return { ok: false, changed: 0 };
  }
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, changed: 0 };
  }
  const byUrl = new Map<string, CompetitorLocation>();
  for (const entry of entries) {
    const location = parseLocatorProperty(entry?.raw);
    if (location && typeof entry.listingUrl === 'string') {
      byUrl.set(entry.listingUrl.trim(), location);
    }
  }
  if (byUrl.size === 0) {
    return { ok: true, changed: 0 };
  }
  const client = createServiceRoleClient();
  let changed = 0;
  let ok = true;
  const confirmedNow: { address: string; listingKey: string }[] = [];
  const rows = await loadRows(profile.agency_id);
  for (const row of rows) {
    const location = byUrl.get(row.listing_url.trim());
    if (
      !location ||
      (row.locator_state === location.state &&
        row.locator_address === location.address &&
        (row.locator_confirmed ?? false) === location.confirmed &&
        row.locator_label_key === location.labelKey &&
        same(row.locator_analyzed_at, location.analyzedAt))
    ) {
      continue;
    }
    const { data, error } = await client
      .from('buyer_prospects')
      .update({
        locator_state: location.state,
        locator_label: location.label,
        locator_label_key: location.labelKey,
        locator_address: location.address,
        locator_source: location.source,
        locator_confirmed: location.confirmed,
        locator_property_id: location.propertyId,
        locator_latitude: location.latitude,
        locator_longitude: location.longitude,
        locator_analyzed_at: location.analyzedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('agency_id', profile.agency_id)
      .or('locator_confirmed.is.null,locator_confirmed.eq.false')
      .select('listing_key');
    if (error) {
      ok = false;
    } else if (data && data.length > 0) {
      changed += 1;
      if (location.confirmed && location.address) {
        confirmedNow.push({ address: location.address, listingKey: data[0].listing_key });
      }
    }
  }
  // Mission 107 — une annonce déjà opposée : l'adresse confirmée rejoint l'opposition.
  if (confirmedNow.length > 0) {
    const supabase = await createClient();
    const oppositions = await getOppositions(supabase, profile.agency_id);
    for (const confirmed of confirmedNow) {
      if (oppositions.listings.has(confirmed.listingKey)) {
        const added = await insertOppositions(
          supabase,
          { agencyId: profile.agency_id, profileId: profile.id },
          { addressKey: addressKey(confirmed.address), listingKeys: [] },
        );
        if (!added) {
          await reportServerError(
            'oppositionParAnnonce',
            new Error('adresse confirmée d’une annonce opposée non ajoutée à la liste'),
          );
        }
      }
    }
  }
  if (changed > 0) {
    revalidatePath('/prospection');
    revalidatePath('/visites');
  }
  return { ok, changed };
}

// Mission 114 — le Localisateur SIMULÉ, pour les biens démarchés de l'agence de démonstration : la
// réponse vient du jeu de données, après le délai fixe, et passe par `saveBuyerProspectLocations`.
// Ailleurs, rien n'est écrit et le Localisateur se dit absent.
export async function locateDemoBuyerProspects(): Promise<SyncOutcome> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !(await isDemoAgency(profile.agency_id))) {
    return { availability: 'unavailable', pending: false, changed: 0 };
  }
  const now = new Date();
  const entries = (await loadBuyerProspectsToLocate())
    .map((prospect) => findDemoListing(prospect.listingUrl))
    .filter((listing) => listing != null)
    .map((listing) => demoLocatorEntry(listing, now));
  if (entries.length === 0) {
    return { availability: 'ready', pending: false, changed: 0 };
  }
  await demoDelay();
  const saved = await saveBuyerProspectLocations(entries);
  return { availability: 'ready', pending: false, changed: saved.changed };
}
