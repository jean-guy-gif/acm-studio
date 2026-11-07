'use client';

import { useState } from 'react';

import { SubmitButton } from '@/components/submit-button';
import { btnDanger, btnDangerGhost, btnSecondary } from '@/components/ui/styles';

// Mission 93 — « Supprimer » demande confirmation DANS l'écran (pas de boîte du navigateur),
// en nommant le dossier. Confirmer l'archive : il disparaît des listes, rien n'est effacé.
export function ArchiveProjectButton({
  projectId,
  projectName,
  action,
  label = 'Supprimer',
  triggerClassName = btnDangerGhost,
}: {
  projectId: string;
  projectName: string;
  action: (formData: FormData) => Promise<void>;
  // Mission 143 (B4) — sur la Vue d'ensemble, « Supprimer le dossier… » en lien discret, loin du
  // bouton principal.
  label?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = `archive-${projectId}`;
  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 text-zinc-900 shadow-2xl">
            <h2 id={titleId} className="font-title text-xl font-bold text-brand-deep">
              Supprimer le dossier {projectName}&nbsp;?
            </h2>
            <p className="text-sm text-zinc-600">Il disparaîtra de vos listes.</p>
            <form action={action} className="flex flex-wrap justify-end gap-2">
              <input type="hidden" name="projectId" value={projectId} />
              <button
                type="button"
                autoFocus
                className={btnSecondary}
                onClick={() => setOpen(false)}
              >
                Annuler
              </button>
              <SubmitButton pendingLabel="Suppression…" className={btnDanger}>
                Supprimer
              </SubmitButton>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
