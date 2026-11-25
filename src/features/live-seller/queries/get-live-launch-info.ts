import 'server-only';

import { estimateLiveMinutes } from '@/features/before-meeting/services/live-sequence';
import { getPendingImports } from '@/features/competitor-search/queries/get-pending-imports';
import { getComparables } from '@/features/comparables/queries/get-comparables';
import { competitorsWithPriceOrSurfaceToVerify } from '@/features/imported-fields/services/fields-to-verify';
import { buildLivePages } from '@/features/live-seller/services/build-live-pages';
import { liveResume, type LiveResume } from '@/features/live-seller/services/live-resume';
import { loadLivePresentation } from '@/features/live-seller/services/load-live-presentation';
import type { LivePresentationMode } from '@/features/live-seller/services/presentation-mode';
import { needsLiveShortlist } from '@/features/live-seller/services/live-shortlist';
import { projectLiveForSeller } from '@/features/live-seller/services/project-live-for-seller';
import { getProject } from '@/features/projects/queries/get-project';
import {
  neighbourhoodKeys,
  readNeighbourhoodSnapshot,
} from '@/features/neighbourhood-link/queries/read-neighbourhood-snapshot';
import { createClient } from '@/lib/supabase/server';
import { listingsCheckStale } from '@/features/competitor-refresh/services/since-preparation';

// Mission 89 — ce que la liste du Live dit d'un dossier avant de le lancer : combien de
// concurrents retenus (aucun = on ne lance pas), et où en est le rendez-vous s'il a commencé.
// Rien d'autre ne sort d'ici : ni prix, ni réponse du vendeur.
// Mission 104 — et, pour la confirmation avant de lancer : est-ce le dossier d'exemple, et
// combien de concurrents retenus ont un prix ou une surface encore à vérifier.
export type LiveLaunchInfo = {
  competitorCount: number;
  resume: LiveResume;
  isExample: boolean;
  toVerifyCount: number;
  // Mission 108 — la décision de prix est périmée : rappelé au lancement, sans bloquer.
  decisionOutdated: boolean;
  // Mission 109 — aucune décision de prix enregistrée : rappelé au lancement, sans bloquer.
  decisionMissing: boolean;
  // Mission 110 — au-delà de 6 retenus, le choix des concurrents montrés reste à faire.
  shortlistPending: boolean;
  // Mission 112 — concurrents retenus qui attendent encore leur import : rappelé, sans bloquer.
  pendingImportCount: number;
  // Mission 131 — « Document seul » : pas de Live à lancer.
  presentationMode: LivePresentationMode;
  // Mission 143 (B4) — la durée estimée, sur le moteur du Live lui-même (M95).
  estimatedMinutes: number;
  // Mission 152 — les annonces des concurrents retenus n'ont pas été vérifiées depuis 24 h.
  listingsCheckStale: boolean;
};

export async function getLiveLaunchInfo(projectId: string): Promise<LiveLaunchInfo | null> {
  // loadLivePresentation est cadré sur l'agence de l'appelant : null pour un dossier étranger.
  const presentation = await loadLivePresentation(projectId);
  if (!presentation) {
    return null;
  }
  const projected = presentation.live ? projectLiveForSeller(presentation.live) : null;
  const [project, comparables, pending] = await Promise.all([
    getProject(projectId),
    getComparables(projectId),
    getPendingImports(projectId),
  ]);
  // Mission 159 — les écrans du quartier comptent dans la durée et dans « Reprendre ».
  const quartier = project
    ? await readNeighbourhoodSnapshot(await createClient(), project.agency_id, projectId)
    : null;
  const pages = buildLivePages(
    projected && { ...projected, neighbourhood: quartier ? neighbourhoodKeys(quartier) : [] },
    presentation.property != null,
    presentation.project.liveRhythm,
    presentation.project.presentationMode,
  );
  const resume = liveResume(pages, projected);
  const retainedListings = comparables.filter(
    (comparable) => comparable.is_selected && (comparable.listing_url ?? '').trim() !== '',
  );
  return {
    competitorCount: projected?.comparables.length ?? 0,
    resume,
    isExample: project?.is_example === true,
    toVerifyCount: competitorsWithPriceOrSurfaceToVerify(comparables).length,
    decisionOutdated: presentation.positioningStatus === 'outdated',
    decisionMissing: presentation.positioningStatus === 'not_saved',
    shortlistPending: needsLiveShortlist(
      comparables.filter((comparable) => comparable.is_selected).length,
      project?.live_shortlist_at ?? null,
    ),
    pendingImportCount: pending.length,
    presentationMode: presentation.project.presentationMode,
    estimatedMinutes: estimateLiveMinutes(pages.length),
    listingsCheckStale: listingsCheckStale({
      isExample: project?.is_example === true,
      started: resume.started,
      withListing: retainedListings.length > 0,
      checkedAt: project?.listings_checked_at ?? null,
      importedAt: retainedListings.map((comparable) => comparable.created_at),
      now: new Date(),
    }),
  };
}
