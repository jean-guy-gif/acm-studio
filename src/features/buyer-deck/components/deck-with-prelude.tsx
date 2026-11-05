'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { btnPrimary, link } from '@/components/ui/styles';
import { DeckPrepare } from '@/features/buyer-deck/components/deck-prepare';
import type { BuyerDeck } from '@/features/buyer-deck/types';

// Mission 130 B — « Avant de présenter » quitte la fiche : ses mots et les phrases « Pourquoi » se
// relisent ici, sur l'écran de présentation, avant le premier bien, par le conseiller seul ;
// « Commencer la présentation » ouvre la scène. Une présentation terminée s'ouvre directement
// (son déroulé est figé, M122).
export function DeckWithPrelude({ deck, children }: { deck: BuyerDeck; children: ReactNode }) {
  const [started, setStarted] = useState(deck.presentedAt != null);
  if (started) return <>{children}</>;
  return (
    <main
      className="mx-auto flex min-h-screen max-w-3xl flex-col gap-5 bg-zinc-50 px-4 py-8"
      data-testid="deck-prelude"
    >
      <Link href={`/acquereurs/${deck.buyerId}`} className={`${link} text-sm`}>
        ← {deck.buyerName}
      </Link>
      <p className="text-sm text-zinc-600">
        Pour vous seul, avant de tourner l’écran : relisez ses mots et la phrase de chaque bien.
      </p>
      <DeckPrepare deck={deck} />
      <button
        type="button"
        className={`${btnPrimary} self-start`}
        data-testid="deck-start"
        onClick={() => setStarted(true)}
      >
        Commencer la présentation
      </button>
    </main>
  );
}
