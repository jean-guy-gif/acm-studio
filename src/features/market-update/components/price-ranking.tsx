import type {
  PriceRanking as Ranking,
  RankingRow,
  RankingStep,
} from '@/features/market-update/services/price-ranking';
import { TIER_LEGEND, type RankingTier } from '@/features/market-update/services/ranking-tiers';
import { formatEuro } from '@/lib/format';

// Mission 129 — « Où en est votre prix », d'après la maquette v2 validée par Jean-Guy : le verdict
// de la couleur de la place, trois étapes et leurs réglettes, le classement du moins cher au plus
// cher, la ligne du vendeur pleine, la légende. Une seule couleur à lire : celle de la place
// (M116 disparaît de cette page). Affichage seulement : tout vient de `buildPriceRanking`.

export const TIER_CLASSES: Record<
  RankingTier,
  { text: string; bar: string; soft: string; border: string; cell: string; fill: string }
> = {
  green: {
    text: 'text-emerald-700',
    bar: 'bg-emerald-600',
    soft: 'bg-emerald-50',
    border: 'border-emerald-600',
    cell: 'bg-emerald-200',
    fill: 'bg-emerald-600 text-white',
  },
  orange: {
    text: 'text-amber-700',
    bar: 'bg-amber-600',
    soft: 'bg-orange-50',
    border: 'border-amber-600',
    cell: 'bg-orange-200',
    fill: 'bg-amber-600 text-white',
  },
  red: {
    text: 'text-red-700',
    bar: 'bg-red-600',
    soft: 'bg-red-50',
    border: 'border-red-600',
    cell: 'bg-red-200',
    fill: 'bg-red-600 text-white',
  },
};

// Le plus dangereux a son or à lui (maquette v2), jamais l'orange du tiers « attention » : un
// cadre orange sur une ligne verte dirait « attention » à tort. Le fond des badges tient 4,9:1
// avec le blanc.
export const GOLD = {
  frame: 'border-[#b8892b]',
  outline: 'outline-[#b8892b]',
  soft: 'bg-[#fbf4e3]',
  badge: 'bg-[#8f6a1c] text-white',
};

const ordinal = (rank: number) => (rank === 1 ? 'er' : 'e');

// « Maison · 5 pièces · 113 m² · Biot » → « Maison · 5 p. · 113 m² · Biot » (maquette v2).
const shortLabel = (label: string) => label.replace(/(\d+) pièces?/, '$1 p.');

function Place({ rank, total, size }: { rank: number; total: number; size: 'lg' | 'md' }) {
  return (
    <>
      {rank}
      <sup className={size === 'lg' ? 'text-[0.55em]' : 'text-[0.6em]'}>{ordinal(rank)}</sup>
      <span className="ml-2 font-semibold text-zinc-500 [font-size:0.5em]">sur {total}</span>
    </>
  );
}

function Strip({ step }: { step: RankingStep }) {
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {step.cells.map((tier, index) => (
        <span
          key={index}
          className={`h-3 flex-1 rounded ${
            index === step.subjectIndex
              ? `${TIER_CLASSES[tier].bar} h-5 ring-2 ring-zinc-800 ring-offset-1`
              : TIER_CLASSES[tier].cell
          }`}
        />
      ))}
    </div>
  );
}

function StepCard({
  label,
  step,
  empty,
  current,
}: {
  label: string;
  step: RankingStep | null;
  empty: string;
  current: boolean;
}) {
  const tier = step ? TIER_CLASSES[step.tier] : null;
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col gap-2 rounded-xl border p-3 sm:p-4 ${
        current && tier ? `${tier.border} ${tier.soft}` : 'border-zinc-200 bg-white'
      }`}
      data-testid="ranking-step"
      data-current={current}
    >
      {/* Une ligne sur grand écran ; deux lignes réservées aux trois cartes quand elles sont
          étroites (tablette, A4), pour que les rangs restent alignés. */}
      <span className="text-[0.62rem] font-semibold tracking-[0.08em] text-zinc-500 uppercase sm:max-lg:min-h-[2.6em] lg:whitespace-nowrap">
        {label}
      </span>
      {step ? (
        <>
          <span className={`font-title text-4xl leading-none font-bold ${tier?.text}`}>
            <Place rank={step.rank} total={step.total} size="md" />
          </span>
          <Strip step={step} />
        </>
      ) : (
        <span className="text-sm text-zinc-500">{empty}</span>
      )}
    </div>
  );
}

function Verdict({ ranking }: { ranking: Ranking }) {
  const { verdict } = ranking;
  const tier = TIER_CLASSES[verdict.tier];
  const [before, after] = verdict.emphasis
    ? verdict.sentence.split(verdict.emphasis)
    : [verdict.sentence, null];
  return (
    <div
      className={`flex items-start gap-4 rounded-xl border p-4 sm:p-5 ${tier.border} ${tier.soft}`}
      data-testid="ranking-verdict"
      data-tier={verdict.tier}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-title text-2xl font-bold text-white ${tier.bar}`}
        aria-hidden
      >
        {verdict.tier === 'green' ? '✓' : '!'}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className={`font-title text-2xl leading-tight font-bold sm:text-3xl ${tier.text}`}>
          {verdict.word} : vous êtes {verdict.rank}
          <sup className="text-[0.55em]">{ordinal(verdict.rank)}</sup> sur {verdict.total}
        </p>
        <p className="text-[0.95rem] text-zinc-800">
          {before}
          {verdict.emphasis ? <strong>{verdict.emphasis}</strong> : null}
          {after}
        </p>
      </div>
    </div>
  );
}

