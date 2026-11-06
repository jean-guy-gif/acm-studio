import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, card, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { VoucherForm } from '@/features/visit-voucher/components/voucher-form';
import { getVoucherContext } from '@/features/visit-voucher/queries/get-voucher-context';
import { legalIdentityGapsLabel } from '@/features/legal-identity/services/legal-identity';

export const metadata: Metadata = { title: 'Bon de visite — ACM Studio' };

type Props = {
  params: Promise<{ buyerId: string }>;
  searchParams: Promise<{ visite?: string }>;
};

// Mission 137 — le bon de visite d'un acquéreur, sur la tablette ou le téléphone du conseiller :
// les biens visités, le visiteur, « Lu et approuvé », la signature au doigt. Identité légale de
// l'agence incomplète : l'écran dit ce qui manque et mène à Identité ; aucun bon ne se produit.
export default async function VoucherPage({ params, searchParams }: Props) {
  const [{ buyerId }, { visite }] = await Promise.all([params, searchParams]);
  const read = await getVoucherContext(buyerId);
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
        <h1 className={pageTitle}>Bon de visite</h1>
        <p className={pageSubtitle}>
          Signé au doigt par le visiteur, gardé sur la fiche, envoyé par un lien.
        </p>
      </div>
      {context.agency == null ? (
        <div className={`${card} flex flex-col gap-2 p-5`} data-testid="voucher-gaps">
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
      ) : context.visits.length === 0 ? (
        <p className="text-sm text-zinc-600">Aucune visite pour cet acquéreur.</p>
      ) : eligible.length === 0 ? (
        <div className={`${card} flex flex-col gap-2 p-5`} data-testid="voucher-none">
          {context.visits.map((visit) => (
            <p key={visit.visitId} className="text-sm text-zinc-700">
              {visit.label} : {visit.note}
            </p>
          ))}
        </div>
      ) : (
        <VoucherForm context={context} preselected={visite ?? null} />
      )}
    </div>
  );
}
