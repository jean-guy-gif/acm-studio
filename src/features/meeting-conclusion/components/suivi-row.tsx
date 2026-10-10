'use client';

import Link from 'next/link';
import { useState } from 'react';

import {
  badgeBrand,
  badgeNeutral,
  badgeRejected,
  badgeSelected,
  btnPrimary,
  btnSecondary,
  link,
  metaLabel,
} from '@/components/ui/styles';
import { ConclusionAmountsPanel } from '@/features/meeting-conclusion/components/conclusion-amounts-panel';
import { SuiviIssueForm } from '@/features/meeting-conclusion/components/suivi-issue-form';
import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import { sellerJourneyGap } from '@/features/meeting-conclusion/services/conclusion-amounts';
import {
  suiviGroup,
  whatHoldsBack,
  type SuiviGroup,
} from '@/features/meeting-conclusion/services/filter-suivi';
import {
  launchReadinessLabel,
  launchReadinessShort,
} from '@/features/meeting-conclusion/services/launch-readiness';
import { OUTCOME_LABELS, type ConclusionOutcome } from '@/features/meeting-conclusion/types';
import { shortDate } from '@/features/prospecting/services/prospecting-status';
import { propertyLabel } from '@/features/projects/services/property-label';
import { formatEuro, formatPercent } from '@/lib/format';

// « Vendu ailleurs » (parti) en orange ; « retiré » (peut revenir) en gris neutre.
const OUTCOME_BADGE: Record<ConclusionOutcome, string> = {
  signed: badgeSelected,
  follow_up: badgeBrand,
  sold_elsewhere: badgeRejected,
  withdrawn: badgeNeutral,
};

// La barre de gauche : vert = mandat signé, bleu = à relancer, gris = vendu ailleurs ou retiré.
const GROUP_BAR: Record<SuiviGroup, string> = {
  signed: 'bg-emerald-600',
  follow_up: 'bg-brand',
  lost: 'bg-zinc-400',
};

const cellLabel =
  'text-[11px] font-bold tracking-[0.12em] text-zinc-500 uppercase stage:text-white/50';

const longDate = (iso: string | null): string | null =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) : null;

// Ce que la ligne d'un mandat signé dit de sa prospection.
export type SuiviProspecting = { count: number; progress: string | null };

