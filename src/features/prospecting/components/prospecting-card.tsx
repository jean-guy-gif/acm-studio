import Link from 'next/link';

import { badgeBrand, badgeNeutral, badgeRejected, badgeSelected } from '@/components/ui/styles';
import { ConfirmAddressActions } from '@/features/competitor-locator/components/confirm-address-actions';
import { CompetitorMandateLine } from '@/features/competitor-mandate/components/competitor-mandate-line';
import type { ProspectingStep } from '@/features/competitor-mandate/services/mandate-columns';
import { PrepareFileLinks } from '@/features/prospecting-file/components/prepare-file-links';
import { ProspectingStatusActions } from '@/features/prospecting/components/prospecting-status-actions';
import { followUpDate, shortDate } from '@/features/prospecting/services/prospecting-status';
import type { ProspectingEntry } from '@/features/prospecting/types';
import { formatEuro, formatSquareMeters } from '@/lib/format';

// Mission 86 — à qui s'adresser (M83), en badge court sur la carte.
export const STEP_BADGES: Record<ProspectingStep, { label: string; className: string }> = {
  colleague: { label: 'Exclusivité · appeler le confrère', className: badgeRejected },
  owner: { label: 'Propriétaire · aller sonner', className: badgeBrand },
  check: { label: 'À vérifier', className: badgeNeutral },
};

// « Appartement · 3 p · 62 m² · 339 000 € · SeLoger » — chaque morceau tient sur sa ligne :
// un prix ne se coupe jamais.
export function competitorFacts(row: ProspectingEntry['row']): string[] {
  return [
    row.propertyType,
    row.roomsCount != null ? `${row.roomsCount} p` : null,
    row.surfaceArea != null ? formatSquareMeters(row.surfaceArea) : null,
    row.price != null ? formatEuro(row.price) : null,
    row.portal,
  ].filter((fact): fact is string => fact != null && fact !== '');
}

// Mission 86 — une carte de la page Prospection : l'adresse, à qui s'adresser, le concurrent,
// le geste du moment, et TOUJOURS le bien vendeur pour lequel on prospecte. Écran conseiller,
// jamais montré au vendeur.
export function ProspectingCard({ entry }: { entry: ProspectingEntry }) {
  const { row, seller } = entry;
  const badge = STEP_BADGES[row.step];
  const facts = competitorFacts(row);
  const addressConfirmed = row.confirmed && row.address != null;
  const followUp = row.handedAt ? shortDate(followUpDate(row.handedAt)) : null;

  return (
    <li
      data-testid="prospecting-card"
      className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3.5 text-sm stage:border-white/10 stage:bg-white/[0.04]"
    >
      <div className="flex flex-col gap-0.5">
        {row.address ? (
          <span className="leading-snug font-semibold text-zinc-900 stage:text-white">
            {row.address}
          </span>
        ) : (
          <span className="leading-snug font-semibold text-zinc-500 italic stage:text-white/60">
            Adresse non localisée
          </span>
        )}
        {row.label ? (
          <span className="text-xs text-zinc-500 stage:text-white/60">{row.label}</span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`${badge.className} whitespace-nowrap`}>{badge.label}</span>
        {row.status === 'meeting' ? (
          <span className={`${badgeSelected} whitespace-nowrap`}>
            RDV obtenu{row.meetingAt ? ` · ${shortDate(row.meetingAt)}` : ''}
          </span>
        ) : null}
        {row.status === 'mandate' ? (
          <span className={`${badgeSelected} whitespace-nowrap`}>
            Mandat rentré{row.mandateAt ? ` · ${shortDate(row.mandateAt)}` : ''}
          </span>
        ) : null}
        {row.status === 'declined' ? (
          <span className={`${badgeNeutral} whitespace-nowrap`}>
            Pas intéressé{row.declinedAt ? ` · ${shortDate(row.declinedAt)}` : ''}
          </span>
        ) : null}
      </div>

      {facts.length > 0 ? (
        <p className="flex flex-wrap gap-x-1.5 text-xs text-zinc-700 stage:text-white/80">
          {facts.map((fact, index) => (
            <span key={fact} className="whitespace-nowrap">
              {index > 0 ? '· ' : ''}
              {fact}
            </span>
          ))}
        </p>
      ) : null}

      {row.status === 'handed' && row.handedAt ? (
        <p className="text-xs text-zinc-500 stage:text-white/60">
          Remis le {shortDate(row.handedAt)}
          {followUp ? ` · relance conseillée le ${followUp}` : ''}
        </p>
      ) : null}

      {/* ACM ne sait pas à qui s'adresser : le conseiller le dit ici (M83). */}
      {row.step === 'check' && (row.status === 'to_confirm' || row.status === 'ready') ? (
        <CompetitorMandateLine competitor={row.mandate} />
      ) : null}

      {/* Tant que l'adresse n'est pas confirmée : la confirmer, la localiser ou la saisir (M84). */}
      {row.status === 'to_confirm' ? (
        <ConfirmAddressActions
          projectId={seller.projectId}
          competitorId={row.id}
          listingUrl={row.listingUrl}
          canAccept={row.canAcceptAddress}
          confirmed={addressConfirmed}
          confirmedByAdvisor={row.confirmedByAdvisor}
        />
      ) : null}

      {/* Prêt à envoyer — et, dès avant, la version confrère, qui n'attend pas l'adresse (M84). */}
      <div className="flex flex-wrap items-center gap-2">
        {row.status === 'ready' || (row.status === 'to_confirm' && row.step === 'colleague') ? (
          <PrepareFileLinks
            projectId={seller.projectId}
            competitorId={row.id}
            step={row.step}
            addressConfirmed={addressConfirmed}
            primary={row.status === 'ready'}
          />
        ) : null}
        <ProspectingStatusActions
          projectId={seller.projectId}
          competitorId={row.id}
          status={row.status}
          primary={row.status === 'handed' || row.status === 'meeting'}
        />
      </div>

      <p className="border-t border-dashed border-zinc-200 pt-2 text-xs text-zinc-500 stage:border-white/10 stage:text-white/55">
        Pour&nbsp;:{' '}
        <Link
          href={`/builder/${seller.projectId}`}
          className="font-semibold text-brand-deep hover:underline stage:text-brand"
        >
          {seller.name}
        </Link>
        {seller.label ? ` · ${seller.label}` : ''}
      </p>
    </li>
  );
}
