import 'server-only';

import { getComparables } from '@/features/comparables/queries/get-comparables';
import { loadSearchCriteria } from '@/features/competitor-search/queries/load-search-criteria';
import {
  needsLiveShortlist,
  proposeLiveShortlist,
} from '@/features/live-seller/services/live-shortlist';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { getProject } from '@/features/projects/queries/get-project';
import { formatEuro } from '@/lib/format';

export type LiveShortlistView = {
  pending: boolean;
  retainedCount: number;
  entries: {
    id: string;
    label: string;
    percent: number | null;
    proposed: boolean;
    shown: boolean;
  }[];
};

// Mission 110 — ce que « Lancer le Live » propose au-delà de 6 concurrents retenus : la liste,
// du plus au moins pertinent, les 6 premiers cochés ; et si le choix reste à faire.
export async function getLiveShortlist(projectId: string): Promise<LiveShortlistView | null> {
  const [project, comparables, loaded] = await Promise.all([
    getProject(projectId),
    getComparables(projectId),
    loadSearchCriteria(projectId),
  ]);
  if (!project) {
    return null;
  }
  const retained = comparables.filter((comparable) => comparable.is_selected);
  const byId = new Map(retained.map((comparable) => [comparable.id, comparable]));
  const ranked = proposeLiveShortlist(loaded.ok ? loaded.criteria : null, retained);
  return {
    pending: needsLiveShortlist(retained.length, project.live_shortlist_at ?? null),
    retainedCount: retained.length,
    entries: ranked.map((entry) => {
      const comparable = byId.get(entry.id)!;
      const label = neutralComparableLabel({
        propertyType: comparable.property_type,
        roomsCount: comparable.rooms_count,
        surfaceArea: comparable.surface_area,
        city: comparable.city,
        district: comparable.district,
      });
      return {
        id: entry.id,
        label: comparable.price != null ? `${label} · ${formatEuro(comparable.price)}` : label,
        percent: entry.percent,
        proposed: entry.proposed,
        shown: comparable.excluded_from_live !== true,
      };
    }),
  };
}
