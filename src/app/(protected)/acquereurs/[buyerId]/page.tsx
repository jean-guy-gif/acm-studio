import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { alertOk, backLink, badgeBrand, btnSecondary, card, link } from '@/components/ui/styles';
import { BuyerAnswers } from '@/features/buyer-deck/components/buyer-answers';
import { getBuyerAnswers } from '@/features/buyer-deck/queries/get-buyer-answers';
import { loadDeck } from '@/features/buyer-deck/queries/load-deck';
import { answerSuggestions } from '@/features/buyer-deck/services/answer-suggestions';
import { deckCriteria, proposedBuyerWords } from '@/features/buyer-deck/services/buyer-deck';
import { VisitRow } from '@/features/buyer-presentation/components/visit-row';
import { getVisitLines } from '@/features/buyer-presentation/queries/get-visit-requests';
import { VISIT_OUTCOME_LABELS } from '@/features/buyer-presentation/types';
import { getVisitLetters } from '@/features/buyer-prospecting/queries/get-visit-letters';
import { BuyerArchiveButton } from '@/features/buyers/components/buyer-archive-button';
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
import { getBuyer } from '@/features/buyers/queries/get-buyers';
import { ITEM_ANSWER_REPORT } from '@/features/buyer-deck/types';
import { getBuyerHistory } from '@/features/buyers/queries/get-buyer-history';
import { sentDayLabel } from '@/features/buyers/services/loop-properties';
import { getBuyersProgress } from '@/features/buyers/queries/get-buyers-progress';
import { buyerDateLabel, buyerToCriteria } from '@/features/buyers/services/buyer-criteria';
import {
  budgetGap,
  buyerJourney,
  buyerNextAction,
  buyerTimeline,
  lastExchangeLabel,
  type JourneyStatus,
} from '@/features/buyers/services/buyer-journey';
import { NO_PROGRESS } from '@/features/buyers/services/buyer-progress';
import { BUYER_STATUS_LABELS } from '@/features/buyers/types';
import { IdealSelectionList } from '@/features/ideal-properties/components/ideal-selection-list';
import { getIdealSelection } from '@/features/ideal-properties/queries/get-ideal-selection';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  buyerCandidates,
  reconcileBuyer,
} from '@/features/meeting-conclusion/services/buyer-reconciliation';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import { withoutExamples } from '@/features/welcome/services/example-exclusion';
import { getProfile } from '@/lib/auth/get-profile';
import { getBuyerLastWatch } from '@/features/buyer-watch/queries/get-watch';
import {
  getBuyerOffers,
  getBuyerVouchers,
  getVisitVouchers,
} from '@/features/visit-voucher/queries/get-visit-vouchers';
import { frenchDay } from '@/features/purchase-offer/services/offer-dates';
import { OfferAnswerBadge } from '@/features/purchase-offer/components/offer-answer-badge';
import { visitReportLine } from '@/features/buyer-messages/report';
import { watchLine } from '@/features/buyer-watch/services/watch-schedule';
import { formatEuro } from '@/lib/format';
import { displayPhotoUrl } from '@/lib/photo-url';
import { createClient } from '@/lib/supabase/server';

// Mission 142 — une demande de visite lance « Vivre ici » en tâche de fond (`after()`), dans la
// même fonction : OpenStreetMap peut prendre jusqu'à 45 s par bien. La limite, gardée large.
export const maxDuration = 300;

export const metadata: Metadata = { title: 'Fiche acquéreur — ACM Studio' };

