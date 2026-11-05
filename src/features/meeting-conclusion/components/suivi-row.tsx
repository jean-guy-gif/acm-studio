'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  badgeNeutral,
  badgeRejected,
  badgeSelected,
  btnPrimary,
  btnSecondary,
  link,
  metaLabel,
} from '@/components/ui/styles';
import { RefreshPricesButton } from '@/features/competitor-refresh/components/refresh-prices-button';
import { MarketUpdateList } from '@/features/market-update/components/market-update-panel';
import type { MarketUpdateEntry } from '@/features/market-update/queries/list-market-updates';
import { ConclusionAmountsPanel } from '@/features/meeting-conclusion/components/conclusion-amounts-panel';
import { FollowUpHistory } from '@/features/meeting-conclusion/components/follow-up-history';
import {
  FollowUpPanel,
  relancedLabel,
} from '@/features/meeting-conclusion/components/follow-up-panel';
import { SellerSaidBlock } from '@/features/meeting-conclusion/components/seller-said-block';
import { SuiviIssueForm } from '@/features/meeting-conclusion/components/suivi-issue-form';
import type { SuiviDossier } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import { sellerJourneyGap } from '@/features/meeting-conclusion/services/conclusion-amounts';
import type { DossierFollowUp } from '@/features/meeting-conclusion/services/dossier-follow-up';
import {
  suiviGroup,
  whatHoldsBack,
  type SuiviGroup,
} from '@/features/meeting-conclusion/services/filter-suivi';
import type { ProspectingCount } from '@/features/meeting-conclusion/services/suivi-task-inputs';
import {
  dayLabel,
  lateLabel,
  type CardStep,
} from '@/features/meeting-conclusion/services/suivi-step-labels';
import {
  MANDATE_TYPE_LABELS,
  OBJECTION_LABELS,
  OUTCOME_LABELS,
  followUpMotiveLabel,
  type ConclusionOutcome,
} from '@/features/meeting-conclusion/types';
import {
  priceAlignment,
  PRICE_ALIGNMENT_TEXT,
} from '@/features/price-positioning/services/price-alignment';
import { propertyLabel } from '@/features/projects/services/property-label';
import { ExampleBadge } from '@/features/welcome/components/example-badge';
import { formatEuro, formatPercent } from '@/lib/format';

// Mission 130 — la barre de gauche : vert mandat signé, orange à relancer (« attention », M129),
// gris vendu ailleurs ou retiré. Le bleu dit désormais l'action et l'étape du jour.
const GROUP_BAR: Record<SuiviGroup, string> = {
  signed: 'bg-emerald-600',
  follow_up: 'bg-orange-500',
  lost: 'bg-zinc-300',
};

const OUTCOME_BADGE: Record<ConclusionOutcome, string> = {
  signed: badgeSelected,
  follow_up: badgeRejected,
  sold_elsewhere: badgeNeutral,
  withdrawn: badgeNeutral,
};

const smallCaps =
  'text-[11px] font-bold tracking-[0.12em] text-zinc-500 uppercase stage:text-white/50';

const longDate = (iso: string | null): string | null =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) : null;

const parisDayOf = (iso: string | null): string | null =>
  iso
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Paris',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(iso))
    : null;

// Mission 130 — la frise d'un mandat signé : Mandat signé → Concurrents démarchés → Point marché →
// Visites acquéreurs. Vert ce qui est fait, bleu l'étape du jour, gris ce qui vient.
export type SuiviFrieze = {
  prospecting: ProspectingCount;
  competitorCount: number;
  // Le prochain Point marché (AAAA-MM-JJ), son retard en jours s'il est dû, le dernier point fait.
  nextPointOn: string | null;
  pointDue: boolean;
  pointLateDays: number;
  latestPointOn: string | null;
  visits: { done: number; pending: number };
};

type Segment = {
  label: string;
  late?: string | null;
  sub?: string;
  tone: 'done' | 'today' | 'later';
};

