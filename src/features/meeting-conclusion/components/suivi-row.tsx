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
import {
  SUIVI_OPEN_EVENT,
  type SuiviOpenDetail,
} from '@/features/meeting-conclusion/components/suivi-task-button';
import { SuiviIssueForm } from '@/features/meeting-conclusion/components/suivi-issue-form';
import { useSuiviLead } from '@/features/meeting-conclusion/components/suivi-lead';
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
  type PriceAlignmentTone,
} from '@/features/price-positioning/services/price-alignment';
import { propertyLabel } from '@/features/projects/services/property-label';
import { ExampleBadge } from '@/features/welcome/components/example-badge';
import { formatDay, formatEuro, formatPercent, formatRelativeDay } from '@/lib/format';

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

// « Prix signé · aligné sur le marché » : le libellé de M116 sans répéter « prix ».
const ALIGNMENT_SHORT: Record<PriceAlignmentTone, string> = {
  green: 'aligné sur le marché',
  orange: 'proche du marché',
  red: 'éloigné du marché',
};

const smallCaps =
  'text-[11px] font-bold tracking-[0.12em] text-zinc-500 uppercase stage:text-white/50';

const longDate = (iso: string | null): string | null =>
  iso ? formatDay(iso, 'fr', 'numeric') : null;

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
  visits: { done: number; pending: number; priceReturns?: number };
  // Mission 130 — une lecture en échec ne se lit jamais comme « rien » (M98).
  pointsUnknown?: boolean;
  visitsUnknown?: boolean;
};

type Segment = {
  label: string;
  late?: string | null;
  sub?: string;
  tone: 'done' | 'today' | 'due' | 'later';
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
  const point: Segment = frieze.pointsUnknown
    ? { label: 'Point marché · non lu, rechargez la page', tone: 'later' }
    : frieze.competitorCount === 0 || frieze.nextPointOn == null
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
  const visit: Segment = frieze.visitsUnknown
    ? { label: 'Visites acquéreurs · non lues', tone: 'later' }
    : visits.pending > 0
      ? { label: `Visites acquéreurs · ${visits.pending} à organiser`, tone: 'today' }
      : visits.done > 0
        ? {
            label: `Visites acquéreurs · ${visits.done} faite${visits.done > 1 ? 's' : ''}`,
            // Mission 139 — « 3 visites · 2 retours sur le prix », côté conseiller.
            sub:
              (visits.priceReturns ?? 0) > 0
                ? `${visits.priceReturns} retour${(visits.priceReturns ?? 0) > 1 ? 's' : ''} sur le prix`
                : undefined,
            tone: 'done',
          }
        : { label: 'Visites acquéreurs · 0', tone: 'later' };
  return [{ label: 'Mandat signé ✓', tone: 'done' }, competitors, point, visit];
}

// L'étape de la carte en bleu plein ; une autre étape due en bleu clair (designer, 05/11).
const SEGMENT_BAR = {
  done: 'bg-emerald-600',
  today: 'bg-brand',
  due: 'bg-brand/35',
  later: 'bg-zinc-200',
};
const SEGMENT_TEXT = {
  done: 'text-emerald-700 font-semibold stage:text-emerald-300',
  today: 'text-brand-deep font-semibold stage:text-brand',
  due: 'text-brand-deep stage:text-brand',
  later: 'text-zinc-500 stage:text-white/50',
};

