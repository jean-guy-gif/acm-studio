import type { Metadata } from 'next';
import Link from 'next/link';

import {
  badgeBrand,
  card,
  emptyState,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { getOtherAnswers } from '@/features/buyer-deck/queries/get-other-answers';
import { ITEM_ANSWER_REPORT, NO_REASON_LABELS } from '@/features/buyer-deck/types';
import { VisitRow } from '@/features/buyer-presentation/components/visit-row';
import {
  getVisitLines,
  type VisitLine,
} from '@/features/buyer-presentation/queries/get-visit-requests';
import { getVisitLetters } from '@/features/buyer-prospecting/queries/get-visit-letters';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';

export const metadata: Metadata = { title: 'Visites — ACM Studio' };

// Mission 119 — la page Visites du mode Acquéreur : les demandes à planifier, puis les visites
// faites avec leur retour et leur issue, par acquéreur. Mission 120 — chaque visite demandée
// porte l'action qui convient à l'origine du bien, et l'état de son courrier.
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

export default async function VisitsPage() {
  const [allLines, others] = await Promise.all([getVisitLines(), getOtherAnswers()]);
  const lines = allLines.filter((line) => !line.buyerArchived);
  // Mission 120 — l'action de chaque visite et l'état de son courrier.
  const letters = await getVisitLetters(lines.filter((line) => line.visitedAt == null));
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
                    <VisitRow key={line.id} line={line} letter={letters.get(line.id) ?? null} />
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
