import 'server-only';

import { geoProvider } from '@/features/competitor-search/services/geo-provider';
import type { GeoPoint } from '@/features/competitor-search/types';
import { dismissalKey } from '@/features/buyer-dismissals/services/dismissal-key';
import { buildSheetBlocks } from '@/features/living-here/services/build-sheet';
import { placeFingerprint, startPoint } from '@/features/living-here/services/living-here-rules';
import { readLivingHereBlocks } from '@/features/living-here/services/sheet-schema';
import { demoLivingHereBlocks } from '@/features/demo/services/demo-living-here';
import { liveLivingHereReaders } from '@/features/living-here/services/live-readers';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 142 — la fiche « Vivre ici » d'un bien retenu pour un acquéreur, construite par le
// serveur seul, APRÈS le garde de l'appelant (la demande de visite, le conseiller de l'agence, le
// lien public) : par la clé de service, toujours cadrée sur l'agence. Une fiche par bien et par
// agence (la clé de la boucle, M134), partagée par les acquéreurs ; puis le trajet jusqu'au lieu de
// chaque acquéreur qui visite ce bien.

export type BuildForItemResult = { ok: true; propertyKey: string } | { ok: false; reason: string };

type Snapshot = { features?: { location?: unknown } | null; city?: unknown } | null;

const pointOf = (value: unknown): GeoPoint | null => {
  if (value == null || typeof value !== 'object') return null;
  const { lat, lon } = value as { lat?: unknown; lon?: unknown };
  return typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon)
    ? { lat, lon }
    : null;
};

// Une fiche de moins de 30 jours n'est pas refaite en tâche de fond : « Actualiser » le fait.
const FRESH_MS = 30 * 86_400_000;

