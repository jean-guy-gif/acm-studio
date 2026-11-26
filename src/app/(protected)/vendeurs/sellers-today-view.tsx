import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { StatTiles } from '@/components/socle/stat-tiles';
import { LateNote, PersonRow, RowLink, TaskCard } from '@/components/socle/task-card';
import {
  alertError,
  socleBtnQuiet,
  socleCardBordered,
  socleKicker,
  socleSubtitle,
  socleTitle,
} from '@/components/ui/styles';
import { buyerOthersNote, buyersTodayCount } from '@/features/buyers/services/buyers-today';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { taskLine } from '@/features/meeting-conclusion/services/suivi-step-labels';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import {
  DossierAllLink,
  DossierHeader,
  NextStepCard,
} from '@/features/projects/components/dossier-summary';
import { OverviewSteps } from '@/features/projects/components/overview-steps';
import { countMyDossiers } from '@/features/projects/queries/count-my-dossiers';
import { loadDossierSummary } from '@/features/projects/queries/load-dossier-summary';
import {
  selectedSeller,
  sellersToday,
  sellerTaskButton,
  sellerTaskKey,
  sellerTodayHref,
  type SellerTodayItem,
} from '@/features/projects/services/sellers-today';
import { TodayTaskAction } from '@/features/today/components/today-task';
import { getToday, type Today, type TodayTaskContext } from '@/features/today/queries/get-today';

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

// La refonte, lot E (maquettes REFONTE-7 et 8) — Vendeurs s'ouvre sur « à faire aujourd'hui » : une
// carte par vendeur, avec ce qu'il y a à faire et son bouton ; un seul bouton plein. Sur téléphone,
// une colonne de cartes ; sur tablette et ordinateur, la liste à gauche et, à droite, son dossier —
// sa prochaine étape, trois chiffres, « Son dossier », « Tout le dossier » —, sans changer de page
// (`?dossier=`). Ce sont les tâches du bloc « Vendeurs » d'« Aujourd'hui » (« Mes tâches ») : mêmes
// règles, mêmes gestes. « Tous mes vendeurs » mène aux listes de Préparation, du Live et du Suivi.
export async function SellersTodayView({ dossier }: { dossier?: string }) {
  const [today, mine] = await Promise.all([getToday('mine'), countMyDossiers()]);
  if (!today) notFound();
  const day = parisDay(new Date());
  const items = sellersToday(
    today.board.blocks.flatMap((block) => block.lines.flatMap((line) => line.tasks)),
    (projectId) => today.context.get(projectId),
    day,
  );
  const selected = selectedSeller(items, dossier);
  // Une lecture en échec n'est jamais lue comme « rien à faire » (M98).
  const unread = today.failed.length > 0;
  const things = items.reduce((total, item) => total + 1 + item.others.length, 0);

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
              {unread && items.length === 0
                ? 'Une partie des tâches n’a pas pu être lue'
                : buyersTodayCount(things)}
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
                    <TaskAction task={item.task} today={today} day={day} primary={index === 0} />
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
                  href={sellerTodayHref(item)}
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
          label="Tous mes vendeurs"
          count={mine ?? undefined}
          testId="sellers-all-link"
        />
      </section>

      {/* La clé : un vendeur, un détail NEUF (un geste ouvert ne suit jamais le vendeur suivant). */}
      <section
        key={selected?.projectId ?? 'vendeur'}
        aria-label={selected ? selected.name : 'Détail'}
        className="hidden min-w-0 flex-col gap-[18px] md:sticky md:top-0 md:flex md:max-h-screen md:self-start md:overflow-y-auto md:px-7 md:py-6 xl:gap-5 xl:px-10 xl:py-8"
        data-testid="sellers-today-detail"
        data-dossier={selected?.projectId}
      >
        {selected ? (
          <>
            <Suspense
              fallback={
                <>
                  <DossierHeader name={selected.name} propertyText={null} badge={null} />
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
              Voir tous mes vendeurs
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

// Sa prochaine étape : ce qu'il y a à faire aujourd'hui, et son geste — le seul bouton plein.
function NextTask({ item, today, day }: { item: SellerTodayItem; today: Today; day: string }) {
  return (
    <NextStepCard
      testId="sellers-today-task"
      title={item.what}
      late={item.late}
      action={<TaskAction task={item.task} today={today} day={day} primary />}
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
  const summary = await loadDossierSummary(item.projectId);
  if (!summary) {
    return (
      <>
        <DossierHeader name={item.name} propertyText={null} badge={null} />
        <NextTask item={item} today={today} day={day} />
        <p role="alert" className={alertError}>
          Son dossier n’a pas pu être lu : rechargez la page.
        </p>
      </>
    );
  }
  return (
    <>
      <DossierHeader
        name={summary.name}
        propertyText={summary.propertyText}
        badge={summary.badge}
      />
      <NextTask item={item} today={today} day={day} />
      <StatTiles testId="dossier-tiles" tiles={summary.tiles} />
      <OverviewSteps steps={summary.steps} />
      <DossierAllLink href={`/builder/${item.projectId}`} />
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
