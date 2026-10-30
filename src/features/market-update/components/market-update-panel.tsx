import Link from 'next/link';

import { btnSecondary, metaLabel } from '@/components/ui/styles';
import { NewcomersSearchPanel } from '@/features/market-update/components/newcomers-search-panel';
import { PriceLineBand } from '@/features/market-update/components/price-line';
import type { MarketUpdateEntry } from '@/features/market-update/queries/list-market-updates';
import {
  droppedSinceMeetingLabel,
  MARKET_UPDATE_STATE_LABELS,
  type MarketUpdateCompetitor,
  type MarketUpdateSummary,
} from '@/features/market-update/services/market-update-summary';
import { daysLabel } from '@/features/market-update/services/meeting-days';
import { NO_NEWCOMER_LABEL } from '@/features/market-update/services/price-lines';
import { priceAlignment } from '@/features/price-positioning/services/price-alignment';
import { formatEuro, formatPercent } from '@/lib/format';

// Mission 127 — sur le Suivi, côté conseiller : la liste des points datés (« Point du 15/11 »),
// la ligne d'un concurrent avec sa pastille et sa phrase de fait, et les trois lignes de prix en
// compact, à côté de « Ce que le vendeur a dit » (M96), pour préparer la relance. Affichage.

export const shortDay = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) : '';

const STATE_BADGE: Record<MarketUpdateCompetitor['state'], string> = {
  unchanged: 'bg-zinc-100 text-zinc-600 stage:bg-white/10 stage:text-white/70',
  dropped: 'bg-emerald-50 text-emerald-700 stage:bg-emerald-500/15 stage:text-emerald-300',
  raised: 'bg-zinc-100 text-zinc-700 stage:bg-white/10 stage:text-white/70',
  unread: 'bg-amber-50 text-amber-800 stage:bg-amber-400/20 stage:text-amber-200',
  probable_sale: 'bg-orange-50 text-orange-800 stage:bg-orange-400/20 stage:text-orange-200',
  withdrawn: 'bg-zinc-200 text-zinc-700 stage:bg-white/15 stage:text-white/80',
  gone: 'bg-zinc-200 text-zinc-700 stage:bg-white/15 stage:text-white/80',
  newcomer: 'bg-brand-soft text-brand-deep stage:bg-white/10 stage:text-white/80',
};

// La phrase de fait d'un concurrent, pour la ligne du Suivi.
export function competitorFactLine(item: MarketUpdateCompetitor, madeAt: string): string {
  const d =
    item.daysOnMarket != null
      ? daysLabel({ days: item.daysOnMarket, approximate: item.daysApproximate })
      : null;
  if (item.conclusion) {
    const when = `Retirée${item.goneAt ? ` le ${shortDay(item.goneAt)}` : ''}${d ? ` après ${d}` : ''}`;
    if (item.conclusion.kind === 'withdrawn') return `${when} : retiré du marché sans vente`;
    return `${when} : vente probable, négociation estimée de ${item.conclusion.negotiationMinPercent} à ${item.conclusion.negotiationMaxPercent} % (${formatEuro(item.conclusion.estimatedMin as number)} à ${formatEuro(item.conclusion.estimatedMax as number)})`;
  }
  if (item.newcomer) {
    return `Nouveau venu · ${item.currentPrice != null ? formatEuro(item.currentPrice) : '—'}${item.seenSince ? ` · vu sur le marché depuis le ${shortDay(item.seenSince)}` : ''}`;
  }
  if (item.state === 'gone') {
    return `Retirée${item.goneAt ? ` le ${shortDay(item.goneAt)}` : ''} : durée en vente inconnue, aucune conclusion`;
  }
  if (item.state === 'unread') {
    return `Prix au rendez-vous non relu ; prix du jour : ${item.currentPrice != null ? formatEuro(item.currentPrice) : '—'}${d ? ` · en vente depuis ${d}` : ''}`;
  }
  const gap =
    item.gapPercent != null && item.gapPercent !== 0
      ? ` · ${formatPercent(item.gapPercent, { signed: true, maxDecimals: 1 })} · ${item.state === 'dropped' ? 'baisse' : 'hausse'} vue le ${shortDay(madeAt)}`
      : ' · inchangé';
  return `${item.meetingPrice != null ? formatEuro(item.meetingPrice) : '—'} au rendez-vous → ${item.currentPrice != null ? formatEuro(item.currentPrice) : '—'} aujourd’hui${gap}${d ? ` · en vente depuis ${d}` : ''}`;
}