export async function buildLivingHereForItem(input: {
  agencyId: string;
  itemId: string;
  builtBy: string | null;
  // En tâche de fond, après une demande de visite : une fiche récente est gardée telle quelle.
  onlyIfMissing?: boolean;
}): Promise<BuildForItemResult> {
  const admin = createServiceRoleClient();
  const { data: item } = await admin
    .from('buyer_selection_items')
    .select('id, source, reference, snapshot')
    .eq('id', input.itemId)
    .eq('agency_id', input.agencyId)
    .maybeSingle();
  if (!item) return { ok: false, reason: 'item' };
  const isDemo = await isDemoAgency(input.agencyId);
  const geo = geoProvider(isDemo);

  // Ce que le bien dit de lui : sa commune, et d'où partir.
  let city: string | null = null;
  let postalCode: string | null = null;
  let mandateAddress: { address: string } | null = null;
  let listingPoint: GeoPoint | null = null;
  let key: string;
  if (item.source === 'project') {
    key = dismissalKey({ source: 'project', projectId: item.reference });
    const [{ data: property }, { data: conclusion }] = await Promise.all([
      admin
        .from('subject_properties')
        .select('address, postal_code, city')
        .eq('project_id', item.reference)
        .eq('agency_id', input.agencyId)
        .maybeSingle(),
      admin
        .from('project_meeting_conclusions')
        .select('outcome')
        .eq('project_id', item.reference)
        .eq('agency_id', input.agencyId)
        .maybeSingle(),
    ]);
    city = property?.city ?? null;
    postalCode = property?.postal_code ?? null;
    // Seul un mandat signé part de son adresse (décision du 07/11) ; un vendeur à relancer part du
    // centre de sa commune.
    if (conclusion?.outcome === 'signed' && property?.address?.trim()) {
      mandateAddress = { address: property.address.trim() };
    }
  } else if (item.source === 'competitor') {
    const { data: competitor } = await admin
      .from('comparables')
      .select('id, listing_url, city, postal_code')
      .eq('id', item.reference)
      .eq('agency_id', input.agencyId)
      .maybeSingle();
    if (!competitor) return { ok: false, reason: 'competitor' };
    key = dismissalKey({
      source: 'competitor',
      competitorId: competitor.id,
      listingUrl: competitor.listing_url,
    });
    city = competitor.city;
    postalCode = competitor.postal_code;
    // L'adresse localisée d'un concurrent n'est jamais lue (M119) : le centre de sa commune.
  } else {
    key = dismissalKey({ source: 'listing', url: item.reference });
    const snapshot = item.snapshot as Snapshot;
    listingPoint = pointOf(snapshot?.features?.location);
    city = typeof snapshot?.city === 'string' ? snapshot.city : null;
  }
  if (!city) return { ok: false, reason: 'city' };

  const commune = await geo.resolveCommune(city, postalCode);
  if (!commune.ok) return { ok: false, reason: 'commune' };
  let mandatePoint: GeoPoint | null = null;
  if (mandateAddress) {
    const geocode = await geo.geocodeSubject(mandateAddress.address, postalCode, city);
    mandatePoint = geocode.ok ? geocode.point : null;
  }
  const start = startPoint({
    mandateAddressPoint: mandatePoint,
    listingPoint,
    communeCentre: commune.centre,
  });
  if (!start) return { ok: false, reason: 'start' };
  if (input.onlyIfMissing) {
    const { data: fresh } = await admin
      .from('living_here_sheets')
      .select('built_at')
      .eq('agency_id', input.agencyId)
      .eq('property_key', key)
      .maybeSingle();
    if (fresh && Date.now() - new Date(fresh.built_at).getTime() < FRESH_MS) {
      // La fiche reste ; le trajet d'un nouvel acquéreur se calcule quand même (relecture du 07/11).
      if (!isDemo)
        await recordTrips({ agencyId: input.agencyId, itemId: item.id, from: start.point });
      return { ok: true, propertyKey: key };
    }
  }

  const { data: existing } = await admin
    .from('living_here_sheets')
    .select('blocks, built_at')
    .eq('agency_id', input.agencyId)
    .eq('property_key', key)
    .maybeSingle();
  // Mission 114 — dans l'agence de démonstration, aucun appel réseau : le jeu figé du point.
  const { blocks, failures } = isDemo
    ? { blocks: demoLivingHereBlocks(start.point, new Date()), failures: [] }
    : await buildSheetBlocks({
        context: {
          from: start.point,
          inseeCode: commune.code,
          commune: commune.display,
          communeCentre: commune.centre,
        },
        readers: liveLivingHereReaders,
        previous: existing ? readLivingHereBlocks(existing.blocks, existing.built_at) : null,
        now: new Date(),
      });
  await Promise.all(
    failures.map(({ source, error }) => reportServerError(`living-here:${source}`, error)),
  );
  const { error } = await admin.from('living_here_sheets').upsert(
    {
      agency_id: input.agencyId,
      property_key: key,
      origin: start.origin,
      built_by: input.builtBy,
      // La liste d'autorisation à l'écriture aussi (M141) ; la commune, pour « depuis … ».
      blocks: {
        ...readLivingHereBlocks(blocks, new Date().toISOString()),
        commune: commune.display,
      },
    },
    { onConflict: 'agency_id,property_key' },
  );
  if (error) {
    await reportServerError('living-here:write', error);
    return { ok: false, reason: 'write' };
  }
  if (!isDemo) await recordTrips({ agencyId: input.agencyId, itemId: item.id, from: start.point });
  return { ok: true, propertyKey: key };
}

// Le temps en voiture jusqu'au lieu de chaque acquéreur qui visite ce bien, gardé sur sa visite :
// la durée et le mode seulement (jamais le texte du lieu ni ses coordonnées). Un lieu introuvable
// ne laisse rien ; une panne entre au journal.
async function recordTrips(input: {
  agencyId: string;
  itemId: string;
  from: GeoPoint;
}): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: visits } = await admin
    .from('buyer_visit_requests')
    .select('id, buyers!inner(living_place)')
    .eq('agency_id', input.agencyId)
    .eq('buyer_selection_item_id', input.itemId)
    .is('cancelled_at', null);
  const readers = liveLivingHereReaders;
  for (const visit of visits ?? []) {
    const place = (visit.buyers as unknown as { living_place: string | null }).living_place?.trim();
    if (!place) continue;
    try {
      const to = await readers.locate(place);
      if (!to) continue;
      const seconds = await readers.driveSeconds(input.from, to);
      await admin
        .from('buyer_visit_requests')
        .update({
          living_place_trip: {
            mode: 'car',
            minutes: Math.max(1, Math.round(seconds / 60)),
            place: placeFingerprint(place),
          },
        })
        .eq('id', visit.id)
        .eq('agency_id', input.agencyId);
    } catch (error) {
      await reportServerError('living-here:trip', error);
    }
  }
}
