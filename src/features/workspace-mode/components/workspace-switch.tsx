'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { setWorkspaceMode } from '@/features/workspace-mode/actions/set-workspace-mode';
import { homeForMode } from '@/features/workspace-mode/services/workspace-mode';
import {
  WORKSPACE_MODES,
  WORKSPACE_MODE_LABELS,
  type WorkspaceMode,
} from '@/features/workspace-mode/types';

// Mission 118 — l'interrupteur Vendeur | Acquéreur, en tête du menu, visible sur bureau comme sur
// tablette : le mot et la couleur du mode. Choisir un mode l'enregistre et ouvre sa première page
// (sinon le mode de la page le ramènerait aussitôt) ; un échec le dit, sans bloquer la navigation.
export const MODE_COLOR: Record<WorkspaceMode, { on: string; dot: string }> = {
  seller: {
    on: 'bg-brand-deep text-white stage:bg-brand stage:text-[#051826]',
    dot: 'bg-brand-deep stage:bg-brand',
  },
  buyer: {
    on: 'bg-emerald-700 text-white stage:bg-emerald-400 stage:text-[#051826]',
    dot: 'bg-emerald-600 stage:bg-emerald-400',
  },
};

export function WorkspaceSwitch({ mode }: { mode: WorkspaceMode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const choose = (next: WorkspaceMode) => {
    if (next === mode) return;
    setError(null);
    startTransition(async () => {
      const result = await setWorkspaceMode(next).catch(() => ({
        ok: false as const,
        error: 'Le mode n’a pas pu être enregistré.',
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(homeForMode(next));
    });
  };

  return (
    <div className="flex flex-col gap-1" data-testid="workspace-switch" data-mode={mode}>
      <div
        role="group"
        aria-label="Mode"
        className="grid grid-cols-2 rounded-xl border border-zinc-200 bg-zinc-100 p-1 stage:border-white/10 stage:bg-white/5"
      >
        {WORKSPACE_MODES.map((value) => {
          const active = value === mode;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              disabled={pending}
              onClick={() => choose(value)}
              className={`rounded-lg px-2 py-1.5 font-title text-sm font-semibold transition-colors ${
                active
                  ? MODE_COLOR[value].on
                  : 'text-zinc-600 hover:bg-white hover:text-zinc-900 stage:text-white/60 stage:hover:bg-white/10 stage:hover:text-white'
              }`}
            >
              {WORKSPACE_MODE_LABELS[value]}
            </button>
          );
        })}
      </div>
      <p className="flex items-center gap-1.5 px-1 text-xs text-zinc-500 stage:text-white/50">
        <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${MODE_COLOR[mode].dot}`} />
        <span data-testid="workspace-mode-word">Mode {WORKSPACE_MODE_LABELS[mode]}</span>
      </p>
      {error ? (
        <p role="alert" className="px-1 text-xs font-medium text-red-600 stage:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
