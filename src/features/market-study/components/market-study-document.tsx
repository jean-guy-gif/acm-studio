/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';

import { TIER_CLASSES } from '@/features/market-update/components/price-ranking';
import type {
  MarketStudyDocument as MarketStudyDocumentData,
  MarketStudyRanking,
  MarketStudyRankingRow,
  MarketStudyStory,
  StudyBand,
  StudyCard,
  StudyTile,
} from '@/features/market-study/types';
import { NeighbourhoodLinkBlock } from '@/features/neighbourhood-link/components/neighbourhood-link-block';
import { rankingChunks } from '@/features/market-study/services/study-story';
import { cssString, Photo } from '@/features/seller-synthesis/components/seller-synthesis-document';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import { formatEuro } from '@/lib/format';
import { displayPhotoUrl } from '@/lib/photo-url';

// Mission 163 A — l'« Étude de marché » en fil conducteur (maquette M163-fil-conducteur, validée par
// Jean-Guy le 20/11) : une idée par page, la conclusion en titre. Couverture, ce que l'étude apprend,
// puis les chapitres présents — les biens en vente, les ventes réelles, la place du prix, ce que
// l'acheteur demandera — et la suite. Chaque page : le bandeau, le détail, « L'avis de … », la
// source. Il n'affiche que `document.story` (composé par `study-story.ts`) et le classement : rien
// d'une annonce n'y entre (liste d'autorisation, M51, M107), aucune valeur du bien.

const kicker = 'text-[0.62rem] font-semibold tracking-[0.12em] text-zinc-500 uppercase';
const pageBody =
  'flex flex-col gap-4 px-5 py-5 sm:px-8 print:gap-3 print:px-[14mm] print:pt-[5mm] print:pb-0';
const h3 = 'font-title text-lg font-bold text-brand-deep';
const source = 'text-[0.68rem] leading-snug text-zinc-500';

// Une page de l'Étude : à l'écran une feuille blanche, à l'impression une page A4 neuve.
function Page({
  name,
  first = false,
  children,
}: {
  name: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`flex flex-col bg-white shadow-sm print:shadow-none ${first ? '' : 'print:break-before-page'}`}
      data-study-page={name}
    >
      {children}
    </section>
  );
}

function Band({ band, children }: { band: StudyBand; children?: ReactNode }) {
  return (
    <header className="flex flex-col bg-zinc-100 px-5 pt-7 pb-5 sm:px-8 print:px-[14mm] print:pt-[9mm] print:pb-[6mm]">
      {band.number ? (
        <span className="mb-2 self-start border-[1.5px] border-brand-deep px-1.5 font-title text-sm font-bold text-brand-deep">
          {band.number}
        </span>
      ) : null}
      <h2
        className="max-w-[175mm] font-title text-3xl leading-[1.05] font-bold text-brand-deep sm:text-[2.1rem]"
        data-testid="study-chapter-title"
      >
        {band.title}
      </h2>
      {band.lead ? (
        <p className="mt-2.5 max-w-[165mm] text-[0.95rem] text-zinc-700">{band.lead}</p>
      ) : null}
      {children}
    </header>
  );
}

