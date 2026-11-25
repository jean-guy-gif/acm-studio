import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { card, emptyState, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { nothingTodayLabel } from '@/features/meeting-conclusion/services/suivi-step-labels';
import { TodayCountSync } from '@/features/today/components/today-count';
import { TodaySeries } from '@/features/today/components/today-series';
import { TodayIcon, TodayTask } from '@/features/today/components/today-task';
import { getToday } from '@/features/today/queries/get-today';
import {
  seriesDetail,
  seriesLate,
  seriesTitle,
  TODAY_BLOCK_NOTES,
  TODAY_BLOCK_TITLES,
} from '@/features/today/services/today-board';
import { formatDay } from '@/lib/format';

export const metadata: Metadata = { title: 'Aujourd’hui — ACM Studio' };

type TodayPageProps = { searchParams: Promise<{ vue?: string }> };

const chip = 'rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap transition-colors';

// Mission 145 (partie B) — « Aujourd'hui », la page d'arrivée : ce qu'il y a à faire, la plus
// urgente en premier, en quatre blocs (Urgent, Vendeurs, Acquéreurs, Prospection), une ligne par
// sorte de tâche ; « Fait aujourd'hui » en bas. « Mes tâches » par défaut ; un manager, et lui
// seul, passe à « Toute l'agence » (`?vue=agence`). Maquettes M145-1 à M145-6.
export default async function TodayPage({ searchParams }: TodayPageProps) {
  const { vue } = await searchParams;
  const today = await getToday(vue === 'agence' ? 'agency' : 'mine');
  if (!today) notFound();
  const now = new Date();
  const day = parisDay(now);
  const { board, scope } = today;
  const prospectAlerts = board.blocks.some((block) =>
    block.lines.some((line) => line.kind === 'prospect_buyers'),
  );
  // Un seul bouton plein sur la page : celui de la première ligne, la plus urgente.
  const firstLineKey = board.blocks[0]?.lines[0]?.key ?? null;

  return (
    <div className="flex flex-col gap-5 md:gap-6" data-testid="today-page">
      {scope === 'mine' && today.failed.length === 0 ? (
        <TodayCountSync count={board.lineCount} />
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={kickerLabel}>{formatDay(now, 'fr', 'weekday')}</span>
          <h1 className={pageTitle}>Aujourd’hui</h1>
          <p className={pageSubtitle} data-testid="today-summary">
            {today.failed.length > 0
              ? 'Une partie des tâches n’a pas pu être lue : rechargez la page.'
              : board.lineCount === 0
                ? 'Rien à faire aujourd’hui.'
                : `${board.lineCount} ${board.lineCount > 1 ? 'choses' : 'chose'} à faire, la plus urgente en premier.`}
          </p>
          {today.manager ? (
            <div
              className="mt-1 inline-flex self-start rounded-full bg-zinc-100 p-1 stage:bg-white/10"
              data-testid="today-scope"
            >
              <Link
                href="/aujourdhui"
                aria-current={scope === 'mine' ? 'true' : undefined}
                className={`${chip} ${scope === 'mine' ? 'bg-white text-brand-darker shadow-sm' : 'text-zinc-600'}`}
              >
                Mes tâches
              </Link>
              <Link
                href="/aujourdhui?vue=agence"
                aria-current={scope === 'agency' ? 'true' : undefined}
                className={`${chip} ${scope === 'agency' ? 'bg-white text-brand-darker shadow-sm' : 'text-zinc-600'}`}
              >
                Toute l’agence
              </Link>
            </div>
          ) : null}
        </div>
        {today.readyBuyers != null ? (
          <Link
            href="/acquereurs?etat=ready"
            className={`${card} flex flex-col px-4 py-2.5`}
            data-testid="today-ready-buyers"
          >
            <span className="font-title text-2xl font-bold text-brand-darker stage:text-white">
              {today.readyBuyers}
            </span>
            <span className="text-xs text-zinc-600 stage:text-white/70">
              {today.readyBuyers > 1 ? 'acquéreurs prêts' : 'acquéreur prêt'} à visiter ›
            </span>
          </Link>
        ) : null}
      </div>

      {/* Une lecture en échec n'est jamais lue comme « rien à faire » (M98). */}
      {today.failed.map((message) => (
        <p key={message} role="alert" className="text-sm font-semibold text-red-700">
          {message}
        </p>
      ))}

      {board.lineCount === 0 && today.failed.length === 0 ? (
        <div className={emptyState} data-testid="today-nothing">
          <p className="text-sm text-zinc-600 stage:text-white/70">
            {nothingTodayLabel(today.next)}
          </p>
        </div>
      ) : null}

      {board.blocks.map((block) => (
        <section
          key={block.key}
          className={`${card} flex flex-col px-5 py-3`}
          data-testid="today-block"
          data-block={block.key}
        >
          <h2 className="flex items-baseline gap-2 font-title text-xl font-bold text-brand-darker stage:text-white">
            {TODAY_BLOCK_TITLES[block.key]}
            <small className="font-sans text-xs font-semibold text-zinc-500 stage:text-white/60">
              · {TODAY_BLOCK_NOTES[block.key] ?? block.lines.length}
            </small>
          </h2>
          <ol className="flex flex-col divide-y divide-zinc-100 stage:divide-white/10">
            {block.lines.map((line) => {
              const primary = line.key === firstLineKey;
              if (line.tasks.length === 1) {
                const task = line.tasks[0]!;
                return (
                  <li key={line.key} data-testid="today-line" data-kind={line.kind}>
                    <TodayTask
                      task={task}
                      block={block.key}
                      context={today.context.get(task.projectId)}
                      today={day}
                      primary={primary}
                    />
                  </li>
                );
              }
              return (
                <li key={line.key} data-testid="today-line" data-kind={line.kind}>
                  <TodaySeries
                    icon={<TodayIcon block={block.key} text={String(line.tasks.length)} />}
                    title={seriesTitle(line.kind, line.tasks, prospectAlerts)}
                    detail={seriesDetail(line.kind, line.tasks)}
                    late={seriesLate(line.late)}
                    count={line.tasks.length}
                    primary={primary}
                  >
                    {line.tasks.map((task, index) => (
                      <TodayTask
                        key={`${line.key}-${index}`}
                        task={task}
                        block={block.key}
                        context={today.context.get(task.projectId)}
                        today={day}
                        primary={false}
                        icon={false}
                      />
                    ))}
                  </TodaySeries>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      {today.done ? (
        <section
          className="flex flex-col gap-1 rounded-2xl border border-zinc-200/80 bg-zinc-50 px-5 py-3 stage:border-white/10 stage:bg-white/5"
          data-testid="today-done"
        >
          <h2 className="font-title text-base font-bold text-brand-darker stage:text-white">
            ✓ Fait aujourd’hui
            {today.done.length > 0 ? (
              <small className="ml-1 font-sans text-xs font-semibold text-zinc-500">
                · {today.done.length}
                {scope === 'agency' ? ' · toute l’agence' : ''}
              </small>
            ) : null}
          </h2>
          {today.done.length === 0 ? (
            <p className="text-sm text-zinc-500 stage:text-white/60">Rien encore.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {today.done.map((line) => (
                <li
                  key={line.key}
                  className="text-sm text-zinc-500 stage:text-white/60"
                  data-testid="today-done-line"
                >
                  <s>{line.title}</s> · {line.detail}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
