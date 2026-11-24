import Link from 'next/link';

import { emptyState, kickerLabel, link, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { redirect } from 'next/navigation';

import { readVisitLines } from '@/features/buyer-presentation/queries/get-visit-requests';
import { getLoopTasks } from '@/features/buyers/queries/get-loop-properties';
import { SuiviLeadProvider } from '@/features/meeting-conclusion/components/suivi-lead';
import { SuiviRow, type SuiviFrieze } from '@/features/meeting-conclusion/components/suivi-row';
import {
  readMarketUpdates,
  type MarketUpdateEntry,
} from '@/features/market-update/queries/list-market-updates';
import {
  emptySellerInsights,
  getSellerInsights,
} from '@/features/meeting-conclusion/queries/get-seller-insights';
import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import {
  buildDossierFollowUp,
  type DossierFollowUp,
} from '@/features/meeting-conclusion/services/dossier-follow-up';
import { parisDay, sortContacts } from '@/features/meeting-conclusion/services/follow-up-contacts';
import {
  SUIVI_GROUPS,
  SUIVI_GROUP_LABELS,
  filterSuiviByGroup,
  filterSuiviByMotive,
  followUpMotiveCounts,
  parseFollowUpMotive,
  parseSuiviGroup,
  sortSuivi,
  suiviCounts,
  type SuiviGroup,
} from '@/features/meeting-conclusion/services/filter-suivi';
import { cardStep } from '@/features/meeting-conclusion/services/suivi-step-labels';
import {
  competitorCounts,
  prospectingCounts,
  suiviTaskInputs,
  visitCounts,
} from '@/features/meeting-conclusion/services/suivi-task-inputs';
import {
  dossierTasks,
  isTaskDue,
  nextMarketUpdateOn,
  nextStep,
  taskLateDays,
} from '@/features/meeting-conclusion/services/suivi-tasks';
import {
  FOLLOW_UP_MOTIVES,
  FOLLOW_UP_MOTIVE_LABELS,
  type FollowUpMotive,
} from '@/features/meeting-conclusion/types';
import { readRuledOut } from '@/features/buyers/queries/read-seen-properties';
import {
  loadAgencyBuyers,
  loadLoopProperties,
} from '@/features/buyers/queries/get-property-buyers';
import { heldOffers } from '@/features/buyers/services/proposable';
import { buyerInSentence } from '@/features/meeting-conclusion/services/suivi-step-labels';
import { getAgencyOfferAnswers } from '@/features/purchase-offer/queries/get-offer-answers';
import { projectReadyBuyers } from '@/features/today/services/mandate-alerts';
import { getAgencyBranding } from '@/features/branding/queries/get-agency-branding';
import { documentAgencyName } from '@/features/prospecting-file/services/document-name';
import { withoutExamples } from '@/features/welcome/services/example-exclusion';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import { getAgency } from '@/lib/auth/get-agency';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

type SuiviPageProps = {
  searchParams: Promise<{
    issue?: string;
    motif?: string;
    acquereur?: string;
    relancer?: string;
    point?: string;
  }>;
};

const chip =
  'rounded-full border px-3 py-1 text-sm font-semibold whitespace-nowrap transition-colors';
// Mission 146 — la pastille choisie en bleu clair : le seul plein de l'écran est une étape (M143).
const chipActive = `${chip} border-brand bg-brand-soft text-brand-deep stage:bg-white/10 stage:text-white`;
const chipIdle = `${chip} border-zinc-200 bg-white text-zinc-600 hover:border-brand hover:text-brand-deep stage:border-white/15 stage:bg-white/5 stage:text-white/70`;

const groupHref = (group: SuiviGroup | null): string =>
  group == null ? '/suivi' : `/suivi?issue=${group}`;

// Mission 96 — le filtre par motif ne porte que sur les « à relancer » : l'adresse le dit.
const motiveHref = (motive: FollowUpMotive): string => `/suivi?issue=follow_up&motif=${motive}`;

// Mission 54 — le Suivi qui sert : filtrer, rapprocher un acheteur, faire évoluer l'issue.
// Mission 86 — il se lit d'un coup d'œil : des compteurs qui filtrent, une ligne courte par
// dossier, une seule action selon l'issue. « Tous » ne masque rien (règle M52).
export default async function SuiviPage({ searchParams }: SuiviPageProps) {
  const { issue, motif, acquereur, relancer, point } = await searchParams;
  // Mission 130 — le rapprochement acquéreur a quitté le Suivi pour le mode Acquéreur : un ancien
  // lien (« Rapprocher » d'une fiche, M117) y mène, ses critères avec lui.
  if (acquereur) {
    redirect(`/acquereurs/rapprochement?acquereur=${encodeURIComponent(acquereur)}`);
  }
  const motive = parseFollowUpMotive(motif);
  // Un motif choisi ne montre que des « à relancer ».
  const group = motive != null ? 'follow_up' : parseSuiviGroup(issue);

  // Mission 128 B — ce qui ne dépend de rien part ensemble, puis ce qui dépend des dossiers et
  // du profil.
  const [allDossiers, profile, branding, visitRead] = await Promise.all([
    getSuiviDossiers(),
    getProfile(),
    getAgencyBranding(),
    // Mission 130 — les visites demandées sur les mandats de l'agence (M119).
    readVisitLines(),
  ]);
  const visits = visitRead.lines;
  // Mission 97 — un dossier d'exemple se voit dans la liste (badge « Exemple »), mais ne compte
  // nulle part : compteurs, « À faire aujourd'hui », motifs.
  const counted = withoutExamples(allDossiers);
  const projectIds = allDossiers.map((dossier) => dossier.project.id);
  const followUpIds = withoutExamples(allDossiers)
    .filter((dossier) => dossier.conclusion?.outcome === 'follow_up')
    .map((dossier) => dossier.project.id);
  const [{ cards }, insights, agency, pointRead, mandateRead, agencyBuyers, loop, offers] =
    await Promise.all([
      getAgencyProspecting(counted),
      getSellerInsights(projectIds),
      profile ? getAgency(profile.agency_id) : null,
      // Mission 127 — les points marché de chaque dossier.
      profile
        ? createClient().then((supabase) =>
            readMarketUpdates(supabase, profile.agency_id, projectIds),
          )
        : { byProject: new Map<string, MarketUpdateEntry[]>(), failed: false },
      // Mission 134 — les acquéreurs prêts de chaque mandat (« Acquéreurs · N »).
      profile
        ? getLoopTasks(profile.agency_id, new Date())
        : { tasks: [], readyByProject: new Map<string, number>(), failed: false },
      // Mission 145 — les acquéreurs prêts d'un vendeur à relancer (l'argument pour rentrer le
      // mandat), et l'offre acceptée d'un mandat (« Offre acceptée · famille Keller »).
      profile ? loadAgencyBuyers(profile.agency_id) : null,
      profile ? loadLoopProperties(profile.agency_id, followUpIds) : null,
      profile
        ? createClient().then((supabase) => getAgencyOfferAnswers(supabase, profile.agency_id))
        : null,
    ]);
  const dismissals = profile
    ? await createClient().then((supabase) => readRuledOut(supabase, profile.agency_id))
    : null;
  const nowForBuyers = new Date();
  const followUpReady = new Map<string, number>();
  if (agencyBuyers && !agencyBuyers.failed && loop && !loop.failed && dismissals != null) {
    for (const id of followUpIds) {
      followUpReady.set(
        id,
        projectReadyBuyers(
          id,
          agencyBuyers.buyers,
          agencyBuyers.progress,
          loop.properties.get(id),
          dismissals,
          nowForBuyers,
        ),
      );
    }
  }
  // Un mandat sous offre acceptée (M145 A) : l'acquéreur de sa plus récente offre acceptée.
  const heldBy = new Map<string, { buyerId: string; name: string }>();
  if (offers) {
    for (const [projectId, answer] of heldOffers(offers)) {
      if (answer.buyerId) {
        heldBy.set(projectId, {
          buyerId: answer.buyerId,
          // « famille Keller » : le nom dans la phrase, sans son article.
          name: buyerInSentence(answer.buyerName).replace(/^la /, ''),
        });
      }
    }
  }
  const marketUpdates = pointRead.byProject;
  const signature = {
    advisorFirstName: profile?.first_name ?? null,
    agencyName: documentAgencyName(branding?.documentName, agency?.name) || null,
  };
  const now = new Date();
  const today = parisDay(now);

  // Mission 96 — pour chaque dossier : ce que le vendeur a dit, ses relances, le délai depuis
  // le dernier contact et le message proposé. Calculé ici, côté serveur.
  const followUps = new Map<string, DossierFollowUp>();
  for (const dossier of allDossiers) {
    const own = insights.get(dossier.project.id) ?? emptySellerInsights();
    followUps.set(
      dossier.project.id,
      buildDossierFollowUp({
        readyBuyers: followUpReady.get(dossier.project.id) ?? 0,
        conclusion: dossier.conclusion,
        liveStartedAt: dossier.project.live_started_at,
        liveEndedAt: dossier.project.live_ended_at,
        competitors: own.competitors,
        dangerous: own.dangerous,
        contacts: own.contacts,
        now,
        signature,
      }),
    );
  }
  const lastContacts = new Map(
    [...followUps].map(([projectId, followUp]) => [projectId, followUp.lastContactAt]),
  );

  // Mission 130 — les tâches : « À faire aujourd'hui » pour toute l'agence, et la prochaine étape
  // de chaque carte.
  const lastPoints = new Map<string, string>();
  for (const [projectId, entries] of marketUpdates) {
    if (entries[0]) lastPoints.set(projectId, entries[0].madeAt);
  }
  const inputs = suiviTaskInputs({
    dossiers: allDossiers,
    contacts: new Map(
      [...followUps].map(([projectId, followUp]) => [projectId, followUp.contacts]),
    ),
    lastPoints,
    cards,
    visits,
    pointsUnknown: pointRead.failed,
    now,
  });
  const prospecting = prospectingCounts(cards);
  const competitors = competitorCounts(cards);
  const visitsByProject = visitCounts(visits);
  const inputById = new Map(inputs.map((input) => [input.projectId, input]));

  const motiveCounts = followUpMotiveCounts(counted);
  // Les « à relancer » du plus ancien contact au plus récent.
  const dossiers = sortSuivi(
    filterSuiviByMotive(filterSuiviByGroup(allDossiers, group), motive),
    lastContacts,
  );
  const counts = suiviCounts(counted);
  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Après le rendez-vous</span>
        <h1 className={pageTitle}>Suivi</h1>
        <p className={pageSubtitle}>Chaque vendeur après le rendez-vous, et sa prochaine étape.</p>
      </div>
      {/* Mission 145 — ce qu'il y a à faire aujourd'hui vit dans « Aujourd'hui » (remplace M130 A,
          le bloc « À faire aujourd'hui » du Suivi). */}
      <p className="text-sm text-zinc-600 stage:text-white/70" data-testid="suivi-today-link">
        Ce que vous avez à faire aujourd’hui :{' '}
        <Link href="/aujourdhui" className={`${link} font-semibold`}>
          Aujourd’hui ›
        </Link>
      </p>

      {allDossiers.length === 0 ? (
        <div className={emptyState}>
          <p className="font-title text-lg font-semibold text-zinc-700 stage:text-white/85">
            Aucun dossier conclu pour le moment.
          </p>
          <p className="mt-1 text-sm text-zinc-500 stage:text-white/60">
            Un dossier arrive ici une fois le rendez-vous conclu depuis le Live.
          </p>
        </div>
      ) : (
        <>
          {/* Une lecture en échec n'est jamais lue comme « rien » (M98). */}
          {visitRead.failed ? (
            <p role="alert" className="text-sm font-semibold text-red-700">
              Les visites demandées n’ont pas pu être lues : rechargez la page.
            </p>
          ) : null}
          {pointRead.failed ? (
            <p role="alert" className="text-sm font-semibold text-red-700">
              Les Points marché n’ont pas pu être lus : rechargez la page.
            </p>
          ) : null}
          {mandateRead.failed ? (
            <p role="alert" className="text-sm font-semibold text-red-700">
              Les acquéreurs n’ont pas pu être lus : rechargez la page.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2" data-testid="suivi-filters">
            <Link
              href="/suivi"
              aria-current={group === null ? 'true' : undefined}
              className={group === null ? chipActive : chipIdle}
            >
              Tous · {counted.length}
            </Link>
            {SUIVI_GROUPS.map((value) => (
              <Link
                key={value}
                href={groupHref(group === value && motive == null ? null : value)}
                aria-current={group === value ? 'true' : undefined}
                className={group === value && motive == null ? chipActive : chipIdle}
              >
                {SUIVI_GROUP_LABELS[value]} · {counts[value]}
              </Link>
            ))}
          </div>

          {/* Mission 96 — le filtre par motif, sous « À relancer » actif seulement (M130). */}
          {group === 'follow_up' && motiveCounts.size > 0 ? (
            <div
              className="flex flex-wrap items-center gap-2"
              data-testid="follow-up-motive-filter"
            >
              <span className="text-xs font-semibold text-zinc-500 stage:text-white/60">
                Pourquoi&nbsp;:
              </span>
              {FOLLOW_UP_MOTIVES.filter((value) => motiveCounts.has(value)).map((value) => (
                <Link
                  key={value}
                  href={motive === value ? groupHref('follow_up') : motiveHref(value)}
                  aria-current={motive === value ? 'true' : undefined}
                  className={motive === value ? chipActive : chipIdle}
                >
                  {FOLLOW_UP_MOTIVE_LABELS[value]} · {motiveCounts.get(value)}
                </Link>
              ))}
            </div>
          ) : null}

          {dossiers.length === 0 ? (
            <div className={emptyState}>
              <p className="text-sm text-zinc-500 stage:text-white/60">
                Aucun vendeur dans ce filtre.
              </p>
            </div>
          ) : (
            (() => {
              // Mission 146 — chaque carte, puis la première dont l'étape est due : c'est elle qui
              // porte le seul bouton plein de l'écran (`SuiviLeadProvider`).
              const cards = dossiers.map((dossier) => {
                const id = dossier.project.id;
                const input = inputById.get(id)!;
                const tasks = dossierTasks(input);
                const task = nextStep(tasks, today);
                const followUp = followUps.get(id)!;
                const latest = sortContacts(followUp.contacts)[0] ?? null;
                const entries = marketUpdates.get(id) ?? [];
                const latestEntry = entries[0] ?? null;
                const own = prospecting.get(id) ?? {
                  total: 0,
                  ready: 0,
                  toConfirm: 0,
                  done: 0,
                  declined: 0,
                  readySince: null,
                };
                const competitorCount = competitors.get(id) ?? 0;
                const outcome = dossier.conclusion?.outcome ?? null;
                const pointTask = tasks.find((item) => item.kind === 'market_update') ?? null;
                const nextPointOn =
                  competitorCount > 0 && !pointRead.failed
                    ? nextMarketUpdateOn(
                        dossier.conclusion?.signedAt ?? null,
                        dossier.conclusion?.concludedAt ?? null,
                        latestEntry?.madeAt ?? null,
                      )
                    : null;
                const frieze: SuiviFrieze | null =
                  outcome === 'signed' && !dossier.project.is_example
                    ? {
                        prospecting: own,
                        competitorCount,
                        nextPointOn,
                        pointDue: pointTask != null && isTaskDue(pointTask, today),
                        pointLateDays: pointTask ? taskLateDays(pointTask, today) : 0,
                        latestPointOn: latestEntry ? parisDay(new Date(latestEntry.madeAt)) : null,
                        visits: visitsByProject.get(id) ?? { done: 0, pending: 0 },
                        pointsUnknown: pointRead.failed,
                        visitsUnknown: visitRead.failed,
                      }
                    : null;
                const step = cardStep(
                  task,
                  {
                    outcome,
                    sellerName: dossier.project.seller_name ?? 'Dossier vendeur',
                    isExample: dossier.project.is_example === true,
                    competitorCount,
                    toConfirmCount: own.toConfirm,
                    declinedCount: own.declined,
                    latestPoint: latestEntry
                      ? {
                          id: latestEntry.id,
                          madeOn: parisDay(new Date(latestEntry.madeAt)),
                          line: latestEntry.line,
                        }
                      : null,
                    outcomeChangedOn: dossier.conclusion?.outcomeChangedAt
                      ? parisDay(new Date(dossier.conclusion.outcomeChangedAt))
                      : null,
                    datePosed: task?.datePosed ?? true,
                    lastContactNote: latest
                      ? { on: parisDay(new Date(latest.contactedAt)), note: latest.note }
                      : null,
                  },
                  today,
                );
                return { id, outcome, entries, followUp, step, frieze, dossier };
              });
              const dueIds = cards
                .filter((card) => card.step.button?.primary)
                .map((card) => card.id);
              return (
                <SuiviLeadProvider dueIds={dueIds}>
                  <ul className="flex flex-col gap-3">
                    {cards.map(({ id, outcome, entries, followUp, step, frieze, dossier }) => (
                      <SuiviRow
                        key={id}
                        dossier={dossier}
                        followUp={followUp}
                        marketUpdates={entries}
                        step={step}
                        frieze={frieze}
                        initialPanel={relancer === id ? 'relance' : point === id ? 'point' : null}
                        readyBuyers={mandateRead.readyByProject.get(id) ?? null}
                        followUpReadyBuyers={
                          outcome === 'follow_up' ? (followUpReady.get(id) ?? null) : null
                        }
                        acceptedOfferBuyer={outcome === 'signed' ? (heldBy.get(id) ?? null) : null}
                      />
                    ))}
                  </ul>
                </SuiviLeadProvider>
              );
            })()
          )}
        </>
      )}
    </div>
  );
}
