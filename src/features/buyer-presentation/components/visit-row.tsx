import Link from 'next/link';

import { badgeBrand, badgeNeutral } from '@/components/ui/styles';
import type { VisitVoucher } from '@/features/visit-voucher/queries/get-visit-vouchers';
import { OfferAnswerBadge } from '@/features/purchase-offer/components/offer-answer-badge';
import { VisitMessagesPanel } from '@/features/buyer-messages/components/visit-messages-panel';
import { NEXT_STEP_LABELS, visitReportLine } from '@/features/buyer-messages/report';
import type { OfferAnswer } from '@/features/purchase-offer/queries/get-offer-answers';
import { AVAILABILITY_LABELS } from '@/features/buyer-deck/types';
import { VisitDoneForm } from '@/features/buyer-presentation/components/visit-done-form';
import type { VisitLine } from '@/features/buyer-presentation/queries/get-visit-requests';
import {
  VISIT_OUTCOME_LABELS,
  VISIT_REQUEST_DURING_LABELS,
} from '@/features/buyer-presentation/types';
import { VisitLetterAction } from '@/features/buyer-prospecting/components/visit-letter-action';
import type { VisitLetter } from '@/features/buyer-prospecting/queries/get-visit-letters';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';
import { SELECTION_SOURCE_LABELS } from '@/features/ideal-properties/types';
import { formatEuro } from '@/lib/format';

// Mission 119 — une visite demandée ou faite. Mission 120 — une visite demandée porte l'action qui
// convient à l'origine du bien et l'état de son courrier ; tant que le courrier n'a pas abouti,
// elle attend le propriétaire ou le confrère, puis redevient « À planifier » (collaboration
// obtenue, mandat rentré), sans autre geste.
export function VisitRow({
  line,
  letter = null,
  voucher = null,
  offerAnswer = null,
}: {
  line: VisitLine;
  letter?: VisitLetter | null;
  // Mission 137 — le bon de visite signé pour cette visite, gardé sur elle.
  voucher?: VisitVoucher | null;
  // Mission 138 — la réponse du vendeur à l'offre née de cette visite.
  offerAnswer?: OfferAnswer | null;
}) {
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
        <span className={done ? badgeBrand : badgeNeutral} data-testid="visit-outcome">
          {!done && letter?.waiting ? letter.waiting : VISIT_OUTCOME_LABELS[line.outcome]}
        </span>
        {offerAnswer ? (
          <OfferAnswerBadge decision={offerAnswer.decision} decidedAt={offerAnswer.decidedAt} />
        ) : null}
      </div>
      <p className="text-xs text-zinc-500 stage:text-white/60">
        Demandée le {buyerDateLabel(line.requestedAt)}{' '}
        {VISIT_REQUEST_DURING_LABELS[line.requestedDuring]}
        {done ? ` · visitée le ${buyerDateLabel(line.visitedAt!)}` : ''}
      </p>
      {/* Mission 137 B — une visite « Offre envisagée » mène à l'offre d'achat. */}
      {done && line.outcome === 'offer' ? (
        <Link
          href={`/acquereurs/${line.buyerId}/offre?visite=${line.id}`}
          className="self-start text-sm font-semibold text-brand-darker underline"
          data-testid="visit-offer-open"
        >
          Offre d’achat
        </Link>
      ) : null}
      {voucher ? (
        <Link
          href={`/acquereurs/${line.buyerId}/bon-de-visite/${voucher.documentId}`}
          className="self-start text-sm font-semibold text-brand-darker underline"
          data-testid="visit-voucher-signed"
        >
          Bon de visite signé le {buyerDateLabel(voucher.signedAt)}
        </Link>
      ) : null}
      {/* Mission 122 — ses créneaux, donnés à la fin de la présentation. */}
      {line.availability.length > 0 ? (
        <p className="text-sm text-zinc-700 stage:text-white/80" data-testid="visit-availability">
          Ses créneaux : {line.availability.map((slot) => AVAILABILITY_LABELS[slot]).join(', ')}
        </p>
      ) : null}
      {done ? (
        <>
          {/* Mission 139 — le compte rendu : l'avis, ce qui a plu et déplu, la suite. */}
          {line.report ? (
            <p className="text-sm text-zinc-700 stage:text-white/80" data-testid="visit-report">
              {visitReportLine(line.report)}
              {line.report.nextStep ? ` · ${NEXT_STEP_LABELS[line.report.nextStep]}` : ''}
            </p>
          ) : null}
          {line.feedback ? (
            <p className="text-sm text-zinc-700 stage:text-white/80" data-testid="visit-feedback">
              « {line.feedback} »
            </p>
          ) : null}
          {line.report?.nextStep ? <VisitMessagesPanel requestId={line.id} /> : null}
        </>
      ) : (
        <>
          {letter ? (
            <VisitLetterAction
              visitId={line.id}
              action={letter.action}
              letterHref={letter.letterHref}
              state={letter.state}
              colleague={letter.colleague}
            />
          ) : null}
          <VisitDoneForm requestId={line.id} />
        </>
      )}
    </li>
  );
}
