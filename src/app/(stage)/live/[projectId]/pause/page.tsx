import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  advisorAccessLink,
  LiveNeutralScreen,
} from '@/features/live-seller/components/live-neutral-screen';
import { LiveResumeLink } from '@/features/live-seller/components/live-resume-link';
import { getNeutralScreenContext } from '@/features/live-seller/queries/get-neutral-screen-context';

export const metadata: Metadata = { title: 'Rendez-vous en pause' };

// Mission 92 — « Quitter », après sa confirmation, ouvre cet écran neutre : jamais la liste du
// Live, qui montre les noms des autres vendeurs de l'agence. « Reprendre » relance le Live au
// bon écran ; « Accès conseiller » mène à la liste, une fois la tablette reprise en main.
export default async function LivePausePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const context = await getNeutralScreenContext(projectId);
  if (!context) {
    notFound();
  }
  return (
    <LiveNeutralScreen
      title="Rendez-vous en pause"
      logoLightUrl={context.logoLightUrl}
      logoDarkUrl={context.logoDarkUrl}
      agencyName={context.agencyName}
      isDemo={context.isDemo}
      actions={<LiveResumeLink projectId={projectId} />}
      advisorAccess={
        <Link href="/live" className={advisorAccessLink}>
          Accès conseiller
        </Link>
      }
    />
  );
}