export function RankingSteps({
  ranking,
  meetingDay,
  pointDay,
  searchedRange = null,
}: {
  ranking: Ranking;
  meetingDay: string | null;
  pointDay: string | null;
  // Mission 129 — la fourchette cherchée pour les nouveaux venus, quand une recherche a été faite.
  searchedRange?: { min: number; max: number } | null;
}) {
  const { steps } = ranking;
  const arrow = (
    <span className="hidden self-center text-zinc-400 sm:block" aria-hidden>
      →
    </span>
  );
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3" data-testid="ranking-steps">
        <StepCard
          label={`Au rendez-vous${meetingDay ? ` · ${meetingDay.slice(0, 5)}` : ''}`}
          step={steps.meeting}
          empty="Prix du rendez-vous non relus"
          current={false}
        />
        {arrow}
        <StepCard
          label={`Aujourd’hui${pointDay ? ` · ${pointDay.slice(0, 5)}` : ''}`}
          step={steps.today}
          empty=""
          current={steps.newcomers == null}
        />
        {arrow}
        <StepCard
          label="Avec les nouveaux venus"
          step={steps.newcomers}
          empty="Aucun nouveau venu retenu"
          current={steps.newcomers != null}
        />
      </div>
      {/* La fourchette cherchée, sous la rangée : les trois cartes gardent la même hauteur. */}
      {searchedRange ? (
        <p className="text-right text-xs text-zinc-500" data-testid="ranking-searched-range">
          Nouveaux venus cherchés entre {formatEuro(searchedRange.min)} et{' '}
          {formatEuro(searchedRange.max)}
        </p>
      ) : null}
    </div>
  );
}

function Badge({ row }: { row: RankingRow }) {
  return (
    <>
      {row.newcomer ? (
        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[0.62rem] font-bold tracking-[0.12em] text-brand-darker uppercase">
          Nouveau
        </span>
      ) : null}
      {row.dangerous ? (
        <span
          className={`rounded px-1.5 py-0.5 text-[0.62rem] font-bold tracking-[0.12em] uppercase ${GOLD.badge}`}
          data-testid="ranking-dangerous"
        >
          {row.dangerous === 'today' ? 'Le plus dangereux aujourd’hui' : 'Le plus dangereux'}
        </span>
      ) : null}
    </>
  );
}

