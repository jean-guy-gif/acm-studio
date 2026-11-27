import type { ReactNode } from 'react';

import { card } from '@/components/ui/styles';
import {
  FOLLOW_UP_GROUP_TITLES,
  followUpFacts,
  followUpOrigin,
  followUpPill,
  type FollowUpEntry,
  type FollowUpGroup,
  type FollowUpTone,
} from '@/features/buyers/services/buyer-follow-up';
import {
  suiviLineGist,
  suiviLineGroups,
  suiviLineOpen,
} from '@/features/buyers/services/buyer-sheet-layout';
import { PropertySheetButton } from '@/features/property-sheet/components/property-sheet-button';
import { formatEuro } from '@/lib/format';

// Lancement, mission 6 (Jean-Guy, 23/11 ; maquette `L6-suivi-de-l-acquereur.png`) — « Son suivi »,
// sur la fiche acquéreur, pour le conseiller seul : un seul endroit avec les biens envoyés, refusés
// et pourquoi, visités avec leur compte rendu, pour faire le point avec lui. Un bien = une ligne ;
// rangé par ce qu'il en a dit (`buyerFollowUp`). Les gestes d'une visite (confirmer, visite faite,
// changer la suite) restent sur la ligne du bien : `visitRows` porte la ligne de chaque visite,
// telle que la page Visites la montre. Aucun bouton plein (M146).
//
// Mission 10 bis (Jean-Guy, 25/11 ; maquette `M10bis-fiche-acquereur-repliee.png`) — sur le modèle
// de la carte du Suivi vendeur : trois lignes avec leur nombre (visités, envoyés en attente,
// refusés), fermées à l'ouverture de la fiche ; chacune s'ouvre d'un toucher, et le détail d'une
// visite n'apparaît qu'alors. « Visites à organiser » : une quatrième ligne, seulement quand il y
// en a une, ouverte d'elle-même (c'est là qu'on confirme la visite). Ce que le conseiller a écarté
// pour lui se lit dans « Tout le dossier » (`BuyerDismissed`).
const TONES: Record<FollowUpTone, string> = {
  ok: 'bg-emerald-50 text-emerald-800',
  now: 'bg-sky-100 text-sky-900',
  wait: 'border border-zinc-200 bg-zinc-50 text-zinc-600',
  no: 'bg-orange-50 text-orange-800',
  off: 'bg-zinc-100 text-zinc-600',
  plain: 'bg-zinc-100 text-zinc-700',
};

const chevron = 'w-3 shrink-0 text-xs';

// La refonte, lot B (maquette REFONTE-4) — « puis trois chiffres » : chaque ligne du suivi est une
// tuile du socle, son nombre en grand, ce qu'il compte dessous. Une tuile se touche pour s'ouvrir :
// elle prend alors toute la largeur, ses biens dessous (Mission 10 bis : le détail d'une visite
// n'apparaît qu'une fois sa ligne ouverte), et les tuiles fermées restent côte à côte au-dessus
// d'elle (la grille se resserre, `grid-flow-row-dense`). « Visites à organiser », quand il y en a,
// a sa ligne entière SOUS les trois, dans la page comme à l'écran (`suiviLineGroups`).
const tile =
  'min-w-0 rounded-2xl border border-[#E3E6F0] bg-white stage:border-white/10 stage:bg-white/5';
const tileHead = 'relative flex flex-col gap-0.5 px-3 py-3.5 xl:px-[18px] xl:py-4';
const tileCount = 'text-[26px] leading-tight font-extrabold xl:text-[28px]';
const tileLabel = 'font-sans text-sm font-normal text-[#5B6380] xl:text-[15px] stage:text-white/60';
const tileGist = 'text-xs text-[#5B6380] stage:text-white/60';

