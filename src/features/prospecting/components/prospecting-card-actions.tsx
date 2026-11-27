'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MoreMenu, type MoreMenuItem } from '@/components/ui/more-menu';
import { btnDanger, btnSecondary, link } from '@/components/ui/styles';
import {
  addBuyerProspectOpposition,
  setBuyerProspectStatus,
} from '@/features/buyer-prospecting/actions/buyer-prospect-actions';
import { ConfirmAddressActions } from '@/features/competitor-locator/components/confirm-address-actions';
import type { ProspectingStep } from '@/features/competitor-mandate/services/mandate-columns';
import { PrepareFileLinks } from '@/features/prospecting-file/components/prepare-file-links';
import { PROSPECTING_FILE_VERSION_LABELS } from '@/features/prospecting-file/types';
import { addProspectingOpposition } from '@/features/prospecting/actions/add-prospecting-opposition';
import { setProspectingStatus } from '@/features/prospecting/actions/set-prospecting-status';
import { announceOppositionRecorded } from '@/features/prospecting/components/opposition-notice';
import type { CardStep } from '@/features/prospecting/services/card-step';
import type { ProspectingMove } from '@/features/prospecting/services/prospecting-status';

const small = 'px-3 py-1.5 text-xs';
const OPPOSE_FAILED =
  'L’inscription n’a pas été confirmée\u00a0: vérifiez la connexion, puis réessayez.';

