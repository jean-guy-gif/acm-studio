import type {
  PriceRanking as Ranking,
  RankingRow,
  RankingStep,
} from '@/features/market-update/services/price-ranking';
import type { RankingTier } from '@/features/market-update/services/ranking-tiers';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import type { ClientTexts } from '@/lib/client-texts/types';
import { formatEuro } from '@/lib/format';

type RankingTexts = ClientTexts['documents']['marketUpdate']['ranking'];
// Mission 140 — les mots du classement, dans la langue du vendeur (le français par défaut).
const rankingTexts = (language: TextLanguage): RankingTexts =>
  clientTexts(language).documents.marketUpdate.ranking;

// Mission 129 — « Où en est votre prix », d'après la maquette v2 validée par Jean-Guy : le verdict
// de la couleur de la place, trois étapes et leurs réglettes, le classement du moins cher au plus
// cher, la ligne du vendeur pleine, la légende. Une seule couleur à lire : celle de la place
// (M116 disparaît de cette page). Affichage seulement : tout vient de `buildPriceRanking`.

export const TIER_CLASSES: Record<
  RankingTier,
  {
    text: string;
    bar: string;
    soft: string;
    border: string;
    cell: string;
    fill: string;
    // Mission 162 — à l'impression, le tiers « danger » est hachuré : en noir et blanc, le vert et
    // le rouge donnent le même gris ; les hachures les distinguent (sur une barre, sur une case).
    barMark: string;
    cellMark: string;
  }
> = {
  green: {
    text: 'text-emerald-700',
    bar: 'bg-emerald-600',
    soft: 'bg-emerald-50',
    border: 'border-emerald-600',
    cell: 'bg-emerald-200',
    fill: 'bg-emerald-600 text-white',
    barMark: '',
    cellMark: '',
  },
  orange: {
    text: 'text-amber-700',
    bar: 'bg-amber-600',
    soft: 'bg-orange-50',
    border: 'border-amber-600',
    cell: 'bg-orange-200',
    fill: 'bg-amber-600 text-white',
    barMark: '',
    cellMark: '',
  },
  red: {
    text: 'text-red-700',
    bar: 'bg-red-600',
    soft: 'bg-red-50',
    border: 'border-red-600',
    cell: 'bg-red-200',
    fill: 'bg-red-600 text-white',
    barMark:
      'print:bg-[image:repeating-linear-gradient(135deg,rgba(255,255,255,0.7)_0_2px,transparent_2px_5px)]',
    cellMark:
      'print:bg-[image:repeating-linear-gradient(135deg,rgba(0,0,0,0.45)_0_1.5px,transparent_1.5px_5px)]',
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

// « Maison · 5 pièces · 113 m² · Biot » → « Maison · 5 p. · 113 m² · Biot » (maquette v2).

function Place({
  rank,
  total,
  size,
  t,
}: {
  rank: number;
  total: number;
  size: 'lg' | 'md';
  t: RankingTexts;
}) {
  return (
    <>
      {rank}
      <sup className={size === 'lg' ? 'text-[0.55em]' : 'text-[0.6em]'}>{t.ordinal(rank)}</sup>
      <span className="ml-2 font-semibold text-zinc-500 [font-size:0.5em]">{t.of(total)}</span>
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
              ? `${TIER_CLASSES[tier].bar} ${TIER_CLASSES[tier].barMark} h-5 ring-2 ring-zinc-800 ring-offset-1`
              : `${TIER_CLASSES[tier].cell} ${TIER_CLASSES[tier].cellMark}`
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
  t,
}: {
  label: string;
  step: RankingStep | null;
  empty: string;
  current: boolean;
  t: RankingTexts;
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
            <Place rank={step.rank} total={step.total} size="md" t={t} />
          </span>
          <Strip step={step} />
        </>
      ) : (
        <span className="text-sm text-zinc-500">{empty}</span>
      )}
    </div>
  );
}

