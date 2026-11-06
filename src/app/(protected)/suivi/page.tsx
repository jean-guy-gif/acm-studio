import Link from 'next/link';

import { emptyState, kickerLabel, link, pageSubtitle, pageTitle } from '@/components/ui/styles';
import { redirect } from 'next/navigation';

import { readVisitLines } from '@/features/buyer-presentation/queries/get-visit-requests';
import { getMandateBuyers, type MandateBuyers } from '@/features/buyers/queries/get-mandate-buyers';
import { getBuyerRecontactTasks } from '@/features/buyers/queries/get-buyer-recontact-tasks';
import { SuiviRow, type SuiviFrieze } from '@/features/meeting-conclusion/components/suivi-row';
import { SuiviTaskButton } from '@/features/meeting-conclusion/components/suivi-task-button';
import { SuiviTaskCountSync } from '@/features/meeting-conclusion/components/suivi-task-count';
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
import {
  cardStep,
  nothingTodayLabel,
  taskLine,
} from '@/features/meeting-conclusion/services/suivi-step-labels';
import {
  competitorCounts,
  prospectingCounts,
  suiviTaskInputs,
  visitCounts,
} from '@/features/meeting-conclusion/services/suivi-task-inputs';
import {
  buildSuiviTaskList,
  dossierTasks,
  isTaskDue,
  nextMarketUpdateOn,
  nextStep,
  taskLateDays,
} from '@/features/meeting-conclusion/services/suivi-tasks';
import {
  FOLLOW_UP_MOTIVES,
  FOLLOW_UP_MOTIVE_LABELS,
  followUpMotiveLabel,
  type FollowUpMotive,
} from '@/features/meeting-conclusion/types';
import { propertyLabel } from '@/features/projects/services/property-label';
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
const chipActive = `${chip} border-brand-deep bg-brand-deep text-white`;
const chipIdle = `${chip} border-zinc-200 bg-white text-zinc-600 hover:border-brand hover:text-brand-deep stage:border-white/15 stage:bg-white/5 stage:text-white/70`;

// Mission 130 — la pastille numérotée d'une tâche : la couleur du groupe du vendeur.
const TASK_DOT = {
  follow_up: 'bg-orange-500',
  signed: 'bg-emerald-600',
  // Mission 132 — la couleur du mode Acquéreur (M118).
  buyer: 'bg-emerald-500',
};

