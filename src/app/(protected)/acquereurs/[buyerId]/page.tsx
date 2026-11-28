import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { alertOk, backLink, badgeBrand, btnSecondary, card, link } from '@/components/ui/styles';
import { BuyerAnswers } from '@/features/buyer-deck/components/buyer-answers';
import { BuyerSoftCriteria } from '@/features/buyer-notes/components/buyer-soft-criteria';
import { VerifyAllBadge } from '@/features/buyer-notes/components/verify-all-badge';
import { getPosedAiCap } from '@/features/ai-budget/queries/get-ai-budgets';
import { notesReadingOpen } from '@/features/buyer-notes/services/reading-gate';
import { getBuyerLoopProposals } from '@/features/buyers/queries/get-loop-properties';
import { getBuyerAnswers } from '@/features/buyer-deck/queries/get-buyer-answers';
import { loadDeck } from '@/features/buyer-deck/queries/load-deck';
import { answerSuggestions } from '@/features/buyer-deck/services/answer-suggestions';
import { deckCriteria, proposedBuyerWords } from '@/features/buyer-deck/services/buyer-deck';
import { VisitRow } from '@/features/buyer-presentation/components/visit-row';
import { readVisitLines } from '@/features/buyer-presentation/queries/get-visit-requests';
import { VISIT_OUTCOME_LABELS } from '@/features/buyer-presentation/types';
import { getVisitLetters } from '@/features/buyer-prospecting/queries/get-visit-letters';
import { BuyerArchiveButton } from '@/features/buyers/components/buyer-archive-button';
import { BuyerNextStepCard } from '@/features/buyers/components/buyer-next-step-card';
import { getSaleSeller } from '@/features/buyers/queries/get-sale-seller';
import { AcademiaLinks } from '@/features/academia/components/academia-links';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { MANDATE_TYPE_LABELS } from '@/features/meeting-conclusion/types';
import { BuyerForm } from '@/features/buyers/components/buyer-form';
import { BuyerStatusActions } from '@/features/buyers/components/buyer-status-actions';
import { BuyerReadinessActions } from '@/features/buyers/components/buyer-readiness-actions';
import {
  buyerReadiness,
  exchangeDates,
  READY_LABEL,
  RECONTACT_LABEL,
} from '@/features/buyers/services/buyer-readiness';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { BuyerDismissed, BuyerFollowUp } from '@/features/buyers/components/buyer-follow-up';
import {
  everythingLine,
  everythingOpen,
  editSearchHref,
  otherActions,
  readinessLine,
  readinessOpen,
  searchFoldLine,
  searchFoldOpen,
  selectionShown,
  statusHref,
  suiviLastVisit,
  timelineLine,
} from '@/features/buyers/services/buyer-sheet-layout';
import { getBuyerFollowUpRows } from '@/features/buyers/queries/get-buyer-follow-up';
import {
  buyerFollowUp,
  followUpSummary,
  selectionFollowed,
} from '@/features/buyers/services/buyer-follow-up';
import { getBuyer } from '@/features/buyers/queries/get-buyers';
import { getBuyerHistory } from '@/features/buyers/queries/get-buyer-history';
import { getBuyersProgress } from '@/features/buyers/queries/get-buyers-progress';
import { buyerDateLabel, buyerToCriteria } from '@/features/buyers/services/buyer-criteria';
import {
  budgetGap,
  buyerJourney,
  buyerNextAction,
  saleInProgress,
  buyerTimeline,
  lastExchangeLabel,
  type JourneyStatus,
} from '@/features/buyers/services/buyer-journey';
import { NO_PROGRESS } from '@/features/buyers/services/buyer-progress';
import { BUYER_STATUS_LABELS } from '@/features/buyers/types';
import { IdealSelectionList } from '@/features/ideal-properties/components/ideal-selection-list';
import { PropertySheetButton } from '@/features/property-sheet/components/property-sheet-button';
import { getIdealSelection } from '@/features/ideal-properties/queries/get-ideal-selection';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  buyerCandidates,
  reconcileBuyer,
} from '@/features/meeting-conclusion/services/buyer-reconciliation';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import { withoutExamples } from '@/features/welcome/services/example-exclusion';
import { getMandateCondominiums } from '@/features/buyers/queries/get-mandate-condominiums';
import { getProfile } from '@/lib/auth/get-profile';
import { academiaLinkView } from '@/lib/academia';
import { getBuyerLastWatch } from '@/features/buyer-watch/queries/get-watch';
import {
  getBuyerOffers,
  getBuyerVouchers,
  getVisitVouchers,
} from '@/features/visit-voucher/queries/get-visit-vouchers';
import { frenchDay } from '@/features/purchase-offer/services/offer-dates';
import { OfferAnswerBadge } from '@/features/purchase-offer/components/offer-answer-badge';
import { NEXT_STEP_LABELS, visitReportLine } from '@/features/buyer-messages/report';
import { watchLine } from '@/features/buyer-watch/services/watch-schedule';
import { formatEuro, formatRelativeDay } from '@/lib/format';
import { displayPhotoUrl } from '@/lib/photo-url';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Fiche acquéreur — ACM Studio' };

type BuyerPageProps = {
  params: Promise<{ buyerId: string }>;
  searchParams: Promise<{
    enregistre?: string;
    modifier?: string;
    rapide?: string;
    ajuste?: string;
    // Lancement, mission 7 — juste après « Visite faite » sur la fiche : ses messages ouverts.
    messages?: string;
    // Mission 10 bis — « Tout le dossier », ouvert : là où l'on change son statut.
    tout?: string;
  }>;
};

const STEP_BAR: Record<JourneyStatus, string> = {
  done: 'bg-emerald-600',
  current: 'bg-brand',
  later: 'bg-zinc-200',
};
const STEP_TITLE: Record<JourneyStatus, string> = {
  done: 'text-emerald-700 stage:text-emerald-300',
  current: 'text-brand-deep stage:text-brand',
  later: 'text-zinc-800 stage:text-white/80',
};
// Mission 152 (partie B) — un toucher sur le libellé d'un bien ouvre sa fiche complète.
const SHEET_LINK =
  'text-left font-title text-base font-bold text-zinc-900 underline-offset-2 hover:text-brand-deep hover:underline stage:text-white';
const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  project: { label: 'Dans l’agence', className: 'bg-emerald-50 text-emerald-700' },
  competitor: { label: 'Concurrent', className: 'bg-zinc-100 text-zinc-600' },
  listing: { label: 'Marché', className: 'bg-brand-soft text-brand-deep' },
};

