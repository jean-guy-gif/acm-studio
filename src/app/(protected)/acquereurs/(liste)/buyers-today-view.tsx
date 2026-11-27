import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { ScopeSwitch } from '@/components/socle/scope-switch';
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
import { proposedBuyerWords } from '@/features/buyer-deck/services/buyer-deck';
import { BuyerNextStepCard } from '@/features/buyers/components/buyer-next-step-card';
import { readBuyers } from '@/features/buyers/queries/get-buyers';
import { loadBuyerTodaySummary } from '@/features/buyers/queries/load-buyer-today-summary';
import { AGENCY_BUYERS_HREF, ALL_BUYERS_HREF } from '@/features/buyers/services/buyers-page';
import {
  buyerOthersNote,
  buyersToday,
  buyersTodayCount,
  buyersTodayDetail,
  buyersTodayTaskCount,
  buyerTaskKey,
  buyerTodayHref,
  watchDeckHref,
  watchDetailHref,
  type BuyerTodayItem,
} from '@/features/buyers/services/buyers-today';
import type { Buyer } from '@/features/buyers/types';
import { IdealPropertiesPanel } from '@/features/ideal-properties/components/ideal-properties-panel';
import { loadIdealPanel } from '@/features/ideal-properties/queries/load-ideal-panel';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { taskLine } from '@/features/meeting-conclusion/services/suivi-step-labels';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
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

// Ce qu'il y a à faire et son geste, dans le détail : l'un sous l'autre ; sur ordinateur, côte à
// côte, le bouton à droite sur 240 px. Un geste ouvert (son message, ses boutons d'envoi) reprend
// toute la largeur, sous la phrase : il ne tient pas dans 240 px.
const ACTION_ROW =
  'flex flex-col xl:flex-row xl:items-center xl:justify-between xl:has-[[data-task-open]]:flex-col xl:has-[[data-task-open]]:items-stretch';
const ACTION_SLOT = 'flex flex-col xl:w-60 xl:flex-none xl:has-[[data-task-open]]:w-auto';

