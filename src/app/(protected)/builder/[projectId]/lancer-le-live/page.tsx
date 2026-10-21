import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, card, pageTitle } from '@/components/ui/styles';
import { LiveLaunchActions } from '@/features/live-seller/components/live-launch-actions';
import { LiveShortlistPicker } from '@/features/live-seller/components/live-shortlist-picker';
import { getLiveLaunchInfo } from '@/features/live-seller/queries/get-live-launch-info';
import { getLiveShortlist } from '@/features/live-seller/queries/get-live-shortlist';

// Mission 107 — l'onglet « Live » de la barre d'étapes et le bandeau « Ouvrir dans le Live »
// passent par ici : le même contrôle que le bouton « Lancer le Live » (M104). Rien à demander
// (dossier d'exemple prêt, Live déjà commencé) : la scène s'ouvre aussitôt ; sinon la
// confirmation « devant le vendeur », les rappels ou la raison s'affichent d'emblée.
export default async function LaunchLivePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const launch = await getLiveLaunchInfo(projectId);
  if (!launch) {
    notFound();
  }
  // Mission 110 — au-delà de 6 retenus, d'abord le choix des concurrents montrés.
  const shortlist = launch.shortlistPending ? await getLiveShortlist(projectId) : null;
  return (
    <div className="flex flex-col gap-4">
      <Link href={`/builder/${projectId}`} className={backLink}>
        ← Retour au dossier
      </Link>
      <h1 className={pageTitle}>Lancer le Live</h1>
      {shortlist ? (
        <LiveShortlistPicker projectId={projectId} shortlist={shortlist} pending />
      ) : (
        <div className={`${card} flex flex-col gap-3 p-5`} data-testid="launch-live-step">
          <LiveLaunchActions
            projectId={projectId}
            competitorCount={launch.competitorCount}
            resume={launch.resume}
            isExample={launch.isExample}
            toVerifyCount={launch.toVerifyCount}
            decisionOutdated={launch.decisionOutdated}
            decisionMissing={launch.decisionMissing}
            shortlistPending={launch.shortlistPending}
            pendingImportCount={launch.pendingImportCount}
            proceed
          />
        </div>
      )}
    </div>
  );
}