// Mission 117 — la fiche d'un acquéreur ; Mission 130 B — « Une seule prochaine étape » (maquette
// M130-fiche-acquereur.png) : en tête, qui il est, ses mots et ses critères, son téléphone et son
// e-mail ; ses quatre étapes ; UNE prochaine étape, en bloc plein ; sa sélection ; ce qui s'est
// passé ; « Rapprocher », gratuit. Une fiche archivée ou d'une autre agence est introuvable (M93).
//
// Mission 10 bis (Jean-Guy, 25/11 ; maquette `M10bis-fiche-acquereur-repliee.png`) — la même fiche,
// repliée, sur le modèle de la carte du Suivi vendeur. À l'ouverture, trois blocs : qui il est et
// ce qu'il cherche (ses critères et « Ce qui compte pour eux » repliés), la prochaine étape (le
// seul bouton plein), « Son suivi » en lignes fermées avec leur nombre. Tout le reste — les cinq
// étapes, les autres actions, ses bons de visite et ses offres, ce qui a été écarté pour lui,
// « Prêt à visiter ? », « Ce qui s'est passé », son statut — passe sous un seul « Tout le
// dossier ». Affichage seulement : aucune fonction retirée, aucune règle changée. Un pli s'ouvre
// seul quand il faut agir dedans (`buyer-sheet-layout.ts`).
export default async function BuyerPage({ params, searchParams }: BuyerPageProps) {
  const [{ buyerId }, { enregistre, modifier, rapide, ajuste, messages, tout }] = await Promise.all(
    [params, searchParams],
  );
  const buyer = await getBuyer(buyerId);
  if (!buyer) notFound();
  // Lancement, mission 6 — la lecture des visites dit son échec : « Son suivi » ne range jamais
  // un bien visité en « en attente » sans le dire (M98).
  const [selection, profile, visitRead, dossiers] = await Promise.all([
    getIdealSelection(buyer.id),
    getProfile(),
    readVisitLines(),
    getSuiviDossiers(),
  ]);
  const allVisits = visitRead.lines;
  const supabase = await createClient();
  const counted = withoutExamples(dossiers);
  const [
    loadedDeck,
    answers,
    progress,
    prospecting,
    history,
    lastWatch,
    loopProposals,
    condominiums,
    followUpRows,
  ] = await Promise.all([
    selection ? loadDeck(buyer.id) : Promise.resolve(null),
    profile
      ? getBuyerAnswers(supabase, buyer.id, profile.agency_id)
      : Promise.resolve({ lines: [], forSuggestions: [] }),
    profile
      ? getBuyersProgress(supabase, profile.agency_id, [buyer.id])
      : Promise.resolve(new Map()),
    // Mission 130 B — si la prospection ne se lit pas (« Ne plus solliciter » illisible, M98), la
    // fiche s'affiche quand même : seules les correspondances le disent.
    getAgencyProspecting(counted).catch(() => null),
    profile
      ? getBuyerHistory(supabase, profile.agency_id, buyer.id)
      : Promise.resolve({
          selections: [],
          letters: [],
          proposals: [],
          events: [],
          readings: [],
          failed: true,
        }),
    // Mission 136 — son dernier passage de veille.
    profile
      ? getBuyerLastWatch(profile.agency_id, buyer.id)
      : Promise.resolve({ ok: false as const }),
    // Mission 145 (partie A, I2) — les mandats signés à lui proposer.
    profile ? getBuyerLoopProposals(profile.agency_id, new Date()) : null,
    // Mission 151 — la copropriété connue des mandats, seulement s'il n'en veut pas.
    profile && buyer.condominiumAccepted === false
      ? getMandateCondominiums(
          profile.agency_id,
          counted.map((dossier) => dossier.project.id),
        )
      : Promise.resolve(new Map<string, boolean>()),
    // Lancement, mission 6 — « Son suivi » : ses biens envoyés, ses réponses, ce qui a été écarté
    // pour lui. null : une lecture a échoué (M98).
    profile ? getBuyerFollowUpRows(supabase, profile.agency_id, buyer.id) : null,
  ]);
  const facts = progress.get(buyer.id) ?? NO_PROGRESS;
  const ownVisits = allVisits.filter((line) => line.buyerId === buyer.id);
  // Mission 120 — ses visites demandées, chacune avec l'action qui convient et l'état du courrier.
  const visits = ownVisits.filter((line) => line.visitedAt == null);
  // Correctif du 13/11 (essai de Jean-Guy) — ses visites faites : la suite s'y change quand
  // l'acquéreur change d'avis (« Changer la suite »), et « Offre envisagée » mène à l'offre d'achat.
  const doneVisits = ownVisits
    .filter((line) => line.visitedAt != null)
    .sort((a, b) => b.visitedAt!.localeCompare(a.visitedAt!));
  // Mission 137 — et le bon de visite signé de chaque visite, toutes visites de la fiche.
  const [letters, vouchers, signedVouchers, signedOffers] = await Promise.all([
    getVisitLetters([...visits, ...doneVisits]),
    getVisitVouchers(
      supabase,
      ownVisits.map((line) => line.id),
    ),
    profile ? getBuyerVouchers(supabase, profile.agency_id, buyer.id) : Promise.resolve([]),
    profile ? getBuyerOffers(supabase, profile.agency_id, buyer.id) : Promise.resolve([]),
  ]);
  const suggestions = answerSuggestions(buyer, buyer.ignoredSuggestions, answers.forSuggestions);
  // Lancement, mission 6 — « Son suivi » : un bien = une ligne, ses visites sur sa ligne.
  const followUp = followUpRows
    ? buyerFollowUp({
        ...followUpRows,
        visits: ownVisits.map((line) => ({
          id: line.id,
          itemId: line.itemId,
          requestedAt: line.requestedAt,
          visitedAt: line.visitedAt,
          opinion: line.report?.opinion ?? null,
          outcome: line.outcome,
        })),
      })
    : [];
  const followedVisits = new Set(followUp.flatMap((entry) => entry.visitIds));
  const lastAnswer =
    (signedOffers ?? [])
      .flatMap((offer) =>
        offer.answer && offer.decidedAt
          ? [{ answer: offer.answer, decidedAt: offer.decidedAt }]
          : [],
      )
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))[0] ?? null;
  const deck = loadedDeck?.advisorDeck ?? null;
  const now = new Date();
  const journey = buyerJourney(facts, buyer.status);
  const next = buyerNextAction(buyer, facts, now, loopProposals?.byBuyer.get(buyer.id) ?? []);
  // Mission 143 (B1) — pendant une offre acceptée, la fiche suit la vente : sa recherche est en
  // pause (sélection, « Prêt à visiter ? », « Rapprocher », suggestions masqués), tout revient si
  // l'offre tombe (M138).
  const sale = saleInProgress(facts, buyer.status) ? (facts.offer ?? null) : null;
  const saleVisit = sale ? ownVisits.find((line) => line.id === sale.visitId) : undefined;
  const saleSeller =
    sale?.projectId && profile
      ? await getSaleSeller(supabase, profile.agency_id, sale.projectId)
      : null;
  // Mission 147 (partie A) — dans l'agence de démonstration, Academia s'ouvre sur sa présentation.
  const saleDemo = saleSeller ? await isDemoAgency(profile?.agency_id) : false;
  const readingOpen = notesReadingOpen({
    isDemo: saleSeller ? saleDemo : await isDemoAgency(profile?.agency_id),
    email: profile?.email,
    agencyCapCents: await getPosedAiCap(profile?.agency_id),
  });
  const salePhoto = saleVisit
    ? deck?.items.find((item) => item.item.itemId === saleVisit.itemId)?.photos[0]
    : undefined;
  const saleVoucher = sale?.visitId ? vouchers.get(sale.visitId) : undefined;
  const words = deck?.words ?? proposedBuyerWords(buyer);
  const criteria = deckCriteria(buyer);
  // Mission 86, 117 — « Rapprocher » : ce que l'agence a déjà qui correspond à sa recherche.
  const matches = prospecting
    ? reconcileBuyer(
        buyerToCriteria(buyer),
        buyerCandidates(
          counted,
          prospecting.cards
            .filter((cardItem) => cardItem.row.opposedOn == null)
            .map(({ row, seller }) => ({ row, seller })),
          condominiums,
        ),
      ).matchCount
    : null;
  const timeline = buyerTimeline({
    createdAt: buyer.createdAt,
    selections: history.selections,
    letters: history.letters,
    proposals: history.proposals,
    events: history.events,
    readings: history.readings,
    presentedAt: facts.presentedAt,
    linkAt: facts.linkAt ?? null,
    answeredAt: facts.answeredAt ?? null,
    visits: ownVisits.map((line) => ({
      requestedAt: line.requestedAt,
      visitedAt: line.visitedAt,
      label: line.itemLabel,
      during: line.requestedDuring,
      // Mission 139 — le compte rendu s'inscrit dans « Ce qui s'est passé » : « Intéressé · a aimé : … ».
      outcomeLabel: line.visitedAt
        ? line.report
          ? visitReportLine(line.report)
          : VISIT_OUTCOME_LABELS[line.outcome]
        : null,
    })),
  });
  // Mission 132 — le dernier échange avec l'acquéreur : le même calcul que « Prêt à visiter », la
  // liste et le Suivi (un lien envoyé ou un courrier préparé ne sont pas des échanges avec lui).
  const lastExchange = lastExchangeLabel(exchangeDates(buyer, facts), now, buyer.createdAt);
  const readiness = buyerReadiness(buyer, facts, now);
  const telHref = buyer.phone ? `tel:${buyer.phone.replace(/[^\d+]/g, '')}` : null;
  // Lancement, mission 10 — la fiche simplifiée (`buyer-sheet-layout.ts`) : « Sa sélection » ne garde
  // son bloc que tant qu'elle est à présenter ; ensuite ses biens se lisent dans « Son suivi ».
  const followUpRead = followUpRows != null && !visitRead.failed;
  const showSelection = selectionShown({
    hasSelection: deck != null || selection != null,
    sale: sale != null,
    // Envoyée ou présentée : chacun de ses biens a déjà sa ligne dans « Son suivi ».
    sent:
      deck != null &&
      followUpRows != null &&
      selectionFollowed(
        deck.items.map((item) => item.item.itemId),
        followUpRows,
        followUp,
      ),
    followUpRead,
  });
  const others = otherActions({
    buyerId: buyer.id,
    sale: sale != null,
    matches,
    hasVisits: ownVisits.length > 0,
  });
  const OTHER_TEST_IDS = {
    matches: 'buyer-matches-link',
    voucher: 'buyer-voucher-new',
    offer: 'buyer-offer-new',
  } as const;
  // La veille, telle que le bloc la dit : sa ligne repliée la reprend (M136).
  const watchSentence = lastWatch.ok
    ? watchLine({
        ready: readiness.state === 'ready',
        lastRunAt: lastWatch.lastRunAt,
        off: lastWatch.off,
        now,
      })
    : null;
  const searching = buyer.status === 'searching' || buyer.status === 'visiting';
  const foldTitle = 'inline font-title text-lg font-semibold text-brand-deep stage:text-white';
  const foldLine = 'text-sm text-zinc-500 stage:text-white/60';
  // Mission 10 bis — dans « Tout le dossier » : le titre d'un bloc, et celui d'un pli.
  const subTitle =
    'text-xs font-extrabold tracking-widest text-brand-deep uppercase stage:text-brand';
  const nestedTitle = 'inline font-title text-base font-semibold text-brand-deep stage:text-white';
  const foldSummary =
    'flex cursor-pointer list-none flex-wrap items-baseline gap-x-2 gap-y-0.5 marker:hidden [&::-webkit-details-marker]:hidden';
  const foldChevron = 'w-3 shrink-0 text-xs text-brand-deep transition-transform stage:text-brand';
  // Sur téléphone, la ligne d'un pli passe sous son titre, alignée sur lui.
  const foldLineWrap = 'basis-full pl-5 sm:basis-auto sm:pl-0';
  // « Prêt à visiter ? » reste dehors, ouvert, tant qu'il manque quelque chose (Lancement 10) ;
  // prêt, il se range dans « Tout le dossier ». En pause pendant la vente (M143).
  const readinessOutside = sale == null && readinessOpen(readiness.state, searching);
  const dismissedCount = followUp.filter((entry) => entry.group === 'dismissed').length;
  const vouchersShown = signedVouchers == null || signedVouchers.length > 0;
  const offersShown = signedOffers == null || signedOffers.length > 0;
  // Sa sélection envoyée ou présentée : ses trois liens se rangent avec les autres actions.
  const selectionLinks = !showSelection && !sale && deck != null;
  // La ligne fermée « Visités » dit sa dernière visite et sa suite ; la ligne du bien dont on vient
  // de noter la visite s'ouvre seule (`?messages=`, Lancement 7).
  const lastVisited = suiviLastVisit(followUp, ownVisits);
  const lastVisit = lastVisited?.visitedAt
    ? {
        day: formatRelativeDay(lastVisited.visitedAt, now),
        outcome: lastVisited.report?.nextStep
          ? NEXT_STEP_LABELS[lastVisited.report.nextStep]
          : VISIT_OUTCOME_LABELS[lastVisited.outcome],
      }
    : null;
  const messagesGroup = messages
    ? (followUp.find((entry) => entry.visitIds.includes(messages))?.group ?? null)
    : null;
  // Ses visites à organiser : la ligne qui en porte une s'ouvre seule — « Visites à organiser »,
  // mais aussi celle d'un bien refusé, ou écarté pour lui, qui garde une visite demandée.
  const pendingVisitIds = visits.map((line) => line.id);
  const dismissedPending =
    sale == null &&
    followUp.some(
      (entry) =>
        entry.group === 'dismissed' && entry.visitIds.some((id) => pendingVisitIds.includes(id)),
    );
  // Le suivi n'a pas pu être lu en entier (M98) : rien de ce qu'il devait montrer ne reste sous un
  // pli fermé — ni « Sa sélection », gardée pour cela (Lancement 10).
  const suiviUnread = followUpRows == null || visitRead.failed;
  const visitRows = Object.fromEntries(
    ownVisits.map((line) => [
      line.id,
      <VisitRow
        key={line.id}
        line={line}
        openMessages={line.id === messages}
        letter={letters.get(line.id) ?? null}
        voucher={vouchers.get(line.id) ?? null}
      />,
    ]),
  );
  const readinessFold = (inDossier: boolean) => (
    <details
      className={inDossier ? 'group/fold py-4' : `${card} group/fold p-5`}
      data-testid="buyer-readiness"
      open={readinessOpen(readiness.state, searching)}
    >
      <summary className={`${foldSummary} ${foldLine}`}>
        <span aria-hidden className={`${foldChevron} group-open/fold:rotate-90`}>
          ▸
        </span>
        {inDossier ? (
          <h3 className={nestedTitle}>Prêt à visiter&#x202f;?</h3>
        ) : (
          <h2 className={foldTitle}>Prêt à visiter&#x202f;?</h2>
        )}
        <span className={foldLineWrap} data-testid="buyer-readiness-line">
          <span className="hidden sm:inline">· </span>
          {readinessLine({
            financing: buyer.financing,
            lastExchange,
            watch: watchSentence,
          })}
        </span>
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-sm text-zinc-600 stage:text-white/70">
          Financement validé, un échange il y a moins de 30 jours et un budget renseigné.
        </p>
        <BuyerReadinessActions
          buyerId={buyer.id}
          financing={buyer.financing}
          financingChangedAt={buyer.financingChangedAt}
          contactedToday={
            buyer.contactedAt != null && parisDay(new Date(buyer.contactedAt)) === parisDay(now)
          }
          financingMode={buyer.financingMode}
          loan={{
            contribution: buyer.loanContribution,
            amount: buyer.loanAmount,
            agreement: buyer.loanAgreement,
          }}
          modeToVerify={buyer.fieldsToVerify.includes('financing_mode')}
        />
        {/* Mission 136 — la veille : une recherche par semaine, pour un acquéreur prêt. */}
        {lastWatch.ok ? (
          <p className="text-sm text-zinc-600 stage:text-white/70" data-testid="buyer-watch-line">
            {watchSentence}
          </p>
        ) : null}
      </div>
    </details>
  );

  return (
    <div className="flex max-w-6xl flex-col gap-4 md:gap-5">
      <Link href="/acquereurs" className={backLink}>
        ← Acquéreurs
      </Link>

      {/* Mission 135 — un ajustement appliqué depuis ses refus relance le rapprochement (gratuit). */}
      {ajuste && matches != null ? (
        <p role="status" className={alertOk} data-testid="buyer-adjusted">
          Recherche ajustée ·{' '}
          <Link
            href={`/acquereurs/rapprochement?acquereur=${buyer.id}#rapprochement`}
            className="font-semibold underline underline-offset-2"
            data-testid="buyer-adjusted-matches"
          >
            {matches === 0
              ? 'aucun bien de l’agence ne correspond pour l’instant'
              : matches === 1
                ? '1 bien de l’agence correspond'
                : `${matches} biens de l’agence correspondent`}
          </Link>
        </p>
      ) : null}

      {enregistre ? (
        <p role="status" className={alertOk} data-testid="buyer-saved">
          Fiche enregistrée.
          {/* Mission 132 — dès la saisie rapide, ce que la fiche rapporte : les biens de l'agence
              qui correspondent (le rapprochement de M86, gratuit). */}
          {rapide ? (
            <>
              {matches != null ? (
                <>
                  {' '}
                  <Link
                    href={`/acquereurs/rapprochement?acquereur=${buyer.id}#rapprochement`}
                    className="font-semibold underline underline-offset-2"
                    data-testid="buyer-quick-matches"
                  >
                    {matches === 0
                      ? 'Aucun bien de l’agence ne correspond pour l’instant'
                      : matches === 1
                        ? '1 bien de l’agence correspond'
                        : `${matches} biens de l’agence correspondent`}
                  </Link>
                </>
              ) : null}
              {' · '}
              <Link
                href={`/acquereurs/${buyer.id}?modifier=1#recherche`}
                className="underline underline-offset-2"
              >
                Compléter sa recherche
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      {/* Mission 10 bis — les deux premiers blocs, côte à côte sur ordinateur : qui il est et ce
          qu'il cherche ; la prochaine étape, juste dessous à toutes les autres largeurs (Lancement
          10). Pendant une vente, « Avant le compromis » la suit et « La vente » reste visible. */}
      <div
        className={`grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] ${
          // Les deux blocs ont la même hauteur ; ses critères dépliés, la prochaine étape garde
          // la sienne plutôt que de s'étirer à côté d'eux.
          sale
            ? 'lg:grid-rows-[auto_1fr] lg:items-start'
            : 'lg:items-stretch lg:has-[details[open]]:items-start'
        }`}
      >
        {/* Qui il est, ce qu'il cherche, comment le joindre. */}
        <section
          className={`${card} flex min-w-0 flex-col gap-3 p-5 lg:col-start-1 lg:row-start-1`}
          data-testid="buyer-header"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h1
              className="font-title text-3xl font-bold text-brand-darker stage:text-white"
              data-testid="buyer-name"
            >
              {buyer.name}
            </h1>
            {/* Mission 143 (B1) — un seul badge d'état, le plus avancé : « Offre acceptée le … »
                remplace « Sous offre » et « Prêt à visiter ». Mission 10 bis — un simple badge :
                le statut se change dans « Tout le dossier ». */}
            {sale?.decidedAt ? (
              <span data-testid="buyer-sale-badge">
                <OfferAnswerBadge decision="accepted" decidedAt={sale.decidedAt} />
              </span>
            ) : (
              <span className={`${badgeBrand} whitespace-nowrap`} data-testid="buyer-status-pill">
                {BUYER_STATUS_LABELS[buyer.status]}
              </span>
            )}
            {/* Mission 138 — la dernière réponse du vendeur à une de ses offres. */}
            {lastAnswer && !sale ? (
              <OfferAnswerBadge decision={lastAnswer.answer} decidedAt={lastAnswer.decidedAt} />
            ) : null}
            {sale ? null : readiness.state === 'ready' ? (
              <span
                className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white"
                data-testid="buyer-ready"
              >
                {READY_LABEL}
              </span>
            ) : readiness.state === 'recontact' ? (
              <span
                className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800"
                data-testid="buyer-recontact"
              >
                {RECONTACT_LABEL}
              </span>
            ) : null}
            {/* Mission 151 — une fiche née d'une lecture : ses champs « À vérifier » (M97). */}
            <VerifyAllBadge buyerId={buyer.id} count={buyer.fieldsToVerify.length} />
          </div>
          {words ? (
            <p className="text-lg text-zinc-800 stage:text-white/85" data-testid="buyer-words">
              «&nbsp;{words}&nbsp;»
            </p>
          ) : null}
          {sale ? (
            <p className="text-sm text-zinc-600 stage:text-white/70" data-testid="buyer-paused">
              Recherche en pause pendant la vente ·{' '}
              <Link href={statusHref(buyer.id)} className={link}>
                la rouvrir
              </Link>
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="buyer-contact">
            {telHref ? (
              <a href={telHref} className={btnSecondary} data-testid="buyer-phone">
                ☎ {buyer.phone}
              </a>
            ) : null}
            {buyer.email ? (
              <a
                href={`mailto:${buyer.email}`}
                className={`${link} text-sm underline`}
                data-testid="buyer-email"
              >
                ✉ E-mail
              </a>
            ) : null}
            {!telHref && !buyer.email ? (
              <Link href={editSearchHref(buyer.id)} className={`${link} text-sm underline`}>
                Ajouter son téléphone ou son e-mail
              </Link>
            ) : null}
            {lastExchange ? (
              <span
                className="text-xs text-zinc-500 stage:text-white/60"
                data-testid="buyer-last-exchange"
              >
                {lastExchange}
              </span>
            ) : null}
          </div>
          {/* Ses critères et « Ce qui compte pour eux » (M151), repliés sur une ligne ; « Modifier
              sa recherche » n'apparaît qu'ici. */}
          <details
            className="group/search mt-auto border-t border-zinc-100 pt-3 stage:border-white/10"
            data-testid="buyer-search-fold"
            open={searchFoldOpen(buyer.fieldsToVerify.length)}
          >
            <summary className={foldSummary}>
              <span aria-hidden className={`${foldChevron} group-open/search:rotate-90`}>
                ▸
              </span>
              <h2 className="font-title text-base font-semibold text-brand-deep stage:text-white">
                Ses critères et ce qui compte pour eux
              </h2>
              <span className={`${foldLine} ${foldLineWrap}`} data-testid="buyer-search-line">
                {searchFoldLine({
                  criteria: criteria.length,
                  mustHave: criteria.filter((item) => item.mustHave).length,
                  soft: buyer.softCriteria.length,
                })}
              </span>
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2" data-testid="buyer-criteria">
                {criteria.map((item) => (
                  <span
                    key={item.criterion}
                    className={
                      item.mustHave
                        ? 'rounded-md bg-amber-50 px-2.5 py-1 text-sm text-zinc-800'
                        : 'rounded-md bg-zinc-100 px-2.5 py-1 text-sm text-zinc-700 stage:bg-white/10 stage:text-white/80'
                    }
                  >
                    {item.mustHave ? '★ ' : ''}
                    {item.label}
                  </span>
                ))}
              </div>
              <BuyerSoftCriteria
                criteria={buyer.softCriteria}
                toVerify={buyer.fieldsToVerify.includes('soft_criteria')}
              />
              <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <Link
                  href={editSearchHref(buyer.id)}
                  className={`${link} font-semibold underline`}
                  data-testid="buyer-edit-search"
                >
                  Modifier sa recherche
                </Link>
                {/* Mission 151 — « Compléter depuis mes notes », là où la lecture est ouverte. */}
                {readingOpen ? (
                  <Link
                    href={`/acquereurs/${buyer.id}/depuis-mes-notes`}
                    className={`${link} font-semibold underline`}
                    data-testid="buyer-complete-from-notes"
                  >
                    Compléter depuis mes notes
                  </Link>
                ) : null}
              </p>
            </div>
          </details>
        </section>

        <div
          className={`flex min-w-0 flex-col gap-4 md:gap-5 lg:col-start-2 lg:row-start-1 ${
            sale ? 'lg:row-span-2' : ''
          }`}
        >
          {/* UNE prochaine étape : la carte du socle, le seul bouton plein de la fiche (lot B). */}
          <BuyerNextStepCard
            next={next}
            unread={facts.unread}
            loopFailed={loopProposals?.failed ?? false}
            className={sale ? '' : 'lg:flex-1'}
          />

          {/* Mission 143 (B1) — « Avant le compromis » : coché = fait, lu dans ce qui existe. */}
          {sale ? (
            <section
              className={`${card} flex flex-col gap-2 p-5`}
              data-testid="buyer-before-compromise"
            >
              <h2 className="font-title text-xl font-bold text-brand-darker stage:text-white">
                Avant le compromis
              </h2>
              <ul className="flex flex-col">
                {[
                  { label: 'Offre signée', done: true },
                  { label: 'Acceptée par le vendeur', done: true },
                  { label: 'Acquéreur prévenu', done: sale.buyerNotified },
                  { label: 'Dossier transmis au notaire', done: sale.notaryLinked },
                ].map((check) => (
                  <li
                    key={check.label}
                    data-testid="buyer-before-compromise-item"
                    data-done={check.done ? 'true' : 'false'}
                    className="flex items-center gap-2 border-t border-zinc-100 py-2 text-sm first:border-0 stage:border-white/10"
                  >
                    <span
                      className={check.done ? 'font-bold text-emerald-700' : 'text-zinc-500'}
                      aria-label={check.done ? 'fait' : 'à faire'}
                    >
                      {check.done ? '✓' : '○'}
                    </span>
                    <span className="text-zinc-800 stage:text-white/85">{check.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* Mission 143 (B1) — « La vente » : le bien de l'offre, son vendeur, le montant offert. */}
        {sale ? (
          <section
            id="la-vente"
            className={`${card} flex scroll-mt-6 flex-col gap-3 p-5 lg:col-start-1 lg:row-start-2`}
            data-testid="buyer-sale"
          >
            <h2 className="font-title text-xl font-bold text-brand-darker stage:text-white">
              La vente
            </h2>
            <div className="flex flex-wrap items-start gap-4">
              {salePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayPhotoUrl(salePhoto)}
                  alt=""
                  className="h-20 w-28 shrink-0 rounded-lg bg-zinc-100 object-cover"
                />
              ) : (
                <span className="h-20 w-28 shrink-0 rounded-lg bg-zinc-200" aria-hidden />
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
                  {saleVisit?.itemLabel ?? 'Le bien de l’offre'}
                </span>
                <span className="text-sm text-zinc-600 stage:text-white/70">
                  {[
                    saleSeller
                      ? `Vendeur\u00a0: ${saleSeller.sellerName}${
                          saleSeller.mandateType
                            ? ` (mandat ${MANDATE_TYPE_LABELS[saleSeller.mandateType].toLowerCase()})`
                            : ''
                        }`
                      : null,
                    saleVisit?.itemPrice != null
                      ? `prix affiché ${formatEuro(saleVisit.itemPrice)}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              {sale.price != null ? (
                <span className="flex shrink-0 flex-col items-end text-right">
                  <span
                    className="font-title text-2xl font-bold text-zinc-900 stage:text-white"
                    data-testid="buyer-sale-amount"
                  >
                    {formatEuro(sale.price)}
                  </span>
                  <span className="text-sm text-zinc-500 stage:text-white/60">offre acceptée</span>
                </span>
              ) : null}
            </div>
            {/* Mission 147 (partie A) — le dossier d'adresse et « Vivre ici » d'Academia, à la
                  suite du bon et de l'offre, sur l'adresse du mandat de l'offre (planche M147-3). */}
            <AcademiaLinks
              variant="links"
              unread={!saleSeller}
              leading={
                <>
                  {saleVoucher ? (
                    <Link
                      href={`/acquereurs/${buyer.id}/bon-de-visite/${saleVoucher.documentId}`}
                      className={`${link} text-sm`}
                    >
                      Bon de visite signé
                    </Link>
                  ) : null}
                  <Link
                    href={`/acquereurs/${buyer.id}/offre/${sale.documentId}`}
                    className={`${link} text-sm`}
                    data-testid="buyer-sale-offer"
                  >
                    Offre d’achat signée
                  </Link>
                </>
              }
              addressLink={
                saleSeller
                  ? academiaLinkView({
                      target: 'address',
                      address: saleSeller.address,
                      demo: saleDemo,
                    })
                  : null
              }
              livingLink={
                saleSeller
                  ? academiaLinkView({
                      target: 'living',
                      address: saleSeller.address,
                      demo: saleDemo,
                    })
                  : null
              }
              missingHref={
                sale.projectId ? `/builder/${sale.projectId}/property#champ-address` : '#la-vente'
              }
            />
          </section>
        ) : null}
      </div>

      {/* Lancement, mission 6 — « Son suivi » : un seul endroit avec les biens envoyés, refusés
          et pourquoi, visités avec leur compte rendu. Mission 10 bis — en lignes fermées, avec
          leur nombre ; le détail d'une visite n'apparaît qu'une fois sa ligne ouverte. */}
      <BuyerFollowUp
        entries={followUp}
        summary={followUpSummary(followUp, visits.length)}
        unread={suiviUnread}
        lastVisit={lastVisit}
        messagesGroup={messagesGroup}
        messagesKey={messages ?? null}
        pendingVisitIds={pendingVisitIds}
        sale={sale != null}
        budgetMax={buyer.budgetMax}
        visitRows={visitRows}
      >
        {/* Mission 122, 135 — ce que ses refus suggèrent : accepter ou ignorer, rien ne se modifie
            seul ; en pause pendant la vente (M143). Une suggestion attend une réponse : elle reste
            visible, sous les lignes. */}
        {!sale && suggestions.length > 0 ? (
          <div
            id="reponses"
            className="scroll-mt-6 border-t border-zinc-100 py-3 stage:border-white/10"
          >
            <BuyerAnswers buyerId={buyer.id} answers={[]} suggestions={suggestions} bare />
          </div>
        ) : null}
      </BuyerFollowUp>
      {/* Une visite que le suivi n'a pas pu rattacher à un bien (lecture en échec) reste visible. */}
      {ownVisits.some((line) => !followedVisits.has(line.id)) ? (
        <section className={`${card} flex flex-col gap-3 p-5`} data-testid="buyer-visits-section">
          <h2 className="font-title text-lg font-semibold text-brand-deep stage:text-white">
            Ses visites
          </h2>
          <ul className="flex flex-col gap-2">
            {ownVisits
              .filter((line) => !followedVisits.has(line.id))
              .map((line) => (
                <VisitRow
                  key={line.id}
                  line={line}
                  letter={letters.get(line.id) ?? null}
                  voucher={vouchers.get(line.id) ?? null}
                />
              ))}
          </ul>
        </section>
      ) : null}

      {/* Lancement, mission 10 — « Prêt à visiter ? » s'ouvre seul quand il manque quelque chose :
          il reste alors ici, sous les yeux ; prêt, il se range dans « Tout le dossier ». */}
      {readinessOutside ? readinessFold(false) : null}

      {/* Mission 10 bis — « Tout le dossier », replié : tout le reste de la fiche, rien de retiré. */}
      <details
        id="tout"
        className={`${card} group/all scroll-mt-6`}
        data-testid="buyer-all"
        open={everythingOpen({
          asked: tout === '1',
          // Une lecture en échec ne reste jamais sous un pli fermé (M98).
          unread:
            history.failed ||
            signedVouchers == null ||
            signedOffers == null ||
            others.some((action) => action.unread) ||
            (showSelection && suiviUnread),
          pendingVisit: dismissedPending,
        })}
      >
        <summary className={`${foldSummary} px-5 py-4`}>
          <span aria-hidden className={`${foldChevron} group-open/all:rotate-90`}>
            ▸
          </span>
          <h2 className="font-title text-lg font-semibold text-brand-deep stage:text-white">
            Tout le dossier
          </h2>
          <span className={`${foldLine} ${foldLineWrap}`} data-testid="buyer-all-line">
            {everythingLine({
              selection: showSelection,
              vouchers: vouchersShown,
              offers: offersShown,
              dismissed: dismissedCount,
              readiness: sale == null && !readinessOutside,
            })}
          </span>
        </summary>
        <div className="flex flex-col divide-y divide-zinc-100 border-t border-zinc-100 px-5 stage:divide-white/10 stage:border-white/10">
          {/* Ses cinq étapes, lues à leur état le plus avancé (M143). */}
          <section className="flex flex-col gap-2 py-4">
            <h3 className={subTitle}>Où il en est</h3>
            <ol
              className="grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-100 md:grid-cols-5 stage:border-white/10"
              data-testid="buyer-steps"
              aria-label="Les étapes de cet acquéreur"
            >
              {journey.map((step) => (
                <li
                  key={step.key}
                  data-testid="buyer-step"
                  data-step={step.key}
                  data-status={step.status}
                  className={`flex flex-col gap-0.5 px-4 pt-0 pb-3 ${step.status === 'current' ? 'bg-brand-soft/40' : ''}`}
                >
                  <span className={`-mx-4 mb-3 h-1 ${STEP_BAR[step.status]}`} aria-hidden />
                  <span className={`font-title text-base font-bold ${STEP_TITLE[step.status]}`}>
                    {step.number} · {step.title}
                    {step.status === 'done' ? ' ✓' : ''}
                  </span>
                  <span className="text-sm text-zinc-500 stage:text-white/60">{step.state}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Sa sélection, tant qu'elle est à présenter — en pause pendant la vente ; une fois
              envoyée ou présentée, ses biens ne se lisent plus que dans « Son suivi » (Lancement,
              mission 10). */}
          {!showSelection ? null : deck ? (
            <section className="flex flex-col gap-3 py-4" data-testid="ideal-selection">
              <h3 className={subTitle}>
                Sa sélection · {deck.items.length} bien{deck.items.length > 1 ? 's' : ''}
              </h3>
              <ul className="flex flex-col">
                {deck.items.map((item) => {
                  const gap = budgetGap(item.item.price, buyer.budgetMax);
                  const badge = SOURCE_BADGE[item.item.source];
                  return (
                    <li
                      key={item.item.itemId}
                      data-testid="ideal-selection-item"
                      className="flex items-center gap-3 border-t border-zinc-100 py-3 first:border-0 stage:border-white/10"
                    >
                      {item.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displayPhotoUrl(item.photos[0])}
                          alt=""
                          className="h-16 w-24 shrink-0 rounded-lg bg-zinc-100 object-cover"
                        />
                      ) : (
                        <span className="h-16 w-24 shrink-0 rounded-lg bg-zinc-200" aria-hidden />
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex flex-wrap items-center gap-2">
                          <PropertySheetButton
                            target={{ kind: 'selection-item', id: item.item.itemId }}
                            backLabel="Sa sélection"
                            budgetMax={buyer.budgetMax}
                            className={SHEET_LINK}
                          >
                            {item.item.label}
                          </PropertySheetButton>
                          {badge ? (
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-sm text-zinc-500 stage:text-white/60">
                          {item.okCount} critère{item.okCount > 1 ? 's' : ''} sur {item.total}
                          {item.pitch ? ` · «\u00a0${item.pitch}\u00a0»` : ''}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end text-right">
                        <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
                          {item.item.price != null ? formatEuro(item.item.price) : '—'}
                        </span>
                        <span
                          className={`text-sm ${
                            item.item.price == null || gap == null
                              ? 'text-zinc-500 stage:text-white/60'
                              : gap.tone === 'orange'
                                ? 'text-amber-700'
                                : 'text-emerald-700'
                          }`}
                        >
                          {item.item.price == null
                            ? 'Prix à confirmer'
                            : gap == null
                              ? null
                              : gap.tone === 'green'
                                ? 'dans le budget'
                                : gap.negotiable
                                  ? `+${formatEuro(gap.over)}, à négocier`
                                  : `+${formatEuro(gap.over)}, au-dessus du budget`}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <Link href={`/acquereurs/${buyer.id}/biens-ideaux`} className={`${link} text-sm`}>
                  Changer la sélection
                </Link>
                {/* La présentation commence par « Avant de présenter » (ses mots, les phrases) ;
                    terminée, elle se relit. */}
                <Link
                  href={`/presentation/${buyer.id}`}
                  className={`${link} text-sm`}
                  data-testid={deck.presentedAt ? 'present-selection' : 'reread-before-presenting'}
                >
                  {deck.presentedAt
                    ? 'Revoir la présentation'
                    : 'Relire les phrases avant de présenter'}
                </Link>
                <Link
                  href={`/acquereurs/${buyer.id}/dossier`}
                  className={`${link} text-sm`}
                  data-testid="buyer-dossier"
                >
                  Dossier acquéreur et lien
                </Link>
              </div>
            </section>
          ) : selection ? (
            <div className="py-4">
              <IdealSelectionList selection={selection} />
            </div>
          ) : null}

          {/* Lancement, mission 10 — « Autres actions » : des liens discrets, jamais un bouton
              (M146). Mission 10 bis — une fois sa sélection envoyée, ses liens s'y rangent aussi. */}
          <section className="flex flex-col gap-2 py-4" data-testid="buyer-other-actions">
            <h3 className={subTitle}>Autres actions</h3>
            <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {selectionLinks ? (
                <>
                  <Link
                    href={`/acquereurs/${buyer.id}/biens-ideaux`}
                    className={`${link} font-semibold whitespace-nowrap`}
                  >
                    Changer la sélection
                  </Link>
                  <Link
                    href={`/presentation/${buyer.id}`}
                    className={`${link} font-semibold whitespace-nowrap`}
                    data-testid={
                      deck.presentedAt ? 'present-selection' : 'reread-before-presenting'
                    }
                  >
                    {deck.presentedAt
                      ? 'Revoir la présentation'
                      : 'Relire les phrases avant de présenter'}
                  </Link>
                  <Link
                    href={`/acquereurs/${buyer.id}/dossier`}
                    className={`${link} font-semibold whitespace-nowrap`}
                    data-testid="buyer-dossier"
                  >
                    Dossier acquéreur et lien
                  </Link>
                </>
              ) : null}
              {others.map((action) => (
                <Link
                  key={action.key}
                  href={action.href}
                  className={`${link} font-semibold whitespace-nowrap`}
                  data-testid={OTHER_TEST_IDS[action.key]}
                >
                  {action.label}
                </Link>
              ))}
            </p>
            {others.some((action) => action.unread) ? (
              <p role="alert" className="text-sm font-semibold text-zinc-600 stage:text-white/70">
                {others.find((action) => action.unread)?.unread}
              </p>
            ) : null}
          </section>

          {/* Mission 137 — ses bons de visite : gardés sur la fiche, même ses visites toutes faites.
              Lancement, mission 10 — le bloc n'existe que s'il y a un bon signé ; « Bon de visite »
              et « Offre d'achat » se préparent depuis « Autres actions ». Mission 10 bis — dans
              « Tout le dossier ». */}
          {signedVouchers == null || signedVouchers.length > 0 ? (
            <section className="flex flex-col gap-2 py-4" data-testid="buyer-vouchers">
              <h3 className={subTitle}>Ses bons de visite</h3>
              {signedVouchers == null ? (
                <p role="alert" className="text-sm font-semibold text-red-700">
                  Les bons de visite n’ont pas pu être lus&nbsp;: rechargez la page.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {signedVouchers.map((voucher) => (
                    <li key={voucher.documentId}>
                      <Link
                        href={`/acquereurs/${buyer.id}/bon-de-visite/${voucher.documentId}`}
                        className="text-sm font-semibold text-brand-darker underline"
                        data-testid="buyer-voucher-signed"
                      >
                        Signé le {buyerDateLabel(voucher.signedAt)}
                        {voucher.labels.length > 0 ? ` · ${voucher.labels.join('\u202f; ')}` : ''}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {/* Mission 137 B — ses offres d'achat : signées, et la réponse du vendeur. */}
          {signedOffers == null || signedOffers.length > 0 ? (
            <section className="flex flex-col gap-2 py-4" data-testid="buyer-offers">
              <h3 className={subTitle}>Ses offres d’achat</h3>
              {signedOffers == null ? (
                <p role="alert" className="text-sm font-semibold text-red-700">
                  Les offres n’ont pas pu être lues&nbsp;: rechargez la page.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {signedOffers.map((offer) => (
                    <li key={offer.documentId}>
                      <Link
                        href={`/acquereurs/${buyer.id}/offre/${offer.documentId}`}
                        className="text-sm font-semibold text-brand-darker underline"
                        data-testid="buyer-offer-signed"
                      >
                        Signée le {buyerDateLabel(offer.signedAt)}
                        {offer.answer
                          ? ''
                          : ` · en attente du vendeur jusqu’au ${frenchDay(offer.validUntil)}`}
                      </Link>
                      {offer.answer && offer.decidedAt ? (
                        <>
                          {' '}
                          <OfferAnswerBadge decision={offer.answer} decidedAt={offer.decidedAt} />
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {/* Ce que le conseiller a écarté pour lui, sans lui en parler (M139) : replié. */}
          {dismissedCount > 0 ? (
            <div className="py-4">
              <BuyerDismissed
                entries={followUp}
                visitRows={visitRows}
                open={dismissedPending}
                budgetMax={buyer.budgetMax}
                titleClassName={nestedTitle}
                lineClassName={foldLine}
              />
            </div>
          ) : null}

          {sale == null && !readinessOutside ? readinessFold(true) : null}

          {/* Ce qui s'est passé : lu dans les tables, rien de plus ; replié (Lancement 10). */}
          <details className="group/fold py-4" data-testid="buyer-timeline" open={history.failed}>
            <summary className={`${foldSummary} ${foldLine}`}>
              <span aria-hidden className={`${foldChevron} group-open/fold:rotate-90`}>
                ▸
              </span>
              <h3 className={nestedTitle}>Ce qui s’est passé</h3>
              <span className={foldLineWrap} data-testid="buyer-timeline-line">
                <span className="hidden sm:inline">· </span>
                {timelineLine(
                  timeline.length,
                  timeline[0] ? formatRelativeDay(timeline[0].at, now) : null,
                )}
              </span>
            </summary>
            <div className="mt-3 flex flex-col gap-2">
              {history.failed ? (
                <p role="alert" className="text-sm font-semibold text-red-700">
                  Une partie de l’historique n’a pas pu être lue&nbsp;: rechargez la page.
                </p>
              ) : null}
              <ol className="flex flex-col">
                {timeline.map((entry, index) => (
                  <li
                    key={`${entry.at}-${index}`}
                    className="flex gap-6 border-t border-zinc-100 py-2 text-sm first:border-0 stage:border-white/10"
                  >
                    <span className="w-12 shrink-0 text-zinc-500 stage:text-white/60">
                      {buyerDateLabel(entry.at).slice(0, 5)}
                    </span>
                    <span className="text-zinc-800 stage:text-white/85">{entry.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          </details>

          <section
            id="statut"
            className="flex scroll-mt-6 flex-col gap-3 py-4 text-sm"
            data-testid="buyer-status-block"
          >
            <h3 className={subTitle}>Son statut</h3>
            <BuyerStatusActions buyer={buyer} />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <BuyerArchiveButton buyerId={buyer.id} name={buyer.name} />
              <span className="text-xs text-zinc-500 stage:text-white/60">
                Fiche du {buyerDateLabel(buyer.createdAt)}
              </span>
            </div>
          </section>
        </div>
      </details>

      {/* La recherche se modifie sur demande : « Modifier sa recherche », sous ses critères, ouvre
          le formulaire ici. Un pli, pour le refermer sans perdre une saisie en cours. */}
      {modifier === '1' ? (
        <details
          id="recherche"
          className="group/fold scroll-mt-6"
          data-testid="buyer-form-details"
          open
        >
          <summary className={foldSummary}>
            <span aria-hidden className={`${foldChevron} group-open/fold:rotate-90`}>
              ▸
            </span>
            <h2 className="font-title text-lg font-semibold text-brand-deep stage:text-white">
              Sa recherche
            </h2>
          </summary>
          <div className="mt-5 max-w-3xl">
            <BuyerForm buyer={buyer} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