// Le geste d'une tâche : celui d'« Aujourd'hui », à l'allure du socle.
function TaskAction({
  task,
  today,
  day,
  primary,
  onPlace = false,
}: {
  task: SuiviTask;
  today: Today;
  day: string;
  primary: boolean;
  // Dans le détail (tablette, ordinateur) : ses nouveaux biens se voient sur place.
  onPlace?: boolean;
}) {
  const line = taskLine(task, today.context.get(task.projectId) ?? NO_CONTEXT, day);
  return (
    <TodayTaskAction
      task={task}
      // La refonte, lot C — les nouveaux biens de la veille se voient « un bien à la fois » : sur
      // place dans le détail, sur leur page depuis une carte (téléphone).
      href={
        (onPlace
          ? (() => {
              // Remarques de Jean-Guy (26/11) — le détail garde la vue choisie (`?agence=1`).
              const here = watchDetailHref(task);
              return here ? withScope(here, today.scope) : null;
            })()
          : watchDeckHref(task)) ?? line.href
      }
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
// Une personne qui a plusieurs choses à faire les a toutes : la plus utile fait sa carte, les
// autres suivent sous « Aussi aujourd'hui », chacune avec son geste. « Tous mes acquéreurs » mène
// à la liste entière.
// La refonte, lot C — la personne choisie a de nouveaux biens à voir : son détail les montre un
// par un (tablette, ordinateur) ; `biens` : l'adresse la tient sur ses biens (`buyersTodayDetail`).
// Remarques de Jean-Guy (26/11) — un manager choisit sa vue, « Mes fiches » ou « Toute l'agence »
// (`?agence=1`), comme sur « Aujourd'hui » ; le lien d'en bas compte ce qu'il dit (« Tous mes
// acquéreurs » ou « Tous les acquéreurs de l'agence ») et ouvre la liste dans la même vue.
export async function BuyersTodayView({
  personne,
  biens = false,
  scope: asked = 'mine',
}: {
  personne?: string;
  biens?: boolean;
  scope?: TodayScope;
}) {
  const [today, profile, read] = await Promise.all([getToday(asked), getProfile(), readBuyers()]);
  if (!today || !profile) notFound();
  const scope = today.scope;
  const allHref = scope === 'agency' ? AGENCY_BUYERS_HREF : ALL_BUYERS_HREF;
  const day = parisDay(new Date());
  const boardTasks = today.board.blocks.flatMap((block) =>
    block.lines.flatMap((line) => line.tasks),
  );
  const items = buyersToday(boardTasks, day);
  const mine = read.buyers.filter((buyer) => buyer.advisorId === profile.id);
  const inView = scope === 'agency' ? read.buyers : mine;
  const buyerById = (buyerId: string) => read.buyers.find((buyer) => buyer.id === buyerId) ?? null;
  const detail = buyersTodayDetail(items, { personne, biens }, (id) => buyerById(id) != null);
  const { selected } = detail;
  // Une lecture en échec n'est jamais lue comme « rien à faire » (M98).
  const unread = today.failed.length > 0;
  const deckBuyer = detail.deckBuyerId ? buyerById(detail.deckBuyerId) : null;
  // La personne du détail : celle de ses biens, sinon la personne choisie.
  const detailId = deckBuyer?.id ?? selected?.buyerId ?? null;

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
                : buyersTodayCount(buyersTodayTaskCount(boardTasks))}
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

        {today.manager ? (
          <ScopeSwitch
            scope={scope}
            mineLabel="Mes fiches"
            mineHref="/acquereurs"
            agencyHref="/acquereurs?agence=1"
            testId="buyers-scope"
          />
        ) : null}

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

        {/* Sur téléphone : une carte par personne, son bouton dessous. Un seul bouton plein, celui
            de la première carte : les autres cartes restent en contour, geste ouvert compris. */}
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

        {/* Sur tablette et ordinateur : la même liste, en lignes ; la personne choisie à droite. */}
        {items.length > 0 ? (
          <ul className="hidden flex-col gap-2.5 md:flex" data-testid="buyers-today-rows">
            {items.map((item) => (
              <li key={item.buyerId}>
                <PersonRow
                  href={withScope(buyerTodayHref(item), scope)}
                  name={item.name}
                  task={item.what}
                  late={item.late}
                  tone={item.tone}
                  selected={item.buyerId === detailId}
                  also={buyerOthersNote(item.others)}
                  keepScroll
                />
              </li>
            ))}
          </ul>
        ) : null}

        <RowLink
          href={allHref}
          label={allPeopleLabel('acquéreurs', scope)}
          count={read.failed ? undefined : inView.length}
          testId="buyers-all-link"
        />
      </section>

      {/* La clé : une personne, un détail NEUF. Sans elle, React gardait l'état du geste ouvert
          d'une personne à la suivante (même page, seule l'adresse change) : le message préparé
          pour l'une, et « J'ai relancé », se retrouvaient sous le nom de l'autre. */}
      <section
        key={detailId ?? 'personne'}
        aria-label={deckBuyer?.name ?? selected?.name ?? 'Détail'}
        className={`hidden min-w-0 flex-col gap-[18px] md:sticky md:top-0 md:flex md:max-h-screen md:self-start md:overflow-y-auto md:px-7 md:py-6 xl:px-10 xl:py-8 ${deckBuyer ? 'md:h-screen' : ''}`}
        data-testid="buyers-today-detail"
        data-person={detailId ?? undefined}
      >
        {deckBuyer ? (
          <>
            {/* Le bien prend la hauteur de l'écran, ses deux gestes en bas ; les autres choses à
                faire de la personne suivent, en défilant. */}
            <div className="flex min-h-full flex-none flex-col gap-[18px]">
              <Suspense
                fallback={
                  <BuyerHeader
                    buyerId={deckBuyer.id}
                    name={deckBuyer.name}
                    words={proposedBuyerWords(deckBuyer)}
                    note="Lecture de ses nouveaux biens…"
                  />
                }
              >
                <BuyerDeck buyer={deckBuyer} profile={profile} />
              </Suspense>
            </div>
            {detail.beside.length > 0 ? (
              <OtherTasks tasks={detail.beside} today={today} day={day} />
            ) : null}
          </>
        ) : selected ? (
          <BuyerTodayDetail
            item={selected}
            words={(() => {
              const buyer = buyerById(selected.buyerId);
              return buyer ? proposedBuyerWords(buyer) : null;
            })()}
            buyer={buyerById(selected.buyerId)}
            today={today}
            day={day}
            // Des fiches illisibles : ses biens se lisent sur leur page, jamais un lien sans effet.
            watchOnPlace={!read.failed}
          />
        ) : (
          <div className={`${socleCardBordered} flex flex-col gap-2 p-6`}>
            <span className={socleKicker}>À faire aujourd’hui</span>
            <p className="text-[21px] leading-snug font-bold text-brand-darker stage:text-white">
              {unread
                ? 'Une partie des tâches n’a pas pu être lue : rechargez la page.'
                : 'Rien à faire aujourd’hui pour vos acquéreurs.'}
            </p>
            <Link href={allHref} className="text-[15px] font-bold text-brand-deep stage:text-brand">
              Voir {allPeopleLabel('acquéreurs', scope).toLowerCase()}
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
  buyer,
  today,
  day,
  watchOnPlace,
}: {
  item: BuyerTodayItem;
  words: string | null;
  buyer: Buyer | null;
  today: Today;
  day: string;
  watchOnPlace: boolean;
}) {
  return (
    <>
      <BuyerHeader buyerId={item.buyerId} name={item.name} words={words} />

      <div
        className={`${socleCardBordered} ${ACTION_ROW} gap-4 p-6 xl:gap-8`}
        data-testid="buyers-today-task"
      >
        <div className="flex min-w-0 flex-col gap-2">
          <span className={socleKicker}>À faire aujourd’hui</span>
          <p className="text-[21px] leading-snug font-bold text-brand-darker stage:text-white">
            {item.what}
            {item.late ? <LateNote late={item.late} /> : null}
          </p>
        </div>
        <div className={ACTION_SLOT}>
          <TaskAction task={item.task} today={today} day={day} primary />
        </div>
      </div>

      {item.others.length > 0 ? (
        <OtherTasks tasks={item.others} today={today} day={day} onPlace={watchOnPlace} />
      ) : null}

      {/* La refonte, lot F (Jean-Guy, 26/11) — pas de bien à voir : sous ce qu'il y a à faire
          aujourd'hui, sa prochaine étape et ses trois chiffres, ceux de sa fiche repliée. Lus à
          part : la tâche du jour n'attend pas. */}
      {buyer ? (
        <Suspense fallback={null}>
          <BuyerTodaySummary buyer={buyer} />
        </Suspense>
      ) : null}
    </>
  );
}

// Sa prochaine étape, en contour (la tâche du jour garde le seul bouton plein), et ses trois
// chiffres : visités, envoyés en attente, refusés.
async function BuyerTodaySummary({ buyer }: { buyer: Buyer }) {
  const summary = await loadBuyerTodaySummary(buyer);
  if (!summary) return null;
  return (
    <>
      <BuyerNextStepCard
        next={summary.next}
        unread={summary.unread}
        loopFailed={summary.loopFailed}
        filled={false}
      />
      {summary.tiles ? (
        <StatTiles testId="buyer-today-tiles" tiles={summary.tiles} />
      ) : (
        <p role="alert" className={alertError}>
          Son suivi n’a pas pu être lu : ouvrez sa fiche.
        </p>
      )}
    </>
  );
}

// Ses autres choses à faire du jour, chacune avec son geste, en contour : rien de dû n'est caché
// derrière sa première tâche. Dans le détail (tablette, ordinateur), une carte chacune ; dans la
// carte du téléphone (`inCard`), sous son bouton.
function OtherTasks({
  tasks,
  today,
  day,
  inCard = false,
  onPlace = false,
}: {
  tasks: BuyerTodayItem['others'];
  today: Today;
  day: string;
  inCard?: boolean;
  onPlace?: boolean;
}) {
  return (
    <div
      className={
        inCard
          ? 'flex flex-col gap-3 border-t border-[#E3E6F0] pt-3 stage:border-white/10'
          : 'flex flex-col gap-2.5'
      }
      data-testid="buyers-today-others"
    >
      <span className={socleKicker}>Aussi aujourd’hui</span>
      {tasks.map((other) => (
        <div
          key={buyerTaskKey(other.task)}
          className={
            inCard ? 'flex flex-col gap-2' : `${socleCardBordered} ${ACTION_ROW} gap-3 p-4 xl:gap-6`
          }
          data-testid="buyers-today-other"
        >
          {/* Dans la carte, la phrase d'une autre tâche se lit comme celle de la première : en
              gris, sous le nom — c'est le bouton qui porte le geste. */}
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
          <div className={inCard ? 'flex flex-col [&>*]:w-full' : ACTION_SLOT}>
            <TaskAction
              task={other.task}
              today={today}
              day={day}
              primary={false}
              onPlace={onPlace}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Qui est la personne choisie : son nom, sa recherche en une phrase, « Ouvrir sa fiche ».
function BuyerHeader({
  buyerId,
  name,
  words,
  note = null,
}: {
  buyerId: string;
  name: string;
  words: string | null;
  // Pendant une lecture : ce qui arrive.
  note?: string | null;
}) {
  return (
    <>
      {/* Sous 1024 px (une tablette en portrait), le détail est étroit : « Ouvrir sa fiche » passe
          sous son nom et sa recherche, qui gardent toute la largeur. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            className="text-[22px] leading-tight font-extrabold tracking-[-0.3px] text-brand-darker xl:text-[26px] xl:tracking-[-0.4px] stage:text-white"
            data-testid="buyers-today-name"
          >
            {name}
          </h2>
          {words ? (
            <p className="text-sm text-[#5B6380] xl:text-[15px] stage:text-white/60">{words}</p>
          ) : null}
        </div>
        <Link
          href={`/acquereurs/${buyerId}`}
          className={`${socleBtnQuiet} flex-none self-start`}
          data-testid="buyers-today-open"
        >
          Ouvrir sa fiche
        </Link>
      </div>
      {note ? (
        <p className="text-[15px] text-[#5B6380] stage:text-white/60" role="status">
          {note}
        </p>
      ) : null}
    </>
  );
}

// La refonte, lot C — « un bien à la fois », dans le détail : les biens idéaux de la personne
// (la même lecture que sa page), montrés un par un sous son nom.
async function BuyerDeck({
  buyer,
  profile,
}: {
  buyer: Buyer;
  profile: Parameters<typeof loadIdealPanel>[1];
}) {
  const panel = await loadIdealPanel(buyer, profile);
  return (
    <IdealPropertiesPanel
      {...panel}
      embedded={{
        name: buyer.name,
        words: proposedBuyerWords(buyer),
        ficheHref: `/acquereurs/${buyer.id}`,
      }}
    />
  );
}