// Mission 129 — le verdict, dans le classement et sur la couverture du document (décision de
// Jean-Guy, 05/11 : le message clé se lit dès la première page, téléphone compris).
export function Verdict({
  ranking,
  testId = 'ranking-verdict',
  language = 'fr',
}: {
  ranking: Ranking;
  testId?: string;
  language?: TextLanguage;
}) {
  const t = rankingTexts(language);
  const { verdict } = ranking;
  const tier = TIER_CLASSES[verdict.tier];
  const [before, after] = verdict.emphasis
    ? verdict.sentence.split(verdict.emphasis)
    : [verdict.sentence, null];
  return (
    <div
      className={`flex items-start gap-4 rounded-xl border p-4 sm:p-5 ${tier.border} ${tier.soft}`}
      data-testid={testId}
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
          {t.youAre(verdict.word)}
          {verdict.rank}
          <sup className="text-[0.55em]">{t.ordinal(verdict.rank)}</sup> {t.of(verdict.total)}
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
  language = 'fr',
}: {
  ranking: Ranking;
  meetingDay: string | null;
  pointDay: string | null;
  // Mission 129 — la fourchette cherchée pour les nouveaux venus, quand une recherche a été faite.
  searchedRange?: { min: number; max: number } | null;
  language?: TextLanguage;
}) {
  const t = rankingTexts(language);
  const { steps } = ranking;
  const arrow = (
    <span className="hidden self-center text-zinc-500 sm:block" aria-hidden>
      →
    </span>
  );
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3" data-testid="ranking-steps">
        <StepCard
          label={`${t.atMeeting}${meetingDay ? ` · ${meetingDay.slice(0, 5)}` : ''}`}
          step={steps.meeting}
          empty={t.meetingUnread}
          current={false}
          t={t}
        />
        {arrow}
        <StepCard
          label={`${t.today}${pointDay ? ` · ${pointDay.slice(0, 5)}` : ''}`}
          step={steps.today}
          empty=""
          current={steps.newcomers == null}
          t={t}
        />
        {arrow}
        <StepCard
          label={t.withNewcomers}
          step={steps.newcomers}
          empty={t.noNewcomer}
          current={steps.newcomers != null}
          t={t}
        />
      </div>
      {/* La fourchette cherchée, sous la rangée : les trois cartes gardent la même hauteur. */}
      {searchedRange ? (
        <p className="text-right text-xs text-zinc-500" data-testid="ranking-searched-range">
          {t.searched(
            formatEuro(searchedRange.min, { language }),
            formatEuro(searchedRange.max, { language }),
          )}
        </p>
      ) : null}
    </div>
  );
}

function Badge({ row, t }: { row: RankingRow; t: RankingTexts }) {
  return (
    <>
      {row.newcomer ? (
        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[0.62rem] font-bold tracking-[0.12em] text-brand-darker uppercase">
          {t.newBadge}
        </span>
      ) : null}
      {row.dangerous ? (
        <span
          className={`rounded px-1.5 py-0.5 text-[0.62rem] font-bold tracking-[0.12em] uppercase ${GOLD.badge}`}
          data-testid="ranking-dangerous"
        >
          {row.dangerous === 'today' ? t.dangerousToday : t.dangerous}
        </span>
      ) : null}
    </>
  );
}

