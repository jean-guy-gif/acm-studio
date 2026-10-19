'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { btnPrimary } from '@/components/ui/styles';
import {
  showsNextAction,
  type NextDossierAction,
} from '@/features/projects/services/dossier-steps';

// Mission 110 — « Étape suivante », dans l'en-tête de chaque écran du dossier.
export function NextStepButton({
  projectId,
  action,
}: {
  projectId: string;
  action: NextDossierAction;
}) {
  const pathname = usePathname();
  if (!showsNextAction(pathname, projectId, action)) {
    return null;
  }
  return (
    <Link href={action.href} className={`${btnPrimary} ml-auto`} data-testid="next-step">
      {action.label} →
    </Link>
  );
}
