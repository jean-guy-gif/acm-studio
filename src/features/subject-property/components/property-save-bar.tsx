'use client';

import { btnGhost, btnPrimary, btnSecondary } from '@/components/ui/styles';
import type { SaveBarStatus } from '@/features/subject-property/services/save-bar-status';

const TONE: Record<SaveBarStatus['tone'], string> = {
  neutral: 'text-zinc-500 stage:text-white/60',
  ok: 'text-emerald-600 stage:text-emerald-300',
  error: 'text-red-600 stage:text-red-300',
};

// MISSION 77 — UNE barre fixée à la fenêtre (comme le Live, M51) : un seul « Enregistrer » pour
// toute la fiche, et les deux sorties (retour au dossier, recherche de concurrents) qui
// enregistrent avant de partir. Elle dit toujours où en est la fiche. Elle s'arrête au bord du
// menu latéral, qu'elle ne recouvre pas.
export function PropertySaveBar({
  status,
  pending,
  onSave,
  onBack,
  onFind,
  onStatusClick,
  children,
}: {
  status: SaveBarStatus;
  pending: boolean;
  onSave: () => void;
  onBack: () => void;
  onFind: () => void;
  onStatusClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur md:left-64 stage:border-white/10 stage:bg-brand-deep/95"
      style={{
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        paddingTop: '0.75rem',
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 sm:px-6 md:px-10">
        {children}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <button type="button" onClick={onBack} disabled={pending} className={btnGhost}>
            ← Retour au dossier
          </button>
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
            <span
              role={status.tone === 'error' ? 'alert' : 'status'}
              className={`text-sm font-medium ${TONE[status.tone]}`}
            >
              {status.target != null ? (
                <button
                  type="button"
                  onClick={onStatusClick}
                  className="underline underline-offset-2"
                >
                  {status.text}
                </button>
              ) : (
                status.text
              )}
            </span>
            <button type="button" onClick={onSave} disabled={pending} className={btnPrimary}>
              Enregistrer
            </button>
            <button type="button" onClick={onFind} disabled={pending} className={btnSecondary}>
              Trouver des concurrents →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
