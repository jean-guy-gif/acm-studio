/* eslint-disable @next/next/no-img-element */
import { TIER_CLASSES } from '@/features/market-update/components/price-ranking';
import { daysLabel } from '@/features/market-update/services/meeting-days';
import { TIER_LEGEND } from '@/features/market-update/services/ranking-tiers';
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
import { formatEuro, formatEuroPerSquareMeter, formatPercent } from '@/lib/format';
import { displayPhotoUrl } from '@/lib/photo-url';

// Mission 131 — l'« Étude de marché », à la forme de la synthèse (M113) et du Point marché (M127,
// M129) : couverture en pleine photo, une fiche par concurrent retenu qui ne se coupe jamais, puis
// « Où en est votre prix » au jour de l'étude. Il ne lit que le type `MarketStudyDocument` (liste
// d'autorisation) : rien d'une annonce n'y entre, aucune recommandation de prix.

const shortDay = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
};

const ordinal = (rank: number) => (rank === 1 ? 'er' : 'e');

// « Maison · 5 pièces · 113 m² · Biot » → « Maison · 5 p. · 113 m² · Biot » (maquette M129).
const shortLabel = (label: string) => label.replace(/(\d+) pièces?/, '$1 p.');

function PriceCards({ item }: { item: MarketStudyCompetitor }) {
  const cards = [
    {
      key: 'price',
      label: 'Prix affiché',
      value: formatEuro(item.price),
      hint: item.pricePerSquareMeter ? formatEuroPerSquareMeter(item.pricePerSquareMeter) : null,
    },
    item.goneAt
      ? {
          key: 'gone',
          label: 'Annonce',
          value: `Retirée le ${shortDay(item.goneAt)}`,
          hint: 'elle ne compte pas dans le classement',
        }
      : item.daysOnMarket
        ? {
            key: 'days',
            label: 'En vente depuis',
            value: daysLabel(item.daysOnMarket),
            hint: null,
          }
        : null,
    item.priceDrop
      ? {
          key: 'drop',
          label: 'Baisse de prix connue',
          value: formatEuro(item.priceDrop.amount),
          hint:
            item.priceDrop.percent != null
              ? formatPercent(-Math.abs(item.priceDrop.percent), { signed: true, maxDecimals: 1 })
              : null,
        }
      : null,
  ].filter((entry): entry is NonNullable<typeof entry> => entry != null);
  return (
    <div className="flex flex-col gap-1.5" data-testid="market-study-prices">
      <div className={`${kicker} border-t-2 border-brand-deep pt-2 text-brand-deep`}>
        Son prix aujourd’hui
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

function CompetitorPage({ item }: { item: MarketStudyCompetitor }) {
  const photos = item.photoUrls;
  return (
    <article
      className="flex flex-col gap-3 border border-t-[3px] border-zinc-200 border-t-brand-deep bg-white p-4 break-inside-avoid"
      data-testid="market-study-competitor"
    >
      <div>
        <div className={kicker}>Concurrent {item.position}</div>
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
            Ses caractéristiques face à votre bien
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
          />
        </div>
      ) : null}
      <PriceCards item={item} />
    </article>
  );
}

function StudyVerdict({
  subject,
  testId,
}: {
  subject: NonNullable<MarketStudyRanking['subject']>;
  testId: string;
}) {
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
          {subject.word} : vous êtes {subject.rank}
          <sup className="text-[0.55em]">{ordinal(subject.rank)}</sup> sur {subject.total}
        </p>
        <p className="text-[0.95rem] text-zinc-800">
          {`À ${formatEuro(subject.price)}, ${
            subject.rank === 1
              ? 'votre bien serait le moins cher des biens en vente que nous avons étudiés.'
              : subject.rank === subject.total
                ? 'votre bien serait le plus cher des biens en vente que nous avons étudiés.'
                : `${subject.rank - 1} ${subject.rank - 1 > 1 ? 'biens en vente sont' : 'bien en vente est'} moins ${subject.rank - 1 > 1 ? 'chers' : 'cher'} que le vôtre.`
          }`}
        </p>
      </div>
    </div>
  );
}

function RankingRow({ row: item }: { row: MarketStudyRankingRow }) {
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
                <strong>VOTRE BIEN</strong> · {shortLabel(item.label)}
              </span>
              {item.detail ? <span className="text-sm opacity-90">{item.detail}</span> : null}
            </div>
            <span className="font-title text-2xl font-bold sm:text-3xl print:text-2xl">
              {formatEuro(item.price)}
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
        <span className={`mt-1 block h-10 w-1.5 rounded print:h-8 ${tier.bar}`} />
      </td>
      <td className="py-2 pr-3 print:py-1">
        <div className="flex items-start gap-3">
          <span
            className={`w-6 shrink-0 text-center font-title text-2xl font-bold print:text-xl ${tier.text}`}
          >
            {item.rank}
          </span>
          <div className="flex min-w-0 flex-col">
            <span>{shortLabel(item.label)}</span>
            {item.detail ? <span className="text-sm text-zinc-500">{item.detail}</span> : null}
            <span className="mt-1 font-title text-lg font-bold sm:hidden">
              {formatEuro(item.price)}
            </span>
          </div>
        </div>
      </td>
      <td className="py-2 pr-3 text-right font-title text-xl font-bold whitespace-nowrap text-zinc-900 max-sm:hidden sm:text-2xl print:py-1 print:text-xl">
        {formatEuro(item.price)}
      </td>
    </tr>
  );
}

