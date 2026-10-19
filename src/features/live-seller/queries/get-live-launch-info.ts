import 'server-only';

import { getComparables } from '@/features/comparables/queries/get-comparables';
import { competitorsWithPriceOrSurfaceToVerify } from '@/features/imported-fields/services/fields-to-verify';
import { buildLivePages } from '@/features/live-seller/services/build-live-pages';
import { liveResume, type LiveResume } from '@/features/live-seller/services/live-resume';
import { loadLivePresentation } from '@/features/live-seller/services/load-live-presentation';
import { needsLiveShortlist } from '@/features/live-seller/services/live-shortlist';
import { projectLiveForSeller } from '@/features/live-seller/services/project-live-for-seller';
import { getProject } from '@/features/projects/queries/get-project';

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
};

export async function getLiveLaunchInfo(projectId: string): Promise<LiveLaunchInfo | null> {
  // loadLivePresentation est cadré sur l'agence de l'appelant : null pour un dossier étranger.
  const presentation = await loadLivePresentation(projectId);
  if (!presentation) {
    return null;
  }
  const projected = presentation.live ? projectLiveForSeller(presentation.live) : null;
  const pages = buildLivePages(
    projected,
    presentation.property != null,
    presentation.project.liveRhythm,
  );
  const [project, comparables] = await Promise.all([
    getProject(projectId),
    getComparables(projectId),
  ]);
  return {
    competitorCount: projected?.comparables.length ?? 0,
    resume: liveResume(pages, projected),
    isExample: project?.is_example === true,
    toVerifyCount: competitorsWithPriceOrSurfaceToVerify(comparables).length,
    decisionOutdated: presentation.positioningStatus === 'outdated',
    decisionMissing: presentation.positioningStatus === 'not_saved',
    shortlistPending: needsLiveShortlist(
      comparables.filter((comparable) => comparable.is_selected).length,
      project?.live_shortlist_at ?? null,
    ),
  };
}