// Mission 146 (partie B, C9, planche B3) — les gestes d'une carte de Prospection : SA prochaine
// étape en contour, au plus un lien, et « … » (Corriger l'adresse · Pas intéressé · Annuler · Ne
// plus solliciter…). Le serveur relit le statut et refuse un saut de cran (M86) ; « Ne plus
// solliciter » se confirme dans l'écran, sans boîte du navigateur, parce qu'il ne s'annule pas
// d'ici (M98). Jamais un appel (M145).
export function ProspectingCardActions({
  plan,
  projectId,
  competitorId,
  oppositionProjectId,
  oppositionCompetitorId,
  buyerProspectId,
  step,
  listingUrl,
  canAcceptAddress,
  addressConfirmed,
  buyerLetterHref,
}: {
  plan: CardStep;
  projectId: string;
  competitorId: string;
  // « Ne plus solliciter » porte sur la carte (sa copie de référence, M98).
  oppositionProjectId: string;
  oppositionCompetitorId: string;
  buyerProspectId: string | null;
  step: ProspectingStep;
  listingUrl: string | null;
  canAcceptAddress: boolean;
  addressConfirmed: boolean;
  // Le courrier de la recherche acquéreur qui vise ce bien (M120), s'il y en a une.
  buyerLetterHref: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [addressOpen, setAddressOpen] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [opposing, setOpposing] = useState(false);

  const run = (move: ProspectingMove) => {
    setError(null);
    startTransition(async () => {
      const result = await (
        buyerProspectId
          ? setBuyerProspectStatus(buyerProspectId, move)
          : setProspectingStatus(projectId, competitorId, move)
      ).catch(() => ({ ok: false as const, error: 'Connexion perdue — réessayez.' }));
      if (!result.ok) setError(result.error);
    });
  };

  const oppose = () => {
    setError(null);
    startTransition(async () => {
      const result = await (
        buyerProspectId
          ? addBuyerProspectOpposition(buyerProspectId)
          : addProspectingOpposition(oppositionProjectId, oppositionCompetitorId)
      ).catch(() => ({ ok: false as const, error: OPPOSE_FAILED }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpposing(false);
      // La carte quitte le tableau : la page confirme l'enregistrement (mission 103).
      announceOppositionRecorded();
    });
  };

  const openAddress = (correct: boolean) => {
    setCorrecting(correct);
    setAddressOpen(true);
  };

  const items: MoreMenuItem[] = [
    ...(plan.menu.address
      ? [
          {
            key: 'address',
            label: plan.menu.address === 'correct' ? 'Corriger l’adresse' : 'Confirmer l’adresse',
            onSelect: () => openAddress(plan.menu.address === 'correct'),
          },
        ]
      : []),
    // Mission 84 — ACM ne sait pas à qui s'adresser : le conseiller choisit la version.
    ...(plan.menu.prepareVersions && !buyerProspectId
      ? (['owner', 'colleague'] as const).map((version) => ({
          key: `prepare-${version}`,
          label: `Préparer le dossier ${PROSPECTING_FILE_VERSION_LABELS[version].toLowerCase()}`,
          href: `/builder/${projectId}/prospection/${competitorId}?version=${version}`,
        }))
      : []),
    ...(plan.menu.decline
      ? [{ key: 'decline', label: 'Pas intéressé', onSelect: () => run('declined') }]
      : []),
    ...(plan.menu.undo
      ? [{ key: 'undo', label: 'Annuler la dernière étape', onSelect: () => run('back') }]
      : []),
    ...(plan.menu.oppose
      ? [
          {
            key: 'oppose',
            label: 'Ne plus solliciter…',
            danger: true,
            onSelect: () => setOpposing(true),
          },
        ]
      : []),
  ];

  let main = null;
  switch (plan.main?.kind) {
    case 'confirm_address':
      // Ouverte, l'étape laisse la place à ses choix (M84).
      main = addressOpen ? null : (
        <button
          type="button"
          className={`${btnSecondary} ${small}`}
          onClick={() => openAddress(false)}
        >
          Confirmer l’adresse
        </button>
      );
      break;
    case 'prepare':
      // Mission 120 B (reprise R4) — sur une carte à deux origines, « Préparer le dossier » et le
      // courrier de la recherche acquéreur restent au même rang, même classe (en contour).
      main = (
        <>
          {buyerProspectId ? null : (
            <PrepareFileLinks
              projectId={projectId}
              competitorId={competitorId}
              step={step}
              addressConfirmed={addressConfirmed}
              compact
            />
          )}
          {buyerLetterHref ? (
            <Link
              href={buyerLetterHref}
              target="_blank"
              className={`${btnSecondary} ${small}`}
              data-testid="buyer-letter-link"
            >
              {step === 'colleague'
                ? 'Préparer le dossier de collaboration'
                : 'Préparer le courrier'}
            </Link>
          ) : null}
        </>
      );
      break;
    case 'move': {
      const { move, label } = plan.main.move;
      main = (
        <button
          type="button"
          disabled={pending}
          className={`${btnSecondary} ${small}`}
          onClick={() => run(move)}
        >
          {label}
        </button>
      );
      break;
    }
    default:
      main = null;
  }

  return (
    <div className="flex flex-col gap-1.5 print:hidden" data-testid="prospecting-card-actions">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {main}
          {plan.link ? (
            <button
              type="button"
              disabled={pending}
              className={`${link} text-xs hover:underline disabled:opacity-50`}
              onClick={() => run(plan.link!.move)}
            >
              {plan.link.label}
            </button>
          ) : null}
        </div>
        <MoreMenu items={items} testId="prospecting-card-more" />
      </div>
      {addressOpen ? (
        <ConfirmAddressActions
          key={correcting ? 'correct' : 'confirm'}
          projectId={projectId}
          competitorId={competitorId}
          listingUrl={listingUrl}
          canAccept={canAcceptAddress}
          confirmed={addressConfirmed}
          buyerProspectId={buyerProspectId}
          startTyping={correcting}
          onDone={() => setAddressOpen(false)}
        />
      ) : null}
      {addressOpen ? (
        <button
          type="button"
          className={`${link} self-start text-xs hover:underline`}
          onClick={() => setAddressOpen(false)}
        >
          Fermer
        </button>
      ) : null}
      {opposing ? (
        <ConfirmDialog
          title="Ne plus solliciter cette adresse&#x202f;?"
          text="Elle sera bloquée pour toute l’agence, dans tous les dossiers&nbsp;: plus de courrier, plus de tournée. Ce geste ne s’annule pas d’ici."
          onCancel={() => setOpposing(false)}
        >
          <button type="button" disabled={pending} onClick={oppose} className={btnDanger}>
            Confirmer&nbsp;: ne plus solliciter
          </button>
        </ConfirmDialog>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-red-600 stage:text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
