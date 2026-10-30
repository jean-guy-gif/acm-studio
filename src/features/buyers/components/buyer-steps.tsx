import Link from 'next/link';

import { btnPrimary, btnSecondary, card } from '@/components/ui/styles';
import {
  buyerNextStep,
  buyerSteps,
  type BuyerProgressFacts,
  type BuyerStepKey,
} from '@/features/buyers/services/buyer-progress';

// Essai de Jean-Guy (26/10) — en haut de la fiche, les trois étapes dans l'ordre, chacune avec son
// bouton et son état : « 1 · Biens idéaux » → « 2 · Présenter la sélection » → « 3 · Dossier
// acquéreur ». Le bouton de l'étape suivante est le bouton principal.
export function BuyerSteps({
  buyerId,
  facts,
  answersShown = false,
}: {
  buyerId: string;
  facts: BuyerProgressFacts;
  // La fiche montre déjà « Ce qu'il a répondu » (qui porte l'ancre « reponses ») : l'étape ne la
  // reprend pas — un identifiant n'est jamais en double.
  answersShown?: boolean;
}) {
  const steps = buyerSteps(facts);
  const next = buyerNextStep(buyerId, facts).step;
  const style = (key: BuyerStepKey) => (key === next ? btnPrimary : btnSecondary);
  const button = (key: BuyerStepKey) => {
    switch (key) {
      case 'ideal':
        return (
          <Link href={`/acquereurs/${buyerId}/biens-ideaux`} className={style(key)}>
            Trouver les biens idéaux
          </Link>
        );
      case 'present':
        return (
          <Link
            href={`/presentation/${buyerId}`}
            className={style(key)}
            data-testid="present-selection"
          >
            {facts.presentedAt ? 'Revoir la présentation' : 'Présenter la sélection'}
          </Link>
        );
      case 'visits':
        return (
          <Link
            href={facts.visitsToOrganize > 0 ? '/visites' : `/acquereurs/${buyerId}#reponses`}
            className={style(key)}
            data-testid="buyer-visits"
          >
            {facts.visitsToOrganize > 0 ? 'Organiser les visites' : 'Voir sa réponse'}
          </Link>
        );
      case 'buyerDossier':
        return (
          <Link
            href={`/acquereurs/${buyerId}/dossier`}
            className={style(key)}
            data-testid="buyer-dossier"
          >
            Dossier acquéreur
          </Link>
        );
    }
  };
  return (
    <ol
      className={`${card} grid gap-4 p-5 md:gap-3 ${steps.length > 3 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}
      data-testid="buyer-steps"
      aria-label="Les étapes de cet acquéreur"
    >
      {steps.map((step, index) => (
        <li
          key={step.key}
          className="relative flex flex-col gap-2"
          data-testid="buyer-step"
          data-step={step.key}
          data-done={step.done}
          data-next={step.key === next}
          // « Voir sa réponse » mène ici quand la réponse n'est pas encore là.
          id={step.key === 'buyerDossier' && !answersShown ? 'reponses' : undefined}
        >
          <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
            {step.number} · {step.title}
            {index < steps.length - 1 ? (
              <span aria-hidden className="ml-2 hidden text-zinc-400 md:inline">
                →
              </span>
            ) : null}
          </span>
          <ul className="flex flex-col gap-0.5 text-sm text-zinc-600 stage:text-white/70">
            {step.states.map((state) => (
              <li
                key={state}
                className={state.endsWith('✓') ? 'font-semibold text-emerald-700' : ''}
                data-testid="buyer-step-state"
              >
                {state}
              </li>
            ))}
          </ul>
          {step.available ? <div className="mt-auto pt-1">{button(step.key)}</div> : null}
        </li>
      ))}
    </ol>
  );
}