function Entry({
  entry,
  visitRows,
  budgetMax,
  now,
}: {
  entry: FollowUpEntry;
  visitRows: Record<string, ReactNode>;
  budgetMax: number | null;
  now: Date;
}) {
  const facts = followUpFacts(entry, now);
  const pill = followUpPill(entry);
  const visits = entry.visitIds.map((id) => visitRows[id]).filter(Boolean);
  const origin = followUpOrigin(entry);
  // Un bien visité, ou à visiter : la ligne de chaque visite porte déjà son libellé, son prix, son
  // compte rendu et ses gestes ; ce qui l'a précédée (l'envoi, sa réponse) se dit au-dessus.
  if (visits.length > 0) {
    return (
      <li
        className="flex flex-col gap-1.5"
        data-testid="buyer-follow-up-item"
        data-group={entry.group}
      >
        {facts.length > 0 || (entry.itemId && !entry.again) ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 text-xs text-zinc-600 stage:text-white/70">
            {facts.length > 0 ? <span>{facts.join(' · ')}</span> : null}
            {entry.itemId && !entry.again ? (
              <PropertySheetButton
                target={{ kind: 'selection-item', id: entry.itemId }}
                backLabel="Son suivi"
                budgetMax={budgetMax}
                className="font-semibold text-brand-deep underline underline-offset-2 stage:text-brand"
              >
                Voir la fiche du bien
              </PropertySheetButton>
            ) : null}
          </p>
        ) : null}
        <ul className="flex flex-col gap-2">{visits}</ul>
      </li>
    );
  }
  return (
    <li
      className="flex flex-col gap-2 rounded-xl border border-zinc-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between stage:border-white/10"
      data-testid="buyer-follow-up-item"
      data-group={entry.group}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        {entry.itemId ? (
          <PropertySheetButton
            target={{ kind: 'selection-item', id: entry.itemId }}
            backLabel="Son suivi"
            budgetMax={budgetMax}
            className="text-left font-title text-base font-bold text-brand-darker underline decoration-brand/30 underline-offset-4 stage:text-white"
          >
            {entry.label}
          </PropertySheetButton>
        ) : (
          <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
            {entry.label}
          </span>
        )}
        {entry.price != null || origin ? (
          <span className="text-sm text-zinc-600 stage:text-white/70">
            {[entry.price != null ? formatEuro(entry.price) : null, origin]
              .filter((part): part is string => part != null)
              .join(' · ')}
          </span>
        ) : null}
        {facts.map((fact) => (
          <span key={fact} className="text-sm text-zinc-700 stage:text-white/80">
            {fact}
          </span>
        ))}
      </div>
      <span
        className={`shrink-0 self-start rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${TONES[pill.tone]}`}
        data-testid="buyer-follow-up-pill"
      >
        {pill.text}
      </span>
    </li>
  );
}

function Entries({
  list,
  visitRows,
  budgetMax,
  now,
}: {
  list: FollowUpEntry[];
  visitRows: Record<string, ReactNode>;
  budgetMax: number | null;
  now: Date;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {list.map((entry) => (
        <Entry
          key={`${entry.key}:${entry.group}`}
          entry={entry}
          visitRows={visitRows}
          budgetMax={budgetMax}
          now={now}
        />
      ))}
    </ul>
  );
}

