import 'server-only';

import { storedFacts } from '@/features/buyer-prospecting/services/prospect-facts';
import {
  loadAgencyBuyers,
  loadLoopProperties,
  toNumber,
  type AgencyBuyers,
} from '@/features/buyers/queries/get-property-buyers';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import {
  isNewProperty,
  loopBuyers,
  mergeLoopProperties,
  NEW_PROPERTY_WINDOW_DAYS,
  readyToPropose,
  type LoopContacts,
  type LoopProperty,
} from '@/features/buyers/services/loop-properties';
import { comparableFacts } from '@/features/buyer-prospecting/services/prospect-facts';
import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import { idealLabel } from '@/features/ideal-properties/services/ideal-label';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import { createClient } from '@/lib/supabase/server';

// Mission 134 — les biens qui appellent les acquéreurs de l'agence, lus en une vague : les dossiers
// signés ou à relancer et leur prix (la 133), les concurrents retenus, les biens démarchés, et les
// envois déjà notés. Une lecture en échec le dit (`failed`) : aucune tâche n'est alors déduite,
// jamais « rien à proposer » (M98).

const DAY = 86_400_000;

// Une colonne `numeric` revient en texte de l'API : convertie avant la liste d'autorisation.
const num = toNumber;

// Lu par pages de 1 000, jusqu'à la dernière (M108) : une liste coupée ferait reproposer un bien.
const PAGE = 1000;
async function readPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<{ data: T[]; error: boolean }> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) return { data: [], error: true };
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) return { data: all, error: false };
  }
}

const competitorKey = (row: { id: string; listing_url: string | null }): string => {
  const listing = listingIdentityKey(row.listing_url);
  return listing ? `listing:${listing}` : `competitor:${row.id}`;
};

export async function loadLoopCatalog(
  agencyId: string,
  now: Date,
  // null : tous les biens du marché, pas seulement ceux des 14 derniers jours (la page d'un bien).
  windowDays: number | null = NEW_PROPERTY_WINDOW_DAYS,
): Promise<{ items: LoopProperty[]; contacts: LoopContacts; failed: boolean }> {
  const empty: LoopContacts = { proposals: new Map() };
  const supabase = await createClient();
  const since =
    windowDays == null ? null : new Date(now.getTime() - windowDays * DAY).toISOString();
  const COMPARABLE_COLUMNS =
    'id, project_id, created_at, listing_url, listing_gone_at, meeting_frozen_at, property_type, rooms_count, surface_area, land_area, city, district, bedrooms_count, outdoor_spaces, parking_types, listing_features, energy_rating, price, photo_urls';
  const [conclusions, projects, comparables, prospects, origins, proposals] = await Promise.all([
    supabase
      .from('project_meeting_conclusions')
      .select('project_id, outcome, signed_at, concluded_at, outcome_changed_at')
      .eq('agency_id', agencyId)
      .in('outcome', ['signed', 'follow_up']),
    supabase
      .from('projects')
      .select('id, seller_name, status, is_example')
      .eq('agency_id', agencyId)
      .neq('status', 'archived')
      .eq('is_example', false),
    readPages((from, to) => {
      const query = supabase
        .from('comparables')
        .select(COMPARABLE_COLUMNS)
        .eq('agency_id', agencyId)
        .eq('is_selected', true)
        .is('listing_gone_at', null);
      return (since ? query.gte('created_at', since) : query).order('id').range(from, to);
    }),
    readPages((from, to) => {
      const query = supabase
        .from('buyer_prospects')
        .select('id, created_at, listing_url, listing_key, facts')
        .eq('agency_id', agencyId);
      return (since ? query.gte('created_at', since) : query).order('id').range(from, to);
    }),
    readPages((from, to) =>
      supabase
        .from('buyer_prospect_origins')
        .select('prospect_id, buyer_id')
        .eq('agency_id', agencyId)
        .order('id')
        .range(from, to),
    ),
    readPages((from, to) =>
      supabase
        .from('buyer_proposals')
        .select('buyer_id, property_key, sent_at')
        .eq('agency_id', agencyId)
        .order('id')
        .range(from, to),
    ),
  ]);
  if (
    conclusions.error ||
    projects.error ||
    comparables.error ||
    prospects.error ||
    origins.error ||
    proposals.error
  ) {
    return { items: [], contacts: empty, failed: true };
  }
  const projectOf = new Map((projects.data ?? []).map((row) => [row.id, row]));
  const contacts: LoopContacts = { proposals: new Map() };
  for (const row of proposals.data) {
    const byBuyer = contacts.proposals.get(row.property_key) ?? new Map<string, string>();
    byBuyer.set(row.buyer_id, row.sent_at);
    contacts.proposals.set(row.property_key, byBuyer);
  }

  const list: LoopProperty[] = [];

  // Les biens de l'agence : mandats signés, vendeurs à relancer, au prix de la 133.
  const agencyProjects = (conclusions.data ?? []).filter((row) => projectOf.has(row.project_id));
  const loop = await loadLoopProperties(
    agencyId,
    agencyProjects.map((row) => row.project_id),
  );
  if (loop.failed) return { items: [], contacts: empty, failed: true };
  for (const row of agencyProjects) {
    const entry = loop.properties.get(row.project_id);
    if (!entry) continue;
    const signed = row.outcome === 'signed';
    list.push({
      key: `project:${row.project_id}`,
      source: 'project',
      reference: row.project_id,
      projectId: row.project_id,
      sellerName: projectOf.get(row.project_id)?.seller_name ?? null,
      origin: signed ? 'mandate' : 'follow_up',
      label: idealLabel(entry.property),
      property: entry.property,
      price: entry.price,
      bornAt:
        (signed
          ? (row.signed_at ?? row.concluded_at)
          : (row.outcome_changed_at ?? row.concluded_at)) ?? now.toISOString(),
      selectionRefs: [`project:${row.project_id}`],
      originBuyerIds: [],
    });
  }

  // Les concurrents retenus sur un dossier vendeur (un nouveau venu : retenu après la conclusion).
  for (const row of comparables.data) {
    const project = projectOf.get(row.project_id);
    if (!project) continue;
    const facts = comparableFacts({
      ...row,
      price: num(row.price),
      surface_area: num(row.surface_area),
      land_area: num(row.land_area),
      rooms_count: num(row.rooms_count),
    });
    const property = {
      propertyType: facts.propertyType,
      roomsCount: facts.roomsCount,
      surfaceArea: facts.surfaceArea,
      city: facts.city,
      bedroomsCount: num(row.bedrooms_count),
      floor: null,
      hasElevator: null,
      hasPool: facts.hasPool,
      outdoorSpaces: facts.outdoorSpaces,
      parkingTypes: facts.parkingTypes,
      energyRating: facts.energyRating,
      generalCondition: null,
    };
    const newcomer = project.status === 'meeting_completed' && row.meeting_frozen_at == null;
    list.push({
      key: competitorKey(row),
      source: 'competitor',
      reference: row.id,
      projectId: row.project_id,
      sellerName: project.seller_name ?? null,
      origin: newcomer ? 'newcomer' : 'competitor',
      label: idealLabel(property),
      property,
      price: facts.price,
      bornAt: row.created_at,
      selectionRefs: [
        `competitor:${row.id}`,
        ...(row.listing_url ? [`listing:${row.listing_url}`] : []),
      ],
      originBuyerIds: [],
    });
  }

  // Les biens démarchés depuis une recherche acquéreur (M120) : ses acquéreurs d'origine l'ont déjà.
  const originsOf = new Map<string, string[]>();
  for (const row of origins.data) {
    if (!row.prospect_id) continue;
    originsOf.set(row.prospect_id, [...(originsOf.get(row.prospect_id) ?? []), row.buyer_id]);
  }
  for (const row of prospects.data) {
    const facts = storedFacts(row.facts);
    const property = {
      propertyType: facts.propertyType,
      roomsCount: facts.roomsCount,
      surfaceArea: facts.surfaceArea,
      city: facts.city,
      bedroomsCount: null,
      floor: null,
      hasElevator: null,
      hasPool: facts.hasPool,
      outdoorSpaces: facts.outdoorSpaces,
      parkingTypes: facts.parkingTypes,
      energyRating: facts.energyRating,
      generalCondition: null,
    };
    list.push({
      key: `listing:${row.listing_key}`,
      source: 'listing',
      reference: row.listing_url,
      projectId: null,
      sellerName: null,
      origin: 'prospect',
      label: idealLabel(property),
      property,
      price: facts.price,
      bornAt: row.created_at,
      selectionRefs: [`listing:${row.listing_url}`],
      originBuyerIds: originsOf.get(row.id) ?? [],
      facts: facts as unknown as Record<string, unknown>,
    });
  }

  return { items: mergeLoopProperties(list), contacts, failed: false };
}

