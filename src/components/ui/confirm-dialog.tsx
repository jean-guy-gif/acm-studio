'use client';

import { useEffect, useId, type ReactNode } from 'react';

import { btnSecondary } from '@/components/ui/styles';

// Mission 146 — la confirmation dans l'écran, partagée : celle de « Supprimer le dossier » (M93),
// pour toute suppression, jamais la boîte du navigateur. « Annuler » prend le focus ; Échap
// annule. Le geste lui-même (`children`) est le contour rouge (`btnDanger`), ou le formulaire qui
// le porte.
export function ConfirmDialog({
  title,
  text,
  onCancel,
  children,
}: {
  title: ReactNode;
  text?: ReactNode;
  onCancel: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 text-zinc-900 shadow-2xl">
        <h2 id={titleId} className="font-title text-xl font-bold text-brand-deep">
          {title}
        </h2>
        {text ? <p className="text-sm text-zinc-600">{text}</p> : null}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" autoFocus className={btnSecondary} onClick={onCancel}>
            Annuler
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
