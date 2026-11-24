import type { ReactNode } from 'react';

import { card } from '@/components/ui/styles';
import {
  FOLLOW_UP_GROUPS,
  FOLLOW_UP_GROUP_TITLES,
  followUpFacts,
  followUpPill,
  type FollowUpEntry,
  type FollowUpTone,
} from '@/features/buyers/services/buyer-follow-up';
import { PropertySheetButton } from '@/features/property-sheet/components/property-sheet-button';
import { formatEuro } from '@/lib/format';

// Lancement, mission 6 (Jean-Guy, 23/11 ; maquette `L6-suivi-de-l-acquereur.png`) — « Son suivi »,
// sur la fiche acquéreur, pour le conseiller seul : un seul endroit avec les biens envoyés, refusés
// et pourquoi, visités avec leur compte rendu, pour faire le point avec lui. Un bien = une ligne ;
// rangé par ce qu'il en a dit (`buyerFollowUp`). Les gestes d'une visite (confirmer, visite faite,
// changer la suite) restent sur la ligne du bien : `visitRows` porte la ligne de chaque visite,
// telle que la page Visites la montre. Aucun bouton plein (M146).
const TONES: Record<FollowUpTone, string> = {
  ok: 'bg-emerald-50 text-emerald-800',
  now: 'bg-sky-100 text-sky-900',
  wait: 'border border-zinc-200 bg-zinc-50 text-zinc-600',
  no: 'bg-orange-50 text-orange-800',
  off: 'bg-zinc-100 text-zinc-600',
  plain: 'bg-zinc-100 text-zinc-700',
};

const groupTitle =
  'flex items-center gap-2 text-xs font-extrabold tracking-widest text-brand-deep uppercase stage:text-brand';
const countBadge =
  'rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold tracking-normal text-sky-900';

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
  // Un bien visité, ou à visiter : la ligne de chaque visite porte déjà son libellé, son prix, son
  // compte rendu et ses gestes ; ce qui l'a précédée (l'envoi, sa réponse) se dit au-dessus.
  if (visits.length > 0) {
    return (
      <li
        className="flex flex-col gap-1.5"
        data-testid="buyer-follow-up-item"
        data-group={entry.group}
      >
        {facts.length > 0 ? (
          <p className="px-1 text-xs text-zinc-600 stage:text-white/70">{facts.join(' · ')}</p>
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
        {entry.price != null || entry.inAgency != null ? (
          <span className="text-sm text-zinc-600 stage:text-white/70">
            {[
              entry.price != null ? formatEuro(entry.price) : null,
              entry.inAgency == null
                ? null
                : entry.inAgency
                  ? 'Dans l’agence'
                  : 'Annonce du marché',
            ]
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

export function BuyerFollowUp({
  entries,
  summary,
  visitRows,
  unread,
  budgetMax = null,
  now = new Date(),
}: {
  entries: FollowUpEntry[];
  // « 5 biens envoyés · 1 visité · 1 visite à organiser · 1 refusé · 2 écartés pour lui ».
  summary: string | null;
  visitRows: Record<string, ReactNode>;
  // Une lecture a échoué : l'écran le dit, jamais « rien d'envoyé » (M98).
  unread: boolean;
  budgetMax?: number | null;
  now?: Date;
}) {
  if (entries.length === 0 && !unread) return null;
  return (
    <section
      id="suivi"
      className={`${card} flex scroll-mt-6 flex-col gap-4 p-5`}
      data-testid="buyer-follow-up"
    >
      <div className="flex flex-col gap-0.5">
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
        <p role="alert" className="text-sm font-semibold text-red-700">
          Son suivi n’a pas pu être lu en entier : rechargez la page.
        </p>
      ) : null}
      {FOLLOW_UP_GROUPS.map((group) => {
        const list = entries.filter((entry) => entry.group === group);
        if (list.length === 0) return null;
        const rows = (
          <ul className="flex flex-col gap-2">
            {list.map((entry) => (
              <Entry
                key={entry.key}
                entry={entry}
                visitRows={visitRows}
                budgetMax={budgetMax}
                now={now}
              />
            ))}
          </ul>
        );
        // Ce que le conseiller a écarté pour lui : replié, il ne lui en a pas parlé.
        return group === 'dismissed' ? (
          <details
            key={group}
            className="flex flex-col gap-2"
            data-testid="buyer-follow-up-group"
            data-group={group}
          >
            <summary className={`${groupTitle} cursor-pointer`}>
              {FOLLOW_UP_GROUP_TITLES[group]} <span className={countBadge}>{list.length}</span>
            </summary>
            <div className="mt-2">{rows}</div>
          </details>
        ) : (
          <div
            key={group}
            className="flex flex-col gap-2"
            data-testid="buyer-follow-up-group"
            data-group={group}
          >
            <h3 className={groupTitle}>
              {FOLLOW_UP_GROUP_TITLES[group]} <span className={countBadge}>{list.length}</span>
            </h3>
            {rows}
          </div>
        );
      })}
    </section>
  );
}
