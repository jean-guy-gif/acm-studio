'use server';

import { revalidatePath } from 'next/cache';

import { parseLocatorProperty } from '@/features/competitor-locator/schemas/locator-property';
import { needsLocatorQuery } from '@/features/competitor-locator/services/location-action';
import type {
  CompetitorLocation,
  CompetitorToLocate,
  RawLocatorEntry,
} from '@/features/competitor-locator/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

const MAX_ENTRIES = 200;

type StoredRow = {
  id: string;
  listing_url: string | null;
  locator_state: string | null;
  locator_label: string | null;
  locator_label_key: string | null;
  locator_address: string | null;
  locator_source: string | null;
  locator_confirmed: boolean | null;
  locator_property_id: string | null;
  locator_latitude: number | null;
  locator_longitude: number | null;
  locator_analyzed_at: string | null;
};

const COLUMNS =
  'id, listing_url, locator_state, locator_label, locator_label_key, locator_address, locator_source, locator_confirmed, locator_property_id, locator_latitude, locator_longitude, locator_analyzed_at';

// Les concurrents RETENUS du dossier, cadrés sur l'agence de l'appelant. [] pour un dossier
// étranger ou absent.
async function loadSelectedRows(projectId: string): Promise<StoredRow[]> {
  const profile = await getProfile();
  if (!profile) {
    return [];
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from('comparables')
    .select(COLUMNS)
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .eq('is_selected', true);
  return data ?? [];
}

// Mission 75 — les concurrents retenus dont l'adresse reste à demander : une annonce en ligne,
// et pas d'adresse confirmée (une adresse confirmée ne se redemande plus).
export async function loadCompetitorsToLocate(projectId: string): Promise<CompetitorToLocate[]> {
  const rows = await loadSelectedRows(projectId);
  return rows
    .filter(needsLocatorQuery)
    .map((row) => ({ id: row.id, listingUrl: (row.listing_url ?? '').trim() }));
}

function sameInstant(a: string | null, b: string | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return new Date(a).getTime() === new Date(b).getTime();
}

function isUnchanged(row: StoredRow, location: CompetitorLocation): boolean {
  return (
    row.locator_state === location.state &&
    row.locator_label === location.label &&
    row.locator_label_key === location.labelKey &&
    row.locator_address === location.address &&
    row.locator_source === location.source &&
    (row.locator_confirmed ?? false) === location.confirmed &&
    row.locator_property_id === location.propertyId &&
    row.locator_latitude === location.latitude &&
    row.locator_longitude === location.longitude &&
    sameInstant(row.locator_analyzed_at, location.analyzedAt)
  );
}

export type SaveCompetitorLocationsResult = { ok: boolean; changed: number };

// Enregistre ce que le Localisateur a rendu. Les réponses viennent du navigateur : chacune est
// revalidée ici, rattachée à un concurrent du dossier par l'adresse de SON annonce (jamais par
// un identifiant envoyé par la page), et une adresse déjà confirmée n'est pas réécrite.
export async function saveCompetitorLocations(
  projectId: string,
  entries: RawLocatorEntry[],
): Promise<SaveCompetitorLocationsResult> {
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > MAX_ENTRIES) {
    return { ok: false, changed: 0 };
  }
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, changed: 0 };
  }

  const locationByUrl = new Map<string, CompetitorLocation>();
  for (const entry of entries) {
    const location = parseLocatorProperty(entry?.raw);
    if (location && typeof entry.listingUrl === 'string') {
      locationByUrl.set(entry.listingUrl.trim(), location);
    }
  }
  if (locationByUrl.size === 0) {
    return { ok: true, changed: 0 };
  }

  const rows = (await loadSelectedRows(projectId)).filter(needsLocatorQuery);
  const supabase = await createClient();
  let changed = 0;
  let ok = true;

  for (const row of rows) {
    const location = locationByUrl.get((row.listing_url ?? '').trim());
    if (!location || isUnchanged(row, location)) {
      continue;
    }
    const { error } = await supabase
      .from('comparables')
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
      })
      .eq('id', row.id)
      .eq('project_id', projectId)
      .eq('agency_id', profile.agency_id);
    if (error) {
      ok = false;
    } else {
      changed += 1;
    }
  }

  if (changed > 0) {
    revalidatePath(`/builder/${projectId}/comparables`);
    revalidatePath(`/builder/${projectId}`);
  }
  return { ok, changed };
}
