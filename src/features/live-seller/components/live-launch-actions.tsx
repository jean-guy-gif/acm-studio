'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';

import { btnPrimary, link } from '@/components/ui/styles';
import {
  livePositionKey,
  resumeIndexFor,
  resumeLabel,
  type LiveResume,
} from '@/features/live-seller/services/live-resume';

export const NO_COMPETITOR_REASON =
  'Aucun concurrent retenu : retenez-en au moins un dans la Préparation pour lancer le Live.';

// La position gardée par l'appareil pendant le Live, lue après l'hydratation.
function useStoredPosition(projectId: string): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return window.localStorage.getItem(livePositionKey(projectId));
      } catch {
        return null;
      }
    },
    () => null,
  );
}

// Mission 89 — le bouton d'un dossier sur la liste du Live (écran conseiller) :
//   • aucun concurrent retenu → bouton désactivé, avec la raison ;
//   • Live commencé → « Reprendre (écran N sur M) », et « Recommencer depuis le début » ;
//   • sinon → « Lancer le Live ».
// La reprise rouvre là où l'appareil s'était arrêté ; à défaut, au premier écran sans réponse.
// Le serveur borne de toute façon l'écran demandé : jamais le prix avant la devinette.
export function LiveLaunchActions({
  projectId,
  competitorCount,
  resume,
}: {
  projectId: string;
  competitorCount: number;
  resume: LiveResume;
}) {
  const stored = useStoredPosition(projectId);

  if (competitorCount === 0) {
    return (
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <button
          type="button"
          disabled
          aria-describedby={`live-blocked-${projectId}`}
          className={btnPrimary}
        >
          Lancer le Live →
        </button>
        <span
          id={`live-blocked-${projectId}`}
          className="max-w-xs text-xs font-medium text-amber-700 sm:text-right stage:text-amber-300"
        >
          {NO_COMPETITOR_REASON}
        </span>
      </div>
    );
  }

  if (!resume.started) {
    return (
      <Link href={`/live/${projectId}`} className={btnPrimary}>
        Lancer le Live →
      </Link>
    );
  }

  const index = resumeIndexFor(resume, stored);
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Link
        href={index > 0 ? `/live/${projectId}?fiche=${index}` : `/live/${projectId}`}
        className={btnPrimary}
      >
        {resumeLabel({ ...resume, index })} →
      </Link>
      <Link href={`/live/${projectId}`} className={`${link} text-xs`}>
        Recommencer depuis le début
      </Link>
    </div>
  );
}