// Mission 86 — une ligne du Suivi : le bien, le chemin parcouru, la note de closing, et UNE
// action selon l'issue. Tout le reste (les quatre repères, les écarts, le motif, le changement
// d'issue) se déplie sous « Voir le détail des prix » : rien de ce que montrait la carte
// d'avant n'a disparu. Écran conseiller.
export function SuiviRow({
  dossier,
  prospecting,
}: {
  dossier: SuiviDossier;
  prospecting: SuiviProspecting | null;
}) {
  const [open, setOpen] = useState(false);
  const { project, property, conclusion } = dossier;
  const outcome = conclusion?.outcome ?? null;
  const group = suiviGroup(outcome);
  const bien = propertyLabel(property);
  const concluded = conclusion?.concludedAt ?? project.updated_at;
  const price = conclusion?.commercializationPrice ?? null;
  const sellerStart = conclusion?.sellerPerceivedPrice ?? null;
  const journey = sellerJourneyGap(sellerStart, price);
  const readinessShort = launchReadinessShort(
    conclusion?.launchReadinessFirst ?? null,
    conclusion?.launchReadinessLast ?? null,
  );
  const readinessFull = launchReadinessLabel(
    conclusion?.launchReadinessFirst ?? null,
    conclusion?.launchReadinessLast ?? null,
  );
  const holdsBack = whatHoldsBack(conclusion);
  const phone = project.seller_phone?.trim() || null;
  const meetingDate = longDate(conclusion?.concludedAt ?? project.updated_at);
  const changedDate = longDate(conclusion?.outcomeChangedAt ?? null);
  const detailsId = `suivi-details-${project.id}`;

  return (
    <li
      data-testid="suivi-row"
      className="@container flex overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card stage:border-white/10 stage:bg-white/5 stage:shadow-none"
    >
      <span className={`w-1.5 shrink-0 ${group ? GROUP_BAR[group] : 'bg-zinc-200'}`} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 p-4 @xl:grid-cols-2 @5xl:grid-cols-[1.35fr_1.2fr_0.75fr_1.15fr] @5xl:items-center">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
                {project.seller_name ?? 'Dossier vendeur'}
              </span>
              {outcome ? (
                <span className={`${OUTCOME_BADGE[outcome]} whitespace-nowrap`}>
                  {OUTCOME_LABELS[outcome]}
                </span>
              ) : null}
            </div>
            <span className="text-sm text-zinc-500 stage:text-white/60">
              {[bien ?? 'Bien vendeur non renseigné', `conclu le ${shortDate(concluded)}`].join(
                ' · ',
              )}
            </span>
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <span className={cellLabel}>Le chemin parcouru</span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-title text-base font-bold text-zinc-900 stage:text-white">
              <span className="whitespace-nowrap">
                {sellerStart != null ? formatEuro(sellerStart) : '—'}
              </span>
              <span className="text-zinc-400 stage:text-white/40" aria-label="puis">
                →
              </span>
              <span className="whitespace-nowrap">{price != null ? formatEuro(price) : '—'}</span>
              {journey.percentage != null ? (
                <span
                  className={`rounded-md px-1.5 py-0.5 text-xs whitespace-nowrap ${
                    journey.percentage <= 0
                      ? 'bg-emerald-50 text-emerald-700 stage:bg-emerald-500/15 stage:text-emerald-300'
                      : 'bg-zinc-100 text-zinc-600 stage:bg-white/10 stage:text-white/70'
                  }`}
                >
                  {formatPercent(journey.percentage, { signed: true })}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            {readinessShort ? (
              <>
                <span className={cellLabel}>Prêt à lancer</span>
                <span className="font-title text-base font-bold whitespace-nowrap text-zinc-900 stage:text-white">
                  {readinessShort}
                </span>
              </>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col items-start gap-1.5 @5xl:items-end @5xl:text-right">
            {group === 'signed' && prospecting ? (
              prospecting.count > 0 ? (
                <>
                  <Link
                    href={`/prospection?bien=${project.id}`}
                    className={`${btnPrimary} whitespace-nowrap`}
                  >
                    Prospecter · {prospecting.count} concurrent{prospecting.count > 1 ? 's' : ''} →
                  </Link>
                  {prospecting.progress ? (
                    <span className="text-xs text-zinc-500 stage:text-white/60">
                      {prospecting.progress}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="text-xs text-zinc-500 stage:text-white/60">
                  Aucun concurrent retenu à prospecter
                </span>
              )
            ) : null}
            {group === 'follow_up' ? (
              <>
                {phone ? (
                  <a
                    href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                    title={`Appeler ${phone}`}
                    className={`${btnSecondary} whitespace-nowrap`}
                  >
                    Relancer →
                  </a>
                ) : (
                  <Link
                    href={`/builder/${project.id}`}
                    className={`${btnSecondary} whitespace-nowrap`}
                  >
                    Relancer →
                  </Link>
                )}
                {holdsBack ? (
                  <span className="line-clamp-2 text-xs font-semibold text-amber-700 stage:text-amber-300">
                    Ce qui le retient&nbsp;: «&nbsp;{holdsBack}&nbsp;»
                  </span>
                ) : null}
              </>
            ) : null}
            <button
              type="button"
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={() => setOpen((value) => !value)}
              className={`${link} text-xs whitespace-nowrap`}
            >
              {open ? 'Masquer le détail des prix ▴' : 'Voir le détail des prix ▾'}
            </button>
          </div>
        </div>

        {open ? (
          <div
            id={detailsId}
            className="flex flex-col gap-4 border-t border-zinc-100 p-4 stage:border-white/10"
          >
            {conclusion ? (
              <div className="flex flex-col gap-1">
                <div className={`${metaLabel} mb-1`}>Le chemin parcouru pendant le rendez-vous</div>
                {[
                  {
                    label: 'Prix du vendeur en début de rendez-vous',
                    value: sellerStart != null ? formatEuro(sellerStart) : 'Non renseigné',
                  },
                  {
                    label: 'Prix de commercialisation',
                    value: price != null ? formatEuro(price) : 'Non convenu',
                  },
                  {
                    label: journey.label,
                    value:
                      journey.amount != null && journey.percentage != null
                        ? `${formatEuro(journey.amount, { signed: true })} (${formatPercent(journey.percentage, { signed: true })})`
                        : '—',
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-2 last:border-0 stage:border-white/10"
                  >
                    <span className="text-sm text-zinc-500 stage:text-white/60">{row.label}</span>
                    <span className="text-right font-title font-semibold whitespace-nowrap text-zinc-900 stage:text-white">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {conclusion ? <ConclusionAmountsPanel amounts={conclusion} /> : null}

            {readinessFull ? (
              <div className="flex flex-col gap-1">
                <span className={metaLabel}>Prêt à lancer&nbsp;: {readinessFull}</span>
                {conclusion?.launchReadinessMissing ? (
                  <p className="text-sm whitespace-pre-wrap text-zinc-700 stage:text-white/80">
                    Ce qui manquait pour être à 10&nbsp;: {conclusion.launchReadinessMissing}
                  </p>
                ) : null}
              </div>
            ) : null}

            {outcome === 'follow_up' && conclusion?.followUpReason ? (
              <div className="flex flex-col gap-1">
                <span className={metaLabel}>À relancer — ce qui retient le vendeur</span>
                <p className="text-sm whitespace-pre-wrap text-zinc-700 stage:text-white/80">
                  {conclusion.followUpReason}
                </p>
              </div>
            ) : null}

            <span className="text-xs text-zinc-400 stage:text-white/40">
              {meetingDate ? `Rendez-vous conclu le ${meetingDate}` : null}
              {changedDate != null && changedDate !== meetingDate
                ? ` · Issue changée le ${changedDate}`
                : null}
            </span>

            <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
              <Link href={`/builder/${project.id}`} className={link}>
                Ouvrir le dossier
              </Link>
              <SuiviIssueForm
                projectId={project.id}
                currentOutcome={outcome}
                currentReason={conclusion?.followUpReason ?? null}
              />
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}