function friezeSegments(frieze: SuiviFrieze): Segment[] {
  const { prospecting, visits } = frieze;
  const competitors: Segment =
    prospecting.total === 0
      ? { label: 'Concurrents · aucun', tone: 'later' }
      : prospecting.ready > 0
        ? { label: `Concurrents · ${prospecting.ready} à démarcher`, tone: 'today' }
        : prospecting.done === prospecting.total
          ? {
              label: `Concurrents démarchés · ${prospecting.done}/${prospecting.total}`,
              tone: 'done',
            }
          : {
              label: `Concurrents · ${prospecting.toConfirm} adresse${prospecting.toConfirm > 1 ? 's' : ''} à confirmer`,
              tone: 'later',
            };
  const point: Segment =
    frieze.competitorCount === 0 || frieze.nextPointOn == null
      ? { label: 'Point marché · sans objet', tone: 'later' }
      : frieze.pointDue
        ? frieze.pointLateDays > 0
          ? { label: 'Point marché · ', late: lateLabel(frieze.pointLateDays), tone: 'today' }
          : { label: 'Point marché · dû', tone: 'today' }
        : frieze.latestPointOn
          ? {
              label: `Point marché ✓ ${dayLabel(frieze.latestPointOn)}`,
              sub: `prochain le ${dayLabel(frieze.nextPointOn)}`,
              tone: 'done',
            }
          : { label: `Point marché · le ${dayLabel(frieze.nextPointOn)}`, tone: 'later' };
  const visit: Segment =
    visits.pending > 0
      ? { label: `Visites acquéreurs · ${visits.pending} à organiser`, tone: 'today' }
      : visits.done > 0
        ? {
            label: `Visites acquéreurs · ${visits.done} faite${visits.done > 1 ? 's' : ''}`,
            tone: 'done',
          }
        : { label: 'Visites acquéreurs · 0', tone: 'later' };
  return [{ label: 'Mandat signé ✓', tone: 'done' }, competitors, point, visit];
}

const SEGMENT_BAR = { done: 'bg-emerald-600', today: 'bg-brand', later: 'bg-zinc-200' };
const SEGMENT_TEXT = {
  done: 'text-emerald-700 font-semibold stage:text-emerald-300',
  today: 'text-brand-deep font-semibold stage:text-brand',
  later: 'text-zinc-500 stage:text-white/50',
};