function StudyRankingView({ ranking }: { ranking: MarketStudyRanking }) {
  return (
    <div className="flex flex-col gap-4" data-testid="market-study-price-ranking">
      {ranking.subject ? (
        <div className="flex flex-col gap-3 break-inside-avoid">
          <StudyVerdict subject={ranking.subject} testId="market-study-verdict" />
          <div className="flex items-center gap-1" aria-hidden>
            {ranking.subject.cells.map((cell, index) => (
              <span
                key={index}
                className={`h-3 flex-1 rounded ${
                  index === ranking.subject!.rank - 1
                    ? `${TIER_CLASSES[cell].bar} h-5 ring-2 ring-zinc-800 ring-offset-1`
                    : TIER_CLASSES[cell].cell
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
          Les biens en vente aujourd’hui, du moins cher au plus cher. Votre bien s’y placera quand
          votre conseiller vous aura proposé un prix.
        </p>
      )}
      <table className="w-full border-collapse text-left text-zinc-800">
        <thead className="[display:table-header-group]">
          <tr className="text-[0.62rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
            <th className="w-1" />
            <th className="py-2 pl-9 font-semibold">Classement, du moins cher au plus cher</th>
            <th className="py-2 pr-3 text-right font-semibold whitespace-nowrap max-sm:hidden">
              Prix affiché
            </th>
          </tr>
        </thead>
        <tbody>
          {ranking.rows.map((item) => (
            <RankingRow key={item.key} row={item} />
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
      ) : null}
    </div>
  );
}

export function MarketStudyDocument({ document }: { document: MarketStudyDocumentData }) {
  const { agency, ranking } = document;
  const day = meetingDay(document.madeAt);
  const footer = ['Étude confidentielle', document.commune, day].filter(Boolean).join(' · ');
  const pageRules = `@page{size:A4;margin:12mm 0 16mm 0;@bottom-left{content:${cssString(footer)};padding-left:14mm;font-size:7.5pt;letter-spacing:.08em;text-transform:uppercase;color:#64748b}@bottom-right{content:counter(page,decimal-leading-zero) " / " counter(pages,decimal-leading-zero);padding-right:14mm;font-size:7.5pt;color:#64748b}}@page :first{margin:0;@bottom-left{content:none}@bottom-right{content:none}}`;
  const hasCompetitors = document.competitors.length > 0;
  const sections = [hasCompetitors ? 'competitors' : null, 'ranking'].filter(
    (key): key is string => key != null,
  );
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
            Étude de marché
          </span>
          {document.propertyLabel ? (
            <span className="mt-3 text-xs tracking-[0.2em] uppercase opacity-85">
              {document.propertyLabel}
            </span>
          ) : null}
          <h1 className="font-title text-4xl leading-tight font-bold sm:text-5xl">
            Étude de marché
            {day ? (
              <>
                <br />
                du {day}
              </>
            ) : null}
          </h1>
          <p className="text-sm opacity-90">
            {[
              document.sellerName ? `Pour ${document.sellerName}` : null,
              agency.advisorName ? `Par ${agency.advisorName}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {ranking.subject ? (
            <div className="mt-6 text-zinc-800">
              <StudyVerdict subject={ranking.subject} testId="market-study-cover-verdict" />
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
        {hasCompetitors ? (
          <section className="flex flex-col gap-3" data-testid="market-study-competitors">
            <SectionTitle
              number={sectionNumber('competitors')}
              title="Les biens en vente face au vôtre"
              hint="Chaque concurrent retenu par votre conseiller : ses caractéristiques face à votre bien, son prix affiché et depuis quand il est en vente."
            />
            {document.competitors.map((item) => (
              <CompetitorPage key={item.id} item={item} />
            ))}
          </section>
        ) : null}

        {/* Le classement commence une page neuve à l'impression, pour ne jamais se couper (M129). */}
        <section
          className={`flex flex-col gap-3 ${hasCompetitors ? 'print:break-before-page' : ''}`}
          data-testid="market-study-ranking"
        >
          <SectionTitle number={sectionNumber('ranking')} title="Où en est votre prix" />
          {ranking.rows.length > 0 ? (
            <StudyRankingView ranking={ranking} />
          ) : (
            <p className="border border-dashed border-zinc-300 px-3 py-4 text-center text-sm text-zinc-500">
              Aucun concurrent retenu pour l’instant : le classement ne se calcule pas.
            </p>
          )}
        </section>

        <footer className="mt-2 flex flex-col gap-2 break-inside-avoid">
          <div className={`${kicker} border-t-2 border-brand-deep pt-2 text-brand-deep`}>
            Pour lire ce document
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">
            Les prix cités sont ceux des annonces, pas des prix de vente. Surfaces et
            caractéristiques telles qu’annoncées, à vérifier.
          </p>
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
                <span className={kicker}>Votre conseiller</span>
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
                  aria-label="Carte de contact du conseiller"
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