// Cinq tâches à l'écran, trois sur téléphone (designer, 05/11) ; les autres derrière « Voir ».
const TASKS_SHOWN = 5;
const TASKS_SHOWN_PHONE = 3;

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
  // Mission 133 — les mandats signés (hors exemple) appellent leurs acquéreurs prêts.
  const mandates = counted
    .filter((dossier) => dossier.conclusion?.outcome === 'signed')
    .map((dossier) => ({
      projectId: dossier.project.id,
      signedAt: dossier.conclusion?.signedAt ?? dossier.conclusion?.concludedAt ?? null,
    }));
  const [{ cards }, insights, agency, pointRead, buyerRead, mandateRead] = await Promise.all([
    getAgencyProspecting(counted),
    getSellerInsights(projectIds),
    profile ? getAgency(profile.agency_id) : null,
    // Mission 127 — les points marché de chaque dossier.
    profile
      ? createClient().then((supabase) =>
          readMarketUpdates(supabase, profile.agency_id, projectIds),
        )
      : { byProject: new Map<string, MarketUpdateEntry[]>(), failed: false },
    // Mission 132 — les acquéreurs sans échange depuis 30 jours.
    profile ? getBuyerRecontactTasks(profile, new Date()) : { tasks: [], failed: false },
    profile
      ? getMandateBuyers(profile.agency_id, mandates, new Date())
      : { byProject: new Map<string, MandateBuyers>(), failed: false },
  ]);
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
    buyersToPropose: new Map(
      [...mandateRead.byProject].map(([projectId, entry]) => [projectId, entry.toPropose]),
    ),
  });
  const taskList = buildSuiviTaskList(inputs, now, buyerRead.tasks);
  const prospecting = prospectingCounts(cards);
  const competitors = competitorCounts(cards);
  const visitsByProject = visitCounts(visits);
  const dossierById = new Map(allDossiers.map((dossier) => [dossier.project.id, dossier]));
  const inputById = new Map(inputs.map((input) => [input.projectId, input]));
  const signedDay = (dossier: {
    conclusion: { signedAt: string | null; concludedAt: string | null } | null;
  }) => {
    const iso = dossier.conclusion?.signedAt ?? dossier.conclusion?.concludedAt ?? null;
    return iso ? parisDay(new Date(iso)) : null;
  };

  const motiveCounts = followUpMotiveCounts(counted);
  // Les « à relancer » du plus ancien contact au plus récent.
  const dossiers = sortSuivi(
    filterSuiviByMotive(filterSuiviByGroup(allDossiers, group), motive),
    lastContacts,
  );
  const counts = suiviCounts(counted);
  const shownTasks = taskList.dues.slice(0, TASKS_SHOWN);
  const moreTasks = taskList.dues.slice(TASKS_SHOWN);

  // `copy` : la copie d'une tâche dans la liste dépliable du téléphone (sans repère de test).
  const renderTask = (task: (typeof taskList.dues)[number], index: number, copy = false) => {
    const dossier = dossierById.get(task.projectId);
    const line = taskLine(
      task,
      {
        motiveLabel:
          dossier?.conclusion?.outcome === 'follow_up'
            ? followUpMotiveLabel(
                dossier.conclusion.followUpMotive ?? null,
                dossier.conclusion.followUpMotiveDetail ?? null,
              )
            : null,
        lastContactDays: followUps.get(task.projectId)?.lastContactDays ?? null,
        signedOn: dossier ? signedDay(dossier) : null,
        propertyLabel: dossier ? propertyLabel(dossier.property) : null,
      },
      today,
    );
    return (
      <li
        key={`${task.buyerId ?? task.projectId}-${task.kind}`}
        data-testid={copy ? undefined : 'suivi-task'}
        className={`flex items-start gap-3 border-t border-zinc-100 py-2 first:border-0 sm:items-center stage:border-white/10 ${
          !copy && index >= TASKS_SHOWN_PHONE ? 'max-sm:hidden' : ''
        }`}
      >
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
            task.kind === 'follow_up'
              ? TASK_DOT.follow_up
              : task.kind === 'buyer_recontact'
                ? TASK_DOT.buyer
                : TASK_DOT.signed
          }`}
          aria-hidden
        >
          {index + 1}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5 leading-snug sm:flex-row sm:items-center sm:gap-3">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
              {line.title}
            </span>
            <span className="text-sm text-zinc-500 stage:text-white/60">
              {line.detail}
              {line.late ? (
                <span className="font-semibold text-orange-700">{line.late}</span>
              ) : null}
            </span>
          </span>
          <SuiviTaskButton
            href={line.href}
            label={line.button}
            open={
              task.kind === 'follow_up'
                ? { projectId: task.projectId, panel: 'relance' }
                : task.kind === 'market_update'
                  ? { projectId: task.projectId, panel: 'point' }
                  : null
            }
          />
        </span>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-col gap-1.5">
        <span className={kickerLabel}>Après le rendez-vous</span>
        <h1 className={pageTitle}>Suivi</h1>
        <p className={pageSubtitle}>Ce que vous avez à faire, puis chaque vendeur.</p>
      </div>
      <SuiviTaskCountSync count={taskList.dues.length} />

      {/* Mission 132 — sans dossier conclu, « À faire aujourd'hui » reste là pour les acquéreurs : une
          tâche due ou à venir, ou leur lecture en échec (jamais lue comme « rien à faire », M98). */}
      {allDossiers.length === 0 &&
      taskList.dues.length === 0 &&
      taskList.next == null &&
      !buyerRead.failed ? (
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
          <section
            data-testid="suivi-today"
            className="rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 shadow-card stage:border-white/10 stage:bg-white/5 stage:shadow-none"
          >
            <h2 className="font-title text-xl font-bold text-brand-darker stage:text-white">
              À faire aujourd’hui
              {taskList.dues.length > 0 ? ` · ${taskList.dues.length}` : ''}
            </h2>
            {taskList.dues.length === 0 ? (
              visitRead.failed ||
              pointRead.failed ||
              buyerRead.failed ||
              mandateRead.failed ? null : (
                <p className="mt-2 text-sm text-zinc-600 stage:text-white/70">
                  {nothingTodayLabel(taskList.next)}
                </p>
              )
            ) : (
              <>
                <ol className="mt-2 flex flex-col">
                  {shownTasks.map((task, index) => renderTask(task, index))}
                </ol>
                {moreTasks.length > 0 ? (
                  <details className="max-sm:hidden">
                    <summary className={`${link} cursor-pointer text-sm`}>
                      Voir{' '}
                      {moreTasks.length > 1
                        ? `les ${moreTasks.length} autres tâches`
                        : 'l’autre tâche'}{' '}
                      ▾
                    </summary>
                    <ol className="flex flex-col">
                      {moreTasks.map((task, index) => renderTask(task, TASKS_SHOWN + index))}
                    </ol>
                  </details>
                ) : null}
                {taskList.dues.length > TASKS_SHOWN_PHONE ? (
                  <details className="sm:hidden">
                    <summary className={`${link} cursor-pointer text-sm`}>
                      Voir{' '}
                      {taskList.dues.length - TASKS_SHOWN_PHONE > 1
                        ? `les ${taskList.dues.length - TASKS_SHOWN_PHONE} autres tâches`
                        : 'l’autre tâche'}{' '}
                      ▾
                    </summary>
                    <ol className="flex flex-col">
                      {taskList.dues
                        .slice(TASKS_SHOWN_PHONE)
                        .map((task, index) => renderTask(task, TASKS_SHOWN_PHONE + index, true))}
                    </ol>
                  </details>
                ) : null}
              </>
            )}
            {/* Mission 130 — une lecture en échec n'est jamais lue comme « rien à faire » (M98). */}
            {visitRead.failed ? (
              <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
                Les visites demandées n’ont pas pu être lues : rechargez la page.
              </p>
            ) : null}
            {pointRead.failed ? (
              <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
                Les Points marché n’ont pas pu être lus : rechargez la page.
              </p>
            ) : null}
            {buyerRead.failed || mandateRead.failed ? (
              <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
                Les acquéreurs n’ont pas pu être lus : rechargez la page.
              </p>
            ) : null}
          </section>

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
            <ul className="flex flex-col gap-3">
              {dossiers.map((dossier) => {
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
                return (
                  <SuiviRow
                    key={id}
                    dossier={dossier}
                    followUp={followUp}
                    marketUpdates={entries}
                    step={step}
                    frieze={frieze}
                    initialPanel={relancer === id ? 'relance' : point === id ? 'point' : null}
                    readyBuyers={mandateRead.byProject.get(id)?.ready ?? null}
                  />
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
