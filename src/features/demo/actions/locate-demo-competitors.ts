'use server';

import {
  loadCompetitorsToLocate,
  saveCompetitorLocations,
} from '@/features/competitor-locator/actions/competitor-locations';
import type { SyncOutcome } from '@/features/competitor-locator/services/sync-competitor-locations';
import { demoDelay } from '@/features/demo/services/demo-delay';
import { demoLocatorEntry } from '@/features/demo/services/demo-listing-data';
import { findDemoListing } from '@/features/demo/services/demo-urls';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { getProfile } from '@/lib/auth/get-profile';

const NOTHING: SyncOutcome = { availability: 'ready', pending: false, changed: 0 };

// Mission 114 — le Localisateur SIMULÉ : pour les concurrents retenus du dossier dont l'adresse
// manque, la réponse vient du jeu de données (adresse confirmée, étiquette, position), après le
// délai fixe, et passe par `saveCompetitorLocations` — la même revalidation, la même écriture
// qu'une réponse du vrai Localisateur. Réservé à l'agence de démonstration ; ailleurs, rien
// n'est écrit et le Localisateur se dit absent.
export async function locateDemoCompetitors(projectId: string): Promise<SyncOutcome> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !(await isDemoAgency(profile.agency_id))) {
    return { availability: 'unavailable', pending: false, changed: 0 };
  }
  const now = new Date();
  const entries = (await loadCompetitorsToLocate(projectId))
    .map((competitor) => findDemoListing(competitor.listingUrl))
    .filter((listing) => listing != null)
    .map((listing) => demoLocatorEntry(listing, now));
  if (entries.length === 0) {
    return NOTHING;
  }
  await demoDelay();
  const saved = await saveCompetitorLocations(projectId, entries);
  return { availability: 'ready', pending: false, changed: saved.changed };
}
