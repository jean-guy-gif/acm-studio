import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, card, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { legalIdentityGapsLabel } from '@/features/legal-identity/services/legal-identity';
import { OfferForm } from '@/features/purchase-offer/components/offer-form';
import { OfferModeQuestion } from '@/features/purchase-offer/components/offer-mode-question';
import { OfferSwitchButton } from '@/features/purchase-offer/components/offer-switch';
import { getOfferContext } from '@/features/purchase-offer/queries/get-offer-context';
import { OFFER_LOAN_BLOCKED, offerGate } from '@/features/purchase-offer/services/offer-gate';
import { OFFRE_AVEC_PRET_VALIDEE } from '@/features/purchase-offer/services/offer-text';

export const metadata: Metadata = { title: 'Offre d’achat — ACM Studio' };

type Props = {
  params: Promise<{ buyerId: string }>;
  searchParams: Promise<{ visite?: string }>;
};

// Mission 137 (partie B) — l'offre d'achat d'un acquéreur : un seul écran, après une visite « Offre
// envisagée » d'un bien en mandat signé. Identité légale incomplète : l'écran dit ce qui manque et
// mène à Identité ; aucune offre ne se produit.
export default async function OfferPage({ params, searchParams }: Props) {
  const [{ buyerId }, { visite }] = await Promise.all([params, searchParams]);
  const read = await getOfferContext(buyerId);
  if (!read.ok) {
    if (read.error === 'Fiche introuvable.') notFound();
    return (
      <p role="alert" className="text-sm font-semibold text-red-700">
        {read.error}
      </p>
    );
  }
  const { context } = read;
  const eligible = context.visits.filter((visit) => visit.eligible);
  // Correctif du 13/11 — les visites faites qui peuvent passer en « Offre envisagée ».
  const switchable = context.visits.filter((visit) => visit.switchable);
  // Lot B (Jean-Guy, 27/11) — comment il finance, d'abord : pas encore dit, la question ; avec prêt,
  // le message ; comptant, l'offre d'aujourd'hui. La signature le relit au serveur.
  const gate = offerGate({
    mode: context.buyer.financingMode,
    toVerify: context.buyer.modeToVerify,
    loanClauseValidated: OFFRE_AVEC_PRET_VALIDEE,
  });
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={`/acquereurs/${context.buyer.id}`} className={backLink}>
          ← {context.buyer.name}
        </Link>
        <span className={kickerLabel}>Acquéreur</span>
        <h1 className={pageTitle}>Offre d’achat</h1>
        <p className={pageSubtitle}>
          Signée au doigt par les offrants, puis envoyée au vendeur, qui l’accepte en signant.
        </p>
      </div>
      {gate.kind === 'ask' ? (
        <OfferModeQuestion buyerId={context.buyer.id} mode={gate.mode} toVerify={gate.toVerify} />
      ) : gate.kind === 'blocked' ? (
        <div className={`${card} flex flex-col gap-2 p-5`} data-testid="offer-loan-blocked">
          <p className="text-sm font-semibold text-amber-800">{OFFER_LOAN_BLOCKED}</p>
        </div>
      ) : context.agency == null ? (
        <div className={`${card} flex flex-col gap-2 p-5`} data-testid="offer-gaps">
          <p className="text-sm font-semibold text-amber-800">
            {legalIdentityGapsLabel(context.gaps)}
          </p>
          <Link
            href="/admin/identite"
            className="text-sm font-semibold text-brand-darker underline"
          >
            Compléter l’identité légale
          </Link>
        </div>
      ) : eligible.length === 0 ? (
        <div className={`${card} flex flex-col gap-2 p-5`} data-testid="offer-none">
          {context.visits.length === 0 ? (
            <p className="text-sm text-zinc-700">Aucune visite pour cet acquéreur.</p>
          ) : (
            context.visits.map((visit) => (
              <div key={visit.visitId} className="flex flex-col gap-2" data-testid="offer-visit">
                <p className="text-sm text-zinc-700">
                  {visit.label}&nbsp;: {visit.note}
                </p>
                {visit.switchable ? (
                  <OfferSwitchButton
                    buyerId={context.buyer.id}
                    visitId={visit.visitId}
                    primary={visit.visitId === switchable[0]?.visitId}
                  />
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {switchable.length > 0 ? (
            <div className={`${card} flex flex-col gap-3 p-5`} data-testid="offer-switchable">
              <p className="text-sm font-semibold text-zinc-800">
                Une offre sur une autre visite&#x202f;?
              </p>
              {switchable.map((visit) => (
                <div key={visit.visitId} className="flex flex-col gap-2" data-testid="offer-visit">
                  <p className="text-sm text-zinc-700">
                    {visit.label}&nbsp;: {visit.note}
                  </p>
                  <OfferSwitchButton
                    buyerId={context.buyer.id}
                    visitId={visit.visitId}
                    primary={false}
                  />
                </div>
              ))}
            </div>
          ) : null}
          {/* La visite choisie par l'adresse : le formulaire repart d'elle quand elle change. */}
          <OfferForm key={visite ?? ''} context={context} preselected={visite ?? null} />
        </>
      )}
    </div>
  );
}