function Frieze({ frieze }: { frieze: SuiviFrieze }) {
  const segments = friezeSegments(frieze);
  const today = segments.find((segment) => segment.tone === 'today');
  return (
    <div data-testid="suivi-frieze" className="flex flex-col gap-1.5">
      <div className="grid grid-cols-4 gap-1">
        {segments.map((segment) => (
          <span
            key={segment.label}
            className={`h-1 rounded-full ${SEGMENT_BAR[segment.tone]}`}
            aria-hidden
          />
        ))}
      </div>
      <ol className="hidden grid-cols-4 gap-1 text-center text-xs @md:grid">
        {segments.map((segment) => (
          <li key={segment.label} className={SEGMENT_TEXT[segment.tone]}>
            {segment.label}
            {segment.late ? <span className="text-orange-700">{segment.late}</span> : null}
            {segment.sub ? (
              <span className="block font-normal text-zinc-500 stage:text-white/50">
                {segment.sub}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      {/* Sur téléphone : le libellé de l'étape du jour seulement. */}
      <p className="text-xs @md:hidden">
        <span className={SEGMENT_TEXT[today?.tone ?? 'later']}>
          {today ? today.label : segments[2].label}
          {today?.late ? <span className="text-orange-700">{today.late}</span> : null}
        </span>
      </p>
    </div>
  );
}

function launchReadinessSentence(first: number | null, last: number | null): string | null {
  if (first == null && last == null) return null;
  if (first != null && last != null && first !== last) {
    return `Sa note pour lancer la vente : ${first} sur 10 au début, ${last} sur 10 à la fin`;
  }
  return `Sa note pour lancer la vente : ${last ?? first} sur 10`;
}

type Panel = 'relance' | 'point' | 'details' | 'issue' | null;

// Mission 130 — « Une seule prochaine étape » : à gauche le vendeur, son bien, le chemin du prix
// avec ses libellés et ce qui le retient ; à droite « Prochaine étape · aujourd'hui / le JJ/MM »,
// une phrase, UN bouton (plein seulement si l'étape est due) et trois liens au plus. Tout le reste
// s'ouvre dans la carte : la relance, le Point marché, le détail des prix, l'issue. Écran
// conseiller.
export function SuiviRow({
  dossier,
  followUp,
  marketUpdates,
  step,
  frieze,
  initialPanel = null,
}: {
  dossier: SuiviDossier;
  followUp: DossierFollowUp;
  marketUpdates?: MarketUpdateEntry[];
  step: CardStep;
  frieze: SuiviFrieze | null;
  initialPanel?: 'relance' | 'point' | null;
}) {
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const [relancedOn, setRelancedOn] = useState<string | null>(null);
  // « Faire le point marché » ouvre le Point marché dans la carte et le lance : le panneau reste
  // ouvert quand la prochaine étape change, avec le point qui vient de s'écrire.
  // « Faire le point » d'« À faire aujourd'hui » (`?point=`) arrive ici et le lance aussi.
  const [autoRun, setAutoRun] = useState(initialPanel === 'point');
  // L'adresse ne garde pas `?relancer=` ni `?point=` : un rechargement ne rouvre ni ne relance rien.
  useEffect(() => {
    if (!initialPanel) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('relancer');
    url.searchParams.delete('point');
    window.history.replaceState(window.history.state, '', url.toString());
  }, [initialPanel]);
  const { project, property, conclusion } = dossier;
  const points = marketUpdates ?? [];
  const latestPoint = points[0] ?? null;
  const outcome = conclusion?.outcome ?? null;
  const group = suiviGroup(outcome);
  const bien = propertyLabel(property);
  const price = conclusion?.commercializationPrice ?? null;
  const sellerStart = conclusion?.sellerPerceivedPrice ?? null;
  const sellerRevised = conclusion?.sellerRevisedPrice ?? null;
  const journey = sellerJourneyGap(sellerStart, price);
  const alignment = priceAlignment(price, conclusion?.advisorAnalysis ?? null);
  const holdsBack = whatHoldsBack(conclusion);
  const sellerName = project.seller_name ?? 'Dossier vendeur';
  const missingMandateType = outcome === 'signed' && conclusion?.mandateType == null;
  const motiveLabel =
    outcome === 'follow_up'
      ? followUpMotiveLabel(
          conclusion?.followUpMotive ?? null,
          conclusion?.followUpMotiveDetail ?? null,
        )
      : null;
  const missingMotive = outcome === 'follow_up' && conclusion?.followUpMotive == null;
  const readiness = launchReadinessSentence(
    conclusion?.launchReadinessFirst ?? null,
    conclusion?.launchReadinessLast ?? null,
  );
  const objections = (conclusion?.objections ?? []).map((value) =>
    OBJECTION_LABELS[value].toLowerCase(),
  );
  const meetingDay = parisDayOf(conclusion?.concludedAt ?? null);
  const signedDay = parisDayOf(conclusion?.signedAt ?? conclusion?.concludedAt ?? null);
  const badge =
    outcome === 'signed'
      ? conclusion?.mandateType
        ? `Mandat signé · ${MANDATE_TYPE_LABELS[conclusion.mandateType].toLowerCase()}`
        : 'Mandat signé'
      : outcome
        ? OUTCOME_LABELS[outcome]
        : null;
  const lastLabel = outcome === 'signed' ? 'Prix signé' : 'Prix proposé';
  const pathSteps = [
    sellerStart != null ? { label: 'Il voulait', value: sellerStart } : null,
    sellerRevised != null ? { label: 'Après le marché', value: sellerRevised } : null,
    price != null ? { label: lastLabel, value: price, last: true } : null,
  ].filter((value): value is { label: string; value: number; last?: boolean } => value != null);
  const toggle = (value: Panel) => setPanel((current) => (current === value ? null : value));
  const issueLabel = missingMandateType
    ? 'Compléter le type de mandat'
    : missingMotive
      ? 'Compléter'
      : 'Changer l’issue';
  // Mission 130 — trois liens au plus, selon l'étape (designer) : jamais un geste perdu — la
  // prospection reste à un clic sur tout mandat signé qui a des concurrents.
  const stepKind = step.button?.action.kind ?? null;
  const pointInButton = stepKind === 'market_update' || stepKind === 'point_panel';
  const prospectInButton =
    step.button?.action.kind === 'link' && step.button.action.href.startsWith('/prospection');
  type LinkKey = 'point' | 'prospection' | 'details' | 'issue';
  const linkKeys: LinkKey[] =
    outcome === 'signed'
      ? frieze && frieze.prospecting.total === 0 && frieze.competitorCount === 0
        ? ['details', 'issue']
        : pointInButton
          ? ['prospection', 'details', 'issue']
          : prospectInButton
            ? ['point', 'details', 'issue']
            : step.button
              ? ['point', 'prospection', 'issue']
              : ['prospection', 'details', 'issue']
      : outcome === 'follow_up'
        ? ['point', 'details', 'issue']
        : ['details', 'issue'];
  const LINK_LABELS: Record<LinkKey, string> = {
    point: 'Point marché',
    prospection: 'Prospection',
    details: 'Détail des prix',
    issue: issueLabel,
  };
  const links = linkKeys.map((key) => ({ key, label: LINK_LABELS[key] }));
  const stepWhen = relancedOn ? `le ${dayLabel(relancedOn)}` : step.when;
  const button = step.button;
  const buttonClass = `${button?.primary && !relancedOn ? btnPrimary : btnSecondary} w-full`;

  return (
    <li
      id={`suivi-${project.id}`}
      data-testid="suivi-row"
      className="@container flex scroll-mt-6 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card stage:border-white/10 stage:bg-white/5 stage:shadow-none"
    >
      <span className={`w-1.5 shrink-0 ${group ? GROUP_BAR[group] : 'bg-zinc-200'}`} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="grid grid-cols-1 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] @5xl:grid-cols-[minmax(0,1fr)_24rem]">
          {/* Le vendeur et son bien. */}
          <div className="flex min-w-0 flex-col gap-1 p-4 pb-2 @3xl:p-5 @3xl:pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-title text-xl font-bold text-zinc-900 @3xl:text-2xl stage:text-white">
                {sellerName}
              </span>
              {project.is_example ? <ExampleBadge /> : null}
              {badge && outcome ? (
                <span
                  data-testid="outcome-badge"
                  className={`${OUTCOME_BADGE[outcome]} whitespace-nowrap`}
                >
                  {badge}
                </span>
              ) : null}
              {motiveLabel ? (
                <span data-testid="follow-up-motive" className={badgeNeutral}>
                  {motiveLabel}
                </span>
              ) : null}
            </div>
            <span className="text-sm text-zinc-500 stage:text-white/60">
              {[
                bien ?? 'Bien vendeur non renseigné',
                outcome === 'signed' && signedDay
                  ? `signé le ${dayLabel(signedDay)}`
                  : meetingDay
                    ? `rendez-vous du ${dayLabel(meetingDay)}`
                    : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>

          {/* La prochaine étape : sur téléphone, avant le chemin du prix. */}
          <div
            data-testid="suivi-next-step"
            className="flex min-w-0 flex-col gap-2 border-zinc-100 p-4 @3xl:row-span-2 @3xl:border-l @3xl:p-5 stage:border-white/10"
          >
            <span className={smallCaps}>
              Prochaine étape ·{' '}
              <span className={step.whenLate && !relancedOn ? 'text-orange-700' : undefined}>
                {stepWhen}
              </span>
            </span>
            <span className="font-title text-base font-bold text-zinc-900 stage:text-white">
              {step.title}
            </span>
            <span className="text-sm text-zinc-500 stage:text-white/60">{step.phrase}</span>
            {missingMotive ? (
              <span className="text-xs font-semibold text-orange-700">
                Pourquoi le relancer ? Non noté.
              </span>
            ) : null}
            {relancedOn ? (
              <span
                role="status"
                data-testid="follow-up-recorded"
                className="text-sm font-semibold text-emerald-700"
              >
                {relancedLabel(relancedOn)}
              </span>
            ) : null}
            {button ? (
              button.action.kind === 'link' ? (
                <Link
                  href={button.action.href}
                  data-testid="suivi-step-button"
                  className={buttonClass}
                >
                  {button.label}
                </Link>
              ) : button.action.kind === 'market_update' || button.action.kind === 'point_panel' ? (
                <button
                  type="button"
                  data-testid="suivi-step-button"
                  className={buttonClass}
                  onClick={() => {
                    // « Faire le point marché » le lance ; « Voir le Point du … » l'ouvre seulement.
                    if (button.action.kind === 'market_update') setAutoRun(true);
                    setPanel('point');
                  }}
                >
                  {button.label}
                </button>
              ) : panel === 'relance' ? (
                <button
                  type="button"
                  className={`${link} self-start text-sm`}
                  onClick={() => setPanel(null)}
                >
                  Fermer la relance
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="suivi-step-button"
                  className={buttonClass}
                  aria-expanded={false}
                  onClick={() => setPanel('relance')}
                >
                  {button.label}
                </button>
              )
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              {links.map((item) =>
                item.key === 'prospection' ? (
                  <Link
                    key={item.key}
                    href={`/prospection?bien=${project.id}`}
                    className={`${link} text-sm font-semibold`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.key}
                    type="button"
                    data-testid={`suivi-link-${item.key}`}
                    aria-expanded={panel === item.key}
                    className={`${link} text-sm font-semibold`}
                    onClick={() => toggle(item.key as Panel)}
                  >
                    {item.label}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Le chemin du prix, la frise, ce qui le retient. */}
          <div className="flex min-w-0 flex-col gap-3 px-4 pb-4 @3xl:px-5 @3xl:pb-5">
            {pathSteps.length > 0 ? (
              <div
                data-testid="suivi-price-path"
                className="flex flex-wrap items-end gap-x-3 gap-y-2"
              >
                {pathSteps.map((item, index) => (
                  <div key={item.label} className="flex items-end gap-3">
                    {index > 0 ? (
                      <span className="pb-0.5 text-zinc-300 stage:text-white/30" aria-label="puis">
                        →
                      </span>
                    ) : null}
                    <span className="flex flex-col">
                      <span className="text-xs text-zinc-500 stage:text-white/60">
                        {item.label}
                        {item.last && alignment ? (
                          <span className={`font-semibold ${PRICE_ALIGNMENT_TEXT[alignment.tone]}`}>
                            {' '}
                            · {alignment.label.toLowerCase()}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`font-title text-lg font-bold whitespace-nowrap @3xl:text-xl ${
                          item.last && alignment
                            ? PRICE_ALIGNMENT_TEXT[alignment.tone]
                            : 'text-zinc-900 stage:text-white'
                        }`}
                      >
                        {formatEuro(item.value)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            {frieze ? <Frieze frieze={frieze} /> : null}
            {outcome === 'follow_up' && holdsBack ? (
              <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-zinc-800 stage:bg-orange-500/10 stage:text-white/85">
                Ce qui le retient&nbsp;: «&nbsp;{holdsBack}&nbsp;»
              </p>
            ) : null}
          </div>
        </div>

        {panel === 'relance' && outcome === 'follow_up' ? (
          <FollowUpPanel
            projectId={project.id}
            sellerName={sellerName}
            phone={project.seller_phone?.trim() || null}
            email={project.seller_email?.trim() || null}
            motive={conclusion?.followUpMotive ?? null}
            proposed={followUp.message}
            onClose={() => setPanel(null)}
            onDone={(nextOn) => {
              setRelancedOn(nextOn);
              setPanel(null);
            }}
          />
        ) : null}

        {panel === 'point' ? (
          <div className="flex flex-col gap-2 border-t border-zinc-100 py-3 stage:border-white/10">
            <div className="px-4">
              <RefreshPricesButton projectId={project.id} latest={latestPoint} autoRun={autoRun} />
            </div>
            <MarketUpdateList
              projectId={project.id}
              updates={points}
              signed={outcome === 'signed'}
              nextOn={frieze?.nextPointOn ?? null}
              due={frieze?.pointDue ?? false}
            />
          </div>
        ) : null}

        {panel === 'issue' ? (
          <div className="border-t border-zinc-100 p-4 stage:border-white/10">
            <SuiviIssueForm
              projectId={project.id}
              currentOutcome={outcome}
              currentReason={conclusion?.followUpReason ?? null}
              currentMandateType={conclusion?.mandateType ?? null}
              currentMotive={conclusion?.followUpMotive ?? null}
              currentMotiveDetail={conclusion?.followUpMotiveDetail ?? null}
              currentObjections={conclusion?.objections ?? []}
              currentObjectionNote={conclusion?.objectionNote ?? null}
              knownPrice={price}
              defaultOpen
              onClose={() => setPanel(null)}
            />
          </div>
        ) : null}

        {panel === 'details' ? (
          <div
            data-testid="suivi-details"
            className="flex flex-col gap-4 border-t border-zinc-100 p-4 stage:border-white/10"
          >
            {followUp.sellerSaid ? <SellerSaidBlock said={followUp.sellerSaid} /> : null}
            <FollowUpHistory contacts={followUp.contacts} />

            {conclusion ? (
              <div className="flex flex-col gap-1">
                <div className={`${metaLabel} mb-1`}>Son prix pendant le rendez-vous</div>
                {[
                  {
                    label: 'Il voulait (début du rendez-vous)',
                    value: sellerStart != null ? formatEuro(sellerStart) : 'Non renseigné',
                  },
                  ...(sellerRevised != null
                    ? [{ label: 'Après avoir vu le marché', value: formatEuro(sellerRevised) }]
                    : []),
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

            {readiness ? (
              <div className="flex flex-col gap-1">
                <span className={metaLabel}>{readiness}</span>
                {conclusion?.launchReadinessMissing ? (
                  <p className="text-sm whitespace-pre-wrap text-zinc-700 stage:text-white/80">
                    Ce qui lui manquait pour être à 10&nbsp;: «&nbsp;
                    {conclusion.launchReadinessMissing}&nbsp;»
                  </p>
                ) : null}
              </div>
            ) : null}

            {objections.length > 0 ? (
              <p
                data-testid="objections-line"
                className="text-sm text-zinc-700 stage:text-white/80"
              >
                Ce qui le freine&nbsp;: {objections.join(', ')}
              </p>
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
              {longDate(conclusion?.concludedAt ?? null)
                ? `Rendez-vous conclu le ${longDate(conclusion?.concludedAt ?? null)}`
                : null}
              {conclusion?.outcomeChangedAt &&
              longDate(conclusion.outcomeChangedAt) !== longDate(conclusion.concludedAt)
                ? ` · Issue changée le ${longDate(conclusion.outcomeChangedAt)}`
                : null}
            </span>

            <Link href={`/builder/${project.id}`} className={`${link} self-start`}>
              Ouvrir le dossier
            </Link>
          </div>
        ) : null}
      </div>
    </li>
  );
}
