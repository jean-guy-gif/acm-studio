'use client';

import Link from 'next/link';

import { useStoredLivePosition } from '@/features/live-seller/components/live-launch-actions';
import { ctaPrimary } from '@/features/live-seller/components/live-stage';

// Mission 92 — « Reprendre », sur l'écran de pause : rouvre le Live là où l'appareil s'était
// arrêté (un numéro d'écran gardé par l'appareil, rien du dossier). Le serveur borne de toute
// façon l'écran demandé : jamais le prix avant la devinette.
export function LiveResumeLink({ projectId, label }: { projectId: string; label: string }) {
  const stored = Number.parseInt(useStoredLivePosition(projectId) ?? '', 10);
  const href =
    Number.isInteger(stored) && stored > 0
      ? `/live/${projectId}?fiche=${stored}`
      : `/live/${projectId}`;
  return (
    <Link href={href} className={ctaPrimary}>
      {label}
    </Link>
  );
}
