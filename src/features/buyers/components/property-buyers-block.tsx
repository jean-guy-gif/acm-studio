import Link from 'next/link';

import { card, hintText, link, sectionTitle } from '@/components/ui/styles';
import { ProposeLinkButton } from '@/features/buyers/components/propose-link-button';
import { buyerBudgetLabel, buyerCitiesLabel } from '@/features/buyers/services/buyer-criteria';
import { READY_LABEL } from '@/features/buyers/services/buyer-readiness';
import {
  BUYERS_UNREAD,
  NO_MATCHING_BUYER,
  NO_REFERENCE_PRICE,
  PROPERTY_BUYER_MISSING_LABELS,
  propertyBuyersHeadline,
  type PropertyBuyer,
  type PropertyBuyers,
} from '@/features/buyers/services/property-buyers';

export const PROPERTY_BUYERS_ANCHOR = 'acquereurs';

// Mission 133 — « Acquéreurs de l'agence pour ce bien », sur la Vue d'ensemble et « Avant le
// rendez-vous » : la porte vendeur → acquéreurs de la boucle, pour le conseiller seul. Sur un
// mandat signé, chacun reçoit « Envoyer le lien » (le dossier acquéreur avec ce bien en tête).
export function PropertyBuyersBlock({
  result,
  projectId,
  canPropose,
  advisorFirstName,
}: {
  // null : une lecture a échoué (jamais lu comme « aucun acquéreur », M98).
  result: PropertyBuyers | null;
  projectId: string;
  canPropose: boolean;
  advisorFirstName: string | null;
}) {
  const headline = result
    ? propertyBuyersHeadline(result.ready.length, result.others.length)
    : null;
  return (
    <section
      id={PROPERTY_BUYERS_ANCHOR}
      className={`${card} flex scroll-mt-6 flex-col gap-3 p-5`}
      data-testid="property-buyers"
    >
      <div className="flex flex-col gap-1">
        <h2 className={sectionTitle}>Acquéreurs de l’agence pour ce bien</h2>
        <p
          className="text-sm font-semibold text-zinc-700 stage:text-white/80"
          data-testid="property-buyers-headline"
        >
          {result == null
            ? BUYERS_UNREAD
            : result.price == null
              ? NO_REFERENCE_PRICE
              : (headline ?? NO_MATCHING_BUYER)}
        </p>
      </div>
      {result && result.price != null && headline ? (
        <ul className="flex flex-col">
          {[...result.ready, ...result.others].map((entry) => (
            <BuyerLine
              key={entry.buyer.id}
              entry={entry}
              projectId={projectId}
              canPropose={canPropose}
              advisorFirstName={advisorFirstName}
            />
          ))}
        </ul>
      ) : null}
      {result && result.price != null && headline ? (
        <p className={hintText}>
          Prêts à visiter : financement validé, un échange il y a moins de 30 jours, un budget.
        </p>
      ) : null}
    </section>
  );
}

function BuyerLine({
  entry,
  projectId,
  canPropose,
  advisorFirstName,
}: {
  entry: PropertyBuyer;
  projectId: string;
  canPropose: boolean;
  advisorFirstName: string | null;
}) {
  const { buyer } = entry;
  const budget = buyerBudgetLabel(buyer);
  return (
    <li
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-zinc-100 py-2.5 first:border-0 stage:border-white/10"
      data-testid="property-buyer"
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <Link href={`/acquereurs/${buyer.id}`} className={`${link} font-semibold`}>
          {buyer.name}
        </Link>
        <span className="text-sm text-zinc-500 stage:text-white/60">
          {[buyerCitiesLabel(buyer), budget].filter(Boolean).join(' · ')}
        </span>
      </span>
      {entry.ready ? (
        <span
          className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 stage:bg-emerald-500/15 stage:text-emerald-200"
          data-testid="property-buyer-ready"
        >
          {READY_LABEL}
        </span>
      ) : entry.missing ? (
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600 stage:bg-white/10 stage:text-white/70">
          {PROPERTY_BUYER_MISSING_LABELS[entry.missing]}
        </span>
      ) : null}
      {canPropose ? (
        <ProposeLinkButton
          buyerId={buyer.id}
          buyerName={buyer.name}
          projectId={projectId}
          advisorFirstName={advisorFirstName}
        />
      ) : null}
    </li>
  );
}
