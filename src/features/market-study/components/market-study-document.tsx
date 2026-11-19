/* eslint-disable @next/next/no-img-element */
import { TIER_CLASSES } from '@/features/market-update/components/price-ranking';
import { daysLabel } from '@/features/market-update/services/meeting-days';
import type {
  MarketStudyCompetitor,
  MarketStudyDocument as MarketStudyDocumentData,
  MarketStudyRanking,
  MarketStudyRankingRow,
} from '@/features/market-study/types';
import {
  bigNumber,
  card,
  cssString,
  Grid,
  kicker,
  meetingDay,
  Photo,
  row,
  SectionTitle,
} from '@/features/seller-synthesis/components/seller-synthesis-document';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import { formatDay, formatEuro, formatEuroPerSquareMeter, formatPercent } from '@/lib/format';
import { displayPhotoUrl } from '@/lib/photo-url';
import { NeighbourhoodLinkBlock } from '@/features/neighbourhood-link/components/neighbourhood-link-block';
import { NeighbourhoodDocumentBlocks } from '@/features/neighbourhood-link/components/neighbourhood-document';

// Mission 131 — l'« Étude de marché », à la forme de la synthèse (M113) et du Point marché (M127,
// M129) : couverture en pleine photo, une fiche par concurrent retenu qui ne se coupe jamais, puis
// « Où en est votre prix » au jour de l'étude. Il ne lit que le type `MarketStudyDocument` (liste
// d'autorisation) : rien d'une annonce n'y entre, aucune recommandation de prix.

const shortDay = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatDay(date, 'fr', 'numeric');
};

// « Maison · 5 pièces · 113 m² · Biot » → « Maison · 5 p. · 113 m² · Biot » (maquette M129).

