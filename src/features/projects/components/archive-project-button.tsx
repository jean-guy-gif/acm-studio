'use client';

import { useState } from 'react';

import { SubmitButton } from '@/components/submit-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { btnDanger, btnDangerGhost } from '@/components/ui/styles';

type ArchiveAction = (formData: FormData) => Promise<void>;

// Mission 93 — « Supprimer » demande confirmation DANS l'écran (pas de boîte du navigateur),
// en nommant le dossier. Confirmer l'archive : il disparaît des listes, rien n'est effacé.
// Mission 146 — la fenêtre seule, pour l'ouvrir depuis le menu « … » d'une carte.
export function ArchiveProjectDialog({
  projectId,
  projectName,
  action,
  onCancel,
}: {
  projectId: string;
  projectName: string;
  action: ArchiveAction;
  onCancel: () => void;
}) {
  return (
    <ConfirmDialog
      title={<>Supprimer le dossier {projectName}&#x202f;?</>}
      text="Il disparaîtra de vos listes."
      onCancel={onCancel}
    >
      <form action={action}>
        <input type="hidden" name="projectId" value={projectId} />
        <SubmitButton pendingLabel="Suppression…" className={btnDanger}>
          Supprimer
        </SubmitButton>
      </form>
    </ConfirmDialog>
  );
}

export function ArchiveProjectButton({
  projectId,
  projectName,
  action,
  label = 'Supprimer',
  triggerClassName = btnDangerGhost,
}: {
  projectId: string;
  projectName: string;
  action: ArchiveAction;
  // Mission 143 (B4) — sur la Vue d'ensemble, « Supprimer le dossier… » en lien discret, loin du
  // bouton principal.
  label?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? (
        <ArchiveProjectDialog
          projectId={projectId}
          projectName={projectName}
          action={action}
          onCancel={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
