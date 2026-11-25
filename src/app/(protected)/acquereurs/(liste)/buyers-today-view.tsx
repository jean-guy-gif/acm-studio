import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LateNote, PersonRow, RowLink, TaskCard } from '@/components/socle/task-card';
import {
  alertError,
  socleBtnQuiet,
  socleCardBordered,
  socleKicker,
  socleSubtitle,
  socleTitle,
} from '@/components/ui/styles';
import { proposedBuyerWords } from '@/features/buyer-deck/services/buyer-deck';
import { readBuyers } from '@/features/buyers/queries/get-buyers';
import { ALL_BUYERS_HREF } from '@/features/buyers/services/buyers-page';
import {
  buyersToday,
  buyersTodayCount,
  type BuyerTodayItem,
} from '@/features/buyers/services/buyers-today';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { taskLine } from '@/features/meeting-conclusion/services/suivi-step-labels';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import { TodayTaskAction } from '@/features/today/components/today-task';
import { getToday, type Today, type TodayTaskContext } from '@/features/today/queries/get-today';
import { getProfile } from '@/lib/auth/get-profile';

const NO_CONTEXT: TodayTaskContext = {
  motiveLabel: null,
  lastContactDays: null,
  signedOn: null,
  propertyLabel: null,
};

// Le geste d'une tâche : celui d'« Aujourd'hui », à l'allure du socle.
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
      label={line.button}
      primary={primary}
      look="socle"
    />
  );
}

