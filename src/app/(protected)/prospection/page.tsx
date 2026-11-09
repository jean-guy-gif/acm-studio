import type { Metadata } from 'next';
import Link from 'next/link';

import {
  btnPrimary,
  btnSecondary,
  emptyState,
  kickerLabel,
  pageSubtitle,
  pageTitle,
} from '@/components/ui/styles';
import { BuyerProspectLocatorWatcher } from '@/features/buyer-prospecting/components/buyer-prospect-locator-watcher';
import { getBuyerProspecting } from '@/features/buyer-prospecting/queries/get-buyer-prospecting';
import {
  buyerProspectingCard,
  parseProspectingOrigin,
} from '@/features/buyer-prospecting/services/buyer-prospect-card';
import { CompetitorLocatorWatcher } from '@/features/competitor-locator/components/competitor-locator-watcher';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import { ManualOppositionForm } from '@/features/prospecting/components/manual-opposition-form';
import { OppositionNotice } from '@/features/prospecting/components/opposition-notice';
import {
  ProspectingBoard,
  buyerOriginsOf,
} from '@/features/prospecting/components/prospecting-board';
import { ProspectingCard } from '@/features/prospecting/components/prospecting-card';
import { ProspectionFilters } from '@/features/prospecting/components/prospection-filters';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import {
  filterProspecting,
  parseProspectingTarget,
  parseSellerFilter,
  prospectionHref,
} from '@/features/prospecting/services/filter-prospecting';
import { prospectingCounters } from '@/features/prospecting/services/prospecting-status';
import { readDismissals } from '@/features/buyer-dismissals/queries/read-dismissals';
import { loadAgencyBuyers } from '@/features/buyers/queries/get-property-buyers';
import type { ProspectingRow } from '@/features/competitor-locator/services/build-prospecting-rows';
import type { CardAlert } from '@/features/today/services/mandate-alerts';
import { prospectingAlerts } from '@/features/today/services/prospecting-alerts';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Prospection — ACM Studio' };

type ProspectionPageProps = {
  searchParams: Promise<{ bien?: string; cible?: string; origine?: string }>;
};

