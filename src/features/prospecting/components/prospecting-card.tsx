import { competitorFacts } from '@/features/prospecting/services/competitor-facts';
import Link from 'next/link';

import { badgeBrand, badgeNeutral, badgeRejected, badgeSelected } from '@/components/ui/styles';
import { ConfirmAddressActions } from '@/features/competitor-locator/components/confirm-address-actions';
import { CompetitorMandateLine } from '@/features/competitor-mandate/components/competitor-mandate-line';
import type { ProspectingStep } from '@/features/competitor-mandate/services/mandate-columns';
import { PrepareFileLinks } from '@/features/prospecting-file/components/prepare-file-links';
import { OppositionButton } from '@/features/prospecting/components/opposition-button';
import { ProspectingStatusActions } from '@/features/prospecting/components/prospecting-status-actions';
import { cardCopy } from '@/features/prospecting/services/group-prospecting';
import { OPPOSED_MESSAGE, oppositionBadge } from '@/features/prospecting/services/opposition';
import { followUpDate, shortDate } from '@/features/prospecting/services/prospecting-status';
import type { ProspectingCard as Card } from '@/features/prospecting/types';

// Mission 86 — à qui s'adresser (M83), en badge court sur la carte.
export const STEP_BADGES: Record<ProspectingStep, { label: string; className: string }> = {
  colleague: { label: 'Exclusivité · appeler le confrère', className: badgeRejected },
  owner: { label: 'Propriétaire · aller sonner', className: badgeBrand },
  check: { label: 'À vérifier', className: badgeNeutral },
};

export { competitorFacts };

// Mission 86 — une carte de la page Prospection : l'adresse, à qui s'adresser, le concurrent,
// le geste du moment, et TOUJOURS le bien vendeur pour lequel on prospecte. Écran conseiller,
// jamais montré au vendeur.
// Mission 98 — une carte par BIEN : elle rappelle tous les biens vendeurs qui l'ont retenu, et
// son statut vaut pour toutes ses copies. L'adresse et le courrier sont ceux de la copie du bien
// vendeur filtré (le courrier compare NOTRE bien au sien), sinon de la copie de référence.
export function ProspectingCard({
  card,
  sellerId = null,
}: {
  card: Card;
  sellerId?: string | null;
}) {
  const { row: shared, sellers } = card;
  const { row, seller } = cardCopy(card, sellerId);
  const status = shared.status;
  const step = shared.step;
  const opposed = shared.opposedOn != null;
  const badge = STEP_BADGES[step];
  const facts = competitorFacts(row);
  const addressConfirmed = row.confirmed && row.address != null;
  const followUp = shared.handedAt ? shortDate(followUpDate(shared.handedAt)) : null;

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
        {shared.opposedOn != null ? (
          <span className={badgeRejected}>{oppositionBadge(shared.opposedOn)}</span>
        ) : (
          <span className={`${badge.className} whitespace-nowrap`}>{badge.label}</span>
        )}
        {status === 'meeting' ? (
          <span className={`${badgeSelected} whitespace-nowrap`}>
            RDV obtenu{shared.meetingAt ? ` · ${shortDate(shared.meetingAt)}` : ''}
          </span>
        ) : null}
        {status === 'mandate' ? (
          <span className={`${badgeSelected} whitespace-nowrap`}>
            Mandat rentré{shared.mandateAt ? ` · ${shortDate(shared.mandateAt)}` : ''}
          </span>
        ) : null}
        {status === 'declined' ? (
          <span className={`${badgeNeutral} whitespace-nowrap`}>
            Pas intéressé{shared.declinedAt ? ` · ${shortDate(shared.declinedAt)}` : ''}
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

      {status === 'handed' && shared.handedAt ? (
        <p className="text-xs text-zinc-500 stage:text-white/60">
          {step === 'colleague' ? 'Contacté' : 'Remis'} le {shortDate(shared.handedAt)}
          {followUp ? ` · relance conseillée le ${followUp}` : ''}
        </p>
      ) : null}

      {opposed ? (
        <p className="text-xs text-zinc-600 stage:text-white/70">
          {OPPOSED_MESSAGE}&nbsp;: ni courrier, ni tournée, dans aucun dossier de l’agence.
        </p>
      ) : (
        <>
          {/* ACM ne sait pas à qui s'adresser : le conseiller le dit ici (M83). */}
          {step === 'check' && (status === 'to_confirm' || status === 'ready') ? (
            <CompetitorMandateLine competitor={row.mandate} />
          ) : null}

          {/* Tant que l'adresse n'est pas confirmée : la confirmer, la localiser ou la saisir
              (M84). Mission 90 — et ensuite, « Corriger l'adresse » reste toujours disponible,
              même quand elle vient du Localisateur : un courrier ne part pas à une adresse
              fausse. */}
          {status !== 'declined' ? (
            <ConfirmAddressActions
              projectId={seller.projectId}
              competitorId={row.id}
              listingUrl={row.listingUrl}
              canAccept={row.canAcceptAddress}
              confirmed={addressConfirmed}
            />
          ) : null}

          {/* Prêt à envoyer — et, dès avant, la version confrère, qui n'attend pas l'adresse
              (M84). */}
          <div className="flex flex-wrap items-center gap-2">
            {status === 'ready' || (status === 'to_confirm' && step === 'colleague') ? (
              <PrepareFileLinks
                projectId={seller.projectId}
                competitorId={row.id}
                step={step}
                addressConfirmed={addressConfirmed}
                primary={status === 'ready'}
              />
            ) : null}
            <ProspectingStatusActions
              projectId={seller.projectId}
              competitorId={row.id}
              status={status}
              step={step}
              primary={status === 'handed' || status === 'meeting'}
            />
          </div>

          {/* « Ne plus solliciter » porte sur l'adresse : il attend qu'elle soit confirmée. */}
          {shared.confirmed && shared.address != null ? (
            <OppositionButton projectId={card.seller.projectId} competitorId={shared.id} />
          ) : null}
        </>
      )}

      <p className="border-t border-dashed border-zinc-200 pt-2 text-xs text-zinc-500 stage:border-white/10 stage:text-white/55">
        Pour&nbsp;:{' '}
        {sellers.map((item, index) => (
          <span key={item.projectId}>
            {index > 0 ? ' ; ' : ''}
            <Link
              href={`/builder/${item.projectId}`}
              className="font-semibold text-brand-deep hover:underline stage:text-brand"
            >
              {item.name}
            </Link>
            {item.label ? ` · ${item.label}` : ''}
          </span>
        ))}
      </p>
    </li>
  );
}