type BuyerPageProps = {
  params: Promise<{ buyerId: string }>;
  searchParams: Promise<{
    enregistre?: string;
    modifier?: string;
    rapide?: string;
    ajuste?: string;
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
const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  project: { label: 'Dans l’agence', className: 'bg-emerald-50 text-emerald-700' },
  competitor: { label: 'Concurrent', className: 'bg-zinc-100 text-zinc-600' },
  listing: { label: 'Marché', className: 'bg-brand-soft text-brand-deep' },
};

// Mission 117 — la fiche d'un acquéreur ; Mission 130 B — « Une seule prochaine étape » (maquette
// M130-fiche-acquereur.png) : en tête, qui il est, ses mots et ses critères, son téléphone et son
// e-mail ; ses quatre étapes ; UNE prochaine étape, en bloc plein ; sa sélection ; ce qui s'est
// passé ; « Rapprocher », gratuit. Une fiche archivée ou d'une autre agence est introuvable (M93).
export default async function BuyerPage({ params, searchParams }: BuyerPageProps) {
  const [{ buyerId }, { enregistre, modifier, rapide, ajuste }] = await Promise.all([
    params,
    searchParams,
  ]);
  const buyer = await getBuyer(buyerId);
  if (!buyer) notFound();
  const [selection, profile, allVisits, dossiers] = await Promise.all([
    getIdealSelection(buyer.id),
    getProfile(),
    getVisitLines(),
    getSuiviDossiers(),
  ]);
  const supabase = await createClient();
  const counted = withoutExamples(dossiers);
  const [loadedDeck, answers, progress, prospecting, history, lastWatch] = await Promise.all([
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
      : Promise.resolve({ selections: [], letters: [], proposals: [], events: [], failed: true }),
    // Mission 136 — son dernier passage de veille.
    profile
      ? getBuyerLastWatch(profile.agency_id, buyer.id)
      : Promise.resolve({ ok: false as const }),
  ]);
  const facts = progress.get(buyer.id) ?? NO_PROGRESS;
  const ownVisits = allVisits.filter((line) => line.buyerId === buyer.id);
  // Mission 120 — ses visites demandées, chacune avec l'action qui convient et l'état du courrier.
  const visits = ownVisits.filter((line) => line.visitedAt == null);
  // Mission 137 — et le bon de visite signé de chaque visite, toutes visites de la fiche.
  const [letters, vouchers, signedVouchers, signedOffers] = await Promise.all([
    getVisitLetters(visits),
    getVisitVouchers(
      supabase,
      ownVisits.map((line) => line.id),
    ),
    profile ? getBuyerVouchers(supabase, profile.agency_id, buyer.id) : Promise.resolve([]),
    profile ? getBuyerOffers(supabase, profile.agency_id, buyer.id) : Promise.resolve([]),
  ]);
  const suggestions = answerSuggestions(buyer, buyer.ignoredSuggestions, answers.forSuggestions);
  const lastAnswer =
    (signedOffers ?? [])
      .flatMap((offer) =>
        offer.answer && offer.decidedAt
          ? [{ answer: offer.answer, decidedAt: offer.decidedAt }]
          : [],
      )
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))[0] ?? null;
  const deck = loadedDeck?.advisorDeck ?? null;
  const journey = buyerJourney(facts);
  const next = buyerNextAction(buyer, facts);
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
        ),
      ).matchCount
    : null;
  const timeline = buyerTimeline({
    createdAt: buyer.createdAt,
    selections: history.selections,
    letters: history.letters,
    proposals: history.proposals,
    events: history.events,
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
  const now = new Date();
  const lastExchange = lastExchangeLabel(exchangeDates(buyer, facts), now, buyer.createdAt);
  const readiness = buyerReadiness(buyer, facts, now);
  const telHref = buyer.phone ? `tel:${buyer.phone.replace(/[^\d+]/g, '')}` : null;

  return (
    <div className="flex max-w-6xl flex-col gap-5 md:gap-6">
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

      {/* Qui il est, ce qu'il cherche, comment le joindre. */}
      <section
        className={`${card} flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between`}
        data-testid="buyer-header"
      >
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1
              className="font-title text-3xl font-bold text-brand-darker stage:text-white"
              data-testid="buyer-name"
            >
              {buyer.name}
            </h1>
            <a href="#statut" className={`${badgeBrand} whitespace-nowrap`}>
              {BUYER_STATUS_LABELS[buyer.status]} ▾
            </a>
            {/* Mission 138 — la dernière réponse du vendeur à une de ses offres. */}
            {lastAnswer ? (
              <OfferAnswerBadge decision={lastAnswer.answer} decidedAt={lastAnswer.decidedAt} />
            ) : null}
            {readiness.state === 'ready' ? (
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
          </div>
          {words ? (
            <p className="text-lg text-zinc-800 stage:text-white/85" data-testid="buyer-words">
              «&nbsp;{words}&nbsp;»
            </p>
          ) : null}
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
            <Link
              href={`/acquereurs/${buyer.id}?modifier=1#recherche`}
              className="rounded-md bg-brand-soft px-2.5 py-1 text-sm font-semibold text-brand-deep"
            >
              Modifier
            </Link>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
          {telHref ? (
            <a href={telHref} className={btnSecondary} data-testid="buyer-phone">
              ☎ {buyer.phone}
            </a>
          ) : null}
          {buyer.email ? (
            <a href={`mailto:${buyer.email}`} className={btnSecondary}>
              ✉ E-mail
            </a>
          ) : null}
          {!telHref && !buyer.email ? (
            <Link href={`/acquereurs/${buyer.id}?modifier=1#recherche`} className={link}>
              Ajouter son téléphone ou son e-mail
            </Link>
          ) : null}
          <span className="text-xs text-zinc-500 stage:text-white/60">
            Fiche du {buyerDateLabel(buyer.createdAt)}
            {lastExchange ? ` · ${lastExchange}` : ''}
          </span>
        </div>
      </section>

      {/* Ses quatre étapes. */}
      <ol
        className={`${card} grid grid-cols-2 overflow-hidden md:grid-cols-4`}
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Sa sélection. */}
          {deck ? (
            <section className={`${card} flex flex-col gap-3 p-5`} data-testid="ideal-selection">
              <h2 className="font-title text-xl font-bold text-brand-darker stage:text-white">
                Sa sélection · {deck.items.length} bien{deck.items.length > 1 ? 's' : ''}
              </h2>
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
                          <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
                            {item.item.label}
                          </span>
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
                          {item.pitch ? ` · « ${item.pitch} »` : ''}
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
            <IdealSelectionList selection={selection} />
          ) : null}

          {answers.lines.length > 0 ? (
            <div id="reponses" className="scroll-mt-6">
              <BuyerAnswers buyerId={buyer.id} answers={answers.lines} suggestions={suggestions} />
            </div>
          ) : null}

          {visits.length > 0 ? (
            <section
              className={`${card} flex flex-col gap-3 p-5`}
              data-testid="buyer-visits-section"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-title text-lg font-semibold text-brand-deep stage:text-white">
                  Ses visites à organiser
                </h2>
              </div>
              <ul className="flex flex-col gap-2">
                {visits.map((line) => (
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

          {/* Mission 137 — ses bons de visite : gardés sur la fiche, même ses visites toutes faites. */}
          {ownVisits.length > 0 || signedVouchers == null || signedVouchers.length > 0 ? (
            <section className={`${card} flex flex-col gap-3 p-5`} data-testid="buyer-vouchers">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-title text-lg font-semibold text-brand-deep stage:text-white">
                  Ses bons de visite
                </h2>
                {ownVisits.length > 0 ? (
                  <span className="flex flex-wrap gap-2">
                    <Link
                      href={`/acquereurs/${buyer.id}/bon-de-visite`}
                      className={btnSecondary}
                      data-testid="buyer-voucher-new"
                    >
                      Bon de visite
                    </Link>
                    {/* Mission 137 B — l'offre d'achat se prépare aussi depuis la fiche (§ 11). */}
                    <Link
                      href={`/acquereurs/${buyer.id}/offre`}
                      className={btnSecondary}
                      data-testid="buyer-offer-new"
                    >
                      Offre d’achat
                    </Link>
                  </span>
                ) : null}
              </div>
              {signedVouchers == null ? (
                <p role="alert" className="text-sm font-semibold text-red-700">
                  Les bons de visite n’ont pas pu être lus : rechargez la page.
                </p>
              ) : signedVouchers.length === 0 ? (
                <p className="text-sm text-zinc-600 stage:text-white/70">
                  Aucun bon signé pour l’instant.
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
                        {voucher.labels.length > 0 ? ` · ${voucher.labels.join(' ; ')}` : ''}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {/* Mission 137 B — ses offres d'achat : signées, et la réponse du vendeur. */}
          {signedOffers == null || signedOffers.length > 0 ? (
            <section className={`${card} flex flex-col gap-3 p-5`} data-testid="buyer-offers">
              <h2 className="font-title text-lg font-semibold text-brand-deep stage:text-white">
                Ses offres d’achat
              </h2>
              {signedOffers == null ? (
                <p role="alert" className="text-sm font-semibold text-red-700">
                  Les offres n’ont pas pu être lues : rechargez la page.
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

          {/* Mission 134 — les biens proposés, et sa réponse par le lien. */}
          {history.proposals.length > 0 ? (
            <section className={`${card} flex flex-col gap-2 p-5`} data-testid="buyer-proposals">
              <h2 className="font-title text-xl font-bold text-brand-darker stage:text-white">
                Biens proposés
              </h2>
              <ul className="flex flex-col">
                {history.proposals.map((proposal) => (
                  <li
                    key={`${proposal.at}-${proposal.label}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-100 py-2 text-sm first:border-0 stage:border-white/10"
                    data-testid="buyer-proposal"
                  >
                    <span className="text-zinc-800 stage:text-white/85">{proposal.label}</span>
                    <span className="text-zinc-500 stage:text-white/60">
                      proposé le {sentDayLabel(proposal.at)}
                    </span>
                    {proposal.answer ? (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                        {ITEM_ANSWER_REPORT[proposal.answer]}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Ce qui s'est passé : lu dans les tables, rien de plus. */}
          <section className={`${card} flex flex-col gap-2 p-5`} data-testid="buyer-timeline">
            <h2 className="font-title text-xl font-bold text-brand-darker stage:text-white">
              Ce qui s’est passé
            </h2>
            {history.failed ? (
              <p role="alert" className="text-sm font-semibold text-red-700">
                Une partie de l’historique n’a pas pu être lue : rechargez la page.
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
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          {/* UNE prochaine étape, en bloc plein. */}
          <section
            className="flex flex-col gap-3 rounded-2xl bg-brand-deep p-5 text-white"
            data-testid="buyer-next-step"
          >
            <span className="text-[11px] font-bold tracking-[0.14em] text-white/70 uppercase">
              Prochaine étape
            </span>
            {facts.unread ? (
              <p role="alert" className="text-sm font-semibold text-white">
                L’avancement de cette fiche n’a pas pu être lu : rechargez la page.
              </p>
            ) : (
              <>
                <h2 className="font-title text-xl font-bold">{next.title}</h2>
                <p className="text-sm text-white/85">{next.phrase}</p>
                <Link
                  href={next.primary.href}
                  data-testid="buyer-next-button"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 font-semibold text-brand-deep hover:bg-brand-soft"
                >
                  {next.primary.label}
                </Link>
                {next.secondary ? (
                  <Link
                    href={next.secondary.href}
                    data-testid="buyer-next-secondary"
                    className="self-center text-sm text-white underline"
                  >
                    {next.secondary.label}
                  </Link>
                ) : null}
              </>
            )}
          </section>

          {/* Mission 132 — « Prêt à visiter » : son financement, et le dernier contact. */}
          <section className={`${card} flex flex-col gap-3 p-5`} data-testid="buyer-readiness">
            <h2 className="font-title text-xl font-bold text-brand-darker stage:text-white">
              Prêt à visiter ?
            </h2>
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
            />
            {/* Mission 136 — la veille : une recherche par semaine, pour un acquéreur prêt. */}
            {lastWatch.ok ? (
              <p
                className="text-sm text-zinc-600 stage:text-white/70"
                data-testid="buyer-watch-line"
              >
                {watchLine({
                  ready: readiness.state === 'ready',
                  lastRunAt: lastWatch.lastRunAt,
                  off: lastWatch.off,
                  now,
                })}
              </p>
            ) : null}
          </section>

          {/* Rapprocher, gratuit. */}
          <section className={`${card} flex flex-col gap-3 p-5`} data-testid="buyer-matching">
            <h2 className="font-title text-xl font-bold text-brand-darker stage:text-white">
              Rapprocher
            </h2>
            <p className="text-sm text-zinc-600 stage:text-white/70">
              Vos mandats, vendeurs à relancer et concurrents qui correspondent à sa recherche.
              Gratuit.
            </p>
            {matches == null ? (
              <p role="alert" className="text-sm font-semibold text-zinc-600 stage:text-white/70">
                Correspondances illisibles pour l’instant : rechargez la page.
              </p>
            ) : (
              <Link
                href={`/acquereurs/rapprochement?acquereur=${buyer.id}#rapprochement`}
                className={`${btnSecondary} w-full`}
                data-testid="buyer-matches-link"
              >
                Voir les correspondances · {matches}
              </Link>
            )}
          </section>

          <section id="statut" className="flex scroll-mt-6 flex-col gap-3 text-sm">
            <BuyerStatusActions buyer={buyer} />
            <BuyerArchiveButton buyerId={buyer.id} name={buyer.name} />
          </section>
        </aside>
      </div>

      {/* La recherche se modifie sur demande, repliée. */}
      <details
        id="recherche"
        className="group scroll-mt-6"
        data-testid="buyer-form-details"
        open={modifier === '1'}
      >
        <summary className="cursor-pointer font-title text-lg font-semibold text-brand-deep stage:text-white">
          Modifier sa recherche
        </summary>
        <div className="mt-5 max-w-3xl">
          <BuyerForm buyer={buyer} />
        </div>
      </details>
    </div>
  );
}
