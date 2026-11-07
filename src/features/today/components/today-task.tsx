import Link from 'next/link';

import { btnSecondary } from '@/components/ui/styles';
import { BuyerReportTask } from '@/features/buyer-messages/components/buyer-report-task';
import { BuyerRelaunchTask } from '@/features/buyers/components/buyer-relaunch-task';
import { SuiviTaskButton } from '@/features/meeting-conclusion/components/suivi-task-button';
import { taskLine } from '@/features/meeting-conclusion/services/suivi-step-labels';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import { OfferAnswerTask } from '@/features/purchase-offer/components/offer-answer-task';
import { KeepDateButton } from '@/features/today/components/keep-date-button';
import type { TodayTaskContext } from '@/features/today/queries/get-today';

// Mission 145 (partie B) — une tâche d'« Aujourd'hui », avec le geste qu'elle avait dans le Suivi
// (M130 A, M135, M138, M139) : la relance d'un acquéreur, ses points, la réponse du vendeur à une
// offre se font sur place ; une relance ou un Point marché ouvrent la carte du Suivi. Un seul bouton
// plein par page, celui de la première ligne.

const NO_CONTEXT: TodayTaskContext = {
  motiveLabel: null,
  lastContactDays: null,
  signedOn: null,
  propertyLabel: null,
};

export function TodayTaskAction({
  task,
  href,
  label,
  primary,
}: {
  task: SuiviTask;
  href: string;
  label: string;
  primary: boolean;
}) {
  if (task.kind === 'buyer_watch' && !task.buyerId && task.watchBuyers) {
    return (
      <span className="flex flex-wrap gap-2">
        {task.watchBuyers.map((buyer) => (
          <Link
            key={buyer.id}
            href={`/acquereurs/${buyer.id}/biens-ideaux#nouveau`}
            className={btnSecondary}
          >
            {buyer.name}
          </Link>
        ))}
      </span>
    );
  }
  if (task.kind === 'offer_answer' && task.buyerId && task.offerId && task.decision) {
    return (
      <OfferAnswerTask
        offerId={task.offerId}
        buyerId={task.buyerId}
        visitId={task.visitId ?? null}
        decision={task.decision}
        offerHref={href}
      />
    );
  }
  if ((task.kind === 'buyer_weekly_report' || task.kind === 'buyer_meeting') && task.buyerId) {
    return (
      <BuyerReportTask
        buyerId={task.buyerId}
        kind={task.kind === 'buyer_weekly_report' ? 'weekly_report' : 'meeting_proposed'}
        label={label}
        primary={primary}
      />
    );
  }
  if (task.kind === 'buyer_relaunch' && task.buyerId) {
    return <BuyerRelaunchTask buyerId={task.buyerId} label={label} primary={primary} />;
  }
  if (task.kind === 'follow_up_early') {
    return (
      <span className="flex flex-wrap items-center gap-3">
        <KeepDateButton projectId={task.projectId} />
        <SuiviTaskButton
          href={href}
          label={label}
          primary={primary}
          open={{ projectId: task.projectId, panel: 'relance' }}
        />
      </span>
    );
  }
  return (
    <SuiviTaskButton
      href={href}
      label={label}
      primary={primary}
      open={
        task.kind === 'follow_up'
          ? { projectId: task.projectId, panel: 'relance' }
          : task.kind === 'market_update'
            ? { projectId: task.projectId, panel: 'point' }
            : null
      }
    />
  );
}

const ICON_CLASS: Record<string, string> = {
  urgent: 'bg-emerald-700',
  sellers: 'bg-orange-500',
  buyers: 'bg-brand-deep',
  prospecting: 'bg-zinc-600',
};

export function TodayIcon({ block, text }: { block: string; text: string }) {
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${ICON_CLASS[block] ?? 'bg-zinc-600'}`}
      aria-hidden
    >
      {text}
    </span>
  );
}

// Une tâche seule : son titre, l'argument (des acquéreurs prêts), son détail, son geste.
export function TodayTask({
  task,
  block,
  context,
  today,
  primary,
  icon = true,
}: {
  task: SuiviTask;
  block: string;
  context: TodayTaskContext | undefined;
  today: string;
  primary: boolean;
  icon?: boolean;
}) {
  const line = taskLine(task, context ?? NO_CONTEXT, today);
  return (
    <div
      className="flex items-start gap-3 py-2.5 sm:items-center"
      data-testid="today-task"
      data-kind={task.kind}
    >
      {icon ? (
        <TodayIcon
          block={block}
          text={block === 'urgent' ? '€' : block === 'prospecting' ? '✉' : '!'}
        />
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 leading-snug sm:flex-row sm:items-center sm:gap-3">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
            {line.title}
          </span>
          {line.argue ? (
            <span
              className="mt-0.5 self-start rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800"
              data-testid="today-argument"
            >
              « {line.argue} »
            </span>
          ) : null}
          <span className="text-sm text-zinc-500 stage:text-white/60">
            {line.detail}
            {line.late ? (
              <span className="font-semibold text-orange-700">
                {line.detail ? ' · ' : ''}
                {line.late}
              </span>
            ) : null}
          </span>
        </span>
        <TodayTaskAction task={task} href={line.href} label={line.button} primary={primary} />
      </span>
    </div>
  );
}
