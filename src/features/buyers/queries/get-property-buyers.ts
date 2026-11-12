import 'server-only';

import { readDismissals } from '@/features/buyer-dismissals/queries/read-dismissals';
import { readBuyers } from '@/features/buyers/queries/get-buyers';
import { withoutDismissed } from '@/features/buyers/services/loop-properties';
import { getBuyersProgress } from '@/features/buyers/queries/get-buyers-progress';
import type { BuyerProgressFacts } from '@/features/buyers/services/buyer-progress';
import {
  buyerReferencePrice,
  propertyBuyers,
  type BuyerLoopProperty,
  type PropertyBuyers,
} from '@/features/buyers/services/property-buyers';
import { knownCondominium, type CondominiumEmbed } from '@/features/buyers/services/condominium';
import type { Buyer } from '@/features/buyers/types';
import { toNumber } from '@/lib/format/to-number';
import { createClient } from '@/lib/supabase/server';

// Mission 133 — les acquéreurs de l'agence et leurs faits, lus UNE fois par page, quel que soit le
// nombre de biens à rapprocher (le Suivi en a plusieurs). Une lecture en échec le dit : jamais
// « aucun acquéreur » quand un compteur ou une tâche en dépend (M98).
export type AgencyBuyers = {
  buyers: Buyer[];
  progress: Map<string, BuyerProgressFacts>;
  failed: boolean;
};

export async function loadAgencyBuyers(agencyId: string): Promise<AgencyBuyers> {
  const { buyers, failed } = await readBuyers();
  if (failed) return { buyers: [], progress: new Map(), failed: true };
  if (buyers.length === 0) return { buyers, progress: new Map(), failed: false };
  const progress = await getBuyersProgress(
    await createClient(),
    agencyId,
    buyers.map((buyer) => buyer.id),
  );
  if ([...progress.values()].some((facts) => facts.unread)) {
    return { buyers: [], progress: new Map(), failed: true };
  }
  return { buyers, progress, failed: false };
}

// Les colonnes du bien vendeur que la boucle lit : ses faits, jamais son adresse.
export const LOOP_PROPERTY_COLUMNS =
  'project_id, property_type, rooms_count, surface_area, city, bedrooms_count, floor, has_elevator, has_pool, outdoor_spaces, parking_types, energy_rating, general_condition, advisor_price_max, subject_property_condominiums(is_condominium)';

export type LoopPropertyRow = {
  project_id: string;
  property_type: string | null;
  rooms_count: number | null;
  surface_area: number | null;
  city: string | null;
  bedrooms_count: number | null;
  floor: number | null;
  has_elevator: boolean | null;
  has_pool: boolean | null;
  outdoor_spaces: string[] | null;
  parking_types: string[] | null;
  energy_rating: string | null;
  general_condition: string | null;
  advisor_price_max: number | null;
  // Mission 151 — le bloc « Copropriété » de la fiche, joint (absent : inconnue).
  subject_property_condominiums?: CondominiumEmbed;
};

// Une colonne `numeric` revient en texte de l'API : `toNumber` (M134, déplacé par la M145).
export { toNumber };

export function loopProperty(row: LoopPropertyRow): BuyerLoopProperty {
  return {
    propertyType: row.property_type,
    roomsCount: toNumber(row.rooms_count),
    surfaceArea: toNumber(row.surface_area),
    city: row.city,
    bedroomsCount: toNumber(row.bedrooms_count),
    floor: toNumber(row.floor),
    hasElevator: row.has_elevator,
    hasPool: row.has_pool,
    outdoorSpaces: row.outdoor_spaces ?? [],
    parkingTypes: row.parking_types ?? [],
    energyRating: row.energy_rating,
    generalCondition: row.general_condition,
    isCondominium: knownCondominium(row.subject_property_condominiums),
  };
}

// Les biens de plusieurs dossiers et leur prix de référence (§ 3), en trois lectures.
export async function loadLoopProperties(
  agencyId: string,
  projectIds: string[],
): Promise<{
  properties: Map<string, { property: BuyerLoopProperty; price: number | null }>;
  failed: boolean;
}> {
  const properties = new Map<string, { property: BuyerLoopProperty; price: number | null }>();
  if (projectIds.length === 0) return { properties, failed: false };
  const supabase = await createClient();
  const [subjects, conclusions, positionings] = await Promise.all([
    supabase
      .from('subject_properties')
      .select(LOOP_PROPERTY_COLUMNS)
      .eq('agency_id', agencyId)
      .in('project_id', projectIds),
    supabase
      .from('project_meeting_conclusions')
      .select('project_id, commercialization_price, frozen_advisor_analysis')
      .eq('agency_id', agencyId)
      .in('project_id', projectIds),
    supabase
      .from('project_price_positionings')
      .select('project_id, advisor_comparative_market_price')
      .eq('agency_id', agencyId)
      .in('project_id', projectIds),
  ]);
  if (subjects.error || conclusions.error || positionings.error) {
    return { properties, failed: true };
  }
  const conclusionOf = new Map((conclusions.data ?? []).map((row) => [row.project_id, row]));
  const positioningOf = new Map((positionings.data ?? []).map((row) => [row.project_id, row]));
  for (const row of (subjects.data ?? []) as LoopPropertyRow[]) {
    const conclusion = conclusionOf.get(row.project_id);
    properties.set(row.project_id, {
      property: loopProperty(row),
      price: buyerReferencePrice({
        commercializationPrice: toNumber(conclusion?.commercialization_price),
        frozenAdvisorAnalysis: toNumber(conclusion?.frozen_advisor_analysis),
        advisorAnalysis: toNumber(
          positioningOf.get(row.project_id)?.advisor_comparative_market_price,
        ),
        advisorPriceMax: toNumber(row.advisor_price_max),
      }),
    });
  }
  return { properties, failed: false };
}

// Un dossier : ses acquéreurs correspondants. `null` : une lecture a échoué.
export async function getPropertyBuyers(
  agencyId: string,
  projectId: string,
  now: Date,
): Promise<PropertyBuyers | null> {
  const [agency, loop, dismissals] = await Promise.all([
    loadAgencyBuyers(agencyId),
    loadLoopProperties(agencyId, [projectId]),
    createClient().then((supabase) => readDismissals(supabase, agencyId)),
  ]);
  if (agency.failed || loop.failed || dismissals == null) return null;
  const entry = loop.properties.get(projectId) ?? null;
  // Mission 139 — un acquéreur pour qui le conseiller a écarté ce bien ne compte plus (bloc du
  // dossier, compteur du Live, « Montrer au vendeur ») : une seule règle partout.
  return propertyBuyers(
    withoutDismissed(agency.buyers, dismissals, `project:${projectId}`),
    agency.progress,
    entry?.property ?? null,
    entry?.price ?? null,
    now,
  );
}
