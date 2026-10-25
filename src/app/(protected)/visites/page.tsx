import type { Metadata } from 'next';
import Link from 'next/link';

import {
  badgeBrand,
  badgeNeutral,
  badgeRejected,
  card,
  emptyState,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { getOtherAnswers } from '@/features/buyer-deck/queries/get-other-answers';
import {
  AVAILABILITY_LABELS,
  ITEM_ANSWER_REPORT,
  NO_REASON_LABELS,
} from '@/features/buyer-deck/types';
import { VisitDoneForm } from '@/features/buyer-presentation/components/visit-done-form';
import {
  getVisitLines,
  type VisitLine,
} from '@/features/buyer-presentation/queries/get-visit-requests';
import {
  VISIT_OUTCOME_LABELS,
  VISIT_REQUEST_DURING_LABELS,
} from '@/features/buyer-presentation/types';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';
import { SELECTION_SOURCE_LABELS } from '@/features/ideal-properties/types';
import { formatEuro } from '@/lib/format';

export const metadata: Metadata = { title: 'Visites — ACM Studio' };

export const CONTACT_REMINDER = 'Propriétaire ou confrère à contacter';

// Mission 119 — la page Visites du mode Acquéreur : les demandes à planifier, puis les visites
// faites avec leur retour et leur issue, par acquéreur ; une visite sur un concurrent ou une
// exclusivité rappelle qu'il y a un propriétaire ou un confrère à contacter (le courrier, M120).
function groupByBuyer(
  lines: VisitLine[],
): { buyerId: string; buyerName: string; lines: VisitLine[] }[] {
  const groups = new Map<string, { buyerId: string; buyerName: string; lines: VisitLine[] }>();
  for (const line of lines) {
    const group = groups.get(line.buyerId) ?? {
      buyerId: line.buyerId,
      buyerName: line.buyerName,
      lines: [],
    };
    group.lines.push(line);
    groups.set(line.buyerId, group);
  }
  return [...groups.values()];
}

function VisitRow({ line }: { line: VisitLine }) {
  const done = line.visitedAt != null;
  return (
    <li
      data-testid="visit-line"
      data-state={done ? 'done' : 'pending'}
      className="flex flex-col gap-2 rounded-xl border border-zinc-200 px-4 py-3 stage:border-white/10"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
          {line.itemLabel}
        </span>
        {line.itemPrice != null ? (
          <span className="text-sm text-zinc-600 stage:text-white/70">
            {formatEuro(line.itemPrice)}
          </span>
        ) : null}
        <span className={badgeNeutral}>{SELECTION_SOURCE_LABELS[line.itemSource]}</span>
        <span className={done ? badgeBrand : badgeNeutral}>
          {VISIT_OUTCOME_LABELS[line.outcome]}
        </span>
        {line.contactReminder ? <span className={badgeRejected}>{CONTACT_REMINDER}</span> : null}
      </div>
      <p className="text-xs text-zinc-500 stage:text-white/60">
        Demandée le {buyerDateLabel(line.requestedAt)}{' '}
        {VISIT_REQUEST_DURING_LABELS[line.requestedDuring]}
        {done ? ` · visitée le ${buyerDateLabel(line.visitedAt!)}` : ''}
      </p>
      {/* Mission 122 — ses créneaux, donnés à la fin de la présentation. */}
      {line.availability.length > 0 ? (
        <p className="text-sm text-zinc-700 stage:text-white/80" data-testid="visit-availability">
          Ses créneaux : {line.availability.map((slot) => AVAILABILITY_LABELS[slot]).join(', ')}
        </p>
      ) : null}
      {done ? (
        line.feedback ? (
          <p className="text-sm text-zinc-700 stage:text-white/80" data-testid="visit-feedback">
            « {line.feedback} »
          </p>
        ) : null
      ) : (
        <VisitDoneForm requestId={line.id} />
      )}
    </li>
  );
}

export default async function VisitsPage() {
  const [allLines, others] = await Promise.all([getVisitLines(), getOtherAnswers()]);
  const lines = allLines.filter((line) => !line.buyerArchived);
  const pending = lines.filter((line) => line.visitedAt == null);
  const done = lines.filter((line) => line.visitedAt != null);
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Acquéreurs</span>
        <h1 className={pageTitle}>Visites</h1>
        <p className={pageSubtitle}>
          Les visites demandées par vos acquéreurs, à planifier, puis faites avec leur retour.
        </p>
      </div>
      {lines.length === 0 ? (
        <div className={emptyState}>
          Aucune demande de visite pour l’instant : elles naissent pendant une présentation ou
          depuis le dossier.
        </div>
      ) : null}
      {[
        { title: 'À planifier', items: pending, testId: 'visits-pending' },
        { title: 'Visites faites', items: done, testId: 'visits-done' },
      ].map((section) =>
        section.items.length > 0 ? (
          <section
            key={section.title}
            className={`${card} flex flex-col gap-4 p-5`}
            data-testid={section.testId}
          >
            <h2 className="font-title text-lg font-semibold text-brand-deep stage:text-white">
              {section.title} <span className={badgeBrand}>{section.items.length}</span>
            </h2>
            {groupByBuyer(section.items).map((group) => (
              <div key={group.buyerId} className="flex flex-col gap-2">
                <Link
                  href={`/acquereurs/${group.buyerId}`}
                  className="font-semibold text-zinc-800 hover:underline stage:text-white"
                >
                  {group.buyerName}
                </Link>
                <ul className="flex flex-col gap-2">
                  {group.lines.map((line) => (
                    <VisitRow key={line.id} line={line} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : null,
      )}
      {/* Mission 122 — « Peut-être » et « Pas pour moi » se lisent ici aussi. */}
      {others.length > 0 ? (
        <section className={`${card} flex flex-col gap-3 p-5`} data-testid="visits-other-answers">
          <h2 className="font-title text-lg font-semibold text-brand-deep stage:text-white">
            Ses autres réponses <span className={badgeBrand}>{others.length}</span>
          </h2>
          <ul className="flex flex-col gap-2">
            {others.map((answer) => (
              <li
                key={answer.id}
                data-testid="other-answer"
                data-answer={answer.answer}
                className="flex flex-col gap-0.5 rounded-xl border border-zinc-200 px-4 py-2.5 stage:border-white/10"
              >
                <span className="font-medium text-zinc-900 stage:text-white">
                  <Link href={`/acquereurs/${answer.buyerId}`} className="hover:underline">
                    {answer.buyerName}
                  </Link>{' '}
                  · {answer.itemLabel}
                </span>
                <span className="text-sm text-zinc-700 stage:text-white/80">
                  {ITEM_ANSWER_REPORT[answer.answer]}
                  {answer.reasons.length > 0
                    ? ` : ${answer.reasons.map((reason) => NO_REASON_LABELS[reason]).join(', ')}`
                    : ''}{' '}
                  · le {buyerDateLabel(answer.answeredAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
