'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { badgeBrand, badgeNeutral, btnSecondary, hintText } from '@/components/ui/styles';
import { prepareBuyerLetter } from '@/features/buyer-prospecting/actions/prepare-buyer-letter';
import type { BuyerLetterVersion } from '@/features/buyer-prospecting/services/buyer-letter';
import type { VisitAction, VisitLetterState } from '@/features/buyer-prospecting/types';

const small = 'px-3 py-1.5 text-xs';

const PREPARE_LABELS: Record<BuyerLetterVersion, string> = {
  owner: 'Préparer le courrier au propriétaire',
  colleague: 'Préparer le dossier de collaboration au confrère',
};

// Mission 120 — sur une visite demandée (Visites, fiche), le courrier qui convient à l'origine du
// bien, et son état relu sur sa carte de Prospection (Mission 146 B : le mandat signé et le vendeur
// à relancer sont des étapes de `VisitActions`) ; un concurrent ou une annonce du marché sans
// exclusivité reçoit le courrier au propriétaire. Mission 120 B — en exclusivité, le dossier de
// collaboration au confrère ; l'exclusivité inconnue propose les deux au même rang, et le choix
// l'écrit sur le bien. Une liste : aucune action en bouton plein (maquette M120B-2). « Contacté »
// et « Collaboration obtenue / refusée » se posent sur la carte de Prospection (M115).
export function VisitLetterAction({
  visitId,
  action,
  letterHref,
  state,
  colleague = false,
}: {
  visitId: string;
  action: VisitAction;
  letterHref: string | null;
  state: VisitLetterState;
  colleague?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [preparing, setPreparing] = useState<BuyerLetterVersion | null>(null);

  const prepare = (version: BuyerLetterVersion) => {
    setError(null);
    setPreparing(version);
    startTransition(async () => {
      const result = await prepareBuyerLetter(visitId, version).catch(() => ({
        ok: false as const,
        error: 'Connexion perdue — réessayez.',
      }));
      if (!result.ok) {
        setError(result.error);
        setPreparing(null);
        return;
      }
      router.push(result.href);
    });
  };

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
          {colleague ? 'Ouvrir le dossier de collaboration' : 'Ouvrir le courrier'}
        </Link>
        {state.kind !== 'closed' ? (
          <Link
            href="/prospection?origine=acquereur"
            className="text-xs font-semibold text-brand-deep hover:underline"
            data-testid="visit-follow-prospection"
          >
            Suivre dans Prospection →
          </Link>
        ) : null}
      </div>
    );
  }
  const versions: BuyerLetterVersion[] =
    action.kind === 'owner_letter'
      ? ['owner']
      : action.kind === 'colleague_letter'
        ? ['colleague']
        : action.kind === 'choose'
          ? ['owner', 'colleague']
          : [];
  if (versions.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {action.kind === 'choose' ? (
          <span className="text-sm text-zinc-600 stage:text-white/70">
            <b className="text-zinc-900 stage:text-white">À qui écrire ?</b> L’annonce ne dit pas si
            le mandat est exclusif.
          </span>
        ) : null}
        {versions.map((version) => (
          <button
            key={version}
            type="button"
            className={`${btnSecondary} ${small}`}
            disabled={pending}
            onClick={() => prepare(version)}
            data-testid={
              version === 'owner' ? 'visit-prepare-owner-letter' : 'visit-prepare-colleague-letter'
            }
          >
            {preparing === version ? 'Préparation…' : PREPARE_LABELS[version]}
          </button>
        ))}
      </div>
      {action.kind === 'choose' ? (
        <span className={hintText}>
          Votre choix enregistre la réponse sur le bien : « Exclusivité : non » ou « oui », indiqué
          par vous.
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
