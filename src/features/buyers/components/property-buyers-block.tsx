import Link from 'next/link';

import {
  btnPrimary,
  btnSecondary,
  card,
  hintText,
  link,
  sectionTitle,
} from '@/components/ui/styles';
import { buyerBudgetLabel, buyerCitiesLabel } from '@/features/buyers/services/buyer-criteria';
import { READY_LABEL } from '@/features/buyers/services/buyer-readiness';
import { proposeHref } from '@/features/meeting-conclusion/services/suivi-step-labels';
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
// rendez-vous » : la porte vendeur → acquéreurs de la boucle, pour le conseiller seul. Mission 134 —
// « Proposer ce bien aux acquéreurs » ouvre l'envoi en série (un seul chemin, un seul fait noté) ;
// Mission 145 — sur un mandat signé sans offre acceptée seulement (jamais un vendeur à relancer).
export function PropertyBuyersBlock({
  result,
  proposeKey,
  followUp = null,
}: {
  // null : une lecture a échoué (jamais lu comme « aucun acquéreur », M98).
  result: PropertyBuyers | null;
  // La clé du bien dans la boucle, quand il se propose (mandat signé sans offre acceptée).
  proposeKey: string | null;
  // Mission 145 — un vendeur à relancer : pas de mandat, donc pas de proposition ; l'argument et le
  // geste de relance (M130 A) à la place de « Proposer ce bien aux acquéreurs ».
  followUp?: { sellerName: string; href: string } | null;
}) {
  const ready = result?.ready.length ?? 0;
  const headline = result
    ? followUp && ready > 0
      ? ready > 1
        ? `${ready} acquéreurs prêts correspondent à ce bien`
        : '1 acquéreur prêt correspond à ce bien'
      : propertyBuyersHeadline(ready, result.others.length)
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
            <BuyerLine key={entry.buyer.id} entry={entry} />
          ))}
        </ul>
      ) : null}
      {result && result.price != null && followUp && ready > 0 ? (
        <>
          <p
            className="text-sm text-zinc-600 stage:text-white/70"
            data-testid="property-buyers-mandate"
          >
            Rentrez le mandat pour pouvoir le proposer.
          </p>
          <Link
            href={followUp.href}
            className={`${btnPrimary} self-start`}
            data-testid="property-buyers-relance"
          >
            Relancer {followUp.sellerName}
          </Link>
        </>
      ) : null}
      {result && result.price != null && headline && proposeKey ? (
        <Link
          href={proposeHref(proposeKey)}
          className={`${btnSecondary} self-start`}
          data-testid="propose-property"
        >
          Proposer ce bien aux acquéreurs
        </Link>
      ) : null}
      {result && result.price != null && headline ? (
        <p className={hintText}>
          Prêts à visiter : financement validé, un échange il y a moins de 30 jours, un budget.
        </p>
      ) : null}
    </section>
  );
}

function BuyerLine({ entry }: { entry: PropertyBuyer }) {
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
    </li>
  );
}
