import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { DeckPresentation } from '@/features/buyer-deck/components/deck-presentation';
import { loadDeck } from '@/features/buyer-deck/queries/load-deck';

export const metadata: Metadata = { title: 'Présentation' };

// Mission 119 — la présentation de la sélection à l'acquéreur, plein cadre (M72). Mission 122 —
// le dossier qui fait agir : ses mots, la grille, un bien par écran, sa réponse. La charge ne
// porte que ce que la liste d'autorisation permet (M119) ; sans sélection, retour à la fiche.
export default async function PresentationPage({
  params,
}: {
  params: Promise<{ buyerId: string }>;
}) {
  const { buyerId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(buyerId)) notFound();
  const loaded = await loadDeck(buyerId);
  if (!loaded) redirect(`/acquereurs/${buyerId}`);
  return (
    <DeckPresentation
      deck={loaded.deck}
      initialResponses={loaded.responses}
      initialRequests={loaded.requests}
      logoLightUrl={loaded.logoLightUrl}
      logoDarkUrl={loaded.logoDarkUrl}
      agencyName={loaded.agencyName}
      advisorName={loaded.advisorName}
      advisorPhone={loaded.advisorPhone}
    />
  );
}
