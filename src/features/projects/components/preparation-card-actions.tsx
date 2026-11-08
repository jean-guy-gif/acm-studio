'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

import { MoreMenu, type MoreMenuItem } from '@/components/ui/more-menu';
import { btnSecondary, metaLabel } from '@/components/ui/styles';
import { ArchiveProjectDialog } from '@/features/projects/components/archive-project-button';

type FormAction = (formData: FormData) => Promise<void>;

// Mission 146 (I9) — à droite d'une carte de Préparation : sa prochaine étape, en contour (le seul
// plein de l'écran est « Nouveau dossier vendeur »), et « … » pour le reste — « Déclarer prêt »
// suivi de ce qui manque (M52 : l'outil informe, il ne barre pas la route), « Supprimer le
// dossier… » avec sa confirmation (M93) ; sur un dossier prêt, « Remettre en préparation ».
export function PreparationCardActions({
  projectId,
  projectName,
  ready,
  next,
  missing,
  declareReady,
  revertToPreparation,
  archive,
}: {
  projectId: string;
  projectName: string;
  ready: boolean;
  next: { label: string; href: string };
  missing: string | null;
  declareReady: FormAction;
  revertToPreparation: FormAction;
  archive: FormAction;
}) {
  const [archiving, setArchiving] = useState(false);
  const declareForm = useRef<HTMLFormElement>(null);
  const revertForm = useRef<HTMLFormElement>(null);
  const items: MoreMenuItem[] = ready
    ? [
        {
          key: 'revert',
          label: 'Remettre en préparation',
          onSelect: () => revertForm.current?.requestSubmit(),
        },
      ]
    : [
        {
          key: 'ready',
          label: 'Déclarer prêt',
          hint: missing,
          onSelect: () => declareForm.current?.requestSubmit(),
        },
        {
          key: 'archive',
          label: 'Supprimer le dossier…',
          danger: true,
          onSelect: () => setArchiving(true),
        },
      ];
  return (
    <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
      <span className={metaLabel}>Prochaine étape</span>
      <div className="flex items-center gap-2">
        <Link href={next.href} className={btnSecondary} data-testid="preparation-next-step">
          {next.label} →
        </Link>
        <MoreMenu items={items} testId="preparation-more" />
      </div>
      <form ref={declareForm} action={declareReady} hidden>
        <input type="hidden" name="projectId" value={projectId} />
      </form>
      <form ref={revertForm} action={revertToPreparation} hidden>
        <input type="hidden" name="projectId" value={projectId} />
      </form>
      {archiving ? (
        <ArchiveProjectDialog
          projectId={projectId}
          projectName={projectName}
          action={archive}
          onCancel={() => setArchiving(false)}
        />
      ) : null}
    </div>
  );
}
