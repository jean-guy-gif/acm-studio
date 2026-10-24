import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  alertOk,
  backLink,
  btnPrimary,
  btnSecondary,
  card,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { BuyerArchiveButton } from '@/features/buyers/components/buyer-archive-button';
import { BuyerForm } from '@/features/buyers/components/buyer-form';
import { BuyerStatusActions } from '@/features/buyers/components/buyer-status-actions';
import { getBuyer } from '@/features/buyers/queries/get-buyers';
import { buyerDateLabel } from '@/features/buyers/services/buyer-criteria';
import { IdealSelectionList } from '@/features/ideal-properties/components/ideal-selection-list';
import { getIdealSelection } from '@/features/ideal-properties/queries/get-ideal-selection';

export const metadata: Metadata = { title: 'Fiche acquéreur — ACM Studio' };

type BuyerPageProps = {
  params: Promise<{ buyerId: string }>;
  searchParams: Promise<{ enregistre?: string }>;
};

// Mission 117 — la fiche d'un acquéreur : son statut, « Rapprocher » (le rapprochement du Suivi,
// pré-rempli, M86), la fiche à modifier, « Archiver ». Une fiche archivée ou d'une autre agence
// est introuvable (M93). Mission 118 — « Trouver les biens idéaux » et la sélection retenue.
export default async function BuyerPage({ params, searchParams }: BuyerPageProps) {
  const [{ buyerId }, { enregistre }] = await Promise.all([params, searchParams]);
  const buyer = await getBuyer(buyerId);
  if (!buyer) notFound();
  // Mission 118 — la dernière sélection de biens idéaux, si elle existe.
  const selection = await getIdealSelection(buyer.id);

  return (
    <div className="flex max-w-3xl flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/acquereurs" className={backLink}>
          ← Acquéreurs
        </Link>
        <span className={kickerLabel}>Acquéreur</span>
        <h1 className={pageTitle} data-testid="buyer-name">
          {buyer.name}
        </h1>
        <p className={pageSubtitle}>
          Fiche créée le {buyerDateLabel(buyer.createdAt)} · modifiée le{' '}
          {buyerDateLabel(buyer.updatedAt)}
        </p>
      </div>

      {enregistre ? (
        <p role="status" className={alertOk}>
          Fiche enregistrée.
        </p>
      ) : null}

      <section className={`${card} flex flex-wrap items-center justify-between gap-4 p-5`}>
        <BuyerStatusActions buyer={buyer} />
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/acquereurs/${buyer.id}/biens-ideaux`}
            className={selection ? btnSecondary : btnPrimary}
          >
            Trouver les biens idéaux
          </Link>
          {selection ? (
            <Link
              href={`/presentation/${buyer.id}`}
              className={btnPrimary}
              data-testid="present-selection"
            >
              {selection.presentedAt ? 'Revoir la présentation' : 'Présenter la sélection'}
            </Link>
          ) : null}
          {selection ? (
            <Link
              href={`/acquereurs/${buyer.id}/dossier`}
              className={btnSecondary}
              data-testid="buyer-dossier"
            >
              Dossier acquéreur
            </Link>
          ) : null}
          <Link href={`/suivi?acquereur=${buyer.id}#rapprochement`} className={btnSecondary}>
            Rapprocher
          </Link>
          <BuyerArchiveButton buyerId={buyer.id} name={buyer.name} />
        </div>
      </section>

      {selection ? <IdealSelectionList selection={selection} /> : null}

      <BuyerForm buyer={buyer} />
    </div>
  );
}
