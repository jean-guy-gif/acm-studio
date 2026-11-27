import Link from 'next/link';

import { pillGreen, pillNeutral, socleCardBordered } from '@/components/ui/styles';
import type { VisitVoucher } from '@/features/visit-voucher/queries/get-visit-vouchers';
import { OfferAnswerBadge } from '@/features/purchase-offer/components/offer-answer-badge';
import {
  canTurnIntoOffer,
  NEXT_STEP_LABELS,
  visitReportLine,
} from '@/features/buyer-messages/report';
import type { OfferAnswer } from '@/features/purchase-offer/queries/get-offer-answers';
import { AVAILABILITY_LABELS } from '@/features/buyer-deck/types';
import { VisitActions } from '@/features/buyer-presentation/components/visit-actions';
import type { VisitLine } from '@/features/buyer-presentation/queries/get-visit-requests';
import {
  outsideMandateNote,
  visitNextStep,
} from '@/features/buyer-presentation/services/visit-next-step';
import {
  VISIT_OUTCOME_LABELS,
  VISIT_REQUEST_DURING_LABELS,
} from '@/features/buyer-presentation/types';
import type { VisitLetter } from '@/features/buyer-prospecting/queries/get-visit-letters';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';
import { SELECTION_SOURCE_LABELS } from '@/features/ideal-properties/types';
import { HORS_MANDAT_OUVERT } from '@/features/visit-voucher/services/outside-mandate';
import { formatEuro, formatRelativeMoment } from '@/lib/format';

// Mission 119 — une visite demandée ou faite. Mission 120 — une visite demandée porte le courrier
// qui convient à l'origine du bien et l'état de ce courrier, relu sur sa carte de Prospection.
// Mission 146 (partie B, I10) — son chemin et UNE prochaine étape (`visitNextStep`), le reste en
// liens ; « Mandat signé » quand le bien est à l'agence.
export function VisitRow({
  line,
  letter = null,
  voucher = null,
  offerAnswer = null,
  openMessages = false,
  openDone = false,
}: {
  line: VisitLine;
  letter?: VisitLetter | null;
  // Mission 137 — le bon de visite signé pour cette visite, gardé sur elle.
  voucher?: VisitVoucher | null;
  // Mission 138 — la réponse du vendeur à l'offre née de cette visite.
  offerAnswer?: OfferAnswer | null;
  // Mission 139 — juste après « Visite faite » : ses messages ouverts aussitôt.
  openMessages?: boolean;
  // Lancement, mission 7 — depuis « Aujourd'hui » : son compte rendu, ouvert.
  openDone?: boolean;
}) {
  const done = line.visitedAt != null;
  const next = visitNextStep({
    done,
    outcome: line.outcome,
    scheduledAt: line.scheduledAt ?? null,
    voucherSigned: voucher != null,
    hasReport: line.report?.nextStep != null,
    action: letter?.action ?? { kind: 'none' },
    letterPrepared: letter?.letterHref != null,
    letterState: letter?.state ?? { kind: 'none' },
    colleague: letter?.colleague ?? false,
    outside: HORS_MANDAT_OUVERT && line.itemSource !== 'project',
  });
  // Mission 153 — pourquoi pas de bon, ou ce que le bon demandera, sous le chemin.
  const outsideLine = outsideMandateNote(
    line.itemSource,
    next,
    HORS_MANDAT_OUVERT ? { buyerName: line.buyerName, voucherSigned: voucher != null } : null,
  );
  return (
    <li
      id={`visite-${line.id}`}
      data-testid="visit-line"
      data-state={done ? 'done' : 'pending'}
      className={`${socleCardBordered} flex flex-col gap-2.5 p-4`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[17px] font-bold text-brand-darker stage:text-white">
          {line.itemLabel}
        </span>
        {line.itemPrice != null ? (
          <span className="text-[15px] text-[#5B6380] stage:text-white/70">
            {formatEuro(line.itemPrice)}
          </span>
        ) : null}
        <span className={letter?.action.kind === 'propose_visit' ? pillGreen : pillNeutral}>
          {letter?.action.kind === 'propose_visit'
            ? 'Mandat signé'
            : SELECTION_SOURCE_LABELS[line.itemSource]}
        </span>
        {/* Mission 143 (B1) — un seul badge, le plus avancé : l'offre acceptée remplace
            « Offre envisagée ». */}
        {done && offerAnswer?.decision !== 'accepted' ? (
          <span className={pillNeutral} data-testid="visit-done-outcome">
            {VISIT_OUTCOME_LABELS[line.outcome]}
          </span>
        ) : null}
        {offerAnswer ? (
          <OfferAnswerBadge decision={offerAnswer.decision} decidedAt={offerAnswer.decidedAt} />
        ) : null}
      </div>
      <p className="text-sm text-[#5B6380] stage:text-white/60">
        Demandée le {buyerDateLabel(line.requestedAt)}{' '}
        {VISIT_REQUEST_DURING_LABELS[line.requestedDuring]}
        {done ? ` · visitée le ${buyerDateLabel(line.visitedAt!)}` : ''}
        {/* Mission 122 — ses créneaux, donnés à la fin de la présentation. */}
        {!done && line.availability.length > 0 ? (
          <span data-testid="visit-availability">
            {' '}
            · ses créneaux&nbsp;:{' '}
            {line.availability.map((slot) => AVAILABILITY_LABELS[slot]).join(', ')}
          </span>
        ) : null}
      </p>
      {/* Mission 142 — la visite planifiée, en vert. */}
      {!done && line.scheduledAt ? (
        <p className="text-sm font-semibold text-emerald-700" data-testid="visit-scheduled">
          Visite planifiée {formatRelativeMoment(line.scheduledAt)}
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
              «&nbsp;{line.feedback}&nbsp;»
            </p>
          ) : null}
        </>
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
      <VisitActions
        visitId={line.id}
        buyerId={line.buyerId}
        next={next}
        action={letter?.action ?? { kind: 'none' }}
        letterHref={letter?.letterHref ?? null}
        letterState={letter?.state ?? { kind: 'none' }}
        colleague={letter?.colleague ?? false}
        openMessages={openMessages && line.report?.nextStep != null}
        openDone={openDone && !done}
        // Correctif du 13/11 — la suite d'une visite faite se change ; pas une fois l'offre signée
        // (le serveur le refuse aussi).
        changeNext={
          done && offerAnswer == null
            ? {
                current: line.report?.nextStep ?? null,
                offerAllowed: canTurnIntoOffer({
                  visitedAt: line.visitedAt,
                  outcome: line.outcome,
                  opinion: line.report?.opinion ?? null,
                }),
              }
            : null
        }
      />
      {outsideLine ? (
        <p
          className="text-xs text-zinc-500 stage:text-white/60"
          data-testid="visit-outside-mandate"
        >
          {outsideLine}
        </p>
      ) : null}
    </li>
  );
}
