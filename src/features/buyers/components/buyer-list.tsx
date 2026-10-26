import Link from 'next/link';

import { badgeBrand, badgeNeutral, card, emptyState } from '@/components/ui/styles';
import {
  buyerBudgetLabel,
  buyerCitiesLabel,
  buyerDateLabel,
  buyerRoomsLabel,
  buyerStatusLabel,
  buyerTypesLabel,
} from '@/features/buyers/services/buyer-criteria';
import {
  NO_PROGRESS,
  buyerNextStep,
  type BuyerProgressFacts,
} from '@/features/buyers/services/buyer-progress';
import type { Buyer } from '@/features/buyers/types';

// Mission 117 — la liste des acquéreurs : une ligne par fiche, nom, type, communes, budget,
// pièces, dernière modification ; les miennes en tête. Un champ absent est omis.
export function BuyerList({
  buyers,
  advisorId,
  query,
  progress = new Map(),
}: {
  buyers: Buyer[];
  advisorId: string | null;
  query: string | null;
  // Essai de Jean-Guy (26/10) : les faits des étapes, pour le bouton de chaque carte.
  progress?: ReadonlyMap<string, BuyerProgressFacts>;
}) {
  if (buyers.length === 0) {
    return (
      <div className={emptyState} data-testid="buyer-list-empty">
        {query
          ? `Aucun acquéreur ne porte « ${query} ».`
          : 'Aucun acquéreur pour l’instant : « Nouvel acquéreur » crée la première fiche.'}
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-2" data-testid="buyer-list">
      {buyers.map((buyer) => {
        const facts = [
          buyerTypesLabel(buyer),
          buyerCitiesLabel(buyer),
          buyerBudgetLabel(buyer),
          buyerRoomsLabel(buyer),
        ].filter((fact): fact is string => fact != null && fact !== '');
        return (
          <li key={buyer.id} data-testid="buyer-row" className={`${card} px-4 py-3`}>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/acquereurs/${buyer.id}`}
                    className="font-title text-base font-bold text-zinc-900 hover:underline stage:text-white"
                  >
                    {buyer.name}
                  </Link>
                  <span className={badgeBrand}>{buyerStatusLabel(buyer)}</span>
                  {buyer.advisorId === advisorId ? (
                    <span className={badgeNeutral}>Ma fiche</span>
                  ) : null}
                </div>
                <p className="text-sm text-zinc-600 stage:text-white/70">{facts.join(' · ')}</p>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-xs text-zinc-500 stage:text-white/60">
                  Modifiée le {buyerDateLabel(buyer.updatedAt)}
                </span>
                {/* Essai de Jean-Guy (26/10) : le bouton dit l'étape suivante, plus « Ouvrir ». */}
                {(() => {
                  const next = buyerNextStep(buyer.id, progress.get(buyer.id) ?? NO_PROGRESS);
                  return (
                    <Link
                      href={next.href}
                      className="text-sm font-medium text-brand-deep underline-offset-2 hover:underline stage:text-brand"
                      data-testid="buyer-next-step"
                    >
                      {next.label} →
                    </Link>
                  );
                })()}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
