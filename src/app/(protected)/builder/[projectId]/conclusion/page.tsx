import { liveDurationLabel } from '@/features/live-seller/services/live-timing';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  alertOk,
  backLink,
  btnSecondary,
  card,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { loadLivePresentation } from '@/features/live-seller/services/load-live-presentation';
import { ConclusionAmountsPanel } from '@/features/meeting-conclusion/components/conclusion-amounts-panel';
import { ConclusionDecisionForm } from '@/features/meeting-conclusion/components/conclusion-decision-form';
import { FollowUpHistory } from '@/features/meeting-conclusion/components/follow-up-history';
import { SellerSaidBlock } from '@/features/meeting-conclusion/components/seller-said-block';
import { getConclusion } from '@/features/meeting-conclusion/queries/get-conclusion';
import {
  emptySellerInsights,
  getSellerInsights,
} from '@/features/meeting-conclusion/queries/get-seller-insights';
import { buildDossierFollowUp } from '@/features/meeting-conclusion/services/dossier-follow-up';
import { canConcludeProject } from '@/features/meeting-conclusion/services/can-conclude-project';
import { resolveConclusionAmounts } from '@/features/meeting-conclusion/services/resolve-conclusion-amounts';
import { getProject } from '@/features/projects/queries/get-project';
import { getPropertyBuyers } from '@/features/buyers/queries/get-property-buyers';
import { getProfile } from '@/lib/auth/get-profile';

type ConclusionPageProps = {
  params: Promise<{ projectId: string }>;
};

// Mission 53 §2 — l'écran conseiller, jamais vu du vendeur : consigner l'issue du
// rendez-vous. Accessible pour un dossier prêt (à conclure) ou déjà conclu (pour corriger
// l'issue). Mission 81 — et pour un dossier encore en préparation : le Live peut y être
// lancé, un rendez-vous réellement mené doit pouvoir se conclure.
export default async function ConclusionPage({ params }: ConclusionPageProps) {
  const { projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }
  if (!canConcludeProject(project.status)) {
    notFound();
  }

  const profile = await getProfile();
  const [presentation, conclusion, insightsByProject, buyers] = await Promise.all([
    loadLivePresentation(projectId),
    getConclusion(projectId),
    getSellerInsights([projectId]),
    // Mission 145 (partie B) — les acquéreurs prêts que veut son bien : la phrase anonyme du
    // message de relance, la même règle et la même fonction que le Suivi.
    profile && !project.is_example && project.status === 'meeting_completed'
      ? getPropertyBuyers(profile.agency_id, projectId, new Date())
      : null,
  ]);
  const amounts = resolveConclusionAmounts(conclusion, presentation?.live ?? null);
  const alreadyConcluded = project.status === 'meeting_completed';
  // Mission 95 — la durée mesurée du Live (début → « Terminer »), quand elle l'a été.
  const liveDuration = liveDurationLabel(project.live_started_at, project.live_ended_at);
  // Mission 96 — sur un dossier conclu : ce que le vendeur a dit, et l'historique des relances.
  // Le message de relance se prépare depuis le Suivi : aucune signature n'est demandée ici.
  const insights = insightsByProject.get(projectId) ?? emptySellerInsights();
  const followUp = alreadyConcluded
    ? buildDossierFollowUp({
        conclusion,
        liveStartedAt: project.live_started_at,
        liveEndedAt: project.live_ended_at,
        competitors: insights.competitors,
        dangerous: insights.dangerous,
        contacts: insights.contacts,
        now: new Date(),
        signature: { advisorFirstName: null, agencyName: null },
        readyBuyers: conclusion?.outcome === 'follow_up' ? (buyers?.ready.length ?? 0) : 0,
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/builder/${projectId}`} className={backLink}>
        ← Retour au dossier
      </Link>

      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Conclusion du rendez-vous</span>
        <h1 className={pageTitle}>{project.seller_name ?? 'Dossier vendeur'}</h1>
        <p className={pageSubtitle}>
          Écran conseiller — le vendeur ne le voit pas.
          {liveDuration ? ` ${liveDuration}.` : ''}
        </p>
      </div>

      {/* Mission 110 — la synthèse à laisser au vendeur, après le Live. */}
      {presentation?.live?.sellerSummary ? (
        <Link
          href={`/builder/${projectId}/synthese`}
          className={`${btnSecondary} self-start`}
          data-testid="open-seller-synthesis"
        >
          Synthèse pour le vendeur
        </Link>
      ) : null}

      {alreadyConcluded ? (
        <div className={alertOk}>
          Ce dossier est dans le Suivi. Vous pouvez corriger son issue ci-dessous.
        </div>
      ) : null}

      <ConclusionAmountsPanel
        amounts={amounts}
        sellerPath={{
          start:
            conclusion?.sellerPerceivedPrice ??
            presentation?.live?.sellerSummary?.seller_perceived_property_price ??
            null,
          revised: presentation?.live?.sellerSummary?.seller_revised_property_price ?? null,
        }}
      />

      {followUp?.sellerSaid || (followUp?.contacts.length ?? 0) > 0 ? (
        <div className={`${card} flex flex-col gap-4 p-5 sm:p-6`}>
          {followUp?.sellerSaid ? <SellerSaidBlock said={followUp.sellerSaid} /> : null}
          <FollowUpHistory contacts={followUp?.contacts ?? []} />
        </div>
      ) : null}

      <div className={`${card} p-5 sm:p-6`}>
        <ConclusionDecisionForm
          projectId={projectId}
          initialOutcome={conclusion?.outcome ?? null}
          initialReason={conclusion?.followUpReason ?? null}
          initialMandateType={conclusion?.mandateType ?? null}
          initialMotive={conclusion?.followUpMotive ?? null}
          initialMotiveDetail={conclusion?.followUpMotiveDetail ?? null}
          initialObjections={conclusion?.objections ?? []}
          initialObjectionNote={conclusion?.objectionNote ?? null}
          knownPrice={conclusion?.commercializationPrice ?? null}
        />
      </div>
    </div>
  );
}