function Initials({ story, large = false }: { story: MarketStudyStory; large?: boolean }) {
  const size = large ? 'h-14 w-14 text-base' : 'h-10 w-10 text-sm';
  return story.advisor.photoUrl ? (
    <img
      src={story.advisor.photoUrl}
      alt=""
      className={`${size} shrink-0 rounded-full object-cover`}
    />
  ) : (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-brand-deep font-bold text-white`}
      aria-hidden
    >
      {story.advisor.initials}
    </span>
  );
}

function Avis({ story, text }: { story: MarketStudyStory; text: string }) {
  return (
    <div
      className="mt-2 flex gap-4 border-t-[1.5px] border-zinc-800 pt-4 break-inside-avoid"
      data-testid="study-avis"
    >
      <Initials story={story} />
      <div className="flex min-w-0 flex-col">
        <span className="text-xs text-zinc-500">{story.advisor.by}</span>
        <p className="mt-0.5 text-[1.02rem] leading-snug font-semibold text-zinc-900">{text}</p>
      </div>
    </div>
  );
}

function Chip({
  status,
  language,
}: {
  status: 'competitor_advantage' | 'competitor_weakness' | 'same';
  language: TextLanguage;
}) {
  const label = clientTexts(language).common.grid.status[status];
  const tone =
    status === 'competitor_weakness'
      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
      : status === 'competitor_advantage'
        ? 'border-amber-500 bg-amber-50 text-amber-800'
        : 'border-zinc-300 text-zinc-600';
  return (
    <span className={`rounded-full border px-2 py-px text-[0.66rem] whitespace-nowrap ${tone}`}>
      {label}
    </span>
  );
}

function CompetitorCard({
  card,
  faceTo,
  language,
}: {
  card: StudyCard;
  faceTo: string;
  language: TextLanguage;
}) {
  const texts = clientTexts(language);
  return (
    <article
      className="flex flex-col border border-t-[2.5px] border-zinc-200 border-t-brand-deep bg-white break-inside-avoid sm:flex-row print:min-h-[62mm]"
      data-testid="market-study-competitor"
    >
      {card.photoUrl ? (
        <Photo
          url={card.photoUrl}
          alt={card.label}
          className="h-44 w-full shrink-0 sm:h-auto sm:min-h-44 sm:w-[58mm]"
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col px-4 py-3">
        <span className={kicker}>{card.kicker}</span>
        <h3 className="mt-0.5 font-title text-lg leading-tight font-bold text-brand-deep">
          {card.label}
        </h3>
        <div className="mt-2 grid grid-cols-2 gap-3 border-b border-zinc-200 pb-2">
          <div>
            <div className={kicker}>{texts.documents.synthesis.listed}</div>
            <div className="font-title text-2xl leading-none font-bold text-brand-deep">
              {card.price}
            </div>
            {card.perSquareMeter ? (
              <div className="text-xs text-zinc-600">{card.perSquareMeter}</div>
            ) : null}
          </div>
          {card.since ? (
            <div>
              <div className={kicker}>{card.since.label}</div>
              <div className="font-title text-2xl leading-none font-bold text-brand-deep">
                {card.since.value}
              </div>
              {card.drop ? (
                <div className="text-xs text-zinc-600">
                  {card.drop.label} · {card.drop.value}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {card.diffs.length > 0 || card.equivalentAll ? (
          <div className="mt-2 flex flex-col">
            <span className={kicker}>{faceTo}</span>
            {card.diffs.map((line) => (
              <div
                key={line.label}
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-dotted border-zinc-200 py-1 text-sm"
              >
                <span className="w-24 shrink-0 text-zinc-600">{line.label}</span>
                <span className="min-w-0 flex-1">{line.value}</span>
                <Chip status={line.status} language={language} />
              </div>
            ))}
            {card.equivalentAll ? (
              <div className="flex flex-wrap items-center gap-2 py-1 text-sm">
                <span className="min-w-0 flex-1">{card.equivalentAll}</span>
                <Chip status="same" language={language} />
              </div>
            ) : null}
            {card.equivalentOn ? (
              <p className="mt-1.5 text-xs text-zinc-500">{card.equivalentOn}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

// La frise des ventes réelles : toutes les ventes en points, les ventes retenues numérotées comme
// le tableau ; seuls le prix le plus bas et le plus haut s'écrivent. Aucune moyenne (M159).
// Deux largeurs de dessin : 640 pour l'écran large et l'A4, 360 pour le téléphone, où les textes
// gardent leur taille lisible.
function SalesFrise({
  sales,
  width,
  className,
}: {
  sales: NonNullable<MarketStudyStory['sales']>;
  width: number;
  className: string;
}) {
  const height = width < 500 ? 210 : 190;
  const left = 30;
  const right = 20;
  const top = 24;
  const bottom = 30;
  const time = (month: string) => {
    const [year, mm] = month.split('-').map(Number);
    return (year ?? 0) + ((mm ?? 1) - 0.5) / 12;
  };
  const times = sales.points.map((point) => time(point.month));
  const first = Math.floor(Math.min(...times));
  const last = Math.floor(Math.max(...times)) + 1;
  const prices = sales.points.map((point) => point.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const x = (value: number) => left + ((value - first) / (last - first)) * (width - left - right);
  const y = (price: number) =>
    hi === lo
      ? (top + height - bottom) / 2
      : top + (1 - (price - lo) / (hi - lo)) * (height - top - bottom);
  const base = height - bottom;
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const lowest = sales.points.findIndex((point) => point.price === lo);
  const highest = sales.points.findIndex((point) => point.price === hi);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`h-auto w-full text-brand-deep ${className}`}
      role="img"
      data-testid="study-sales-frise"
    >
      <line x1={left} x2={width - right} y1={base} y2={base} stroke="#9aa7b1" />
      {years.map((year) => (
        <g key={year}>
          <line x1={x(year)} x2={x(year)} y1={base} y2={base + 5} stroke="#9aa7b1" />
          <text x={x(year)} y={base + 18} textAnchor="middle" fontSize={10} fill="#4b5964">
            {year}
          </text>
        </g>
      ))}
      {sales.points.map((point, i) =>
        point.mark == null ? (
          <g key={i}>
            <line
              x1={x(time(point.month))}
              x2={x(time(point.month))}
              y1={y(point.price)}
              y2={base}
              stroke="#d5dbe0"
            />
            <circle
              cx={x(time(point.month))}
              cy={y(point.price)}
              r={4}
              fill="#fff"
              stroke="#9aa7b1"
              strokeWidth={1.5}
            />
          </g>
        ) : null,
      )}
      {sales.points.map((point, i) =>
        point.mark != null ? (
          <g key={i}>
            <line
              x1={x(time(point.month))}
              x2={x(time(point.month))}
              y1={y(point.price)}
              y2={base}
              stroke="currentColor"
              strokeWidth={1.2}
            />
            <circle cx={x(time(point.month))} cy={y(point.price)} r={8} fill="currentColor" />
            <text
              x={x(time(point.month))}
              y={y(point.price) + 3.4}
              textAnchor="middle"
              fontSize={9}
              fontWeight={700}
              fill="#fff"
            >
              {point.mark}
            </text>
          </g>
        ) : null,
      )}
      {lowest >= 0 ? (
        <text
          data-price-label=""
          // Près du bord droit, le prix s'écrit à gauche de son point.
          x={
            x(time(sales.points[lowest]!.month)) +
            (x(time(sales.points[lowest]!.month)) > width - 80 ? -11 : 11)
          }
          textAnchor={x(time(sales.points[lowest]!.month)) > width - 80 ? 'end' : 'start'}
          y={y(lo) + 4}
          fontSize={10}
          fontWeight={700}
          fill="#1b2730"
        >
          {sales.low}
        </text>
      ) : null}
      {highest >= 0 && highest !== lowest ? (
        <text
          data-price-label=""
          x={x(time(sales.points[highest]!.month))}
          y={y(hi) - 11}
          textAnchor="middle"
          fontSize={10}
          fontWeight={700}
          fill="#1b2730"
        >
          {sales.high}
        </text>
      ) : null}
    </svg>
  );
}

function StudyVerdict({
  subject,
  note,
  language,
}: {
  subject: NonNullable<MarketStudyRanking['subject']>;
  note: string;
  language: TextLanguage;
}) {
  const r = clientTexts(language).documents.marketUpdate.ranking;
  const tier = TIER_CLASSES[subject.tier];
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border-[1.5px] p-4 break-inside-avoid ${tier.border} ${tier.soft}`}
      data-testid="market-study-verdict"
      data-tier={subject.tier}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-title text-2xl font-bold text-white ${tier.bar}`}
        aria-hidden
      >
        {subject.tier === 'green' ? '✓' : '!'}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className={`font-title text-2xl leading-tight font-bold ${tier.text}`}>
          {r.youAre(subject.word)}
          {subject.rank}
          <sup className="text-[0.55em]">{r.ordinal(subject.rank)}</sup> {r.of(subject.total)}
        </p>
        <p className="text-sm text-zinc-600">{note}</p>
      </div>
    </div>
  );
}

function RankingRow({
  row: item,
  language,
}: {
  row: MarketStudyRankingRow;
  language: TextLanguage;
}) {
  const r = clientTexts(language).documents.marketUpdate.ranking;
  const euro = (value: number) => formatEuro(value, { language });
  const tier = TIER_CLASSES[item.tier];
  if (item.subject) {
    return (
      <tr className="break-inside-avoid" data-testid="market-study-ranking-row" data-subject="true">
        <td colSpan={3} className="py-1">
          <div
            className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-3 py-2.5 max-sm:flex-col max-sm:items-start ${tier.fill}`}
          >
            <span className="w-6 text-center font-title text-xl font-bold">{item.rank}</span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span>
                <strong>{r.yourProperty}</strong> · {r.shortRooms(item.label)}
              </span>
              {item.detail ? <span className="text-sm opacity-90">{item.detail}</span> : null}
            </div>
            <span className="font-title text-xl font-bold">{euro(item.price)}</span>
          </div>
        </td>
      </tr>
    );
  }
  return (
    <tr
      className="break-inside-avoid border-b border-zinc-200"
      data-testid="market-study-ranking-row"
    >
      <td className="w-1 py-1.5 pr-0 align-top">
        <span className={`mt-1 block h-8 w-1.5 rounded ${tier.bar} ${tier.barMark}`} />
      </td>
      <td className="py-1.5 pr-3">
        <div className="flex items-start gap-3">
          <span className={`w-6 shrink-0 text-center font-title text-xl font-bold ${tier.text}`}>
            {item.rank}
          </span>
          <div className="flex min-w-0 flex-col">
            <span>{r.shortRooms(item.label)}</span>
            {item.detail ? <span className="text-sm text-zinc-500">{item.detail}</span> : null}
            <span className="mt-1 font-title text-lg font-bold sm:hidden">{euro(item.price)}</span>
          </div>
        </div>
      </td>
      <td className="py-1.5 pr-3 text-right font-title text-xl font-bold whitespace-nowrap text-zinc-900 max-sm:hidden">
        {euro(item.price)}
      </td>
    </tr>
  );
}

