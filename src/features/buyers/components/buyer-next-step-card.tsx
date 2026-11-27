import Link from 'next/link';

import {
  socleBigStep,
  socleBtnFilledBig,
  socleBtnOutline,
  socleCardBordered,
  socleKicker,
  socleStepLink,
} from '@/components/ui/styles';
import { CompromiseActions } from '@/features/buyers/components/compromise-actions';
import type { BuyerNextAction } from '@/features/buyers/services/buyer-journey';

// UNE prochaine étape. La refonte, lot B (maquette REFONTE-4) — la carte du socle : blanche, son
// sur-titre, ce qu'il y a à faire, puis le seul bouton plein de la fiche. Lot F (Jean-Guy, 26/11) —
// la même carte, sortie de la fiche, dans le détail d'Acquéreurs (tablette, ordinateur) quand la
// personne n'a pas de bien à voir : la tâche du jour y garde le seul bouton plein, la prochaine
// étape passe en contour (`filled`), et le compromis ne redouble pas les gestes de la réponse du
// vendeur, qui sont dans la tâche (M138).
export function BuyerNextStepCard({
  next,
  unread,
  loopFailed,
  filled = true,
  className = '',
}: {
  next: BuyerNextAction;
  // L'avancement de la fiche n'a pas pu être lu : on ne dit jamais une étape au hasard (M98).
  unread: boolean;
  // Les mandats à lui proposer n'ont pas pu être lus (M145, M98).
  loopFailed: boolean;
  filled?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`${socleCardBordered} flex flex-col gap-3 p-[18px] ${className}`}
      data-testid="buyer-next-step"
    >
      <span className={socleKicker}>Prochaine étape</span>
      {unread ? (
        <p role="alert" className="text-sm font-semibold text-red-700 stage:text-red-300">
          L’avancement de cette fiche n’a pas pu être lu : rechargez la page.
        </p>
      ) : (
        <>
          <h2 className="text-lg leading-snug font-bold text-brand-darker stage:text-white">
            {next.title}
          </h2>
          <p className="text-[15px] text-[#5B6380] lg:grow stage:text-white/70">{next.phrase}</p>
          {/* Mission 145 — les mandats à lui proposer n'ont pas pu être lus (M98). */}
          {loopFailed ? (
            <p role="alert" className="text-sm font-semibold text-red-700 stage:text-red-300">
              Les mandats à lui proposer n’ont pas pu être lus : rechargez la page.
            </p>
          ) : null}
          {next.compromiseOfferId ? (
            filled ? (
              <CompromiseActions
                offerId={next.compromiseOfferId}
                notifyLabel={next.primary.label}
              />
            ) : null
          ) : (
            <>
              <Link
                href={next.primary.href}
                data-testid="buyer-next-button"
                className={
                  filled ? `${socleBtnFilledBig} ${socleBigStep}` : `${socleBtnOutline} w-full`
                }
              >
                {next.primary.label}
              </Link>
              {next.secondary ? (
                <Link
                  href={next.secondary.href}
                  data-testid="buyer-next-secondary"
                  className={socleStepLink}
                >
                  {next.secondary.label}
                </Link>
              ) : null}
            </>
          )}
        </>
      )}
    </section>
  );
}
