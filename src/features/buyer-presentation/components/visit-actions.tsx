'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';

import { btnSecondary, link } from '@/components/ui/styles';
import { VisitMessagesPanel } from '@/features/buyer-messages/components/visit-messages-panel';
import type { VisitNextStep as ReportNextStep } from '@/features/buyer-messages/templates/types';
import { VisitDoneForm } from '@/features/buyer-presentation/components/visit-done-form';
import { VisitNextStepForm } from '@/features/buyer-presentation/components/visit-next-step-form';
import type { VisitNextStep } from '@/features/buyer-presentation/services/visit-next-step';
import { VisitLetterAction } from '@/features/buyer-prospecting/components/visit-letter-action';
import type { VisitAction, VisitLetterState } from '@/features/buyer-prospecting/types';
import { VisitConfirmForm } from '@/features/buyer-presentation/components/visit-confirm-form';

const small = 'px-3 py-1.5 text-xs';
const linkButton = `${link} text-sm hover:underline`;

const PILL: Record<'done' | 'now' | 'later', string> = {
  done: 'bg-emerald-50 text-emerald-800 stage:bg-emerald-400/10 stage:text-emerald-200',
  now: 'bg-brand-soft font-semibold text-brand-deep stage:bg-brand/20 stage:text-white',
  later: 'bg-zinc-100 text-zinc-500 stage:bg-white/5 stage:text-white/50',
};

type Opened = 'confirm' | 'done' | 'messages' | 'change' | null;