// La refonte, lot B (maquettes REFONTE-1, 5 et 6) — Acquéreurs s'ouvre sur « à faire
// aujourd'hui » : une carte par personne, avec ce qu'il y a à faire et son bouton ; un seul bouton
// plein. Sur téléphone, une colonne de cartes ; sur tablette et ordinateur, la liste à gauche et,
// à droite, le détail de la personne choisie, sans changer de page (`?personne=`). Ce sont les
// tâches d'« Aujourd'hui » (« Mes tâches »), rangées par acquéreur : mêmes règles, mêmes gestes.
// « Tous mes acquéreurs » mène à la liste entière.
export async function BuyersTodayView({ personne }: { personne?: string }) {
  const [today, profile, read] = await Promise.all([getToday('mine'), getProfile(), readBuyers()]);
  if (!today || !profile) notFound();
  const day = parisDay(new Date());
  const items = buyersToday(
    today.board.blocks.flatMap((block) => block.lines.flatMap((line) => line.tasks)),
    day,
  );
  const selected = items.find((item) => item.buyerId === personne) ?? items[0] ?? null;
  const mine = read.buyers.filter((buyer) => buyer.advisorId === profile.id);
  const buyerOf = (item: BuyerTodayItem) =>
    read.buyers.find((buyer) => buyer.id === item.buyerId) ?? null;
  // Une lecture en échec n'est jamais lue comme « rien à faire » (M98).
  const unread = today.failed.length > 0;
  // Un seul bouton plein : celui de la première carte qui n'a qu'un geste (la réponse du vendeur à
  // une offre en propose plusieurs, tous en contour, comme sur « Aujourd'hui »).
  const lead = items.findIndex((item) => item.task.kind !== 'offer_answer');

  return (
    <div
      data-shell-wide
      data-testid="buyers-today"
      className="md:grid md:min-h-screen md:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]"
    >
      <section
        aria-label="À faire aujourd’hui"
        className="flex flex-col gap-[18px] px-5 pt-7 pb-6 md:gap-4 md:border-r md:border-[#E3E6F0] md:px-4 md:py-6 xl:gap-[18px] xl:px-6 xl:py-8 stage:border-white/10"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className={`${socleTitle} md:text-[26px] xl:text-[30px]`}>Acquéreurs</h1>
            <p className={socleSubtitle} data-testid="buyers-today-count">
              {unread && items.length === 0
                ? 'Une partie des tâches n’a pas pu être lue'
                : buyersTodayCount(items.length)}
            </p>
          </div>
          <Link
            href="/acquereurs/nouveau"
            aria-label="Nouvel acquéreur"
            data-testid="buyers-new"
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
        {read.failed ? (
          <p role="alert" className={alertError}>
            Vos acquéreurs n’ont pas pu être lus : rechargez la page.
          </p>
        ) : null}

        {/* Sur téléphone : une carte par personne, son bouton dessous ; le premier est plein. */}
        {items.length > 0 ? (
          <ul className="flex flex-col gap-3 md:hidden" data-testid="buyers-today-cards">
            {items.map((item, index) => (
              <li key={item.buyerId}>
                <TaskCard
                  name={item.name}
                  task={item.what}
                  late={item.late}
                  tone={item.tone}
                  href={`/acquereurs/${item.buyerId}`}
                  action={
                    <TaskAction task={item.task} today={today} day={day} primary={index === lead} />
                  }
                />
              </li>
            ))}
          </ul>
        ) : null}

        {/* Sur tablette et ordinateur : la même liste, en lignes ; la personne choisie à droite. */}
        {items.length > 0 ? (
          <ul className="hidden flex-col gap-2.5 md:flex" data-testid="buyers-today-rows">
            {items.map((item) => (
              <li key={item.buyerId}>
                <PersonRow
                  href={`/acquereurs?personne=${item.buyerId}`}
                  name={item.name}
                  task={item.what}
                  late={item.late}
                  tone={item.tone}
                  selected={item.buyerId === selected?.buyerId}
                  keepScroll
                />
              </li>
            ))}
          </ul>
        ) : null}

        <RowLink
          href={ALL_BUYERS_HREF}
          label="Tous mes acquéreurs"
          count={read.failed ? undefined : mine.length}
          testId="buyers-all-link"
        />
      </section>

      <section
        aria-label={selected ? selected.name : 'Détail'}
        className="hidden min-w-0 flex-col gap-[18px] md:sticky md:top-0 md:flex md:max-h-screen md:self-start md:overflow-y-auto md:px-7 md:py-6 xl:px-10 xl:py-8"
        data-testid="buyers-today-detail"
      >
        {selected ? (
          <BuyerTodayDetail
            item={selected}
            words={(() => {
              const buyer = buyerOf(selected);
              return buyer ? proposedBuyerWords(buyer) : null;
            })()}
            today={today}
            day={day}
          />
        ) : (
          <div className={`${socleCardBordered} flex flex-col gap-2 p-6`}>
            <span className={socleKicker}>À faire aujourd’hui</span>
            <p className="text-[21px] leading-snug font-bold text-brand-darker stage:text-white">
              {unread
                ? 'Une partie des tâches n’a pas pu être lue : rechargez la page.'
                : 'Rien à faire aujourd’hui pour vos acquéreurs.'}
            </p>
            <Link
              href={ALL_BUYERS_HREF}
              className="text-[15px] font-bold text-brand-deep stage:text-brand"
            >
              Voir tous mes acquéreurs
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

// Le détail de la personne choisie (tablette et ordinateur) : qui elle est, ce qu'il y a à faire
// aujourd'hui et son geste — le seul bouton plein de l'écran —, puis ses autres tâches du jour.
function BuyerTodayDetail({
  item,
  words,
  today,
  day,
}: {
  item: BuyerTodayItem;
  words: string | null;
  today: Today;
  day: string;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            className="text-[22px] leading-tight font-extrabold tracking-[-0.3px] text-brand-darker xl:text-[26px] xl:tracking-[-0.4px] stage:text-white"
            data-testid="buyers-today-name"
          >
            {item.name}
          </h2>
          {words ? (
            <p className="text-sm text-[#5B6380] xl:text-[15px] stage:text-white/60">{words}</p>
          ) : null}
        </div>
        <Link
          href={`/acquereurs/${item.buyerId}`}
          className={`${socleBtnQuiet} flex-none`}
          data-testid="buyers-today-open"
        >
          Ouvrir sa fiche
        </Link>
      </div>

      <div
        className={`${socleCardBordered} flex flex-col gap-4 p-6 xl:flex-row xl:items-center xl:justify-between xl:gap-8`}
        data-testid="buyers-today-task"
      >
        <div className="flex min-w-0 flex-col gap-2">
          <span className={socleKicker}>À faire aujourd’hui</span>
          <p className="text-[21px] leading-snug font-bold text-brand-darker stage:text-white">
            {item.what}
            {item.late ? <LateNote late={item.late} /> : null}
          </p>
        </div>
        <div className="flex flex-col xl:w-60 xl:flex-none">
          <TaskAction task={item.task} today={today} day={day} primary />
        </div>
      </div>

      {item.others.length > 0 ? (
        <div className="flex flex-col gap-2.5" data-testid="buyers-today-others">
          <span className={socleKicker}>Aussi aujourd’hui</span>
          {item.others.map((other, index) => (
            <div
              key={`${other.task.kind}-${index}`}
              className={`${socleCardBordered} flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6`}
            >
              <p className="text-base font-bold text-brand-darker stage:text-white">
                {other.what}
                {other.late ? <LateNote late={other.late} /> : null}
              </p>
              <div className="flex flex-col xl:w-60 xl:flex-none">
                <TaskAction task={other.task} today={today} day={day} primary={false} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
