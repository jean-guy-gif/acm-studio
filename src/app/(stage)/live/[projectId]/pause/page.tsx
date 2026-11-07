import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  advisorAccessLink,
  LiveNeutralScreen,
} from '@/features/live-seller/components/live-neutral-screen';
import { LiveResumeLink } from '@/features/live-seller/components/live-resume-link';
import { getNeutralScreenContext } from '@/features/live-seller/queries/get-neutral-screen-context';
import { clientTexts } from '@/lib/client-texts';

// Mission 140 — le titre d'onglet dans la langue du dossier.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const context = await getNeutralScreenContext(projectId);
  return { title: clientTexts(context?.language ?? 'fr').live.neutral.pause };
}

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
  const t = clientTexts(context.language).live.neutral;
  return (
    <LiveNeutralScreen
      title={t.pause}
      logoLightUrl={context.logoLightUrl}
      logoDarkUrl={context.logoDarkUrl}
      agencyName={context.agencyName}
      actions={<LiveResumeLink projectId={projectId} label={t.resume} />}
      advisorAccess={
        <Link href="/live" className={advisorAccessLink}>
          Accès conseiller
        </Link>
      }
    />
  );
}