// Le segment « Concurrents » mène à la Prospection du bien : elle reste à un clic, quelle que soit
// l'étape.
function Frieze({
  frieze,
  prospectionHref,
  stepSegment,
}: {
  frieze: SuiviFrieze;
  prospectionHref: string;
  // Le segment de l'étape montrée à droite (1 concurrents, 2 Point marché, 3 visites).
  stepSegment: number | null;
}) {
  const segments = friezeSegments(frieze).map((segment, index) =>
    segment.tone === 'today' && stepSegment != null && index !== stepSegment
      ? { ...segment, tone: 'due' as const }
      : segment,
  );
  const today =
    segments.find((segment) => segment.tone === 'today') ??
    segments.find((segment) => segment.tone === 'due');
  const short = (segment: Segment) =>
    segment.tone === 'done' ? `${segment.label.replace(/ ✓.*$/, '')} ✓` : null;
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
        {segments.map((segment, index) => (
          <li key={segment.label} className={SEGMENT_TEXT[segment.tone]}>
            {index === 1 && frieze.prospecting.total > 0 ? (
              <Link href={prospectionHref} className="underline-offset-2 hover:underline">
                {segment.label}
              </Link>
            ) : (
              segment.label
            )}
            {segment.late ? <span className="text-orange-700">{segment.late}</span> : null}
            {segment.sub ? (
              <span className="block font-normal text-zinc-500 stage:text-white/50">
                {segment.sub}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      {/* Sur téléphone : le libellé de l'étape du jour, le lien des concurrents, et en petit ce qui
          est fait. */}
      <p className="flex flex-wrap gap-x-3 text-xs @md:hidden">
        {today !== segments[1] ? (
          <span className={SEGMENT_TEXT[today?.tone ?? 'later']}>
            {today ? today.label : segments[2].label}
            {today?.late ? <span className="text-orange-700">{today.late}</span> : null}
          </span>
        ) : null}
        {frieze.prospecting.total > 0 ? (
          <Link href={prospectionHref} className="font-semibold text-brand-deep underline">
            {segments[1].label}
          </Link>
        ) : null}
      </p>
      <p className="text-[11px] text-zinc-500 @md:hidden stage:text-white/50">
        {segments.map(short).filter(Boolean).join(' · ')}
      </p>
    </div>
  );
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
  readyBuyers = null,
  followUpReadyBuyers = null,
  acceptedOfferBuyer = null,
}: {
  dossier: SuiviDossier;
  followUp: DossierFollowUp;
  marketUpdates?: MarketUpdateEntry[];
  step: CardStep;
  frieze: SuiviFrieze | null;
  initialPanel?: 'relance' | 'point' | null;
  // Mission 133 — un mandat signé : ses acquéreurs prêts (« Acquéreurs · 7 », vers le bloc du
  // dossier) ; null hors mandat signé ou lecture en échec.
  readyBuyers?: number | null;
  // Mission 145 — un vendeur à relancer : les acquéreurs prêts qui correspondent à son bien (un
  // argument pour rentrer le mandat) ; un mandat sous offre acceptée : l'acquéreur de l'offre, à la
  // place de « Acquéreurs · N » (un seul libellé).
  followUpReadyBuyers?: number | null;
  acceptedOfferBuyer?: { buyerId: string; name: string } | null;
}) {
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const [relancedOn, setRelancedOn] = useState<string | null>(null);
  // « Faire le point marché » ouvre le Point marché dans la carte et le lance : le panneau reste
  // ouvert quand la prochaine étape change, avec le point qui vient de s'écrire.
  // « Faire le point » d'« À faire aujourd'hui » (`?point=`) arrive ici et le lance, si le point est
  // dû (un rechargement après le point ne le relance pas).
  const pointDue = frieze?.pointDue === true;
  // Mission 146 — un panneau qui porte son bouton plein (le Point marché dû, la relance)
  // devient le seul plein de l'écran ; refermé, la première carte due le reprend.
  const lead = useSuiviLead();
  const { claim, release, settle } = lead;
  const panelLeads = panel === 'relance' || (panel === 'point' && pointDue);
  useEffect(() => {
    const id = dossier.project.id;
    if (panelLeads) claim(id);
    else release(id);
    return () => release(id);
  }, [panelLeads, claim, release, dossier.project.id]);
  const [autoRun, setAutoRun] = useState(initialPanel === 'point' && pointDue);
  // Chaque demande de point est une nouvelle relecture : le bloc est remonté (clé), il repart.
  const [runKey, setRunKey] = useState(0);
  const arm = () => {
    setAutoRun(true);
    setRunKey((key) => key + 1);
  };
  // Le lien d'une tâche mène à la même page : la carte, déjà affichée, relit l'adresse quand elle
  // change (`?relancer=`, `?point=`) — jamais au premier rendu, que l'état initial couvre déjà.
  const [shownFor, setShownFor] = useState(initialPanel);
  if (initialPanel !== shownFor) {
    setShownFor(initialPanel);
    if (initialPanel) {
      setPanel(initialPanel);
      if (initialPanel === 'point' && pointDue) arm();
    }
  }
  // Le bouton d'une tâche d'« À faire » prévient la carte à chaque clic.
  const projectId = dossier.project.id;
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<SuiviOpenDetail>).detail;
      if (detail?.projectId !== projectId) return;
      setPanel(detail.panel);
      if (detail.panel === 'point' && pointDue) arm();
    };
    window.addEventListener(SUIVI_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(SUIVI_OPEN_EVENT, onOpen);
  }, [projectId, pointDue]);
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
  type LinkKey = 'point' | 'prospection' | 'details' | 'issue';
  const linkKeys: LinkKey[] =
    outcome === 'signed'
      ? frieze && frieze.competitorCount === 0
        ? ['details', 'issue']
        : [pointInButton ? 'prospection' : 'point', 'details', 'issue']
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
  const stepSegment =
    stepKind === 'market_update' || stepKind === 'point_panel'
      ? 2
      : step.button?.action.kind === 'link' && step.button.action.href.startsWith('/prospection')
        ? 1
        : step.button?.action.kind === 'link' && step.button.action.href === '/visites'
          ? 3
          : null;
  const stepWhen = relancedOn ? `le ${dayLabel(relancedOn)}` : step.when;
  const button = step.button;
  // Le Point marché ouvert et dû : son bouton est le plein de la carte, l'étape passe en contour.
  const pointLeads = panel === 'point' && pointDue;
  // Mission 146 — le plein ne va qu'à la carte qui mène l'écran (`SuiviLeadProvider`).
  const isLead = lead.leadId === dossier.project.id;
  const buttonClass = `${button?.primary && isLead && !relancedOn && !pointLeads ? btnPrimary : btnSecondary} w-full`;

  return (
    <li
      id={`suivi-${project.id}`}
      data-testid="suivi-row"
      className="@container flex scroll-mt-6 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card stage:border-white/10 stage:bg-white/5 stage:shadow-none"
    >
      <span className={`w-1.5 shrink-0 ${group ? GROUP_BAR[group] : 'bg-zinc-200'}`} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="grid grid-cols-1 @2xl:grid-cols-[minmax(0,1fr)_18rem] @4xl:grid-cols-[minmax(0,1fr)_24rem]">
          {/* Le vendeur et son bien. */}
          <div className="flex min-w-0 flex-col gap-1 p-4 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Mission 160 — le nom mène à la Vue d'ensemble du dossier (maquette M160-1). */}
              <Link
                href={`/builder/${project.id}`}
                data-testid="suivi-seller-link"
                aria-label={`Ouvrir le dossier de ${sellerName}`}
                className="font-title text-xl font-bold text-zinc-900 underline-offset-4 hover:underline @2xl:text-2xl stage:text-white"
              >
                {sellerName}
              </Link>
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
            className="flex min-w-0 flex-col gap-1.5 border-zinc-100 p-4 @2xl:row-span-2 @2xl:border-l stage:border-white/10"
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
                    if (button.action.kind === 'market_update') arm();
                    else setAutoRun(false);
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
            <div
              data-testid="suivi-links"
              className="flex flex-wrap gap-x-3 gap-y-1 pt-1 whitespace-nowrap"
            >
              {acceptedOfferBuyer ? (
                <Link
                  href={`/acquereurs/${acceptedOfferBuyer.buyerId}`}
                  data-testid="suivi-accepted-offer"
                  className="rounded-full bg-emerald-700 px-2.5 py-0.5 text-xs font-bold text-white"
                >
                  Offre acceptée · {acceptedOfferBuyer.name}
                </Link>
              ) : readyBuyers != null && readyBuyers > 0 ? (
                <Link
                  href={`/builder/${project.id}#acquereurs`}
                  data-testid="suivi-link-buyers"
                  className={`${link} text-sm font-semibold`}
                >
                  Acquéreurs · {readyBuyers}
                </Link>
              ) : null}
              {followUpReadyBuyers != null && followUpReadyBuyers > 0 ? (
                <Link
                  href={`/builder/${project.id}#acquereurs`}
                  data-testid="suivi-follow-up-buyers"
                  className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800"
                >
                  {followUpReadyBuyers > 1
                    ? `${followUpReadyBuyers} acquéreurs prêts correspondent à ce bien`
                    : '1 acquéreur prêt correspond à ce bien'}
                </Link>
              ) : null}
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
              {/* Mission 160 — en dernier, le dossier lui-même ; un seul endroit (il a quitté
                  « Détail des prix »). */}
              <Link
                href={`/builder/${project.id}`}
                data-testid="suivi-open-dossier"
                className={`${link} text-sm font-semibold`}
              >
                Ouvrir le dossier →
              </Link>
            </div>
          </div>

          {/* Le chemin du prix, la frise, ce qui le retient. */}
          <div className="flex min-w-0 flex-col gap-3 px-4 pb-4">
            {pathSteps.length > 0 ? (
              <div
                data-testid="suivi-price-path"
                className="grid grid-cols-3 items-end gap-x-2 gap-y-2 @md:flex @md:flex-wrap @md:gap-x-3"
              >
                {pathSteps.map((item, index) => (
                  <div key={item.label} className="flex min-w-0 items-end gap-3">
                    {index > 0 ? (
                      <span
                        className="hidden pb-0.5 text-zinc-300 @md:inline stage:text-white/30"
                        aria-label="puis"
                      >
                        →
                      </span>
                    ) : null}
                    <span className="flex flex-col">
                      <span className="text-xs text-zinc-500 stage:text-white/60">
                        <span>{item.label}</span>
                        {item.last && alignment ? (
                          <span className={`font-semibold ${PRICE_ALIGNMENT_TEXT[alignment.tone]}`}>
                            {' '}
                            · {ALIGNMENT_SHORT[alignment.tone]}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className={`font-title text-[15px] font-bold whitespace-nowrap @md:text-lg @3xl:text-xl ${
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
            {frieze ? (
              <Frieze
                frieze={frieze}
                prospectionHref={`/prospection?bien=${project.id}`}
                stepSegment={stepSegment}
              />
            ) : null}
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
              // Mission 146 (partie B) — la carte n'est plus due : la suivante reprend le plein.
              settle(dossier.project.id);
            }}
          />
        ) : null}

        {panel === 'point' ? (
          <div className="flex flex-col gap-2 border-t border-zinc-100 py-3 stage:border-white/10">
            <div className="flex flex-col gap-1.5 px-4">
              <span className={metaLabel}>Point marché</span>
              {outcome === 'signed' ? null : (
                <span className="text-xs text-zinc-500 stage:text-white/60">
                  ACM relit les annonces des concurrents (gratuit) : vous voyez ce qui a bougé
                  depuis le rendez-vous, et le message de relance le dit.
                </span>
              )}
              <RefreshPricesButton
                key={runKey}
                projectId={project.id}
                latest={latestPoint}
                autoRun={autoRun}
                onStarted={() => setAutoRun(false)}
                buttonClassName={`${pointDue && isLead ? btnPrimary : btnSecondary} self-start whitespace-nowrap`}
              />
            </div>
            <MarketUpdateList
              projectId={project.id}
              updates={points}
              signed={outcome === 'signed'}
              nextOn={frieze?.nextPointOn ?? null}
              unreadable={frieze?.pointsUnknown === true}
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

            {/* La note de 1 à 10 et ce qui lui manquait : dans « Ce que le vendeur a dit » (M96). */}

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

            <span className="text-xs text-zinc-500 stage:text-white/40">
              {longDate(conclusion?.concludedAt ?? null)
                ? `Rendez-vous conclu ${formatRelativeDay(conclusion!.concludedAt!)}`
                : null}
              {conclusion?.outcomeChangedAt &&
              longDate(conclusion.outcomeChangedAt) !== longDate(conclusion.concludedAt)
                ? ` · Issue changée ${formatRelativeDay(conclusion.outcomeChangedAt!)}`
                : null}
            </span>
          </div>
        ) : null}
      </div>
    </li>
  );
}