// Mission 146 (partie B, I10, planche B1) — sur une visite : son chemin en pastilles (vert fait,
// bleu maintenant, gris à venir, M143), UNE prochaine étape en contour (Visites n'a aucun bouton
// plein, M120 B), le reste en liens — « Confirmer la visite » ou « Changer la date », « Visite
// faite », « Proposer une visite au vendeur ». Mission 147 (partie A) — « Vivre ici » d'ACM n'y est
// plus : c'est celui d'Academia, sur le mandat.
export function VisitActions({
  visitId,
  buyerId,
  next,
  action,
  letterHref,
  letterState,
  colleague,
  openMessages = false,
  openDone = false,
  changeNext = null,
}: {
  visitId: string;
  buyerId: string;
  next: VisitNextStep;
  action: VisitAction;
  letterHref: string | null;
  letterState: VisitLetterState;
  colleague: boolean;
  // Mission 139 — juste après « Visite faite » : ses messages ouverts aussitôt.
  openMessages?: boolean;
  // Lancement, mission 7 — depuis « Aujourd'hui » : le compte rendu de cette visite, ouvert.
  openDone?: boolean;
  // Correctif du 13/11 — une visite faite : sa suite se change (l'acquéreur a changé d'avis).
  changeNext?: { current: ReportNextStep | null; offerAllowed: boolean } | null;
}) {
  const [opened, setOpened] = useState<Opened>(
    openMessages ? 'messages' : openDone ? 'done' : null,
  );
  const toggle = (value: Exclude<Opened, null>) =>
    setOpened((current) => (current === value ? null : value));
  const projectId =
    action.kind === 'propose_visit' || action.kind === 'call_seller' ? action.projectId : null;
  const voucherHref = `/acquereurs/${buyerId}/bon-de-visite?visite=${visitId}`;
  const offerHref = `/acquereurs/${buyerId}/offre?visite=${visitId}`;
  const waitingFor = colleague ? 'En attente du confrère' : 'En attente du propriétaire';

  let phrase: ReactNode = null;
  let stepAction: ReactNode = null;
  switch (next.step) {
    case 'write':
    case 'open_letter':
      stepAction = (
        <VisitLetterAction
          visitId={visitId}
          action={action}
          letterHref={letterHref}
          state={letterState}
          colleague={colleague}
        />
      );
      break;
    case 'wait':
      phrase = <span data-testid="visit-outcome">{waitingFor}</span>;
      stepAction = (
        <VisitLetterAction
          visitId={visitId}
          action={action}
          letterHref={letterHref}
          state={letterState}
          colleague={colleague}
        />
      );
      break;
    case 'closed':
      phrase = (
        <span data-testid="visit-outcome">
          {letterState.kind === 'closed' ? letterState.label : null} : rien à envoyer pour ce bien.
        </span>
      );
      break;
    case 'call_seller':
      phrase = 'Le vendeur est à relancer : dites-lui que vous avez un acquéreur.';
      stepAction = projectId ? (
        <Link
          href={`/builder/${projectId}`}
          className={`${btnSecondary} ${small}`}
          data-testid="visit-seller-action"
        >
          Rappeler : « j’ai un acquéreur »
        </Link>
      ) : null;
      break;
    case 'confirm':
      phrase = 'Le jour et l’heure : un message prêt pour l’acquéreur.';
      stepAction = (
        <button
          type="button"
          className={`${btnSecondary} ${small}`}
          aria-expanded={opened === 'confirm'}
          onClick={() => toggle('confirm')}
          data-testid="visit-confirm-open"
        >
          Confirmer la visite
        </button>
      );
      break;
    case 'voucher':
      phrase = 'Le jour de la visite, faites signer le bon au visiteur.';
      stepAction = (
        <Link
          href={voucherHref}
          className={`${btnSecondary} ${small}`}
          data-testid="visit-voucher-step"
        >
          Signer le bon de visite
        </Link>
      );
      break;
    case 'visit_done':
      phrase = 'Après la visite : son avis, ce qui a plu et déplu, la suite.';
      stepAction = (
        <button
          type="button"
          className={`${btnSecondary} ${small}`}
          aria-expanded={opened === 'done'}
          onClick={() => toggle('done')}
          data-testid="visit-done-open"
        >
          Visite faite
        </button>
      );
      break;
    case 'offer':
      stepAction = (
        <Link
          href={offerHref}
          className={`${btnSecondary} ${small}`}
          data-testid="visit-offer-open"
        >
          Offre d’achat
        </Link>
      );
      break;
    case 'messages':
      stepAction = (
        <button
          type="button"
          className={`${btnSecondary} ${small}`}
          aria-expanded={opened === 'messages'}
          onClick={() => toggle('messages')}
          data-testid="visit-messages-open"
        >
          Messages prêts
        </button>
      );
      break;
    case 'none':
      break;
  }

  return (
    <div className="flex flex-col gap-2.5" data-testid="visit-actions" data-step={next.step}>
      <ol className="flex flex-wrap items-center gap-1 text-xs" data-testid="visit-track">
        {next.track.map((step, index) => (
          <li key={step.key} className="flex items-center gap-1">
            {index > 0 ? (
              <span aria-hidden className="text-zinc-500 stage:text-white/30">
                →
              </span>
            ) : null}
            <span
              className={`rounded-full px-2.5 py-0.5 ${PILL[step.status]}`}
              data-status={step.status}
              aria-current={step.status === 'now' ? 'step' : undefined}
            >
              {step.status === 'done' ? '✓ ' : ''}
              {step.label}
            </span>
          </li>
        ))}
      </ol>

      {phrase || stepAction ? (
        <div className="flex flex-wrap items-center justify-between gap-2" data-testid="visit-step">
          {phrase ? <p className="text-sm text-zinc-600 stage:text-white/70">{phrase}</p> : null}
          {stepAction}
        </div>
      ) : null}

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5" data-testid="visit-links">
        {next.links.confirm ? (
          <button
            type="button"
            className={linkButton}
            aria-expanded={opened === 'confirm'}
            onClick={() => toggle('confirm')}
            data-testid="visit-confirm-open"
          >
            {next.links.confirm === 'change' ? 'Changer la date' : 'Confirmer la visite'}
          </button>
        ) : null}
        {next.links.visitDone ? (
          <button
            type="button"
            className={linkButton}
            aria-expanded={opened === 'done'}
            onClick={() => toggle('done')}
            data-testid="visit-done-open"
          >
            Visite faite
          </button>
        ) : null}
        {next.links.voucher ? (
          <Link href={voucherHref} className={linkButton} data-testid="visit-voucher-step">
            Signer le bon de visite
          </Link>
        ) : null}
        {next.links.write ? (
          <VisitLetterAction
            visitId={visitId}
            action={action}
            letterHref={null}
            state={letterState}
            colleague={colleague}
            asLinks
          />
        ) : null}
        {next.links.messages ? (
          <button
            type="button"
            className={linkButton}
            aria-expanded={opened === 'messages'}
            onClick={() => toggle('messages')}
            data-testid="visit-messages-open"
          >
            Messages prêts
          </button>
        ) : null}
        {changeNext ? (
          <button
            type="button"
            className={linkButton}
            aria-expanded={opened === 'change'}
            onClick={() => toggle('change')}
            data-testid="visit-change-open"
          >
            Changer la suite
          </button>
        ) : null}
        {next.links.proposeToSeller && projectId ? (
          <Link
            href={`/builder/${projectId}`}
            className={linkButton}
            data-testid="visit-seller-action"
          >
            Proposer une visite au vendeur
          </Link>
        ) : null}
      </div>

      {opened === 'confirm' ? <VisitConfirmForm visitId={visitId} /> : null}
      {opened === 'done' ? (
        <VisitDoneForm requestId={visitId} onCancel={() => setOpened(null)} />
      ) : null}
      {opened === 'messages' ? <VisitMessagesPanel requestId={visitId} /> : null}
      {opened === 'change' && changeNext ? (
        <VisitNextStepForm
          visitId={visitId}
          current={changeNext.current}
          offerAllowed={changeNext.offerAllowed}
          onCancel={() => setOpened(null)}
        />
      ) : null}
    </div>
  );
}