export function BuyerFollowUp({
  entries,
  summary,
  visitRows,
  unread,
  lastVisit = null,
  messagesGroup = null,
  messagesKey = null,
  pendingVisitIds = [],
  sale = false,
  budgetMax = null,
  now = new Date(),
  children = null,
}: {
  entries: FollowUpEntry[];
  // « 5 biens envoyés · 1 visité · 1 visite à organiser · 1 refusé · 2 écartés pour lui ».
  summary: string | null;
  visitRows: Record<string, ReactNode>;
  // Une lecture a échoué : l'écran le dit, jamais « rien d'envoyé » (M98).
  unread: boolean;
  // Sa visite faite la plus récente parmi les biens visités : le jour, déjà dit en mots, et sa
  // suite. La ligne fermée « Visités » la dit.
  lastVisit?: { day: string; outcome: string } | null;
  // Le groupe du bien dont on vient de noter la visite (`?messages=`) : sa ligne s'ouvre seule.
  messagesGroup?: FollowUpGroup | null;
  // Cette visite : une seconde visite notée dans la même ligne la rouvre, même refermée à la main.
  messagesKey?: string | null;
  // Ses visites à organiser : la ligne qui en porte une s'ouvre seule, quel que soit son groupe (un
  // bien refusé peut garder une visite demandée).
  pendingVisitIds?: readonly string[];
  // Une vente est en cours : sa recherche est en pause, « Visites à organiser » reste fermée.
  sale?: boolean;
  budgetMax?: number | null;
  now?: Date;
  // Sous les lignes : ce que ses refus suggèrent, quand il y a une suggestion à accepter ou ignorer.
  children?: ReactNode;
}) {
  // Sans rien d'envoyé ni échec ni suggestion à lire : pas de bloc.
  if (entries.length === 0 && !unread && !children) return null;
  const of = (group: FollowUpGroup) => entries.filter((entry) => entry.group === group);
  const pending = new Set(pendingVisitIds);
  return (
    <section
      id="suivi"
      className={`${card} flex scroll-mt-6 flex-col px-5 pt-4 pb-2`}
      data-testid="buyer-follow-up"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 pb-2">
        <h2 className="font-title text-xl font-bold text-brand-darker stage:text-white">
          Son suivi
        </h2>
        {summary ? (
          <p
            className="text-sm text-zinc-600 stage:text-white/70"
            data-testid="buyer-follow-up-summary"
          >
            {summary}
          </p>
        ) : null}
      </div>
      {unread ? (
        <p role="alert" className="pb-2 text-sm font-semibold text-red-700">
          Son suivi n’a pas pu être lu en entier&nbsp;: rechargez la page.
        </p>
      ) : null}
      <div
        className="grid grid-flow-row-dense grid-cols-3 gap-2.5 pb-3 xl:gap-3.5"
        data-testid="buyer-follow-up-tiles"
      >
        {suiviLineGroups(of('to_visit').length).map((group) => {
          const list = of(group);
          const gist = suiviLineGist({
            group,
            count: list.length,
            pills: list.map((entry) => followUpPill(entry).text),
            lastVisit,
          });
          // « Visites à organiser » prend la ligne entière, sous les trois chiffres.
          const wide = group === 'to_visit' ? 'col-span-3' : '';
          // Une tuile sans bien ne s'ouvre pas : elle dit « aucun », en gris. Sauf si le suivi n'a
          // pas pu être lu en entier : on ne dit jamais « aucun » sur une lecture en échec (M98).
          if (list.length === 0) {
            if (unread) return null;
            return (
              <div
                key={group}
                className={`${tile} ${tileHead} ${wide}`}
                data-testid="buyer-follow-up-group"
                data-group={group}
                data-empty="true"
              >
                <span
                  className={`${tileCount} text-zinc-500 stage:text-white/50`}
                  data-testid="buyer-follow-up-count"
                >
                  0
                </span>
                <h3 className={tileLabel}>{FOLLOW_UP_GROUP_TITLES[group]}</h3>
                <span className={tileGist}>{gist}</span>
              </div>
            );
          }
          return (
            <details
              key={group === messagesGroup && messagesKey ? `${group}:${messagesKey}` : group}
              className={`group/line ${tile} ${wide} open:col-span-3`}
              data-testid="buyer-follow-up-group"
              data-group={group}
              open={suiviLineOpen({
                messages: group === messagesGroup,
                pendingVisit:
                  group === 'to_visit' ||
                  list.some((entry) => entry.visitIds.some((id) => pending.has(id))),
                sale,
              })}
            >
              <summary
                className={`${tileHead} cursor-pointer list-none rounded-2xl marker:hidden hover:bg-[#F4F5FA] stage:hover:bg-white/5 [&::-webkit-details-marker]:hidden`}
              >
                <span
                  aria-hidden
                  className={`${chevron} absolute top-3.5 right-3 text-brand-deep transition-transform group-open/line:rotate-90 stage:text-brand`}
                >
                  ▸
                </span>
                <span
                  className={`${tileCount} text-brand-darker stage:text-white`}
                  data-testid="buyer-follow-up-count"
                >
                  {list.length}
                </span>
                <h3 className={tileLabel}>{FOLLOW_UP_GROUP_TITLES[group]}</h3>
                {gist ? (
                  <span className={tileGist} data-testid="buyer-follow-up-gist">
                    {gist}
                  </span>
                ) : null}
              </summary>
              <div className="border-t border-[#E3E6F0] px-3 pt-3 pb-3 xl:px-[18px] stage:border-white/10">
                <Entries list={list} visitRows={visitRows} budgetMax={budgetMax} now={now} />
              </div>
            </details>
          );
        })}
      </div>
      {children}
    </section>
  );
}

// Mission 10 bis — ce que le conseiller a écarté pour lui, sans lui en parler : dans « Tout le
// dossier », replié comme avant (Lancement 6).
export function BuyerDismissed({
  entries,
  visitRows,
  open = false,
  budgetMax = null,
  now = new Date(),
  titleClassName,
  lineClassName,
}: {
  entries: FollowUpEntry[];
  visitRows: Record<string, ReactNode>;
  // Ouvert de lui-même quand un bien écarté garde une visite à organiser.
  open?: boolean;
  budgetMax?: number | null;
  now?: Date;
  titleClassName: string;
  lineClassName: string;
}) {
  const list = entries.filter((entry) => entry.group === 'dismissed');
  if (list.length === 0) return null;
  return (
    <details
      className="group/fold"
      data-testid="buyer-follow-up-group"
      data-group="dismissed"
      open={open}
    >
      <summary
        className={`flex cursor-pointer list-none flex-wrap items-baseline gap-x-2 gap-y-0.5 marker:hidden [&::-webkit-details-marker]:hidden ${lineClassName}`}
      >
        <span
          aria-hidden
          className={`${chevron} text-brand-deep transition-transform group-open/fold:rotate-90 stage:text-brand`}
        >
          ▸
        </span>
        <h3 className={titleClassName}>{FOLLOW_UP_GROUP_TITLES.dismissed}</h3>
        <span data-testid="buyer-follow-up-count">· {list.length}</span>
      </summary>
      <div className="mt-3">
        <Entries list={list} visitRows={visitRows} budgetMax={budgetMax} now={now} />
      </div>
    </details>
  );
}
