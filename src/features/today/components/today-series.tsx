'use client';

import { useState, type ReactNode } from 'react';

import { btnPrimary, btnSecondary } from '@/components/ui/styles';

// Mission 145 (partie B) — une ligne qui regroupe plusieurs tâches de la même sorte : elle s'ouvre
// sur place (« Voir les 4 » / « Fermer »), et chaque tâche y garde son geste d'aujourd'hui.
export function TodaySeries({
  icon,
  title,
  detail,
  late,
  count,
  primary,
  children,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  late: string | null;
  count: number;
  primary: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div data-testid="today-series">
      <div className="flex items-start gap-3 py-2.5 sm:items-center">
        {icon}
        <span className="flex min-w-0 flex-1 flex-col gap-1.5 leading-snug sm:flex-row sm:items-center sm:gap-3">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
              {title}
            </span>
            <span className="text-sm text-zinc-500 stage:text-white/60">
              {detail}
              {late ? (
                <span className="font-semibold text-orange-700">
                  {detail ? ' · ' : ''}
                  {late}
                </span>
              ) : null}
            </span>
          </span>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className={`${primary ? btnPrimary : btnSecondary} self-start whitespace-nowrap sm:self-auto`}
            data-testid="today-series-toggle"
          >
            {open ? 'Fermer ▴' : `Voir les ${count}`}
          </button>
        </span>
      </div>
      {open ? (
        <div
          className="mb-2 ml-10 flex flex-col divide-y divide-dashed divide-zinc-200 border-l border-zinc-200 pl-4 stage:border-white/10 stage:divide-white/10"
          data-testid="today-series-items"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
