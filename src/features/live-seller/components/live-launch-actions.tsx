'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { btnPrimary, btnSecondary, link } from '@/components/ui/styles';
import {
  LAUNCH_FOR_REAL_LABEL,
  OPEN_EXAMPLE_LABEL,
  REAL_DOSSIER_CONFIRMATION,
  liveLaunchCheck,
  LISTINGS_CHECK_NOTICE,
  NO_DECISION_NOTICE,
  pendingImportsNotice,
} from '@/features/live-seller/services/live-launch';
import {
  livePositionKey,
  resumeIndexFor,
  resumeLabel,
  type LiveResume,
} from '@/features/live-seller/services/live-resume';
import type { LivePresentationMode } from '@/features/live-seller/services/presentation-mode';
import { confirmLiveLaunch } from '@/features/live-seller/actions/confirm-live-launch';
import { openExampleDossier } from '@/features/welcome/actions/open-example-dossier';

// La position gardée par l'appareil pendant le Live, lue après l'hydratation.
export function useStoredLivePosition(projectId: string): string | null {
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

// Mission 89 — le bouton d'un dossier pour lancer le Live (écran conseiller) :
//   • aucun concurrent retenu → bouton désactivé, avec la raison ;
//   • Live commencé → « Reprendre (écran N sur M) ». Mission 92 : plus de « Recommencer depuis
//     le début » — les réponses du vendeur sont figées, on ne rejoue pas un rendez-vous ;
//   • sinon → « Lancer le Live ».
// La reprise rouvre là où l'appareil s'était arrêté ; à défaut, au premier écran sans réponse.
// Le serveur borne de toute façon l'écran demandé : jamais le prix avant la devinette.
// Mission 104 — LE MÊME bouton partout (liste du Live, fiche du dossier, « Avant le
// rendez-vous ») : un lien vers les concurrents quand il n'y en a pas, et, avant d'ouvrir un Live
// jamais commencé, ce qu'il faut savoir (peu de concurrents, prix ou surfaces à vérifier) et, sur
// un vrai dossier, la confirmation « devant le vendeur ». Confirmé dans l'écran, sans boîte du
// navigateur.
export function LiveLaunchActions({
  projectId,
  competitorCount,
  resume,
  isExample,
  toVerifyCount,
  decisionOutdated = false,
  decisionMissing = false,
  shortlistPending = false,
  pendingImportCount = 0,
  listingsCheckStale = false,
  proceed = false,
  secondary = false,
  presentationMode = 'interactive',
}: {
  projectId: string;
  competitorCount: number;
  resume: LiveResume;
  isExample: boolean;
  toVerifyCount: number;
  decisionOutdated?: boolean;
  decisionMissing?: boolean;
  // Mission 110 — au-delà de 6 retenus, le choix des concurrents montrés reste à faire : le
  // lancement mène d'abord à ce choix (l'étape « Lancer le Live »).
  shortlistPending?: boolean;
  // Mission 112 — concurrents retenus qui attendent leur import : rappelé avant de lancer.
  pendingImportCount?: number;
  // Mission 152 — annonces non vérifiées depuis 24 h : rappelé avant de lancer, sans bloquer.
  listingsCheckStale?: boolean;
  // Mission 110 — sur un écran où « Étape suivante » porte déjà le bouton principal.
  secondary?: boolean;
  // Mission 107 — l'étape « Lancer le Live » (onglet « Live », bandeau « prêt ») : ce qui n'a
  // rien à demander s'ouvre tout de suite ; ce qui demande s'affiche déjà ouvert.
  proceed?: boolean;
  // Mission 131 — « Document seul » : pas de Live ; le bouton est désactivé et mène à l'Étude de
  // marché et à la conclusion depuis le dossier.
  presentationMode?: LivePresentationMode;
}) {
  const router = useRouter();
  const primary = secondary ? btnSecondary : btnPrimary;
  const stored = useStoredLivePosition(projectId);
  const [asking, setAsking] = useState(proceed);
  const check = liveLaunchCheck({
    competitorCount,
    isExample,
    toVerifyCount,
    decisionOutdated,
    decisionMissing,
    pendingImportCount,
    listingsCheckStale,
  });
  const href = `/live/${projectId}`;
  const resumeIndex = resume.started ? resumeIndexFor(resume, stored) : 0;
  // Mission 131 — « Document seul » n'ouvre jamais le Live, même depuis l'étape « Lancer le Live ».
  const direct =
    check.status === 'blocked' || presentationMode === 'document'
      ? null
      : resume.started
        ? resumeIndex > 0
          ? `${href}?fiche=${resumeIndex}`
          : href
        : check.status === 'go'
          ? href
          : null;
  useEffect(() => {
    if (proceed && direct && !shortlistPending) router.replace(direct);
  }, [proceed, direct, shortlistPending, router]);

  if (presentationMode === 'document') {
    return (
      <div className="flex flex-col items-start gap-1 sm:items-end" data-document-only>
        <button
          type="button"
          disabled
          aria-describedby={`live-document-${projectId}`}
          className={primary}
        >
          Lancer le Live →
        </button>
        <span
          id={`live-document-${projectId}`}
          className="max-w-xs text-xs font-medium text-zinc-600 sm:text-right stage:text-white/70"
        >
          Document seul : pas de Live.{' '}
          <Link href={`/builder/${projectId}/etude-de-marche`} className={link}>
            Ouvrir l’Étude de marché
          </Link>
          , puis{' '}
          <Link href={`/builder/${projectId}/conclusion`} className={link}>
            conclure le rendez-vous
          </Link>
          .
        </span>
      </div>
    );
  }

  if (check.status === 'blocked') {
    return (
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <button
          type="button"
          disabled
          aria-describedby={`live-blocked-${projectId}`}
          className={primary}
        >
          Lancer le Live →
        </button>
        <span
          id={`live-blocked-${projectId}`}
          className="max-w-xs text-xs font-medium text-amber-700 sm:text-right stage:text-amber-300"
        >
          {check.reason} —{' '}
          <Link href={`/builder/${projectId}/comparables`} className={link}>
            choisir les concurrents
          </Link>
          .
        </span>
      </div>
    );
  }

  if (shortlistPending && !resume.started && !proceed) {
    return (
      <Link href={`/builder/${projectId}/lancer-le-live`} className={primary}>
        Lancer le Live →
      </Link>
    );
  }

  if (resume.started) {
    const index = resumeIndexFor(resume, stored);
    return (
      <Link href={index > 0 ? `${href}?fiche=${index}` : href} className={primary}>
        {resumeLabel({ ...resume, index })} →
      </Link>
    );
  }

  if (check.status === 'go') {
    return (
      <Link href={href} className={primary}>
        Lancer le Live →
      </Link>
    );
  }

  if (!asking) {
    return (
      <button type="button" className={primary} onClick={() => setAsking(true)}>
        Lancer le Live →
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Avant de lancer le Live"
      data-testid="live-launch-confirm"
      className="flex max-w-md flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 stage:border-amber-300/40 stage:bg-amber-300/10 stage:text-amber-100"
    >
      {check.notices.map((notice) =>
        // Mission 109 — sans décision de prix : le lien vers « Avant le rendez-vous ».
        notice === NO_DECISION_NOTICE ? (
          <p key={notice} data-testid="no-decision-notice">
            {notice} :{' '}
            <Link href={`/builder/${projectId}/avant-rendez-vous`} className={link}>
              Avant le rendez-vous
            </Link>
            .
          </p>
        ) : notice === LISTINGS_CHECK_NOTICE ? (
          // Mission 152 — la vérification se fait sur « Avant le rendez-vous » ; rien n'est bloqué.
          <p key={notice} data-testid="launch-listings-check">
            {notice} :{' '}
            <Link href={`/builder/${projectId}/avant-rendez-vous`} className={link}>
              vérifier les annonces
            </Link>
            .
          </p>
        ) : notice === pendingImportsNotice(pendingImportCount) ? (
          // Mission 112 — avec un lien vers les concurrents, sans bloquer (M52).
          <p key={notice} data-testid="launch-pending-imports">
            {notice} :{' '}
            <Link href={`/builder/${projectId}/comparables`} className={link}>
              voir les concurrents
            </Link>
            .
          </p>
        ) : (
          <p key={notice}>{notice}</p>
        ),
      )}
      {check.confirm ? <p className="font-semibold">{REAL_DOSSIER_CONFIRMATION}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        {check.confirm ? (
          // Mission 112 — la confirmation est enregistrée par le serveur, qui ouvre le Live.
          <form action={confirmLiveLaunch.bind(null, projectId)}>
            <button type="submit" className={primary} data-testid="launch-for-real">
              {LAUNCH_FOR_REAL_LABEL}
            </button>
          </form>
        ) : (
          <Link href={href} className={primary}>
            Lancer le Live
          </Link>
        )}
        {check.confirm ? (
          <form action={openExampleDossier}>
            <button type="submit" className={btnSecondary}>
              {OPEN_EXAMPLE_LABEL}
            </button>
          </form>
        ) : null}
        <button type="button" className={`${link} text-xs`} onClick={() => setAsking(false)}>
          Annuler
        </button>
      </div>
    </div>
  );
}
