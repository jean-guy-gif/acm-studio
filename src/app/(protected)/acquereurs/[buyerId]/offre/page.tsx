import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, card, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { legalIdentityGapsLabel } from '@/features/legal-identity/services/legal-identity';
import { OfferForm } from '@/features/purchase-offer/components/offer-form';
import { getOfferContext } from '@/features/purchase-offer/queries/get-offer-context';

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
      {context.agency == null ? (
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
              <p key={visit.visitId} className="text-sm text-zinc-700">
                {visit.label} : {visit.note}
              </p>
            ))
          )}
        </div>
      ) : (
        <OfferForm context={context} preselected={visite ?? null} />
      )}
    </div>
  );
}