export function MarketUpdateCompetitorLines({
  summary,
  madeAt,
}: {
  summary: MarketUpdateSummary;
  madeAt: string;
}) {
  return (
    <ul className="flex flex-col gap-1.5" data-testid="market-update-competitors">
      {summary.competitors.map((item) => (
        <li key={item.id} className="flex flex-col gap-0.5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${STATE_BADGE[item.state]}`}
            >
              {MARKET_UPDATE_STATE_LABELS[item.state]}
            </span>
            <span className="font-semibold text-zinc-800 stage:text-white">
              Concurrent {item.position} · {item.label}
            </span>
          </div>
          <span className="text-xs text-zinc-600 stage:text-white/70">
            {competitorFactLine(item, madeAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// La liste des points, sous la barre d'actions de la ligne.
export function MarketUpdateList({
  projectId,
  updates,
  signed,
}: {
  projectId: string;
  updates: MarketUpdateEntry[];
  signed: boolean;
}) {
  if (updates.length === 0 && !signed) return null;
  const latest = updates[0] ?? null;
  const dropped = latest ? droppedSinceMeetingLabel(latest.summary) : null;
  return (
    <div className="flex flex-col gap-1.5 px-4 pb-3" data-testid="market-updates">
      <span className={metaLabel}>Points marché</span>
      {updates.length === 0 ? (
        <p className="text-xs text-zinc-500 stage:text-white/60">
          Aucun point marché pour ce mandat. La relecture des annonces est gratuite ; le premier
          Point marché s’écrira à la fin de la mise à jour.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {updates.map((item, index) => (
            <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-semibold text-zinc-800 stage:text-white">
                Point du {shortDay(item.madeAt)}
              </span>
              <span className="text-xs text-zinc-500 stage:text-white/60">{item.line}</span>
              <Link
                href={`/builder/${projectId}/point-marche?point=${item.id}`}
                className={`${btnSecondary} text-xs whitespace-nowrap`}
                data-testid={index === 0 ? 'open-market-update' : undefined}
              >
                Ouvrir le Point marché →
              </Link>
            </li>
          ))}
        </ul>
      )}
      {dropped ? (
        <span
          className="text-xs text-zinc-500 stage:text-white/60"
          data-testid="dropped-since-meeting"
        >
          {dropped}
        </span>
      ) : null}
      {/* Mission 127 B — après « Pas maintenant », la recherche reste possible sur le point du jour
          tant qu'aucune recherche n'a été faite pour lui. */}
      {signed &&
      latest &&
      latest.summary.agreedPrice != null &&
      latest.summary.newcomersSearch == null &&
      shortDay(latest.madeAt) === shortDay(new Date().toISOString()) ? (
        <NewcomersSearchPanel
          projectId={projectId}
          meetingDate={latest.summary.meetingDate}
          searched={false}
        />
      ) : null}
    </div>
  );
}

// Les trois lignes, en compact, dans le détail de la ligne du Suivi.
export function MarketUpdateLinesCompact({ update }: { update: MarketUpdateEntry }) {
  const { summary } = update;
  const alignment = priceAlignment(summary.agreedPrice, summary.advisorAnalysis);
  const scale = summary.lines.scale;
  const blocks = [
    {
      number: 1,
      heading: `Au rendez-vous${summary.meetingDate ? ` du ${shortDay(summary.meetingDate)}` : ''}`,
      line: summary.lines.meeting,
      subjectLabel: 'Votre prix',
    },
    { number: 2, heading: 'Aujourd’hui', line: summary.lines.today, subjectLabel: 'Votre prix' },
    {
      number: 3,
      heading: 'Face aux nouveaux venus',
      line: summary.lines.newcomers,
      subjectLabel: 'Votre prix',
    },
  ];
  return (
    <div className="flex flex-col gap-3" data-testid="market-update-lines-compact">
      <span className={metaLabel}>
        Où en est son prix, tel que le vendeur le lira · Point du {shortDay(update.madeAt)}
      </span>
      {blocks.map((block) => (
        <div key={block.number} className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-zinc-800 stage:text-white">
            {block.number} · {block.heading}
          </span>
          {block.line && scale ? (
            <PriceLineBand
              line={block.line}
              scale={scale}
              subjectLabel={block.subjectLabel}
              alignment={alignment}
              compact
            />
          ) : (
            <span className="text-xs text-zinc-500 stage:text-white/60">
              {block.number === 3 ? NO_NEWCOMER_LABEL : 'Aucun prix à placer.'}
            </span>
          )}
          {block.line?.sentence ? (
            <span className="text-xs text-zinc-600 stage:text-white/70">{block.line.sentence}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