export type LoopTasks = {
  tasks: SuiviTask[];
  // Par mandat signé : ses acquéreurs prêts (« Acquéreurs · 7 », M133).
  readyByProject: Map<string, number>;
  failed: boolean;
};

// Les tâches « 4 acquéreurs pour la maison de Vence » : une par nouveau bien qui a au moins un
// acquéreur prêt à qui il n'a pas été proposé ; due à l'arrivée du bien, jamais en retard.
export async function getLoopTasks(
  agencyId: string,
  now: Date,
  preloaded?: AgencyBuyers,
): Promise<LoopTasks> {
  const [agency, catalog] = await Promise.all([
    preloaded ?? loadAgencyBuyers(agencyId),
    loadLoopCatalog(agencyId, now),
  ]);
  const readyByProject = new Map<string, number>();
  if (agency.failed || catalog.failed) return { tasks: [], readyByProject, failed: true };
  const tasks: SuiviTask[] = [];
  for (const item of catalog.items) {
    const loop = loopBuyers(item, agency.buyers, agency.progress, catalog.contacts, now);
    if (item.origin === 'mandate' && item.projectId) {
      readyByProject.set(item.projectId, loop.ready.length);
    }
    if (!isNewProperty(item, now)) continue;
    const count = readyToPropose(loop);
    if (count === 0) continue;
    tasks.push({
      kind: 'propose_buyers',
      projectId: item.projectId ?? '',
      sellerName: item.sellerName ?? '',
      dueOn: parisDay(new Date(item.bornAt)),
      count,
      propertyKey: item.key,
      propertyLabel: item.label,
      origin: item.origin,
      property: { propertyType: item.property.propertyType, city: item.property.city },
      figures: { surfaceArea: item.property.surfaceArea, price: item.price },
    });
  }
  return { tasks, readyByProject, failed: false };
}
