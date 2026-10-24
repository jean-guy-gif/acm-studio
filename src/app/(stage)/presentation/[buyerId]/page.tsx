import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { PresentationShell } from '@/features/buyer-presentation/components/presentation-shell';
import { loadPresentation } from '@/features/buyer-presentation/queries/load-presentation';

export const metadata: Metadata = { title: 'Présentation' };

// Mission 119 — la présentation de la sélection à l'acquéreur, plein cadre (M72). La charge ne
// porte que ce que la liste d'autorisation permet (types.ts) ; sans sélection, retour à la fiche.
export default async function PresentationPage({
  params,
}: {
  params: Promise<{ buyerId: string }>;
}) {
  const { buyerId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(buyerId)) notFound();
  const loaded = await loadPresentation(buyerId);
  if (!loaded) redirect(`/acquereurs/${buyerId}`);
  return (
    <PresentationShell
      presentation={loaded.presentation}
      initialRequests={loaded.requests}
      logoLightUrl={loaded.logoLightUrl}
      logoDarkUrl={loaded.logoDarkUrl}
      agencyName={loaded.agencyName}
    />
  );
}
