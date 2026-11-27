import Link from 'next/link';

import { btnSecondary, metaLabel } from '@/components/ui/styles';
import { NewcomersSearchPanel } from '@/features/market-update/components/newcomers-search-panel';
import { isPointOfDay } from '@/features/market-update/services/point-day';
import { DangerousTodayControl } from '@/features/market-update/components/dangerous-today-control';
import { PriceRankingCompact } from '@/features/market-update/components/price-ranking';
import type { MarketUpdateEntry } from '@/features/market-update/queries/list-market-updates';
import {
  droppedSinceMeetingLabel,
  MARKET_UPDATE_STATE_LABELS,
} from '@/features/market-update/services/market-update-labels';
import type {
  MarketUpdateCompetitor,
  MarketUpdateSummary,
} from '@/features/market-update/services/market-update-summary';
import { daysLabel } from '@/features/market-update/services/meeting-days';
import {
  buildPriceRanking,
  dangerousInForce,
} from '@/features/market-update/services/price-ranking';
import { formatDay, formatEuro, formatPercent } from '@/lib/format';

// Mission 127 — sur le Suivi, côté conseiller : la liste des points datés (« Point du 15/11 »),
// la ligne d'un concurrent avec sa pastille et sa phrase de fait, et les trois lignes de prix en
// compact, à côté de « Ce que le vendeur a dit » (M96), pour préparer la relance. Affichage.

export const shortDay = (value: string | null): string =>
  value ? formatDay(value, 'fr', 'numeric') : '';

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
    if (item.conclusion.kind === 'withdrawn')
      return `${when}\u00a0: probablement retiré sans vente`;
    return `${when}\u00a0: vente probable, négociation estimée de ${item.conclusion.negotiationMinPercent} à ${item.conclusion.negotiationMaxPercent} % (${formatEuro(item.conclusion.estimatedMin as number)} à ${formatEuro(item.conclusion.estimatedMax as number)})`;
  }
  if (item.newcomer) {
    return `Nouveau venu · ${item.currentPrice != null ? formatEuro(item.currentPrice) : '—'}${item.seenSince ? ` · vu sur le marché depuis le ${shortDay(item.seenSince)}` : ''}`;
  }
  if (item.state === 'gone') {
    return `Retirée${item.goneAt ? ` le ${shortDay(item.goneAt)}` : ''}. Durée en vente inconnue\u00a0: impossible de dire si elle est vendue.`;
  }
  if (item.state === 'unread') {
    return `Prix au rendez-vous non relu\u202f; prix du jour\u00a0: ${item.currentPrice != null ? formatEuro(item.currentPrice) : '—'}${d ? ` · en vente depuis ${d}` : ''}`;
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
  nextOn = null,
  due = false,
  unreadable = false,
}: {
  projectId: string;
  updates: MarketUpdateEntry[];
  signed: boolean;
  // Mission 130 — le prochain point (AAAA-MM-JJ), et s'il est dû aujourd'hui.
  nextOn?: string | null;
  due?: boolean;
  // Les points n'ont pas pu être lus : on le dit, sans rien en déduire (M98).
  unreadable?: boolean;
}) {
  if (updates.length === 0 && !signed) return null;
  const latest = updates[0] ?? null;
  const dropped = latest ? droppedSinceMeetingLabel(latest.summary) : null;
  return (
    <div className="flex flex-col gap-1.5 px-4 pb-3" data-testid="market-updates">
      <span className={metaLabel}>Points marché</span>
      {unreadable ? (
        <p role="alert" className="text-xs font-semibold text-red-700">
          Les Points marché n’ont pas pu être lus&nbsp;: rechargez la page.
        </p>
      ) : updates.length === 0 ? (
        <p className="text-xs text-zinc-500 stage:text-white/60">
          Pas encore de Point marché.{' '}
          {due
            ? 'Le premier est à faire aujourd’hui'
            : nextOn
              ? `Le premier est prévu le ${nextOn.slice(8, 10)}/${nextOn.slice(5, 7)}`
              : 'Le premier se fait un mois après la signature'}
          &nbsp;: ACM relit les annonces des concurrents (sans compter dans le forfait) et prépare
          le document pour le vendeur.
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
      {/* Mission 129 — où en est son prix, tel que le vendeur le lira, et le plus dangereux. */}
      {signed && latest ? (
        <MarketUpdateRankingCompact projectId={projectId} update={latest} />
      ) : null}
      {/* Mission 127 B — la proposition (c) sur le point du jour d'un mandat signé ; le panneau
          reste monté après la recherche (il tient ses résultats), et ne rend rien si une recherche
          a déjà été faite pour ce point. */}
      {signed && latest && latest.summary.agreedPrice != null && isPointOfDay(latest.madeAt) ? (
        <NewcomersSearchPanel
          key={latest.id}
          projectId={projectId}
          meetingDate={latest.summary.meetingDate}
          searched={latest.summary.newcomersSearch != null}
          stored={latest.summary.newcomersSearch}
          priceCeiling={latest.summary.agreedPrice}
        />
      ) : null}
    </div>
  );
}

// Mission 129 — le verdict et les trois étapes du dernier point (sans le classement), et le choix du
// plus dangereux du jour (maquettes M129-1 et M129-2).
export function MarketUpdateRankingCompact({
  projectId,
  update,
}: {
  projectId: string;
  update: MarketUpdateEntry;
}) {
  const { summary } = update;
  const ranking = buildPriceRanking(summary, 'Votre bien');
  if (!ranking) return null;
  const danger = dangerousInForce(summary);
  const option = (item: MarketUpdateCompetitor) => ({
    id: item.id,
    label: item.label,
    newcomer: item.newcomer,
    price: item.currentPrice ?? 0,
  });
  // Les biens du classement, dans son ordre : un bien en vente avant le rendez-vous, absent du
  // classement, ne se désigne pas (il ne porterait son cadre que sur sa fiche).
  const options = ranking.rows
    .filter((row) => !row.subject)
    .map((row) => summary.competitors.find((item) => item.id === row.key))
    .filter((item): item is MarketUpdateCompetitor => item != null)
    .map(option);
  const meetingItem = summary.competitors.find((item) => item.id === danger.meetingId) ?? null;
  const currentItem = summary.competitors.find((item) => item.id === danger.currentId) ?? null;
  return (
    <div className="mt-2 flex flex-col gap-3" data-testid="market-update-ranking-compact">
      {/* Ce que lira le vendeur, encadré ; le choix du plus dangereux, pour le conseiller, dessous. */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-3 stage:border-white/10">
        <span className={metaLabel}>
          Où en est son prix, tel que le vendeur le lira · Point du {shortDay(update.madeAt)}
        </span>
        <PriceRankingCompact
          ranking={ranking}
          meetingDay={summary.meetingDate ? shortDay(summary.meetingDate) : null}
          pointDay={shortDay(update.madeAt)}
          searchedRange={summary.newcomersSearch?.priceRange ?? null}
        />
      </div>
      <DangerousTodayControl
        projectId={projectId}
        options={options}
        current={currentItem ? option(currentItem) : null}
        meeting={
          meetingItem
            ? {
                ...option(meetingItem),
                price: meetingItem.currentPrice ?? meetingItem.meetingPrice ?? 0,
                gone: meetingItem.conclusion != null || meetingItem.state === 'gone',
              }
            : null
        }
        changed={danger.changed}
        needsNew={danger.needsNew}
        pointDay={shortDay(update.madeAt).slice(0, 5)}
        editable={isPointOfDay(update.madeAt)}
      />
    </div>
  );
}
