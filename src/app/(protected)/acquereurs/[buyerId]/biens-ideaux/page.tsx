import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  backLink,
  btnPrimary,
  btnSecondary,
  card,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { getBuyer } from '@/features/buyers/queries/get-buyers';
import { buyerToCriteria } from '@/features/buyers/services/buyer-criteria';
import { streamEstateApiKey } from '@/features/competitor-search/services/stream-estate-config';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { IdealPropertiesPanel } from '@/features/ideal-properties/components/ideal-properties-panel';
import { IdealSelectionList } from '@/features/ideal-properties/components/ideal-selection-list';
import { getIdealSelection } from '@/features/ideal-properties/queries/get-ideal-selection';
import { selectionAsInputs } from '@/features/ideal-properties/services/ideal-selection';
import {
  IDEAL_CRITERIA_MESSAGES,
  idealSearchCriteria,
} from '@/features/ideal-properties/services/ideal-criteria';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  buyerCandidates,
  reconcileBuyer,
} from '@/features/meeting-conclusion/services/buyer-reconciliation';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import { getSearchBudget } from '@/features/search-budget/queries/get-search-budget';
import { budgetWarningLabel } from '@/features/search-budget/services/budget';
import { isManagerRole } from '@/features/team/services/role';
import { withoutExamples } from '@/features/welcome/services/example-exclusion';
import { getProfile } from '@/lib/auth/get-profile';

export const metadata: Metadata = { title: 'Biens idéaux — ACM Studio' };

type Props = { params: Promise<{ buyerId: string }> };

// Mission 118 (partie B) — « Trouver les biens idéaux » pour un acquéreur, écran du conseiller :
// l'agence d'abord (le rapprochement M86, calculé ici), puis le marché (payant, lancé depuis
// l'écran), puis la sélection. Une fiche archivée est introuvable : un acquéreur archivé ne
// cherche plus.
export default async function IdealPropertiesPage({ params }: Props) {
  const { buyerId } = await params;
  const [buyer, profile] = await Promise.all([getBuyer(buyerId), getProfile()]);
  if (!buyer || !profile) notFound();

  const dossiers = withoutExamples(await getSuiviDossiers());
  const [{ cards }, selection, demo] = await Promise.all([
    getAgencyProspecting(dossiers),
    getIdealSelection(buyer.id),
    isDemoAgency(profile.agency_id),
  ]);
  const agency = reconcileBuyer(
    buyerToCriteria(buyer),
    buyerCandidates(
      dossiers,
      cards
        .filter((card) => card.row.opposedOn == null)
        .map(({ row, seller }) => ({ row, seller })),
    ),
  );
  const deduced = idealSearchCriteria(buyer);
  const marketAvailable = demo || streamEstateApiKey() != null;
  const marketBlocked = !deduced.ok
    ? IDEAL_CRITERIA_MESSAGES[deduced.reason]
    : !marketAvailable
      ? 'La recherche du marché n’est pas activée : prévenez l’équipe ACM Studio.'
      : null;
  // Mission 100 — l'avertissement de budget, pour le manager seulement, hors démo.
  const budget =
    !demo && isManagerRole(profile.role) ? await getSearchBudget(profile.agency_id) : null;
  const budgetWarning = budget?.ok ? budgetWarningLabel(budget.budget) : null;

  return (
    <div className="flex max-w-4xl flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2">
        <Link href={`/acquereurs/${buyer.id}`} className={backLink}>
          ← {buyer.name}
        </Link>
        <span className={kickerLabel}>Acquéreur</span>
        <h1 className={pageTitle} data-testid="ideal-title">
          Les biens idéaux de {buyer.name}
        </h1>
        <p className={pageSubtitle}>
          Ce que l’agence a déjà, puis le marché en trois catégories ; retenez jusqu’à trois biens.
          Cet écran est pour vous : le dossier remis à l’acquéreur viendra ensuite.
        </p>
      </div>
      {/* Essai de Jean-Guy (26/10) : la sélection actuelle, et ce qui la suit. */}
      {selection && selection.items.length > 0 ? (
        <section
          className={`${card} flex flex-wrap items-center justify-between gap-3 p-5`}
          data-testid="ideal-current"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
              Sélection actuelle :{' '}
              {selection.items.map((_, index) => String.fromCharCode(65 + index)).join(', ')}
            </span>
            <span className="text-sm text-zinc-600 stage:text-white/70">
              Elle est cochée ci-dessous ; « Retenir » ne s’active que si vous la changez.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/presentation/${buyer.id}`} className={btnPrimary}>
              {selection.presentedAt ? 'Revoir la présentation' : 'Présenter'}
            </Link>
            <Link href={`/acquereurs/${buyer.id}/dossier`} className={btnSecondary}>
              Dossier acquéreur
            </Link>
          </div>
        </section>
      ) : null}
      {selection ? <IdealSelectionList selection={selection} /> : null}
      <IdealPropertiesPanel
        current={selection ? selectionAsInputs(selection) : []}
        buyerId={buyer.id}
        agency={agency}
        marketReady={marketBlocked == null}
        marketBlocked={marketBlocked}
        budgetWarning={budgetWarning}
      />
    </div>
  );
}