function Row({ row }: { row: RankingRow }) {
  const tier = TIER_CLASSES[row.tier];
  if (row.subject) {
    return (
      <tr className="break-inside-avoid" data-testid="ranking-row" data-subject="true">
        <td colSpan={4} className="py-1.5 print:py-1">
          <div
            className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-4 py-3 max-sm:flex-col max-sm:items-start print:py-2 ${tier.fill}`}
          >
            <span className="w-6 text-center font-title text-2xl font-bold">{row.rank}</span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span>
                <strong>VOTRE BIEN</strong> · {shortLabel(row.label)}
              </span>
              <span className="text-sm opacity-90">{row.detail}</span>
            </div>
            <div className="flex flex-col items-end max-sm:items-start sm:flex-row sm:items-baseline sm:gap-6">
              <span className="text-sm opacity-90 max-sm:hidden">
                {formatEuro(row.meetingPrice ?? row.currentPrice)}
              </span>
              <span className="font-title text-2xl font-bold sm:text-3xl print:text-2xl">
                {formatEuro(row.currentPrice)}
              </span>
            </div>
          </div>
        </td>
      </tr>
    );
  }
  const gold = row.dangerous != null;
  return (
    <tr
      className={`break-inside-avoid border-b border-zinc-200 ${gold ? `${GOLD.soft} outline-2 -outline-offset-2 ${GOLD.outline}` : ''}`}
      data-testid="ranking-row"
      data-dangerous={row.dangerous ?? undefined}
    >
      <td className="w-1 py-2 pr-0 align-top print:py-1">
        <span className={`mt-1 block h-10 w-1.5 rounded print:h-8 ${tier.bar}`} />
      </td>
      <td className="py-2 pr-3 print:py-1">
        <div className="flex items-start gap-3">
          <span
            className={`w-6 shrink-0 text-center font-title text-2xl font-bold print:text-xl ${tier.text}`}
          >
            {row.rank}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{shortLabel(row.label)}</span>
              <Badge row={row} />
            </span>
            {row.detail ? <span className="text-sm text-zinc-500">{row.detail}</span> : null}
            {/* Téléphone : les deux prix l'un sous l'autre. */}
            <span className="mt-1 flex flex-col sm:hidden">
              {row.meetingPrice != null ? (
                <span className="text-sm text-zinc-500">
                  Au rendez-vous : {formatEuro(row.meetingPrice)}
                </span>
              ) : null}
              <span className="font-title text-lg font-bold">
                Aujourd’hui : {formatEuro(row.currentPrice)}
              </span>
            </span>
          </div>
        </div>
      </td>
      <td className="py-2 pr-3 text-right text-sm whitespace-nowrap text-zinc-500 max-sm:hidden print:py-1">
        {row.meetingPrice != null ? formatEuro(row.meetingPrice) : '—'}
      </td>
      <td className="py-2 pr-3 text-right font-title text-xl font-bold whitespace-nowrap text-zinc-900 max-sm:hidden sm:text-2xl print:py-1 print:text-xl">
        {formatEuro(row.currentPrice)}
      </td>
    </tr>
  );
}

export function PriceRankingView({
  ranking,
  meetingDay,
  pointDay,
  searchedRange = null,
}: {
  ranking: Ranking;
  meetingDay: string | null;
  pointDay: string | null;
  searchedRange?: { min: number; max: number } | null;
}) {
  return (
    <div className="flex flex-col gap-4" data-testid="price-ranking">
      <div className="flex flex-col gap-4 break-inside-avoid">
        <Verdict ranking={ranking} />
        <RankingSteps
          ranking={ranking}
          meetingDay={meetingDay}
          pointDay={pointDay}
          searchedRange={searchedRange}
        />
      </div>
      <table className="w-full border-collapse text-left text-zinc-800">
        <thead className="[display:table-header-group]">
          <tr className="text-[0.62rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
            <th className="w-1" />
            <th className="py-2 pl-9 font-semibold">Classement, du moins cher au plus cher</th>
            <th className="py-2 pr-3 text-right font-semibold whitespace-nowrap max-sm:hidden">
              Prix au rendez-vous
            </th>
            <th className="py-2 pr-3 text-right font-semibold whitespace-nowrap max-sm:hidden">
              Prix aujourd’hui
            </th>
          </tr>
        </thead>
        <tbody>
          {ranking.rows.map((row) => (
            <Row key={row.key} row={row} />
          ))}
        </tbody>
      </table>
      <p
        className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-500"
        data-testid="ranking-legend"
      >
        {(['green', 'orange', 'red'] as const).map((tier, index) => (
          <span key={tier} className="flex items-center gap-1.5">
            <span className={`inline-block h-3.5 w-3.5 rounded ${TIER_CLASSES[tier].bar}`} />
            <span>
              {index === 0 ? (
                <>
                  1<sup>er</sup> tiers
                </>
              ) : index === 1 ? (
                <>
                  2<sup>e</sup> tiers
                </>
              ) : (
                'dernier tiers'
              )}{' '}
              : {TIER_LEGEND[tier]}
            </span>
          </span>
        ))}
      </p>
    </div>
  );
}

// Le Suivi : le verdict et les trois étapes, sans le classement (fiche, point 5).
export function PriceRankingCompact({
  ranking,
  meetingDay,
  pointDay,
  searchedRange = null,
}: {
  ranking: Ranking;
  meetingDay: string | null;
  pointDay: string | null;
  searchedRange?: { min: number; max: number } | null;
}) {
  return (
    <div className="flex flex-col gap-3" data-testid="price-ranking-compact">
      <Verdict ranking={ranking} />
      <RankingSteps
        ranking={ranking}
        meetingDay={meetingDay}
        pointDay={pointDay}
        searchedRange={searchedRange}
      />
    </div>
  );
}
