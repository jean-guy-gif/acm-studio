'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  badgeBrand,
  badgeNeutral,
  btnPrimary,
  btnSecondary,
  hintText,
} from '@/components/ui/styles';
import { prepareBuyerLetter } from '@/features/buyer-prospecting/actions/prepare-buyer-letter';
import type { VisitAction, VisitLetterState } from '@/features/buyer-prospecting/types';

const small = 'px-3 py-1.5 text-xs';

// Mission 120 — sur une visite demandée (Visites, fiche), l'action qui convient à l'origine du
// bien, et l'état du courrier relu sur sa carte de Prospection. Un mandat signé se fait visiter,
// un vendeur à relancer se rappelle (M86) ; un concurrent ou une annonce du marché sans
// exclusivité reçoit le courrier au propriétaire ; l'exclusivité inconnue laisse le choix.
export function VisitLetterAction({
  visitId,
  action,
  letterHref,
  state,
}: {
  visitId: string;
  action: VisitAction;
  letterHref: string | null;
  state: VisitLetterState;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const prepare = () => {
    setError(null);
    startTransition(async () => {
      const result = await prepareBuyerLetter(visitId).catch(() => ({
        ok: false as const,
        error: 'Connexion perdue — réessayez.',
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(result.href);
    });
  };

  if (action.kind === 'propose_visit' || action.kind === 'call_seller') {
    return (
      <Link
        href={`/builder/${action.projectId}`}
        className={`${btnSecondary} ${small} self-start`}
        data-testid="visit-seller-action"
      >
        {action.kind === 'propose_visit'
          ? 'Proposer une visite'
          : 'Rappeler : « j’ai un acquéreur »'}
      </Link>
    );
  }
  if (letterHref) {
    return (
      <div className="flex flex-wrap items-center gap-2" data-testid="visit-letter">
        {state.kind !== 'none' ? (
          <span
            className={state.kind === 'done' ? badgeBrand : badgeNeutral}
            data-testid="visit-letter-state"
          >
            {state.label}
          </span>
        ) : null}
        <Link href={letterHref} className={`${btnSecondary} ${small}`}>
          Ouvrir le courrier
        </Link>
      </div>
    );
  }
  if (action.kind === 'owner_letter' || action.kind === 'choose') {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          className={`${btnPrimary} ${small} self-start`}
          disabled={pending}
          onClick={prepare}
          data-testid="visit-prepare-owner-letter"
        >
          {pending ? 'Préparation…' : 'Préparer le courrier au propriétaire'}
        </button>
        {action.kind === 'choose' ? (
          <span className={hintText}>
            ACM ne sait pas si ce bien est en exclusivité : c’est à vous de choisir.
          </span>
        ) : null}
        {error ? (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
  return null;
}