// Une page du classement : le verdict et la réglette sur la première, la légende sur la dernière ;
// les lignes coupées là où `rankingChunks` le dit, pour que le résumé cite les vraies pages.
function StudyRanking({
  ranking,
  rows,
  first,
  last,
  note,
  language,
}: {
  ranking: MarketStudyRanking;
  rows: MarketStudyRankingRow[];
  first: boolean;
  last: boolean;
  note: string;
  language: TextLanguage;
}) {
  const documents = clientTexts(language).documents;
  const r = documents.marketUpdate.ranking;
  const subject = ranking.subject!;
  return (
    <div className="flex flex-col gap-3" data-testid="market-study-price-ranking">
      {first ? <StudyVerdict subject={subject} note={note} language={language} /> : null}
      {first ? (
        <div className="flex items-center gap-1" aria-hidden>
          {subject.cells.map((cell, index) => (
            <span
              key={index}
              className={`h-3 flex-1 rounded ${
                index === subject.rank - 1
                  ? `${TIER_CLASSES[cell].bar} ${TIER_CLASSES[cell].barMark} h-4 ring-2 ring-zinc-800 ring-offset-1`
                  : `${TIER_CLASSES[cell].cell} ${TIER_CLASSES[cell].cellMark}`
              }`}
            />
          ))}
        </div>
      ) : null}
      <table className="w-full border-collapse text-left text-zinc-800">
        <thead className="[display:table-header-group]">
          <tr className="text-[0.62rem] font-semibold tracking-[0.12em] text-zinc-500 uppercase">
            <th className="w-1" />
            <th className="py-1.5 pl-9 font-semibold">{r.tableTitle}</th>
            <th className="py-1.5 pr-3 text-right font-semibold whitespace-nowrap max-sm:hidden">
              {documents.synthesis.listed}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <RankingRow key={item.key} row={item} language={language} />
          ))}
        </tbody>
      </table>
      {last ? (
        <p
          className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500"
          data-testid="market-study-ranking-legend"
        >
          {(['green', 'orange', 'red'] as const).map((tier, index) => (
            <span key={tier} className="flex items-center gap-1.5">
              <span
                className={`inline-block h-3 w-3 rounded ${TIER_CLASSES[tier].bar} ${TIER_CLASSES[tier].barMark}`}
              />
              <span>
                {r.legendTiers[index].number}
                {r.legendTiers[index].sup ? <sup>{r.legendTiers[index].sup}</sup> : null}
                {r.legendTiers[index].rest}
                {r.legend[tier]}
              </span>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}

function Tile({ tile }: { tile: StudyTile }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 px-4 py-3 break-inside-avoid print:gap-0.5 print:py-2">
      <span className="text-[0.66rem] font-bold tracking-[0.1em] text-brand-deep uppercase">
        {tile.title}
      </span>
      <p className="leading-snug font-bold">{tile.headline}</p>
      {tile.detail.map((line) => (
        <p key={line} className="text-sm text-zinc-600 print:text-xs">
          {line}
        </p>
      ))}
      {tile.source ? <p className={`mt-1 ${source}`}>{tile.source}</p> : null}
    </div>
  );
}

export function MarketStudyDocument({ document }: { document: MarketStudyDocumentData }) {
  const { agency, ranking, language, story } = document;
  const texts = clientTexts(language);
  // À l'impression, le texte courant de la maquette (9,4 pt) : tout ce qui se mesure en rem suit
  // (une tabulation après @media : du CSS, pas du texte montré au vendeur).
  const pageRules = `@media\tprint{html{font-size:14px}}@page{size:A4;margin:10mm 0 16mm 0;@bottom-left{content:${cssString(story.footer)};padding-left:14mm;font-size:7pt;letter-spacing:.08em;text-transform:uppercase;color:#64748b}@bottom-right{content:counter(page) " / " counter(pages);padding-right:14mm;font-size:7pt;color:#64748b}}@page :first{margin:0;@bottom-left{content:none}@bottom-right{content:none}}`;
  const vivreIci = document.neighbourhood ? (
    <NeighbourhoodLinkBlock link={document.neighbourhood} language={language} />
  ) : null;
  const talk = story.quartier ? (
    <div className="break-inside-avoid">
      <h3 className={h3}>{story.quartier.talkTitle}</h3>
      <ol className="mt-1 list-decimal pl-5 print:text-sm">
        {story.quartier.talk.map((line) => (
          <li key={line.lead}>
            <strong>{line.lead}</strong> {line.text}
          </li>
        ))}
      </ol>
    </div>
  ) : null;
  const quartierEnd = story.quartier ? (
    <>
      {story.quartier.avis ? <Avis story={story} text={story.quartier.avis} /> : null}
      <p className={source}>{story.quartier.frozen}</p>
    </>
  ) : null;

  return (
    <article
      className="mx-auto flex w-full max-w-[210mm] flex-col gap-4 bg-zinc-50 text-[0.9rem] text-zinc-800 [print-color-adjust:exact] print:max-w-none print:gap-0 print:bg-white"
      data-testid="market-study"
      data-synthesis=""
      lang={language}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `${pageRules}${document.brandDeclarations ? `[data-synthesis]{${document.brandDeclarations}}` : ''}`,
        }}
      />

      {/* Couverture : la photo du bien, pour qui, par qui ; plus de verdict (décision du 20/11). */}
      <Page name="cover" first>
        <div className="flex flex-col print:h-[297mm]">
          <div className="relative h-64 bg-brand-deep sm:h-96 print:h-[200mm]">
            {document.coverPhotoUrl ? (
              <img
                src={displayPhotoUrl(document.coverPhotoUrl)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <div className="absolute top-6 left-5 rounded bg-white px-3 py-2 sm:left-8 print:top-[12mm] print:left-[14mm]">
              {agency.logoUrl ? (
                <img
                  src={agency.logoUrl}
                  alt={agency.name}
                  className="max-h-10 max-w-40 object-contain"
                />
              ) : (
                <span className="font-title text-lg font-bold text-brand-deep">{agency.name}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col px-5 py-7 sm:px-8 print:px-[14mm] print:py-[9mm]">
            <span className="font-semibold text-brand-deep">{story.cover.kicker}</span>
            <h1
              className="mt-1 font-title text-4xl leading-none font-bold text-brand-deep sm:text-5xl"
              data-testid="study-cover-title"
            >
              {story.cover.title}
            </h1>
            {story.cover.line ? <p className="mt-3 text-zinc-600">{story.cover.line}</p> : null}
            <div className="mt-7 flex flex-col gap-4 border-t-[1.5px] border-zinc-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
              {document.sellerName ? (
                <div>
                  <div className="text-xs text-zinc-500">{story.cover.preparedFor}</div>
                  <div className="font-title text-xl font-bold">{document.sellerName}</div>
                </div>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-3 sm:text-right">
                <Initials story={story} large />
                <div className="flex flex-col text-sm">
                  <span>{story.cover.by}</span>
                  {story.cover.contact ? (
                    <span className="text-zinc-600">{story.cover.contact}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Page>

      {/* Ce que cette étude vous apprend : les chiffres, les conclusions et leur page. */}
      <Page name="summary">
        <Band band={{ number: null, title: story.summary.title, lead: story.summary.lead }}>
          {story.summary.kpis.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {story.summary.kpis.map((kpi) => (
                <div key={kpi.label}>
                  <div className="font-title text-4xl leading-none font-bold text-zinc-900">
                    {kpi.value}
                    {kpi.sup ? <sup className="text-[0.5em]">{kpi.sup}</sup> : null}
                    {kpi.rest ? ` ${kpi.rest}` : null}
                  </div>
                  <div className="mt-1 text-xs text-zinc-600">{kpi.label}</div>
                </div>
              ))}
            </div>
          ) : null}
        </Band>
        <div className={pageBody}>
          <ol className="flex flex-col" data-testid="study-summary">
            {story.summary.items.map((item) => {
              const tier = item.tier ? TIER_CLASSES[item.tier] : null;
              return (
                <li
                  key={item.chapter}
                  className={`flex items-center gap-4 border-b border-zinc-200 py-3 ${
                    tier ? `my-1 rounded-lg border-[1.5px] px-3 ${tier.border} ${tier.soft}` : ''
                  }`}
                  data-chapter={item.chapter}
                  data-tier={item.tier ?? undefined}
                >
                  <span
                    className={`w-8 shrink-0 font-title text-3xl font-bold ${tier ? tier.text : 'text-brand-deep'}`}
                  >
                    {item.number}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="leading-snug font-bold">
                      {item.title.map((part, index) =>
                        part.sup ? <sup key={index}>{part.text}</sup> : part.text,
                      )}
                    </p>
                    {item.sub ? <p className="mt-0.5 text-sm text-zinc-600">{item.sub}</p> : null}
                  </div>
                  <span className="text-xs whitespace-nowrap text-zinc-500">{item.page}</span>
                </li>
              );
            })}
          </ol>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className={h3}>{story.summary.howTitle}</h3>
              <p className="mt-1">{story.summary.how}</p>
            </div>
            <div>
              <h3 className={h3}>{story.summary.valueTitle}</h3>
              <p className="mt-1">{story.summary.value}</p>
            </div>
          </div>
        </div>
      </Page>

      {/* 01 · Les biens en vente : trois fiches par page au plus, jamais coupées. */}
      {story.competitors
        ? story.competitors.pages.map((cards, index, pages) => (
            <Page key={`competitors-${index}`} name="competitors">
              {index === 0 ? <Band band={story.competitors!.band} /> : null}
              <div
                className={pageBody}
                data-testid={index === 0 ? 'market-study-competitors' : undefined}
              >
                {cards.map((card) => (
                  <CompetitorCard
                    key={card.id}
                    card={card}
                    faceTo={story.competitors!.faceTo}
                    language={language}
                  />
                ))}
                {index === pages.length - 1 ? (
                  <>
                    {story.competitors!.avis ? (
                      <Avis story={story} text={story.competitors!.avis} />
                    ) : null}
                    <p className={source}>{story.competitors!.source}</p>
                  </>
                ) : null}
              </div>
            </Page>
          ))
        : null}

      {/* 02 · Les ventes réelles : toutes sur la frise, les plus proches numérotées et listées. */}
      {story.sales ? (
        <Page name="sales">
          <Band band={story.sales.band} />
          <div className={pageBody} data-testid="study-sales">
            <SalesFrise sales={story.sales} width={640} className="block max-sm:hidden" />
            <SalesFrise sales={story.sales} width={360} className="hidden max-sm:block" />
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-brand-deep" />
                {story.sales.legendKept}
              </span>
              {story.sales.legendOthers ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full border-[1.5px] border-zinc-400 bg-white" />
                  {story.sales.legendOthers}
                </span>
              ) : null}
            </p>
            <div className="break-inside-avoid">
              <h3 className={h3}>{story.sales.tableTitle}</h3>
              <table className="mt-1 w-full border-collapse text-sm">
                <thead className="[display:table-header-group]">
                  <tr className="border-b-[1.5px] border-zinc-800 text-left text-[0.66rem] text-zinc-500">
                    <th className="py-1 pr-2" />
                    <th className="py-1 pr-2 font-semibold">{story.sales.columns.month}</th>
                    <th className="py-1 pr-2 font-semibold max-sm:hidden">
                      {story.sales.columns.street}
                    </th>
                    <th className="py-1 pr-2 text-right font-semibold">
                      {story.sales.columns.rooms}
                    </th>
                    <th className="py-1 pr-2 text-right font-semibold">
                      {story.sales.columns.surface}
                    </th>
                    <th className="py-1 pr-2 text-right font-semibold max-sm:hidden">
                      {story.sales.columns.distance}
                    </th>
                    <th className="py-1 text-right font-semibold">{story.sales.columns.price}</th>
                  </tr>
                </thead>
                <tbody>
                  {story.sales.rows.map((sale) => (
                    <tr key={sale.mark} className="border-b border-zinc-200 break-inside-avoid">
                      <td className="py-1.5 pr-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-deep text-[0.65rem] font-bold text-white">
                          {sale.mark}
                        </span>
                      </td>
                      <td className="py-1.5 pr-2">{sale.month}</td>
                      <td className="py-1.5 pr-2 max-sm:hidden">{sale.street ?? ''}</td>
                      <td className="py-1.5 pr-2 text-right">{sale.rooms ?? ''}</td>
                      <td className="py-1.5 pr-2 text-right whitespace-nowrap">
                        {sale.surface ?? ''}
                      </td>
                      <td className="py-1.5 pr-2 text-right whitespace-nowrap max-sm:hidden">
                        {sale.distance ?? ''}
                      </td>
                      <td className="py-1.5 text-right font-bold whitespace-nowrap">
                        {sale.price}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="break-inside-avoid">
              <h3 className={h3}>{story.sales.readTitle}</h3>
              <ol className="mt-1 list-decimal pl-5">
                {story.sales.read.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>
            </div>
            <Avis story={story} text={story.sales.avis} />
            <p className={source}>{story.sales.source}</p>
          </div>
        </Page>
      ) : null}

      {/* 03 · Où se place votre prix : le classement de la M129, sous son titre-conclusion. */}
      {story.ranking
        ? rankingChunks(ranking.rows).map((rows, index, chunks) => (
            <Page key={`ranking-${index}`} name="ranking">
              {index === 0 ? <Band band={story.ranking!.band} /> : null}
              <div
                className={pageBody}
                data-testid={index === 0 ? 'market-study-ranking' : undefined}
              >
                <StudyRanking
                  ranking={ranking}
                  rows={rows}
                  first={index === 0}
                  last={index === chunks.length - 1}
                  note={story.ranking!.verdictNote}
                  language={language}
                />
                {index === chunks.length - 1 ? (
                  <>
                    <Avis story={story} text={story.ranking!.avis} />
                    <p className={source}>{story.ranking!.source}</p>
                  </>
                ) : null}
              </div>
            </Page>
          ))
        : null}

      {/* 04 · Ce que votre acheteur demandera : le quartier sur une page, à la fin. */}
      {story.quartier ? (
        <Page name="quartier">
          <Band band={story.quartier.band} />
          <div
            className={pageBody.replace('print:gap-3', 'print:gap-2')}
            data-testid="study-quartier"
          >
            {story.quartier.planning || story.quartier.permits ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {story.quartier.planning ? <Tile tile={story.quartier.planning} /> : null}
                {story.quartier.permits ? <Tile tile={story.quartier.permits} /> : null}
              </div>
            ) : null}
            {story.quartier.risks ? (
              <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 px-4 py-3 break-inside-avoid print:gap-1 print:py-2">
                <span className="text-[0.66rem] font-bold tracking-[0.1em] text-brand-deep uppercase">
                  {story.quartier.risks.title}
                </span>
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 print:gap-y-1">
                  {story.quartier.risks.cells.map((cell) => (
                    <div key={cell.title} className="border-b border-zinc-200 pb-1.5 print:pb-1">
                      <div className="font-bold print:text-sm">{cell.title}</div>
                      <div className="text-sm text-zinc-600 print:text-xs">{cell.text}</div>
                    </div>
                  ))}
                </div>
                <p className={source}>{story.quartier.risks.source}</p>
              </div>
            ) : null}
            {story.quartier.split ? (
              story.quartier.condominium ? (
                <Tile tile={story.quartier.condominium} />
              ) : null
            ) : (
              <>
                {talk}
                {/* La copropriété et Vivre ici côte à côte : la page tient sur une feuille. */}
                {story.quartier.condominium && vivreIci ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Tile tile={story.quartier.condominium} />
                    {vivreIci}
                  </div>
                ) : (
                  <>
                    {story.quartier.condominium ? <Tile tile={story.quartier.condominium} /> : null}
                    {vivreIci}
                  </>
                )}
                {quartierEnd}
              </>
            )}
          </div>
        </Page>
      ) : null}
      {/* Trop long pour une feuille : la suite du quartier sur une seconde page, explicitement. */}
      {story.quartier?.split ? (
        <Page name="quartier">
          <div className={pageBody}>
            {talk}
            {vivreIci}
            {quartierEnd}
          </div>
        </Page>
      ) : null}

      {/* La suite : trois étapes, les papiers, ses questions, le conseiller, les sources. */}
      <Page name="next">
        <header className="flex flex-col bg-zinc-100 px-5 pt-7 pb-5 sm:px-8 print:px-[14mm] print:pt-[9mm] print:pb-[6mm]">
          <h2
            className="font-title text-3xl leading-tight font-bold text-brand-deep"
            data-testid="study-chapter-title"
          >
            {story.next.title}
          </h2>
          <ol className="mt-4 grid gap-5 sm:grid-cols-3">
            {story.next.steps.map((step, index) => (
              <li key={step.title}>
                <span className="font-title text-3xl leading-none font-bold text-brand-deep">
                  {index + 1}
                </span>
                <h3 className="mt-1 font-title text-lg font-bold text-zinc-900">{step.title}</h3>
                <p className="text-sm text-zinc-700">{step.text}</p>
              </li>
            ))}
          </ol>
        </header>
        <div className={pageBody}>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className={h3}>{story.next.papersTitle}</h3>
              <ul className="mt-1">
                {story.next.papers.map((paper) => (
                  <li
                    key={paper}
                    className="flex items-center gap-2 border-b border-zinc-200 py-1 text-sm"
                  >
                    <span className="inline-block h-3 w-3 shrink-0 rounded-sm border border-zinc-800" />
                    {paper}
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden print:block">
              <h3 className={h3}>{story.next.questionsTitle}</h3>
              {Array.from({ length: 6 }, (_, index) => (
                <span key={index} className="block h-[7.5mm] border-b border-zinc-300" />
              ))}
            </div>
          </div>
          {story.quartier ? null : vivreIci}
          <div className="flex items-center gap-4 rounded-lg border border-zinc-200 px-4 py-3 break-inside-avoid">
            <Initials story={story} large />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className={kicker}>{story.next.contact}</span>
              <span className="font-title text-lg font-bold">
                {story.advisor.name ?? agency.name}
              </span>
              <span className="text-sm text-zinc-600">
                {[agency.advisorPhone, agency.advisorEmail].filter(Boolean).join(' · ')}
              </span>
            </div>
            {agency.advisorQr ? (
              <svg
                viewBox={`0 0 ${agency.advisorQr.size} ${agency.advisorQr.size}`}
                className="h-16 w-16 shrink-0"
                role="img"
                aria-label={texts.documents.common.contactCard}
                shapeRendering="crispEdges"
              >
                <path d={agency.advisorQr.path} fill="currentColor" />
              </svg>
            ) : null}
          </div>
          <div className="break-inside-avoid">
            <h3 className={h3}>{story.next.isTitle}</h3>
            <p className="mt-1 text-sm text-zinc-700">{story.next.is}</p>
            {story.next.sources.length > 0 ? (
              <table className="mt-2 w-full border-collapse text-xs" data-testid="study-sources">
                <tbody>
                  {story.next.sources.map((row) => (
                    <tr key={row.label} className="border-b border-zinc-200 align-top">
                      <td className="w-40 py-1 pr-3 font-bold">{row.label}</td>
                      <td className="py-1">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
          <p className="text-[0.68rem] leading-relaxed text-zinc-500">
            {[
              agency.name,
              agency.postalAddress,
              agency.professionalCard
                ? `Carte professionnelle ${agency.professionalCard}${
                    agency.professionalCardIssuer
                      ? ` délivrée par ${agency.professionalCardIssuer}`
                      : ''
                  }`
                : null,
              agency.financialGuarantee?.trim() || 'Ne peut recevoir aucun fonds',
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </Page>
    </article>
  );
}
