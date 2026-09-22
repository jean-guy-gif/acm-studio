import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  alertOk,
  backLink,
  card,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { loadLivePresentation } from '@/features/live-seller/services/load-live-presentation';
import { ConclusionAmountsPanel } from '@/features/meeting-conclusion/components/conclusion-amounts-panel';
import { ConclusionDecisionForm } from '@/features/meeting-conclusion/components/conclusion-decision-form';
import { getConclusion } from '@/features/meeting-conclusion/queries/get-conclusion';
import { resolveConclusionAmounts } from '@/features/meeting-conclusion/services/resolve-conclusion-amounts';
import { getProject } from '@/features/projects/queries/get-project';

type ConclusionPageProps = {
  params: Promise<{ projectId: string }>;
};

// Mission 53 §2 — l'écran conseiller, jamais vu du vendeur : consigner l'issue du
// rendez-vous. Accessible pour un dossier prêt (à conclure) ou déjà conclu (pour corriger
// l'issue). Un dossier encore en préparation n'a rien à conclure → 404.
export default async function ConclusionPage({ params }: ConclusionPageProps) {
  const { projectId } = await params;

  const project = await getProject(projectId);
  if (!project) {
    notFound();
  }
  if (project.status !== 'ready_for_meeting' && project.status !== 'meeting_completed') {
    notFound();
  }

  const [presentation, conclusion] = await Promise.all([
    loadLivePresentation(projectId),
    getConclusion(projectId),
  ]);
  const amounts = resolveConclusionAmounts(conclusion, presentation?.live ?? null);
  const alreadyConcluded = project.status === 'meeting_completed';

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/builder/${projectId}`} className={backLink}>
        ← Retour au dossier
      </Link>

      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Conclusion du rendez-vous</span>
        <h1 className={pageTitle}>{project.seller_name ?? 'Dossier vendeur'}</h1>
        <p className={pageSubtitle}>Écran conseiller — le vendeur ne le voit pas.</p>
      </div>

      {alreadyConcluded ? (
        <div className={alertOk}>
          Ce dossier est dans le Suivi. Vous pouvez corriger son issue ci-dessous.
        </div>
      ) : null}

      <ConclusionAmountsPanel amounts={amounts} />

      <div className={`${card} p-5 sm:p-6`}>
        <ConclusionDecisionForm
          projectId={projectId}
          initialOutcome={conclusion?.outcome ?? null}
          initialReason={conclusion?.followUpReason ?? null}
        />
      </div>
    </div>
  );
}