function Row({ row, language }: { row: RankingRow; language: TextLanguage }) {
  const t = rankingTexts(language);
  const euro = (value: number) => formatEuro(value, { language });
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
                <strong>{t.yourProperty}</strong> · {t.shortRooms(row.label)}
              </span>
              <span className="text-sm opacity-90">{row.detail}</span>
            </div>
            <div className="flex flex-col items-end max-sm:items-start sm:flex-row sm:items-baseline sm:gap-6">
              <span className="text-sm opacity-90 max-sm:hidden">
                {euro(row.meetingPrice ?? row.currentPrice)}
              </span>
              <span className="font-title text-2xl font-bold sm:text-3xl print:text-2xl">
                {euro(row.currentPrice)}
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
        <span className={`mt-1 block h-10 w-1.5 rounded print:h-8 ${tier.bar} ${tier.barMark}`} />
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
              <span>{t.shortRooms(row.label)}</span>
              <Badge row={row} t={t} />
            </span>
            {row.detail ? <span className="text-sm text-zinc-500">{row.detail}</span> : null}
            {/* Téléphone : les deux prix l'un sous l'autre. */}
            <span className="mt-1 flex flex-col sm:hidden">
              {row.meetingPrice != null ? (
                <span className="text-sm text-zinc-500">
                  {t.atMeetingPrice(euro(row.meetingPrice))}
                </span>
              ) : null}
              <span className="font-title text-lg font-bold">
                {t.todayPrice(euro(row.currentPrice))}
              </span>
            </span>
          </div>
        </div>
      </td>
      <td className="py-2 pr-3 text-right text-sm whitespace-nowrap text-zinc-500 max-sm:hidden print:py-1">
        {row.meetingPrice != null ? euro(row.meetingPrice) : '—'}
      </td>
      <td className="py-2 pr-3 text-right font-title text-xl font-bold whitespace-nowrap text-zinc-900 max-sm:hidden sm:text-2xl print:py-1 print:text-xl">
        {euro(row.currentPrice)}
      </td>
    </tr>
  );
}

export function PriceRankingView({
  ranking,
  meetingDay,
  pointDay,
  searchedRange = null,
  language = 'fr',
}: {
  ranking: Ranking;
  meetingDay: string | null;
  pointDay: string | null;
  searchedRange?: { min: number; max: number } | null;
  language?: TextLanguage;
}) {
  const t = rankingTexts(language);
  return (
    <div className="flex flex-col gap-4" data-testid="price-ranking">
      <div className="flex flex-col gap-4 break-inside-avoid">
        <Verdict ranking={ranking} language={language} />
        <RankingSteps
          ranking={ranking}
          meetingDay={meetingDay}
          pointDay={pointDay}
          searchedRange={searchedRange}
          language={language}
        />
      </div>
      <table className="w-full border-collapse text-left text-zinc-800">
        <thead className="[display:table-header-group]">
          <tr className="text-[0.62rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
            <th className="w-1" />
            <th className="py-2 pl-9 font-semibold">{t.tableTitle}</th>
            <th className="py-2 pr-3 text-right font-semibold whitespace-nowrap max-sm:hidden">
              {t.tableMeeting}
            </th>
            <th className="py-2 pr-3 text-right font-semibold whitespace-nowrap max-sm:hidden">
              {t.tableToday}
            </th>
          </tr>
        </thead>
        <tbody>
          {ranking.rows.map((row) => (
            <Row key={row.key} row={row} language={language} />
          ))}
        </tbody>
      </table>
      <p
        className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-500"
        data-testid="ranking-legend"
      >
        {(['green', 'orange', 'red'] as const).map((tier, index) => (
          <span key={tier} className="flex items-center gap-1.5">
            <span
              className={`inline-block h-3.5 w-3.5 rounded ${TIER_CLASSES[tier].bar} ${TIER_CLASSES[tier].barMark}`}
            />
            <span>
              {t.legendTiers[index].number}
              {t.legendTiers[index].sup ? <sup>{t.legendTiers[index].sup}</sup> : null}
              {t.legendTiers[index].rest}
              {t.legend[tier]}
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
  language = 'fr',
}: {
  ranking: Ranking;
  meetingDay: string | null;
  pointDay: string | null;
  searchedRange?: { min: number; max: number } | null;
  language?: TextLanguage;
}) {
  return (
    <div className="flex flex-col gap-3" data-testid="price-ranking-compact">
      <Verdict ranking={ranking} language={language} />
      <RankingSteps
        language={language}
        ranking={ranking}
        meetingDay={meetingDay}
        pointDay={pointDay}
        searchedRange={searchedRange}
      />
    </div>
  );
}
