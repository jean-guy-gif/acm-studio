import 'server-only';

import { buildLivePages } from '@/features/live-seller/services/build-live-pages';
import { liveResume, type LiveResume } from '@/features/live-seller/services/live-resume';
import { loadLivePresentation } from '@/features/live-seller/services/load-live-presentation';
import { projectLiveForSeller } from '@/features/live-seller/services/project-live-for-seller';

// Mission 89 — ce que la liste du Live dit d'un dossier avant de le lancer : combien de
// concurrents retenus (aucun = on ne lance pas), et où en est le rendez-vous s'il a commencé.
// Rien d'autre ne sort d'ici : ni prix, ni réponse du vendeur.
export type LiveLaunchInfo = {
  competitorCount: number;
  resume: LiveResume;
};

export async function getLiveLaunchInfo(projectId: string): Promise<LiveLaunchInfo | null> {
  // loadLivePresentation est cadré sur l'agence de l'appelant : null pour un dossier étranger.
  const presentation = await loadLivePresentation(projectId);
  if (!presentation) {
    return null;
  }
  const projected = presentation.live ? projectLiveForSeller(presentation.live) : null;
  const pages = buildLivePages(projected, presentation.property != null);
  return {
    competitorCount: projected?.comparables.length ?? 0,
    resume: liveResume(pages, projected),
  };
}
