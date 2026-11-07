import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { DeckPresentation } from '@/features/buyer-deck/components/deck-presentation';
import { DeckWithPrelude } from '@/features/buyer-deck/components/deck-with-prelude';
import { loadDeck } from '@/features/buyer-deck/queries/load-deck';

// Mission 142 — une demande de visite lance « Vivre ici » en tâche de fond (`after()`), dans la
// même fonction : OpenStreetMap peut prendre jusqu'à 45 s par bien. La limite, gardée large.
export const maxDuration = 300;

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
  // Mission 130 B — « Avant de présenter » d'abord, pour le conseiller seul.
  return (
    <DeckWithPrelude deck={loaded.advisorDeck}>
      <DeckPresentation
        deck={loaded.deck}
        initialResponses={loaded.responses}
        initialAvailability={loaded.initialAvailability}
        logoLightUrl={loaded.logoLightUrl}
        logoDarkUrl={loaded.logoDarkUrl}
        agencyName={loaded.agencyName}
        advisorName={loaded.advisorName}
        advisorPhone={loaded.advisorPhone}
        advisorEmail={loaded.advisorEmail}
      />
    </DeckWithPrelude>
  );
}
