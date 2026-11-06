import { notFound, redirect } from 'next/navigation';

import { getComparables } from '@/features/comparables/queries/get-comparables';
import { liveEntryGate } from '@/features/live-seller/services/live-launch';
import { hasLiveStarted } from '@/features/live-seller/services/live-resume';
import { needsLiveShortlist } from '@/features/live-seller/services/live-shortlist';
import { getProject } from '@/features/projects/queries/get-project';

import { getAgencyBranding } from '@/features/branding/queries/get-agency-branding';
import { getAgency } from '@/lib/auth/get-agency';
import { getProfile } from '@/lib/auth/get-profile';
import { getConclusion } from '@/features/meeting-conclusion/queries/get-conclusion';
import { LiveComparativeShell } from '@/features/live-seller/components/live-comparative-shell';
import { getPropertyBuyers } from '@/features/buyers/queries/get-property-buyers';
import { liveBuyersReveal } from '@/features/live-seller/services/live-buyers';
import { getLiveProjectStatus } from '@/features/live-seller/queries/get-live-project-status';
import { isLiveClosed } from '@/features/live-seller/services/live-closed';
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

  // Mission 109 — un dossier conclu ou archivé ne se rejoue pas : l'écran neutre de pause. Seule la
  // réouverture par un opérateur (M104) rouvre un Live.
  if (isLiveClosed(await getLiveProjectStatus(projectId))) {
    redirect(`/live/${projectId}/pause`);
  }

  // Chargement unique (accès contrôlé : getProject cadré sur l'agence → 404 sinon).
  const presentation = await loadLivePresentation(projectId);
  if (!presentation) {
    notFound();
  }
  // Mission 104 — sans concurrent retenu (ou sans bien vendeur), il n'y a pas de Live : un ancien
  // lien, un onglet resté ouvert. Devant le vendeur, jamais un message d'erreur : l'écran neutre
  // de pause (M92). Le conseiller lit la raison sur la liste du Live, où mène « Accès conseiller ».
  if (!presentation.live) {
    redirect(`/live/${projectId}/pause`);
  }
  // Mission 131 — « Document seul » : pas de Live. Un ancien lien ouvre l'écran neutre de pause ;
  // le conseiller change la façon de présenter sur « Avant le rendez-vous ».
  const presentationMode = presentation.project.presentationMode;
  if (presentationMode === 'document') {
    redirect(`/live/${projectId}/pause`);
  }
  // Mission 112 — jamais sans ses contrôles : un vrai dossier jamais lancé passe d'abord par la
  // confirmation « devant le vendeur » enregistrée ; au-delà de 6 concurrents, par leur choix.
  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }
  const retainedCount = (await getComparables(projectId)).filter((c) => c.is_selected).length;
  const gate = liveEntryGate({
    isExample: project.is_example,
    started: project.live_started_at != null || hasLiveStarted(presentation.live),
    confirmedAt: project.live_confirmed_at ?? null,
    shortlistPending: needsLiveShortlist(retainedCount, project.live_shortlist_at ?? null),
  });
  if (gate === 'confirm') {
    redirect(`/builder/${projectId}/lancer-le-live`);
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

  const rhythm = presentation.project.liveRhythm;
  const pages = buildLivePages(
    projectedLive,
    presentation.property != null,
    rhythm,
    presentationMode,
  );
  const initialIndex = clampInitialLiveIndex(parseInitialIndex(fiche), pages, projectedLive);
  // Mission 89 — un prix de commercialisation est-il déjà enregistré ? Seul le oui/non part
  // vers la scène, jamais le montant.
  const [branding, profile, conclusion] = await Promise.all([
    getAgencyBranding(),
    getProfile(),
    getConclusion(projectId),
  ]);
  const [agency, buyers] = profile
    ? await Promise.all([
        getAgency(profile.agency_id),
        // Mission 133 — les acquéreurs prêts de l'agence pour ce bien : sous 5, rien ne part vers
        // la scène ; jamais pour un dossier d'exemple.
        project.is_example ? null : getPropertyBuyers(profile.agency_id, projectId, new Date()),
      ])
    : [null, null];

  return (
    <LiveComparativeShell
      projectId={projectId}
      live={projectedLive}
      property={presentation.property}
      projectName={presentation.project.name}
      advisorRange={advisorRange}
      initialIndex={initialIndex}
      rhythm={rhythm}
      logoLightUrl={branding?.logoLightUrl ?? null}
      logoDarkUrl={branding?.logoDarkUrl ?? null}
      agencyName={agency?.name ?? null}
      hasAgreedPrice={conclusion?.commercializationPrice != null}
      presentationMode={presentationMode}
      buyersReveal={liveBuyersReveal(buyers, new Date())}
    />
  );
}
