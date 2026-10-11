'use client';

import { useState, type ReactNode } from 'react';

import { card, link } from '@/components/ui/styles';

// Mission 91 — les deux blocs du haut, côte à côte sur un écran large, l'un sous l'autre sur
// tablette (M72). « Voir l'analyse détaillée » déplie, sous eux et sur toute la largeur, le
// contenu de l'ancienne page d'analyse : rien n'est perdu, rien n'est imposé.
export function MarketAndDecision({
  market,
  decision,
  details,
}: {
  market: ReactNode;
  decision: ReactNode;
  details: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="@container flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-2">
        <section className={`${card} flex min-w-0 flex-col gap-4 p-5 sm:p-6`}>
          {market}
          <button
            type="button"
            className={`${link} self-start text-sm`}
            aria-expanded={open}
            aria-controls="analyse-detaillee"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? 'Masquer l’analyse détaillée ▴' : 'Voir l’analyse détaillée ▾'}
          </button>
        </section>
        <section className={`${card} flex min-w-0 flex-col gap-4 p-5 sm:p-6`}>{decision}</section>
      </div>
      <div id="analyse-detaillee" hidden={!open} className="flex flex-col gap-4">
        {details}
      </div>
    </div>
  );
}
