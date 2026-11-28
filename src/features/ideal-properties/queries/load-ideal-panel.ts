import 'server-only';

import { getPosedAiCap } from '@/features/ai-budget/queries/get-ai-budgets';
import { notesReadingOpen } from '@/features/buyer-notes/services/reading-gate';
import { readVisitLines } from '@/features/buyer-presentation/queries/get-visit-requests';
import { getBuyerWatchFinds } from '@/features/buyer-watch/queries/get-watch';
import { findAsCandidate, watchReasonsOf } from '@/features/buyer-watch/services/watch-finds';
import { getBuyerFollowUpRows } from '@/features/buyers/queries/get-buyer-follow-up';
import { getMandateCondominiums } from '@/features/buyers/queries/get-mandate-condominiums';
import { readSeenProperties } from '@/features/buyers/queries/read-seen-properties';
import { buyerToCriteria } from '@/features/buyers/services/buyer-criteria';
import { buyerFollowUp, seenWithHim } from '@/features/buyers/services/buyer-follow-up';
import { projectsUnderOffer } from '@/features/buyers/services/proposable';
import { currentSeenReason, seenKeysOf } from '@/features/buyers/services/seen-properties';
import type { Buyer } from '@/features/buyers/types';
import { streamEstateApiKey } from '@/features/competitor-search/services/stream-estate-config';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { getIdealSelection } from '@/features/ideal-properties/queries/get-ideal-selection';
import { categorizeIdeal } from '@/features/ideal-properties/services/categorize-ideal';
import { idealAgencyCandidates } from '@/features/ideal-properties/services/ideal-agency';
import {
  IDEAL_CRITERIA_MESSAGES,
  idealSearchCriteria,
} from '@/features/ideal-properties/services/ideal-criteria';
import { selectionKey } from '@/features/ideal-properties/services/ideal-page';
import { selectionAsInputs } from '@/features/ideal-properties/services/ideal-selection';
import { IDEAL_CATEGORIES } from '@/features/ideal-properties/types';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  BUYER_GROUPS,
  buyerCandidates,
  reconcileBuyer,
} from '@/features/meeting-conclusion/services/buyer-reconciliation';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import {
  getMandatesBeyondSigned,
  heldMandates,
} from '@/features/mandate-life/queries/get-mandates-beyond-signed';
import { getAgencyOfferAnswers } from '@/features/purchase-offer/queries/get-offer-answers';
import { getSearchBudget } from '@/features/search-budget/queries/get-search-budget';
import { budgetWarningLabel } from '@/features/search-budget/services/budget';
import { rankingCriteria } from '@/features/soft-ranking/ranking-request';
import { agencyRankingListings } from '@/features/soft-ranking/server/agency-listings';
import { SOFT_SHORT_LABELS, softMentions } from '@/features/soft-ranking/services/judgments';
import { isManagerRole } from '@/features/team/services/role';
import { withoutExamples } from '@/features/welcome/services/example-exclusion';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Mission 118 (partie B) — ce que lit « Trouver les biens idéaux » pour un acquéreur : l'agence
// d'abord (le rapprochement M86), ce que la veille a trouvé, ce qu'il a déjà vu, sa sélection en
// cours, ce qui compte pour eux. La refonte, lot C — la même lecture sert la page des biens idéaux
// et « un bien à la fois » dans le détail d'Acquéreurs (tablette, ordinateur) : une seule
// fonction, sortie telle quelle de la page, sans rien changer à ce qu'elle lit. Elle rend les
// propriétés du panneau.
export async function loadIdealPanel(buyer: Buyer, profile: Profile) {
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
    beyond,
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
    // Lot C — ni un mandat sous compromis, vendu ou terminé sans vente.
    getMandatesBeyondSigned(supabase, profile.agency_id),
  ]);
  // Une lecture des offres en échec ne propose aucun mandat (M98) : les concurrents restent.
  const underOffer =
    offers == null || beyond == null
      ? new Set(signedIds)
      : heldMandates(projectsUnderOffer(offers), beyond);
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
          ownVisits.map((line) => ({
            id: line.id,
            visitedAt: line.visitedAt,
            disliked: line.report?.disliked ?? [],
          })),
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
      ? 'La recherche du marché n’est pas activée\u00a0: prévenez l’équipe ACM Studio.'
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

  return {
    current: selection ? selectionAsInputs({ ...selection, items: current }) : [],
    presented: selection?.presentedAt != null,
    buyerId: buyer.id,
    agency: agency,
    marketReady: marketBlocked == null,
    marketBlocked: marketBlocked,
    budgetWarning: budgetWarning,
    watch: watch,
    dismissed: seenFacts
      ? seenFacts.filter((fact) => fact.reason === 'dismissed').map((fact) => fact.key)
      : null,
    seen: seenFacts ?? [],
    currentSeen: currentSeen,
    seenMarks: seenRead ? seenRead.marks(buyer.id) : [],
    seenList: seenList,
    mandatesUnread: offers == null,
    buyerName: buyer.name,
    budgetMax: buyer.budgetMax,
    savedItemIds: Object.fromEntries(
      (selection?.items ?? []).map((item) => [selectionKey(item), item.id]),
    ),
    softLabels: softCriteria.map((key) => SOFT_SHORT_LABELS[key]),
    softOpen: softOpen,
    agencyMentions: agencyMentions,
    watchReasons: watchRun != null ? watchReasonsOf(watchRun.finds) : {},
  };
}
