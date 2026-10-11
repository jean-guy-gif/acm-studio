import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  advisorAccessLink,
  LiveNeutralScreen,
} from '@/features/live-seller/components/live-neutral-screen';
import { getNeutralScreenContext } from '@/features/live-seller/queries/get-neutral-screen-context';

export const metadata: Metadata = { title: 'Merci' };

// Mission 92 — la fin du Live. « Terminer le rendez-vous » ouvre cet écran neutre, encore
// tourné vers le vendeur ; « Accès conseiller » mène ensuite à la conclusion.
export default async function LiveThanksPage({
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
      title="Merci pour cet échange"
      subtitle={context.advisorFirstName}
      logoLightUrl={context.logoLightUrl}
      logoDarkUrl={context.logoDarkUrl}
      agencyName={context.agencyName}
      advisorAccess={
        <Link href={`/builder/${projectId}/conclusion`} className={advisorAccessLink}>
          Accès conseiller
        </Link>
      }
    />
  );
}