// Mission 86 — la page Prospection : tous les concurrents à prospecter de tous les mandats
// signés de l'agence, rangés par étape. Écran CONSEILLER, jamais montré au vendeur : les
// adresses des concurrents y figurent (M75).
// Mission 98 — une carte par bien : le même bien retenu dans plusieurs mandats n'y figure, et
// n'y est compté, qu'une fois. Une adresse « Ne plus solliciter » sort du tableau.
export default async function ProspectionPage({ searchParams }: ProspectionPageProps) {
  const { bien, cible, origine } = await searchParams;

  const profile = await getProfile();
  const [{ sellers, cards }, buyerProspecting] = await Promise.all([
    getAgencyProspecting(await getSuiviDossiers()),
    profile
      ? getBuyerProspecting(await createClient(), profile.agency_id)
      : Promise.resolve({ cards: [], byComparable: new Map(), bySelectionItem: new Map() }),
  ]);
  // Mission 145 (partie B) — les acquéreurs prêts qui veulent un bien sans mandat : la même
  // fonction qu'« Aujourd'hui », pour que la carte et la tâche disent le même nombre.
  const [agencyBuyers, dismissals] = profile
    ? await Promise.all([
        loadAgencyBuyers(profile.agency_id),
        readDismissals(await createClient(), profile.agency_id),
      ])
    : [null, null];
  const readyBuyers = new Map<ProspectingRow, CardAlert>();
  if (agencyBuyers) {
    const { alerts } = prospectingAlerts(
      cards,
      buyerProspecting.cards,
      agencyBuyers,
      dismissals,
      new Date(),
    );
    for (const [card, alert] of alerts) readyBuyers.set(card.row, alert);
  }
  const sellerId = parseSellerFilter(bien, sellers);
  const target = parseProspectingTarget(cible);
  const origin = parseProspectingOrigin(origine);
  const { byComparable } = buyerProspecting;
  // Mission 120 — l'origine : les cartes des dossiers vendeurs, celles des recherches acquéreur
  // (une carte de concurrent visée par une recherche est des deux), ou tout. Un bien vendeur
  // filtré ne montre que ses concurrents.
  const shown = filterProspecting(cards, sellerId, target).filter(
    (card) => origin !== 'buyer' || buyerOriginsOf(card, byComparable).length > 0,
  );
  const buyerShown =
    origin === 'seller' || sellerId != null
      ? []
      : filterProspecting(buyerProspecting.cards.map(buyerProspectingCard), null, target).map(
          (card) => buyerProspecting.cards.find((entry) => entry.row === card.row)!,
        );
  const opposed = shown.filter((card) => card.row.opposedOn != null);
  const open = shown.filter((card) => card.row.opposedOn == null);
  const buyerOpposed = buyerShown.filter((card) => card.row.opposedOn != null);
  const buyerOpen = buyerShown.filter((card) => card.row.opposedOn == null);
  const counters = prospectingCounters([...open, ...buyerOpen].map((card) => card.row.status));
  const board = open.filter((card) => card.row.status !== 'declined');
  const declined = open.filter((card) => card.row.status === 'declined');
  const buyerBoard = buyerOpen.filter((card) => card.row.status !== 'declined');
  const buyerDeclined = buyerOpen.filter((card) => card.row.status === 'declined');
  const anything = sellers.length > 0 || buyerProspecting.cards.length > 0;
  // « Préparer tous les courriers » : pour UN bien vendeur, dès qu'un dossier est prêt.
  const lettersReady = sellerId != null && board.some((card) => card.row.status === 'ready');
  // La veille du Localisateur (M75) tourne pour chaque mandat affiché ; l'avis discret
  // (Localisateur absent, partage éteint) ne se dit qu'une fois.
  const watched = sellers.filter((seller) => sellerId == null || seller.projectId === sellerId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={kickerLabel}>Concurrents à démarcher</span>
          <h1 className={pageTitle}>Prospection</h1>
          <p className={pageSubtitle}>
            Les biens concurrents de vos mandats signés, et ceux que vos acquéreurs veulent visiter.
            Écran conseiller — jamais montré au vendeur.
          </p>
        </div>
        {anything ? (
          <div className="flex flex-wrap items-center gap-2">
            <ProspectionFilters
              sellers={sellers}
              sellerId={sellerId}
              target={target}
              origin={origin}
            />
            {lettersReady && sellerId ? (
              <Link
                href={`/prospection/courriers?bien=${sellerId}`}
                target="_blank"
                className={btnPrimary}
              >
                Préparer tous les courriers
              </Link>
            ) : null}
            {board.length > 0 ? (
              <Link
                href={prospectionHref(sellerId, target).replace(
                  '/prospection',
                  '/prospection/tournee',
                )}
                target="_blank"
                className={btnSecondary}
              >
                Imprimer ma tournée
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {!anything ? (
        <div className={emptyState}>
          <p className="font-title text-lg font-semibold text-zinc-700 stage:text-white/85">
            Aucun mandat signé pour le moment.
          </p>
          <p className="mt-1 text-sm text-zinc-500 stage:text-white/60">
            Dès qu’un rendez-vous se conclut par un mandat signé, ses concurrents retenus arrivent
            ici.
          </p>
        </div>
      ) : (
        <>
          {/* Mission 146 (partie B, C9) — les compteurs sur une ligne, de même poids ; « déclarés
              par vous » une fois, pour les mandats et les collaborations (M91, M115). */}
          <p
            className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm text-zinc-600 stage:text-white/70"
            data-testid="prospecting-counters"
          >
            {[
              { count: counters.toCanvass, label: 'à démarcher' },
              { count: counters.handed, label: 'remis' },
              { count: counters.meetings, label: 'rendez-vous' },
              {
                count: counters.mandates,
                label: counters.mandates > 1 ? 'mandats rentrés' : 'mandat rentré',
              },
              {
                count: counters.collaborations,
                label: counters.collaborations > 1 ? 'collaborations' : 'collaboration',
                testId: 'collaborations-counter',
              },
            ].map((entry) => (
              <span key={entry.label} data-testid={entry.testId} className="whitespace-nowrap">
                <span className="font-title text-lg font-bold text-zinc-900 stage:text-white">
                  {entry.count}
                </span>{' '}
                {entry.label}
              </span>
            ))}
            <span className="text-xs text-zinc-500 stage:text-white/50">· déclarés par vous</span>
          </p>

          {buyerProspecting.cards.length > 0 ? <BuyerProspectLocatorWatcher /> : null}
          {watched.map((seller, index) => (
            <CompetitorLocatorWatcher
              key={seller.projectId}
              projectId={seller.projectId}
              showNotice={index === 0}
            />
          ))}

          {shown.length + buyerShown.length === 0 ? (
            <div className={emptyState}>
              <p className="text-sm text-zinc-500 stage:text-white/60">
                Aucun bien pour ce filtre.
              </p>
            </div>
          ) : (
            <ProspectingBoard
              cards={board}
              sellerId={sellerId}
              buyerCards={buyerBoard}
              originsByComparable={byComparable}
              readyBuyers={readyBuyers}
            />
          )}

          {/* « Pas intéressé » sort du tableau, sans disparaître : compté ici, annulable. */}
          {declined.length + buyerDeclined.length > 0 ? (
            <details className="rounded-2xl border border-zinc-200 bg-white p-4 stage:border-white/10 stage:bg-white/5">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-700 stage:text-white/80">
                Pas intéressés ({declined.length + buyerDeclined.length})
              </summary>
              <ul className="mt-3 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                {declined.map((card) => (
                  <ProspectingCard
                    key={card.row.id}
                    card={card}
                    sellerId={sellerId}
                    buyerOrigins={buyerOriginsOf(card, byComparable)}
                  />
                ))}
                {buyerDeclined.map((card) => (
                  <ProspectingCard
                    key={card.prospectId}
                    card={buyerProspectingCard(card)}
                    buyerOrigins={card.origins}
                    buyerProspectId={card.prospectId}
                  />
                ))}
              </ul>
            </details>
          ) : null}

          {/* Mission 98 — « Ne plus solliciter » : hors tableau et hors compteurs, mais visible. */}
          {opposed.length + buyerOpposed.length > 0 ? (
            <details className="rounded-2xl border border-zinc-200 bg-white p-4 stage:border-white/10 stage:bg-white/5">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-700 stage:text-white/80">
                Ne plus solliciter ({opposed.length + buyerOpposed.length})
              </summary>
              <ul className="mt-3 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                {opposed.map((card) => (
                  <ProspectingCard
                    key={card.row.id}
                    card={card}
                    sellerId={sellerId}
                    buyerOrigins={buyerOriginsOf(card, byComparable)}
                  />
                ))}
                {buyerOpposed.map((card) => (
                  <ProspectingCard
                    key={card.prospectId}
                    card={buyerProspectingCard(card)}
                    buyerOrigins={card.origins}
                    buyerProspectId={card.prospectId}
                  />
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}

      {/* Mission 102 — une opposition se note aussi pour une adresse qui n'est sur aucune carte. */}
      <ManualOppositionForm />
      <OppositionNotice />
    </div>
  );
}