function PriceCards({ item, language }: { item: MarketStudyCompetitor; language: TextLanguage }) {
  const texts = clientTexts(language);
  const t = texts.documents.marketStudy;
  const cards = [
    {
      key: 'price',
      label: texts.documents.synthesis.listed,
      value: formatEuro(item.price, { language }),
      hint: item.pricePerSquareMeter
        ? formatEuroPerSquareMeter(item.pricePerSquareMeter, { language })
        : null,
    },
    item.goneAt
      ? {
          key: 'gone',
          label: t.listing,
          value: t.removedOn(shortDay(item.goneAt) ?? ''),
          hint: t.notRanked,
        }
      : item.daysOnMarket
        ? {
            key: 'days',
            label: texts.documents.common.since,
            value: daysLabel(item.daysOnMarket, language),
            hint: null,
          }
        : null,
    item.priceDrop
      ? {
          key: 'drop',
          label: texts.live.analysis.dropped,
          value: formatEuro(item.priceDrop.amount, { language }),
          hint:
            item.priceDrop.percent != null
              ? formatPercent(-Math.abs(item.priceDrop.percent), {
                  signed: true,
                  maxDecimals: 1,
                  language,
                })
              : null,
        }
      : null,
  ].filter((entry): entry is NonNullable<typeof entry> => entry != null);
  return (
    <div className="flex flex-col gap-1.5" data-testid="market-study-prices">
      <div className={`${kicker} border-t-2 border-brand-deep pt-2 text-brand-deep`}>
        {t.priceToday}
      </div>
      <div className={`${row} text-[0.78rem]`}>
        {cards.map((entry) => (
          <div key={entry.key} className={card}>
            <div className={kicker}>{entry.label}</div>
            <div className={bigNumber}>{entry.value}</div>
            {entry.hint ? <div className="text-zinc-600">{entry.hint}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetitorPage({
  item,
  language,
}: {
  item: MarketStudyCompetitor;
  language: TextLanguage;
}) {
  const texts = clientTexts(language);
  const photos = item.photoUrls;
  return (
    <article
      className="flex flex-col gap-3 border border-t-[3px] border-zinc-200 border-t-brand-deep bg-white p-4 break-inside-avoid"
      data-testid="market-study-competitor"
    >
      <div>
        <div className={kicker}>{texts.live.competitorReview.competitor(item.position)}</div>
        <h3 className="font-title text-lg leading-snug font-bold text-brand-darker">
          {item.label}
        </h3>
      </div>
      {photos.length > 0 ? (
        <div
          className={`grid gap-1.5 ${photos.length === 1 ? 'grid-cols-1' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-[2fr_1fr]'}`}
        >
          <Photo
            url={photos[0]}
            alt={item.label}
            className={
              photos.length > 2 ? 'h-full min-h-36 w-full sm:min-h-44' : 'h-36 w-full sm:h-44'
            }
          />
          {photos.length > 1 ? (
            <div className="grid gap-1.5">
              {photos.slice(1, 3).map((url) => (
                <Photo
                  key={url}
                  url={url}
                  alt={item.label}
                  className={photos.length === 2 ? 'h-36 w-full sm:h-44' : 'h-full min-h-16 w-full'}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {item.features.length > 0 ? (
        <div className="flex flex-col gap-1">
          <div className={`${kicker} border-t-2 border-zinc-200 pt-2`}>
            {texts.documents.marketUpdate.features}
          </div>
          <Grid
            competitor={{
              id: item.id,
              position: item.position,
              label: item.label,
              surfaceArea: null,
              photoUrl: null,
              hasPhoto: false,
              photoHidden: false,
              features: item.features,
              serious: null,
              revealed: null,
            }}
            language={language}
          />
        </div>
      ) : null}
      <PriceCards item={item} language={language} />
    </article>
  );
}

function StudyVerdict({
  subject,
  testId,
  language,
}: {
  subject: NonNullable<MarketStudyRanking['subject']>;
  testId: string;
  language: TextLanguage;
}) {
  const documents = clientTexts(language).documents;
  const r = documents.marketUpdate.ranking;
  const t = documents.marketStudy;
  const tier = TIER_CLASSES[subject.tier];
  return (
    <div
      className={`flex items-start gap-4 rounded-xl border p-4 sm:p-5 ${tier.border} ${tier.soft}`}
      data-testid={testId}
      data-tier={subject.tier}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-title text-2xl font-bold text-white ${tier.bar}`}
        aria-hidden
      >
        {subject.tier === 'green' ? '✓' : '!'}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className={`font-title text-2xl leading-tight font-bold sm:text-3xl ${tier.text}`}>
          {r.youAre(subject.word)}
          {subject.rank}
          <sup className="text-[0.55em]">{r.ordinal(subject.rank)}</sup> {r.of(subject.total)}
        </p>
        <p className="text-[0.95rem] text-zinc-800">
          {t.atPrice(
            formatEuro(subject.price, { language }),
            subject.rank === 1
              ? t.cheapest
              : subject.rank === subject.total
                ? t.priciest
                : t.cheaperCount(subject.rank - 1),
          )}
        </p>
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
        <td colSpan={3} className="py-1.5 print:py-1">
          <div
            className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl px-4 py-3 max-sm:flex-col max-sm:items-start print:py-2 ${tier.fill}`}
          >
            <span className="w-6 text-center font-title text-2xl font-bold">{item.rank}</span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span>
                <strong>{r.yourProperty}</strong> · {r.shortRooms(item.label)}
              </span>
              {item.detail ? <span className="text-sm opacity-90">{item.detail}</span> : null}
            </div>
            <span className="font-title text-2xl font-bold sm:text-3xl print:text-2xl">
              {euro(item.price)}
            </span>
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
      <td className="w-1 py-2 pr-0 align-top print:py-1">
        <span className={`mt-1 block h-10 w-1.5 rounded print:h-8 ${tier.bar} ${tier.barMark}`} />
      </td>
      <td className="py-2 pr-3 print:py-1">
        <div className="flex items-start gap-3">
          <span
            className={`w-6 shrink-0 text-center font-title text-2xl font-bold print:text-xl ${tier.text}`}
          >
            {item.rank}
          </span>
          <div className="flex min-w-0 flex-col">
            <span>{r.shortRooms(item.label)}</span>
            {item.detail ? <span className="text-sm text-zinc-500">{item.detail}</span> : null}
            <span className="mt-1 font-title text-lg font-bold sm:hidden">{euro(item.price)}</span>
          </div>
        </div>
      </td>
      <td className="py-2 pr-3 text-right font-title text-xl font-bold whitespace-nowrap text-zinc-900 max-sm:hidden sm:text-2xl print:py-1 print:text-xl">
        {euro(item.price)}
      </td>
    </tr>
  );
}

function StudyRankingView({
  ranking,
  language,
}: {
  ranking: MarketStudyRanking;
  language: TextLanguage;
}) {
  const documents = clientTexts(language).documents;
  const r = documents.marketUpdate.ranking;
  return (
    <div className="flex flex-col gap-4" data-testid="market-study-price-ranking">
      {ranking.subject ? (
        <div className="flex flex-col gap-3 break-inside-avoid">
          <StudyVerdict
            subject={ranking.subject}
            testId="market-study-verdict"
            language={language}
          />
          <div className="flex items-center gap-1" aria-hidden>
            {ranking.subject.cells.map((cell, index) => (
              <span
                key={index}
                className={`h-3 flex-1 rounded ${
                  index === ranking.subject!.rank - 1
                    ? `${TIER_CLASSES[cell].bar} ${TIER_CLASSES[cell].barMark} h-5 ring-2 ring-zinc-800 ring-offset-1`
                    : `${TIER_CLASSES[cell].cell} ${TIER_CLASSES[cell].cellMark}`
                }`}
              />
            ))}
          </div>
        </div>
      ) : (
        <p
          className="border border-dashed border-zinc-300 px-3 py-3 text-sm text-zinc-600"
          data-testid="market-study-no-reference"
        >
          {documents.marketStudy.noReference}
        </p>
      )}
      <table className="w-full border-collapse text-left text-zinc-800">
        <thead className="[display:table-header-group]">
          <tr className="text-[0.62rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
            <th className="w-1" />
            <th className="py-2 pl-9 font-semibold">{r.tableTitle}</th>
            <th className="py-2 pr-3 text-right font-semibold whitespace-nowrap max-sm:hidden">
              {documents.synthesis.listed}
            </th>
          </tr>
        </thead>
        <tbody>
          {ranking.rows.map((item) => (
            <RankingRow key={item.key} row={item} language={language} />
          ))}
        </tbody>
      </table>
      {ranking.subject ? (
        <p
          className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-500"
          data-testid="market-study-ranking-legend"
        >
          {(['green', 'orange', 'red'] as const).map((tier, index) => (
            <span key={tier} className="flex items-center gap-1.5">
              <span
                className={`inline-block h-3.5 w-3.5 rounded ${TIER_CLASSES[tier].bar} ${TIER_CLASSES[tier].barMark}`}
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

export function MarketStudyDocument({ document }: { document: MarketStudyDocumentData }) {
  const { agency, ranking, language } = document;
  const texts = clientTexts(language);
  const t = texts.documents.marketStudy;
  const c = texts.documents.common;
  const day = meetingDay(document.madeAt, language);
  const footer = [c.confidential, document.commune, day].filter(Boolean).join(' · ');
  const pageRules = `@page{size:A4;margin:12mm 0 16mm 0;@bottom-left{content:${cssString(footer)};padding-left:14mm;font-size:7.5pt;letter-spacing:.08em;text-transform:uppercase;color:#64748b}@bottom-right{content:counter(page,decimal-leading-zero) " / " counter(pages,decimal-leading-zero);padding-right:14mm;font-size:7.5pt;color:#64748b}}@page :first{margin:0;@bottom-left{content:none}@bottom-right{content:none}}`;
  const hasCompetitors = document.competitors.length > 0;
  // Mission 159 — les blocs du quartier cochés : le quartier avant les concurrents, les ventes
  // réelles avant « Où en est votre prix ».
  const QUARTIER_BLOCKS = ['urbanisme', 'risques', 'population', 'copropriete', 'permis'] as const;
  const quartierBlocks = QUARTIER_BLOCKS.filter((key) => document.quartier?.keys.includes(key));
  const quartierSales = document.quartier?.keys.includes('ventes') ?? false;
  const sections = [
    quartierBlocks.length > 0 ? 'quartier' : null,
    hasCompetitors ? 'competitors' : null,
    quartierSales ? 'sales' : null,
    'ranking',
  ].filter((key): key is string => key != null);
  const sectionNumber = (key: string) => sections.indexOf(key) + 1;

  return (
    <article
      className="mx-auto flex w-full max-w-[210mm] flex-col gap-0 bg-zinc-50 text-zinc-800 [print-color-adjust:exact] print:max-w-none print:bg-white"
      data-testid="market-study"
      data-synthesis=""
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `${pageRules}${document.brandDeclarations ? `[data-synthesis]{${document.brandDeclarations}}` : ''}`,
        }}
      />
      {/* Couverture : la photo principale du bien, sinon un aplat à la couleur de l'agence. */}
      <section className="relative flex min-h-[150mm] flex-col overflow-hidden bg-brand-deep text-white break-after-page print:h-[297mm] print:min-h-0">
        {document.coverPhotoUrl ? (
          <>
            <img
              src={displayPhotoUrl(document.coverPhotoUrl)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-brand-darker/60 via-brand-darker/55 to-brand-darker/95" />
          </>
        ) : null}
        <div className="relative flex items-center justify-between gap-4 px-8 pt-8 sm:px-12">
          {agency.logoUrl ? (
            <span className="bg-white/95 px-3 py-2">
              <img
                src={agency.logoUrl}
                alt={agency.name}
                className="max-h-10 max-w-40 object-contain"
              />
            </span>
          ) : (
            <span className="font-title text-lg font-semibold">{agency.name}</span>
          )}
          {day ? <span className="text-xs tracking-[0.16em] uppercase">{day}</span> : null}
        </div>
        <div className="flex-1" />
        <div className="relative flex flex-col gap-3 px-8 pb-12 sm:px-12">
          <span className="self-start border border-white/80 px-3 py-1 text-[0.65rem] tracking-[0.2em] uppercase">
            {t.badge}
          </span>
          {document.propertyLabel ? (
            <span className="mt-3 text-xs tracking-[0.2em] uppercase opacity-85">
              {document.propertyLabel}
            </span>
          ) : null}
          <h1 className="font-title text-4xl leading-tight font-bold sm:text-5xl">
            {t.coverTitle}
            {day ? (
              <>
                <br />
                {texts.documents.synthesis.titleDay(day)}
              </>
            ) : null}
          </h1>
          <p className="text-sm opacity-90">
            {[
              document.sellerName ? texts.documents.synthesis.forSeller(document.sellerName) : null,
              agency.advisorName ? t.byAdvisor(agency.advisorName) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {ranking.subject ? (
            <div className="mt-6 text-zinc-800">
              <StudyVerdict
                subject={ranking.subject}
                testId="market-study-cover-verdict"
                language={language}
              />
            </div>
          ) : null}
          <div className="mt-8 flex flex-col gap-4 border-t border-white/35 pt-4 sm:flex-row [&>*]:flex-1">
            {document.coverFigures.map((figure) => (
              <div key={figure.label}>
                <div className="text-[0.62rem] font-semibold tracking-[0.14em] text-white/75 uppercase">
                  {figure.label}
                </div>
                <div className="font-title text-2xl font-bold">{figure.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6 p-5 sm:p-8 print:px-[14mm] print:py-0">
        {/* Mission 157 B — le lien « Vivre ici » du bien, sous sa photo, avant les concurrents. */}
        {document.neighbourhood ? (
          <NeighbourhoodLinkBlock link={document.neighbourhood} language={language} />
        ) : null}
        {document.quartier && quartierBlocks.length > 0 ? (
          <section className="flex flex-col gap-3">
            <NeighbourhoodDocumentBlocks
              content={document.quartier}
              only={quartierBlocks}
              language={language}
              heading={
                <SectionTitle number={sectionNumber('quartier')} title={texts.quartier.kicker} />
              }
            />
          </section>
        ) : null}
        {hasCompetitors ? (
          <section className="flex flex-col gap-3" data-testid="market-study-competitors">
            {/* Mission 162 — le titre s'imprime avec la première fiche : jamais seul en bas de page. */}
            <div className="flex flex-col gap-3 break-inside-avoid">
              <SectionTitle
                number={sectionNumber('competitors')}
                title={t.competitorsTitle}
                hint={t.competitorsHint}
              />
              <CompetitorPage item={document.competitors[0]!} language={language} />
            </div>
            {document.competitors.slice(1).map((item) => (
              <CompetitorPage key={item.id} item={item} language={language} />
            ))}
          </section>
        ) : null}

        {document.quartier && quartierSales ? (
          <section className="flex flex-col gap-3">
            <NeighbourhoodDocumentBlocks
              content={document.quartier}
              only={['ventes']}
              language={language}
              heading={
                <SectionTitle number={sectionNumber('sales')} title={texts.quartier.sales.title} />
              }
              blockTitles={false}
            />
          </section>
        ) : null}
        {/* Le classement commence une page neuve à l'impression, pour ne jamais se couper (M129). */}
        <section
          className={`flex flex-col gap-3 ${hasCompetitors ? 'print:break-before-page' : ''}`}
          data-testid="market-study-ranking"
        >
          <SectionTitle
            number={sectionNumber('ranking')}
            title={texts.documents.marketUpdate.rankingTitle}
          />
          {ranking.rows.length > 0 ? (
            <StudyRankingView ranking={ranking} language={language} />
          ) : (
            <p className="border border-dashed border-zinc-300 px-3 py-4 text-center text-sm text-zinc-500">
              {t.noCompetitors}
            </p>
          )}
        </section>

        <footer className="mt-2 flex flex-col gap-2 break-inside-avoid">
          <div className={`${kicker} border-t-2 border-brand-deep pt-2 text-brand-deep`}>
            {texts.documents.marketUpdate.readingTitle}
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">{c.disclaimer}</p>
          {agency.advisorName ? (
            <div className="flex items-center gap-4 border border-zinc-200 bg-white px-4 py-3">
              {agency.advisorPhotoUrl ? (
                <img
                  src={agency.advisorPhotoUrl}
                  alt={agency.advisorName}
                  className="h-14 w-14 shrink-0 rounded-full object-cover"
                />
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className={kicker}>{c.advisor}</span>
                <span className="font-semibold">{agency.advisorName}</span>
                <span className="text-sm text-zinc-500">
                  {[agency.advisorPhone, agency.advisorEmail].filter(Boolean).join(' · ')}
                </span>
              </div>
              {agency.advisorQr ? (
                <svg
                  viewBox={`0 0 ${agency.advisorQr.size} ${agency.advisorQr.size}`}
                  className="h-16 w-16 shrink-0"
                  role="img"
                  aria-label={c.contactCard}
                  shapeRendering="crispEdges"
                >
                  <path d={agency.advisorQr.path} fill="currentColor" />
                </svg>
              ) : null}
            </div>
          ) : null}
          <p className="text-xs leading-relaxed text-zinc-500">
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
        </footer>
      </div>
    </article>
  );
}
