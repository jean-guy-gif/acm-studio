import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { ScopeSwitch } from '@/components/socle/scope-switch';
import { StatTiles } from '@/components/socle/stat-tiles';
import { LateNote, PersonRow, RowLink, TaskCard } from '@/components/socle/task-card';
import {
  alertError,
  taskButtonClass,
  socleBtnQuiet,
  socleCardBordered,
  socleKicker,
  socleSubtitle,
  socleTitle,
} from '@/components/ui/styles';
import { buyerOthersNote } from '@/features/buyers/services/buyers-today';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { taskLine } from '@/features/meeting-conclusion/services/suivi-step-labels';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import {
  ProjectAllLink,
  ProjectHeader,
  NextStepCard,
} from '@/features/projects/components/project-summary';
import { OverviewSteps } from '@/features/projects/components/overview-steps';
import { countSellerProjects } from '@/features/projects/queries/count-seller-projects';
import { getPreparationDossiers } from '@/features/projects/queries/get-preparation-dossiers';
import { loadProjectSummary } from '@/features/projects/queries/load-project-summary';
import { nextDossierAction } from '@/features/projects/services/dossier-steps';
import {
  PREPARATION_BUTTON,
  preparationItems,
  selectedSeller,
  sellersToday,
  sellersTodayCount,
  sellerTaskButton,
  sellerTaskKey,
  sellerTodayHref,
  type SellerTodayItem,
} from '@/features/projects/services/sellers-today';
import { TodayTaskAction } from '@/features/today/components/today-task';
import {
  getToday,
  type Today,
  type TodayScope,
  type TodayTaskContext,
} from '@/features/today/queries/get-today';
import { allPeopleLabel, withScope } from '@/features/today/services/today-scope';
import { getProfile } from '@/lib/auth/get-profile';

const NO_CONTEXT: TodayTaskContext = {
  motiveLabel: null,
  lastContactDays: null,
  signedOn: null,
  propertyLabel: null,
};

// Le geste d'une tâche : celui d'« Aujourd'hui » (la carte du Suivi s'ouvre sur la relance ou le
// Point marché), à l'allure du socle, avec les mots de la maquette.
function TaskAction({
  task,
  today,
  day,
  primary,
}: {
  task: SuiviTask;
  today: Today;
  day: string;
  primary: boolean;
}) {
  const line = taskLine(task, today.context.get(task.projectId) ?? NO_CONTEXT, day);
  return (
    <TodayTaskAction
      task={task}
      href={line.href}
      label={sellerTaskButton(task)}
      primary={primary}
      look="socle"
    />
  );
}

// Le geste d'une carte : celui de sa tâche du jour, ou, pour un dossier en préparation, « Reprendre
// la préparation », qui mène à son étape à faire.
function SellerAction({
  item,
  today,
  day,
  primary,
}: {
  item: SellerTodayItem;
  today: Today;
  day: string;
  primary: boolean;
}) {
  if (item.task) return <TaskAction task={item.task} today={today} day={day} primary={primary} />;
  return (
    <Link
      href={item.href ?? `/builder/${item.projectId}`}
      className={taskButtonClass(primary, 'socle')}
    >
      {PREPARATION_BUTTON}
    </Link>
  );
}

