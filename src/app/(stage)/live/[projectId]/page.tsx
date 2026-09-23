import { notFound } from 'next/navigation';

import { getAgencyBranding } from '@/features/branding/queries/get-agency-branding';
import { LiveComparativeShell } from '@/features/live-seller/components/live-comparative-shell';
import { buildLivePages } from '@/features/live-seller/services/build-live-pages';
import { loadLivePresentation } from '@/features/live-seller/services/load-live-presentation';
import { clampInitialLiveIndex } from '@/features/live-seller/services/max-reachable-live-index';
import {
  authorizeAdvisorRange,
  projectLiveForSeller,
} from '@/features/live-seller/services/project-live-for-seller';

type LivePageProps = {
  params: Promise<{ projectId: string }>;
  // « fiche » : index de la fiche courante, écrit par la présentation elle-même
  // pour permettre de reprendre au bon endroit après un rechargement en plein
  // rendez-vous. Valeur invalide ou absente = on ouvre à l'introduction.
  searchParams: Promise<{ fiche?: string }>;
};

// Index d'ouverture demandé par l'URL. Volontairement tolérant : jamais d'erreur
// affichée au vendeur pour un paramètre douteux, on retombe sur l'introduction.
// Le borne haute est appliquée par la présentation (nombre réel de fiches).
function parseInitialIndex(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export default async function LiveProjectPage({ params, searchParams }: LivePageProps) {
  const { projectId } = await params;
  const { fiche } = await searchParams;

  // Chargement unique (accès contrôlé : getProject cadré sur l'agence → 404 sinon).
  const presentation = await loadLivePresentation(projectId);
  if (!presentation) {
    notFound();
  }

  // MISSION 51 §2.2 — le vendeur ne reçoit qu'une charge PROJETÉE : chaque concurrent est
  // neutre (aucun prix) tant que son estimation n'est pas persistée, et la fourchette
  // conseiller n'y est pas. Le prix et la fourchette sont LIVRÉS ensuite, après
  // autorisation côté serveur. La borne d'ouverture (2.2) se calcule sur cette même
  // donnée projetée — les réponses persistées qu'elle porte suffisent.
  const projectedLive = presentation.live ? projectLiveForSeller(presentation.live) : null;
  // La fourchette n'est autorisée qu'une fois la valeur perçue persistée (écran 7) : nulle
  // avant, elle n'entre donc pas dans la charge tant que le vendeur ne s'est pas prononcé.
  const advisorRange = presentation.live ? authorizeAdvisorRange(presentation.live) : null;

  const pages = buildLivePages(projectedLive, presentation.property != null);
  const initialIndex = clampInitialLiveIndex(parseInitialIndex(fiche), pages, projectedLive);
  const branding = await getAgencyBranding();

  return (
    <LiveComparativeShell
      projectId={projectId}
      live={projectedLive}
      property={presentation.property}
      projectName={presentation.project.name}
      advisorRange={advisorRange}
      initialIndex={initialIndex}
      logoLightUrl={branding?.logoLightUrl ?? null}
      logoDarkUrl={branding?.logoDarkUrl ?? null}
    />
  );
}
