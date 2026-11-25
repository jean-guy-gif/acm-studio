import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { backLink, kickerLabel, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { getBuyer } from '@/features/buyers/queries/get-buyers';
import { readSeenProperties } from '@/features/buyers/queries/read-seen-properties';
import { currentSeenReason, seenKeysOf } from '@/features/buyers/services/seen-properties';
import { readVisitLines } from '@/features/buyer-presentation/queries/get-visit-requests';
import { getBuyerFollowUpRows } from '@/features/buyers/queries/get-buyer-follow-up';
import { buyerFollowUp, seenWithHim } from '@/features/buyers/services/buyer-follow-up';
import { buyerToCriteria } from '@/features/buyers/services/buyer-criteria';
import { streamEstateApiKey } from '@/features/competitor-search/services/stream-estate-config';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { IdealPropertiesPanel } from '@/features/ideal-properties/components/ideal-properties-panel';
import { getIdealSelection } from '@/features/ideal-properties/queries/get-ideal-selection';
import { selectionAsInputs } from '@/features/ideal-properties/services/ideal-selection';
import { selectionKey } from '@/features/ideal-properties/services/ideal-page';
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
import { getPosedAiCap } from '@/features/ai-budget/queries/get-ai-budgets';
import { notesReadingOpen } from '@/features/buyer-notes/services/reading-gate';
import { BUYER_GROUPS } from '@/features/meeting-conclusion/services/buyer-reconciliation';
import { rankingCriteria } from '@/features/soft-ranking/ranking-request';
import { agencyRankingListings } from '@/features/soft-ranking/server/agency-listings';
import { SOFT_SHORT_LABELS, softMentions } from '@/features/soft-ranking/services/judgments';
import { watchReasonsOf } from '@/features/buyer-watch/services/watch-finds';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import { getBuyerWatchFinds } from '@/features/buyer-watch/queries/get-watch';
import { findAsCandidate } from '@/features/buyer-watch/services/watch-finds';
import { categorizeIdeal } from '@/features/ideal-properties/services/categorize-ideal';
import { idealAgencyCandidates } from '@/features/ideal-properties/services/ideal-agency';
import { getMandateCondominiums } from '@/features/buyers/queries/get-mandate-condominiums';
import { projectsUnderOffer } from '@/features/buyers/services/proposable';
import { getAgencyOfferAnswers } from '@/features/purchase-offer/queries/get-offer-answers';
import { IDEAL_CATEGORIES } from '@/features/ideal-properties/types';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';

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
  const supabase = await createClient();
  const signedIds = dossiers
    .filter((dossier) => dossier.conclusion?.outcome === 'signed')
    .map((dossier) => dossier.project.id);
  const [
    { cards },
    selection,
    demo,
    watchRun,
    seenRead,
    offers,
    condominiums,
    followUpRows,
    visitRead,
  ] = await Promise.all([
    getAgencyProspecting(dossiers),
    getIdealSelection(buyer.id),
    isDemoAgency(profile.agency_id),
    // Mission 136 — ce que la veille a trouvé cette semaine, en tête.
    getBuyerWatchFinds(profile.agency_id, buyer.id),
    // Mission 139 — les biens écartés pour lui : ils ne s'affichent plus. Lancement, mission 3 —
    // ni ceux qu'il a déjà reçus, visités ou refusés.
    readSeenProperties(supabase, profile.agency_id, buyer.id),
    // Mission 145 (partie A) — un mandat sous offre acceptée ne se propose plus.
    getAgencyOfferAnswers(supabase, profile.agency_id),
    // Mission 151 — la copropriété connue des mandats, seulement s'il n'en veut pas.
    buyer.condominiumAccepted === false
      ? getMandateCondominiums(profile.agency_id, signedIds)
      : Promise.resolve(new Map<string, boolean>()),
    // Lancement, mission 3 (suite) — « Déjà vus avec lui » : les lignes de « Son suivi ».
    getBuyerFollowUpRows(supabase, profile.agency_id, buyer.id),
    readVisitLines(),
  ]);
  // Une lecture des offres en échec ne propose aucun mandat (M98) : les concurrents restent.
  const underOffer = offers == null ? new Set(signedIds) : projectsUnderOffer(offers);
  const agency = reconcileBuyer(
    buyerToCriteria(buyer),
    idealAgencyCandidates(
      buyerCandidates(
        dossiers,
        cards
          .filter((card) => card.row.opposedOn == null)
          .map(({ row, seller }) => ({ row, seller })),
        condominiums,
      ),
      underOffer,
    ),
  );
  // Ce qu'il a déjà vu ; null : la lecture a échoué (M98).
  const seenFacts = seenRead ? seenKeysOf(seenRead.seen, buyer.id) : null;
  // Lancement, mission 3 (suite, Jean-Guy, 25/11) — une sélection qu'il a reçue (présentée, lien
  // partagé, envoi noté) n'est plus « actuelle » : rien n'est coché en arrivant (0/3), ses biens
  // passent sous « Déjà vus avec lui ». « Sélection actuelle » ne reste que pour une sélection
  // retenue qu'il n'a pas encore reçue, encore à présenter.
  const received = selection != null && seenRead?.receivedAt(selection.id) != null;
  const current = selection && !received ? selection.items : [];
  // Ce qu'il a dit de chacun des biens de cette sélection en cours (refusé, écarté, visité).
  const currentSeen = Object.fromEntries(
    current.flatMap((item) => {
      const key = seenRead?.keyOf(item);
      const reason = currentSeenReason(
        key ? seenRead?.seen.get(buyer.id)?.get(key)?.reason : undefined,
      );
      return reason ? [[selectionKey(item), reason]] : [];
    }),
  );
  const currentKeys = new Set(current.map((item) => seenRead?.keyOf(item) ?? null));
  // « Déjà vus avec lui » : ce qu'il a reçu, visité ou refusé, chaque bien avec sa mention ; null :
  // la lecture a échoué, l'écran le dit (M98).
  const ownVisits = visitRead.lines.filter((line) => line.buyerId === buyer.id);
  const seenList =
    followUpRows && !visitRead.failed
      ? seenWithHim(
          buyerFollowUp({
            ...followUpRows,
            visits: ownVisits.map((line) => ({
              id: line.id,
              itemId: line.itemId,
              requestedAt: line.requestedAt,
              visitedAt: line.visitedAt,
              opinion: line.report?.opinion ?? null,
              outcome: line.outcome,
            })),
          }),
          ownVisits,
          // Un bien de la sélection en cours a déjà sa ligne dans le bandeau.
        ).filter((line) => !currentKeys.has(line.key))
      : null;
  const deduced = idealSearchCriteria(buyer);
  const watchCategorized =
    watchRun != null
      ? categorizeIdeal(
          buyer,
          watchRun.finds.map(findAsCandidate),
          deduced.ok ? deduced.criteria : null,
        )
      : null;
  const watch =
    watchRun != null && watchCategorized != null
      ? {
          seenOn: parisDay(new Date(watchRun.ranAt)),
          entries: IDEAL_CATEGORIES.flatMap((category) => watchCategorized.byCategory[category]),
        }
      : null;
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

  // Mission 151 (partie B) — ce qui compte pour eux : les critères doux de la fiche ; la porte de
  // la lecture par l'IA (le plafond posé de l'agence) ; avant la recherche, les mots trouvés dans
  // les biens de l'agence, sans IA ni dépense (planche 4 b).
  const softCriteria = rankingCriteria(buyer.softCriteria.map((soft) => soft.key));
  const softOpen = notesReadingOpen({
    isDemo: demo,
    email: profile.email,
    agencyCapCents: await getPosedAiCap(profile.agency_id),
  });
  const agencyKeys = BUYER_GROUPS.flatMap((group) =>
    agency.matches[group].map((hit) => hit.candidate.key),
  );
  const agencyMentions =
    softCriteria.length > 0
      ? Object.fromEntries(
          (await agencyRankingListings(profile.agency_id, agencyKeys)).map((listing) => [
            listing.key,
            softMentions(listing, softCriteria),
          ]),
        )
      : {};

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
      <IdealPropertiesPanel
        current={selection ? selectionAsInputs({ ...selection, items: current }) : []}
        presented={selection?.presentedAt != null}
        buyerId={buyer.id}
        agency={agency}
        marketReady={marketBlocked == null}
        marketBlocked={marketBlocked}
        budgetWarning={budgetWarning}
        watch={watch}
        dismissed={
          seenFacts
            ? seenFacts.filter((fact) => fact.reason === 'dismissed').map((fact) => fact.key)
            : null
        }
        seen={(seenFacts ?? []).flatMap((fact) =>
          fact.reason === 'dismissed' ? [] : [{ key: fact.key, reason: fact.reason }],
        )}
        currentSeen={currentSeen}
        seenMarks={seenRead ? seenRead.marks(buyer.id) : []}
        seenList={seenList}
        mandatesUnread={offers == null}
        buyerName={buyer.name}
        budgetMax={buyer.budgetMax}
        savedItemIds={Object.fromEntries(
          (selection?.items ?? []).map((item) => [selectionKey(item), item.id]),
        )}
        softLabels={softCriteria.map((key) => SOFT_SHORT_LABELS[key])}
        softOpen={softOpen}
        agencyMentions={agencyMentions}
        watchReasons={watchRun != null ? watchReasonsOf(watchRun.finds) : {}}
      />
    </div>
  );
}