// La refonte, lot E (maquettes REFONTE-7 et 8) — Vendeurs s'ouvre sur « à faire aujourd'hui » : une
// carte par vendeur, avec ce qu'il y a à faire et son bouton ; un seul bouton plein. Sur téléphone,
// une colonne de cartes ; sur tablette et ordinateur, la liste à gauche et, à droite, son dossier —
// sa prochaine étape, trois chiffres, « Son dossier », « Tout le dossier » —, sans changer de page
// (`?vendeur=`). Ce sont les tâches du bloc « Vendeurs » d'« Aujourd'hui » (« Mes tâches ») : mêmes
// règles, mêmes gestes. « Tous mes vendeurs » mène aux listes de Préparation, du Live et du Suivi.
// Remarques de Jean-Guy (26/11) — un dossier en préparation, modifié dans les 14 derniers jours, a
// sa carte : « Préparation en cours », « Reprendre la préparation » ; un manager choisit sa vue,
// « Mes dossiers » ou « Toute l'agence » (`?agence=1`), comme sur « Aujourd'hui », et le lien d'en
// bas compte ce qu'il dit (« Tous mes vendeurs » ou « Tous les vendeurs de l'agence »).
export async function SellersTodayView({
  selectedId,
  scope: asked = 'mine',
}: {
  selectedId?: string;
  scope?: TodayScope;
}) {
  const [today, counts, drafts, profile] = await Promise.all([
    getToday(asked),
    countSellerProjects(),
    getPreparationDossiers(false),
    getProfile(),
  ]);
  if (!today || !profile) notFound();
  const now = new Date();
  const day = parisDay(now);
  const scope = today.scope;
  const tasks = sellersToday(today.board, (projectId) => today.context.get(projectId), day);
  const preparations = preparationItems(
    drafts.map(({ project, readiness }) => ({
      projectId: project.id,
      name: project.seller_name,
      status: project.status,
      updatedAt: project.updated_at,
      advisorId: project.advisor_id,
      isExample: project.is_example,
      href: nextDossierAction(project.id, {
        status: project.status,
        hasProperty: readiness.hasProperty,
        exploitableCount: readiness.exploitableCount,
        hasDecision: readiness.hasPositioning,
        liveStarted: project.live_started_at != null,
        liveEnded: project.live_ended_at != null,
        documentOnly: project.live_presentation_mode === 'document',
      }).href,
    })),
    { scope, advisorId: profile.id, now, skip: tasks.map((item) => item.projectId) },
  );
  const items = [...tasks, ...preparations];
  const selected = selectedSeller(items, selectedId);
  // Une lecture en échec n'est jamais lue comme « rien à faire » (M98).
  const unread = today.failed.length > 0;
  const things = tasks.reduce((total, item) => total + 1 + item.others.length, 0);
  const scoped = (href: string) => withScope(href, scope);

  return (
    <div
      data-shell-wide
      data-testid="sellers-today"
      className="md:grid md:min-h-screen md:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]"
    >
      <section
        aria-label="À faire aujourd’hui"
        className="flex flex-col gap-[18px] px-5 pt-7 pb-6 md:gap-4 md:border-r md:border-[#E3E6F0] md:px-4 md:py-6 xl:gap-[18px] xl:px-6 xl:py-8 stage:border-white/10"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className={`${socleTitle} md:text-[26px] xl:text-[30px]`}>Vendeurs</h1>
            <p className={socleSubtitle} data-testid="sellers-today-count">
              {unread && tasks.length === 0
                ? 'Une partie des tâches n’a pas pu être lue'
                : sellersTodayCount(things, preparations.length)}
            </p>
          </div>
          <Link
            href="/builder/new"
            aria-label="Nouveau vendeur"
            data-testid="sellers-new"
            className={`${socleBtnQuiet} size-12 rounded-full px-0 xl:h-11 xl:w-auto xl:rounded-[14px] xl:px-4`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="size-[22px] xl:size-4"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="hidden xl:inline">Nouveau</span>
          </Link>
        </div>

        {today.manager ? (
          <ScopeSwitch
            scope={scope}
            mineLabel="Mes dossiers"
            mineHref="/vendeurs"
            agencyHref="/vendeurs?agence=1"
            testId="sellers-scope"
          />
        ) : null}

        {today.failed.map((message) => (
          <p key={message} role="alert" className={alertError}>
            {message}
          </p>
        ))}

        {/* Sur téléphone : une carte par vendeur, son bouton dessous. Un seul bouton plein, celui de
            la première carte : les autres restent en contour. Son nom mène à son dossier. */}
        {items.length > 0 ? (
          <ul className="flex flex-col gap-3 md:hidden" data-testid="sellers-today-cards">
            {items.map((item, index) => (
              <li key={item.projectId}>
                <TaskCard
                  name={item.name}
                  task={item.what}
                  late={item.late}
                  tone={item.tone}
                  href={`/builder/${item.projectId}`}
                  action={
                    <SellerAction item={item} today={today} day={day} primary={index === 0} />
                  }
                  more={
                    item.others.length > 0 ? (
                      <OtherTasks tasks={item.others} today={today} day={day} inCard />
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>
        ) : null}

        {/* Sur tablette et ordinateur : la même liste, en lignes ; le vendeur choisi à droite. */}
        {items.length > 0 ? (
          <ul className="hidden flex-col gap-2.5 md:flex" data-testid="sellers-today-rows">
            {items.map((item) => (
              <li key={item.projectId}>
                <PersonRow
                  href={scoped(sellerTodayHref(item))}
                  name={item.name}
                  task={item.what}
                  late={item.late}
                  tone={item.tone}
                  selected={item.projectId === selected?.projectId}
                  also={buyerOthersNote(item.others)}
                  keepScroll
                />
              </li>
            ))}
          </ul>
        ) : null}

        {items.length === 0 && !unread ? (
          <p className="text-[15px] text-[#5B6380] md:hidden stage:text-white/60">
            Rien à faire aujourd’hui pour vos vendeurs.
          </p>
        ) : null}

        <RowLink
          href="/builder"
          label={allPeopleLabel('vendeurs', scope)}
          count={counts?.[scope]}
          testId="sellers-all-link"
        />
      </section>

      {/* La clé : un vendeur, un détail NEUF (un geste ouvert ne suit jamais le vendeur suivant). */}
      <section
        key={selected?.projectId ?? 'vendeur'}
        aria-label={selected ? selected.name : 'Détail'}
        className="hidden min-w-0 flex-col gap-[18px] md:sticky md:top-0 md:flex md:max-h-screen md:self-start md:overflow-y-auto md:px-7 md:py-6 xl:gap-5 xl:px-10 xl:py-8"
        data-testid="sellers-today-detail"
        data-project={selected?.projectId}
      >
        {selected ? (
          <>
            <Suspense
              fallback={
                <>
                  <ProjectHeader name={selected.name} badge={null} />
                  <NextTask item={selected} today={today} day={day} />
                  <p className="text-[15px] text-[#5B6380] stage:text-white/60" role="status">
                    Lecture de son dossier…
                  </p>
                </>
              }
            >
              <SellerDossier item={selected} today={today} day={day} />
            </Suspense>
            {selected.others.length > 0 ? (
              <OtherTasks tasks={selected.others} today={today} day={day} />
            ) : null}
          </>
        ) : (
          <div className={`${socleCardBordered} flex flex-col gap-2 p-6`}>
            <span className={socleKicker}>À faire aujourd’hui</span>
            <p className="text-[21px] leading-snug font-bold text-brand-darker stage:text-white">
              {unread
                ? 'Une partie des tâches n’a pas pu être lue : rechargez la page.'
                : 'Rien à faire aujourd’hui pour vos vendeurs.'}
            </p>
            <Link
              href="/builder"
              className="text-[15px] font-bold text-brand-deep stage:text-brand"
            >
              Voir {allPeopleLabel('vendeurs', scope).toLowerCase()}
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

// Ce qu'il y a à faire aujourd'hui, et son geste — le seul bouton plein. « À faire aujourd'hui »,
// comme au lot B : la tâche du jour n'est pas toujours la prochaine étape du dossier (M110), qui se
// lit sur sa page (un mandat signé y dit « Voir le Suivi »).
function NextTask({ item, today, day }: { item: SellerTodayItem; today: Today; day: string }) {
  return (
    <NextStepCard
      testId="sellers-today-task"
      kicker="À faire aujourd’hui"
      title={item.what}
      late={item.late}
      action={<SellerAction item={item} today={today} day={day} primary />}
    />
  );
}

// Le dossier du vendeur choisi (tablette, ordinateur) : son état, sa prochaine étape, trois
// chiffres, « Son dossier », « Tout le dossier ». Lu à part : la liste n'attend pas.
async function SellerDossier({
  item,
  today,
  day,
}: {
  item: SellerTodayItem;
  today: Today;
  day: string;
}) {
  const summary = await loadProjectSummary(item.projectId);
  if (!summary) {
    return (
      <>
        <ProjectHeader name={item.name} badge={null} />
        <NextTask item={item} today={today} day={day} />
        <p role="alert" className={alertError}>
          Son dossier n’a pas pu être lu : rechargez la page.
        </p>
      </>
    );
  }
  return (
    <>
      <ProjectHeader
        name={summary.name}
        propertyText={summary.propertyText}
        badge={summary.badge}
      />
      <NextTask item={item} today={today} day={day} />
      <StatTiles testId="project-tiles" tiles={summary.tiles} />
      <OverviewSteps steps={summary.steps} />
      {/* « Tout le dossier » s'ouvre déplié : son résumé vient d'être lu ici. */}
      <ProjectAllLink href={`/builder/${item.projectId}?tout=1`} />
    </>
  );
}

// Ses autres choses à faire du jour, chacune avec son geste, en contour : dans le détail, une carte
// chacune ; dans la carte du téléphone (`inCard`), sous son bouton.
function OtherTasks({
  tasks,
  today,
  day,
  inCard = false,
}: {
  tasks: SellerTodayItem['others'];
  today: Today;
  day: string;
  inCard?: boolean;
}) {
  return (
    <div
      className={
        inCard
          ? 'flex flex-col gap-3 border-t border-[#E3E6F0] pt-3 stage:border-white/10'
          : 'flex flex-col gap-2.5'
      }
      data-testid="sellers-today-others"
    >
      <span className={socleKicker}>Aussi aujourd’hui</span>
      {tasks.map((other) => (
        <div
          key={sellerTaskKey(other.task)}
          className={
            inCard
              ? 'flex flex-col gap-2'
              : `${socleCardBordered} flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6`
          }
          data-testid="sellers-today-other"
        >
          <p
            className={
              inCard
                ? 'text-[15px] text-[#5B6380] stage:text-white/60'
                : 'text-base font-bold text-brand-darker stage:text-white'
            }
          >
            {other.what}
            {other.late ? <LateNote late={other.late} /> : null}
          </p>
          <div
            className={inCard ? 'flex flex-col [&>*]:w-full' : 'flex flex-col xl:w-60 xl:flex-none'}
          >
            <TaskAction task={other.task} today={today} day={day} primary={false} />
          </div>
        </div>
      ))}
    </div>
  );
}
