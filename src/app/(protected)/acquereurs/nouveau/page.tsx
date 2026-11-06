import type { Metadata } from 'next';
import Link from 'next/link';

import { backLink, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { BuyerForm } from '@/features/buyers/components/buyer-form';
import { BuyerQuickForm } from '@/features/buyers/components/buyer-quick-form';
import { getAgencyCities } from '@/features/buyers/queries/get-agency-cities';
import { criteriaToBuyerDraft } from '@/features/buyers/services/buyer-criteria';

export const metadata: Metadata = { title: 'Nouvel acquéreur — ACM Studio' };

type NewBuyerPageProps = {
  searchParams: Promise<{
    type?: string;
    communes?: string;
    pieces?: string;
    surface?: string;
    budget?: string;
  }>;
};

const num = (value: string | undefined): number | null => {
  if (!value) return null;
  const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

// Mission 117 — une fiche neuve ; depuis le rapprochement du Suivi (« Enregistrer cette
// recherche »), elle arrive pré-remplie de ses critères, à nommer avant d'enregistrer.
// Mission 132 — sinon, la saisie rapide : un écran, en sortant d'un appel ; le reste se complète
// sur la fiche. Le rapprochement garde le formulaire complet (ses pièces et sa surface).
export default async function NewBuyerPage({ searchParams }: NewBuyerPageProps) {
  const params = await searchParams;
  const fromSearch = Object.values(params).some((value) => value != null && value !== '');
  const draft = fromSearch
    ? criteriaToBuyerDraft({
        propertyType: params.type?.trim() || null,
        city: params.communes?.trim() || null,
        roomsCount: num(params.pieces),
        surfaceArea: num(params.surface),
        budgetMin: null,
        budgetMax: num(params.budget),
      })
    : undefined;

  return (
    <div className="flex max-w-3xl flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href="/acquereurs" className={backLink}>
          ← Acquéreurs
        </Link>
        <span className={kickerLabel}>Acquéreurs</span>
        <h1 className={pageTitle}>Nouvel acquéreur</h1>
        <p className={pageSubtitle}>
          {fromSearch
            ? 'Les critères du rapprochement sont posés : nommez l’acquéreur, puis enregistrez.'
            : 'Qui il est, ce qu’il cherche, en quelques gestes ; le reste se complète plus tard.'}
        </p>
      </div>
      {fromSearch ? (
        <BuyerForm buyer={null} draft={draft} />
      ) : (
        <BuyerQuickForm cities={await getAgencyCities()} />
      )}
    </div>
  );
}
