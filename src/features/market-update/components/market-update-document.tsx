/* eslint-disable @next/next/no-img-element */
import { GOLD, PriceRankingView, Verdict } from '@/features/market-update/components/price-ranking';
import { goneConclusionLabel } from '@/features/market-update/services/gone-listing-rule';
import { daysLabel } from '@/features/market-update/services/meeting-days';
import { MARKET_UPDATE_STATE_LABELS } from '@/features/market-update/services/market-update-summary';
import type { MarketUpdateCompetitor } from '@/features/market-update/services/market-update-summary';
import {
  buildPriceRanking,
  dangerousInForce,
  seenBeforeMeeting,
  type DangerousBadge,
} from '@/features/market-update/services/price-ranking';
import type { MarketUpdateDocument as MarketUpdateDocumentData } from '@/features/market-update/types';
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
import type { ClientTexts } from '@/lib/client-texts/types';
import { formatDay, formatEuro, formatEuroPerSquareMeter, formatPercent } from '@/lib/format';

type UpdateTexts = ClientTexts['documents']['marketUpdate'];
import { displayPhotoUrl } from '@/lib/photo-url';

// Mission 127 — le « Point marché » : ce qui a bougé depuis le rendez-vous, à la forme de la
// synthèse (M113) — couverture en pleine photo, titres numérotés, une fiche par concurrent qui ne
// se coupe jamais, puis les trois lignes de prix à la même échelle. Il ne lit que le type
// `MarketUpdateDocument` (liste d'autorisation) : rien d'une annonce n'y entre. Tout « estimé »
// le dit ; aucune recommandation de prix.

const shortDay = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatDay(date, 'fr', 'numeric');
};

// La carte du jour, en couleur : vert baisse, orange vente probable, gris retiré, ambre non relu.
const STATE_CARD: Record<MarketUpdateCompetitor['state'], string> = {
  unchanged: 'border-zinc-200 bg-white',
  dropped: 'border-emerald-300 bg-emerald-50',
  raised: 'border-zinc-300 bg-zinc-50',
  unread: 'border-amber-300 bg-amber-50',
  probable_sale: 'border-orange-300 bg-orange-50',
  withdrawn: 'border-zinc-300 bg-zinc-100',
  gone: 'border-zinc-300 bg-zinc-100',
  newcomer: 'border-brand-deep bg-brand-soft',
};

function days(item: MarketUpdateCompetitor, language: TextLanguage): string | null {
  return item.daysOnMarket != null
    ? daysLabel({ days: item.daysOnMarket, approximate: item.daysApproximate }, language)
    : null;
}

// Mission 127 B — le bloc d'un nouveau venu : « Vu sur le marché depuis le … » à la place du prix
// du rendez-vous (il n'était pas là), son prix affiché, son prix au m².
function NewcomerPriceBlock({
  item,
  language,
  t,
}: {
  item: MarketUpdateCompetitor;
  language: TextLanguage;
  t: UpdateTexts;
}) {
  const perSquareMeter =
    item.currentPrice != null && item.surfaceArea
      ? formatEuroPerSquareMeter(item.currentPrice / item.surfaceArea, { language })
      : null;
  return (
    <div
      className="flex flex-col gap-1.5"
      data-testid="market-update-prices"
      data-state={item.state}
    >
      <div className={`${kicker} border-t-2 border-brand-deep pt-2 text-brand-deep`}>
        {t.newcomerPriceTitle}
      </div>
      <div className={`${row} text-[0.78rem]`}>
        <div className={card}>
          <div className={kicker}>{t.seenSince}</div>
          <div className="font-title text-base font-bold text-zinc-900">
            {item.seenSince ? shortDay(item.seenSince) : '—'}
          </div>
          <div className="text-zinc-500">{t.notYetListed}</div>
        </div>
        <div className={`border px-3.5 py-3 break-inside-avoid ${STATE_CARD.newcomer}`}>
          <div className={kicker}>{clientTexts(language).documents.synthesis.listed}</div>
          <div className={bigNumber}>
            {item.currentPrice != null ? formatEuro(item.currentPrice, { language }) : '—'}
          </div>
          {perSquareMeter ? <div className="text-zinc-600">{perSquareMeter}</div> : null}
        </div>
      </div>
      <p className="text-[0.78rem] text-zinc-600">{t.newcomerNote}</p>
    </div>
  );
}

// Le bloc des prix d'un concurrent : au rendez-vous, aujourd'hui, l'écart — ou ce qu'il est devenu.
function PriceBlock({
  item,
  madeAt,
  language,
  t,
}: {
  item: MarketUpdateCompetitor;
  madeAt: string;
  language: TextLanguage;
  t: UpdateTexts;
}) {
  const euro = (value: number) => formatEuro(value, { language });
  const gone = item.goneAt != null;
  // Mission 127 A 2 — un prix du rendez-vous repris à la migration (source 'current') n'est pas un
  // prix relevé au rendez-vous : « Non relu », annonce disparue comprise.
  const unread =
    item.state === 'unread' || item.meetingPriceSource === 'current' || item.meetingPrice == null;
  const perSquareMeter =
    item.currentPrice != null && item.surfaceArea
      ? formatEuroPerSquareMeter(item.currentPrice / item.surfaceArea, { language })
      : null;
  const made = shortDay(madeAt) ?? '';
  return (
    <div
      className="flex flex-col gap-1.5"
      data-testid="market-update-prices"
      data-state={item.state}
    >
      <div className={`${kicker} border-t-2 border-brand-deep pt-2 text-brand-deep`}>
        {t.priceTitle}
      </div>
      <div className={`${row} text-[0.78rem]`}>
        <div className={card}>
          <div className={kicker}>{t.atMeeting}</div>
          {unread ? (
            <>
              <div className="font-title text-base font-bold text-amber-800">{t.unread}</div>
              <div className="text-zinc-500">{t.unreadHint}</div>
            </>
          ) : (
            <>
              <div className={bigNumber}>
                {item.meetingPrice != null ? euro(item.meetingPrice) : '—'}
              </div>
              <div className="text-zinc-500">{t.meetingPriceHint}</div>
            </>
          )}
        </div>
        <div className={`border px-3.5 py-3 break-inside-avoid ${STATE_CARD[item.state]}`}>
          <div className={kicker}>{!gone && unread ? t.todayPrice : t.today}</div>
          {gone ? (
            <>
              <div className="font-title text-base leading-snug font-bold text-zinc-900">
                {t.removed(item.goneAt ? shortDay(item.goneAt) : null, days(item, language))}
              </div>
              <div className="text-zinc-600">
                {t.lastPrice(item.currentPrice != null ? euro(item.currentPrice) : '—')}
              </div>
            </>
          ) : (
            <>
              <div className={bigNumber}>
                {item.currentPrice != null ? euro(item.currentPrice) : '—'}
              </div>
              <div className="text-zinc-600">
                {item.state === 'dropped'
                  ? t.droppedSeen(made)
                  : item.state === 'raised'
                    ? t.raisedSeen(made)
                    : t.readOn(made)}
              </div>
            </>
          )}
        </div>
        <div className={card}>
          <div className={kicker}>{gone ? t.conclusion : t.gap}</div>
          {gone && item.conclusion ? (
            <div className="font-title text-base leading-snug font-bold text-zinc-900">
              {/* Lot A (Jean-Guy, 27/11) — « probablement retiré sans vente » : un point écrit
                  avant se redit ainsi, comme sa note ; les autres libellés, tels qu'écrits. */}
              {language === 'fr' && item.conclusion.kind !== 'withdrawn'
                ? item.conclusion.label
                : goneConclusionLabel(item.conclusion, language)}
            </div>
          ) : gone ? (
            <>
              <div className="font-title text-base font-bold text-zinc-500">—</div>
              <div className="text-zinc-600">{t.noConclusion}</div>
            </>
          ) : item.gapPercent != null && item.gapAmount != null ? (
            <>
              <div
                className={`${bigNumber} ${item.gapAmount < 0 ? 'text-emerald-700' : item.gapAmount > 0 ? 'text-zinc-900' : ''}`}
              >
                {formatPercent(item.gapPercent, { signed: true, maxDecimals: 1, language })}
              </div>
              <div className="text-zinc-600">
                {item.gapAmount === 0
                  ? t.unchanged
                  : t.gapAmount(euro(Math.abs(item.gapAmount)), item.gapAmount < 0)}
              </div>
            </>
          ) : (
            <>
              <div className="font-title text-base font-bold text-zinc-500">—</div>
              <div className="text-zinc-600">{t.noGap}</div>
            </>
          )}
        </div>
      </div>
      {gone && item.conclusion?.kind === 'probable_sale' ? (
        <div className="border-l-4 border-orange-400 bg-orange-50 px-4 py-2.5 text-[0.82rem]">
          <b>
            {t.likelySale(
              euro(item.conclusion.estimatedMin as number),
              euro(item.conclusion.estimatedMax as number),
            )}
          </b>
          <p className="mt-0.5 text-zinc-600">{t.likelySaleNote}</p>
        </div>
      ) : null}
      {gone && item.conclusion?.kind === 'withdrawn' ? (
        <p className="text-[0.78rem] text-zinc-600">{t.withdrawnNote}</p>
      ) : null}
      {!gone ? (
        <p className="text-[0.78rem] text-zinc-600">
          {[
            t.stillListed,
            days(item, language) ? t.sinceDays(days(item, language) as string) : null,
            perSquareMeter ? t.perSqmToday(perSquareMeter) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}
    </div>
  );
}

function CompetitorPage({
  item,
  view,
  madeAt,
  danger,
  meetingChoice,
  beforeMeeting = false,
  language,
}: {
  language: TextLanguage;
  item: MarketUpdateCompetitor;
  view: MarketUpdateDocumentData['competitors'][number] | undefined;
  madeAt: string;
  // Mission 129 — le plus dangereux en vigueur porte le cadre doré et son bandeau ; quand il a
  // changé, l'ancien garde « votre choix au rendez-vous », discret.
  danger: DangerousBadge | null;
  meetingChoice: boolean;
  // Un « nouveau venu » déjà en vente avant le rendez-vous (cas de Biot) : il reste retenu, mais
  // ne compte pas parmi les nouveaux venus.
  beforeMeeting?: boolean;
}) {
  const photos = view?.photoUrls ?? [];
  const texts = clientTexts(language);
  const t = texts.documents.marketUpdate;
  return (
    <article
      className={`flex flex-col gap-3 bg-white break-inside-avoid ${
        danger
          ? `border-[3px] ${GOLD.frame}`
          : 'border border-t-[3px] border-zinc-200 border-t-brand-deep p-4'
      }`}
      data-testid="market-update-competitor"
      data-dangerous={danger ?? undefined}
    >
      {danger ? (
        <div
          className={`px-4 py-1.5 text-xs font-bold tracking-[0.18em] uppercase ${GOLD.badge}`}
          data-testid="market-update-dangerous-band"
        >
          {danger === 'today' ? t.dangerousToday : t.dangerousYours}
        </div>
      ) : null}
      <div className={danger ? 'flex flex-col gap-3 px-4 pb-4' : 'contents'}>
        <div>
          <div className={kicker}>
            {item.newcomer
              ? beforeMeeting
                ? t.beforeMeeting
                : t.newcomer
              : texts.live.competitorReview.competitor(item.position)}
            {meetingChoice && danger !== 'meeting' ? t.meetingChoice : ''}
            {!item.newcomer && !item.shownAtMeeting ? t.notShown : ''}
          </div>
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
                {photos.slice(1, 4).map((url) => (
                  <Photo
                    key={url}
                    url={url}
                    alt={item.label}
                    className={
                      photos.length === 2 ? 'h-36 w-full sm:h-44' : 'h-full min-h-16 w-full'
                    }
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {view && view.features.length > 0 ? (
          <div className="flex flex-col gap-1">
            <div className={`${kicker} border-t-2 border-zinc-200 pt-2`}>{t.features}</div>
            <Grid
              competitor={{
                id: item.id,
                position: item.position,
                label: item.label,
                surfaceArea: item.surfaceArea,
                photoUrl: null,
                hasPhoto: false,
                photoHidden: false,
                features: view.features,
                serious: null,
                revealed: null,
              }}
              language={language}
            />
          </div>
        ) : null}
        {item.newcomer ? (
          <NewcomerPriceBlock item={item} language={language} t={t} />
        ) : (
          <PriceBlock item={item} madeAt={madeAt} language={language} t={t} />
        )}
      </div>
    </article>
  );
}

export function MarketUpdateDocument({ document }: { document: MarketUpdateDocumentData }) {
  const { summary, agency, language } = document;
  const texts = clientTexts(language);
  const t = texts.documents.marketUpdate;
  const c = texts.documents.common;
  const pointDay = meetingDay(document.madeAt, language);
  const meeting = meetingDay(summary.meetingDate, language);
  const footer = [c.confidential, document.commune, pointDay].filter(Boolean).join(' · ');
  const viewById = new Map(document.competitors.map((item) => [item.id, item]));
  const newcomers = summary.competitors.filter((item) => item.newcomer);
  // Mission 129 — le classement remplace les trois lignes ; le plus dangereux en vigueur.
  const ranking = buildPriceRanking(summary, document.subjectLabel, language);
  const danger = dangerousInForce(summary);
  const dangerOf = (id: string): DangerousBadge | null =>
    id === danger.currentId ? (danger.changed ? 'today' : 'meeting') : null;
  const realNewcomers = newcomers.filter((item) => !seenBeforeMeeting(item, summary.meetingDate));
  // Mission 129 — retenus comme nouveaux venus mais en vente avant le rendez-vous (cas de Biot) :
  // ni sous le titre des nouveaux venus, ni dans leur compte.
  const earlier = newcomers.filter((item) => seenBeforeMeeting(item, summary.meetingDate));
  const hasNewcomers = realNewcomers.length > 0;
  const sections = [
    'competitors',
    hasNewcomers ? 'newcomers' : null,
    earlier.length > 0 ? 'earlier' : null,
    'lines',
  ].filter((key): key is string => key != null);
  const sectionNumber = (key: string) => sections.indexOf(key) + 1;
  const pageRules = `@page{size:A4;margin:12mm 0 16mm 0;@bottom-left{content:${cssString(footer)};padding-left:14mm;font-size:7.5pt;letter-spacing:.08em;text-transform:uppercase;color:#64748b}@bottom-right{content:counter(page,decimal-leading-zero) " / " counter(pages,decimal-leading-zero);padding-right:14mm;font-size:7.5pt;color:#64748b}}@page :first{margin:0;@bottom-left{content:none}@bottom-right{content:none}}`;
  const coverFigures = [
    summary.agreedPrice != null
      ? { label: t.agreedPrice, value: formatEuro(summary.agreedPrice, { language }) }
      : null,
    {
      label: t.followed,
      value: String(summary.competitors.filter((item) => !item.newcomer).length),
    },
    // Mission 127 B — ce chiffre n'existe qu'après une recherche : sans elle, « 0 » dirait « rien
    // de nouveau sur le marché ».
    summary.newcomersSearch || realNewcomers.length > 0
      ? { label: t.newcomersCount, value: String(realNewcomers.length) }
      : null,
  ].filter((item): item is { label: string; value: string } => item != null);

  return (
    <article
      className="mx-auto flex w-full max-w-[210mm] flex-col gap-0 bg-zinc-50 text-zinc-800 [print-color-adjust:exact] print:max-w-none print:bg-white"
      data-testid="market-update"
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
            {/* Un voile sombre sur toute la photo : le texte blanc reste lisible sur un ciel clair. */}
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
          {pointDay ? (
            <span className="text-xs tracking-[0.16em] uppercase">{pointDay}</span>
          ) : null}
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
            {pointDay ? (
              <>
                <br />
                {t.titleDay(pointDay)}
              </>
            ) : null}
          </h1>
          <p className="text-sm opacity-90">
            {[
              meeting ? t.sinceMeeting(meeting) : null,
              document.sellerName.trim() ? t.forSeller(document.sellerName.trim()) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {/* Le verdict dès la couverture, de la couleur de la place (Jean-Guy, 05/11). */}
          {ranking ? (
            <div className="mt-6 text-zinc-800">
              <Verdict ranking={ranking} testId="market-update-cover-verdict" language={language} />
            </div>
          ) : null}
          <div className="mt-8 flex flex-col gap-4 border-t border-white/35 pt-4 sm:flex-row [&>*]:flex-1">
            {coverFigures.map((figure) => (
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
        {/* 01 · Les concurrents, depuis le rendez-vous — une fiche par concurrent, dans l'ordre du Live. */}
        <section className="flex flex-col gap-3">
          <SectionTitle
            number={sectionNumber('competitors')}
            title={t.competitorsTitle}
            hint={t.competitorsHint}
          />
          {/* M110, M113 : une page par concurrent MONTRÉ au rendez-vous ; les concurrents retenus
              hors Live comptent dans les lignes de prix, pas dans les pages. */}
          {summary.competitors
            .filter((item) => item.shownAtMeeting && !item.newcomer)
            .map((item) => (
              <CompetitorPage
                key={item.id}
                item={item}
                view={viewById.get(item.id)}
                madeAt={document.madeAt}
                danger={dangerOf(item.id)}
                meetingChoice={item.id === danger.meetingId}
                language={language}
              />
            ))}
        </section>

        {/* 02 · Les nouveaux venus — après les concurrents du rendez-vous, avant les trois lignes
            (décision de Jean-Guy, 29/10) : une fiche par nouveau venu retenu, même forme. */}
        {hasNewcomers ? (
          <section
            className="flex flex-col gap-3 print:break-before-page"
            data-testid="market-update-newcomers"
          >
            <SectionTitle
              number={sectionNumber('newcomers')}
              title={t.newcomersTitle}
              hint={t.newcomersHint(
                meeting,
                summary.newcomersSearch?.priceRange
                  ? formatEuro(summary.newcomersSearch.priceRange.min, { language })
                  : null,
              )}
            />
            {realNewcomers.map((item) => (
              <CompetitorPage
                key={item.id}
                item={item}
                view={viewById.get(item.id)}
                madeAt={document.madeAt}
                danger={dangerOf(item.id)}
                meetingChoice={false}
                language={language}
              />
            ))}
          </section>
        ) : null}

        {earlier.length > 0 ? (
          <section
            className="flex flex-col gap-3 print:break-before-page"
            data-testid="market-update-earlier"
          >
            <SectionTitle
              number={sectionNumber('earlier')}
              title={t.earlierTitle}
              hint={t.earlierHint}
            />
            {earlier.map((item) => (
              <CompetitorPage
                key={item.id}
                item={item}
                view={viewById.get(item.id)}
                madeAt={document.madeAt}
                danger={dangerOf(item.id)}
                meetingChoice={false}
                beforeMeeting
                language={language}
              />
            ))}
          </section>
        ) : null}

        {/* 03 · Où en est votre prix — le classement (Mission 129, maquette v2) : le titre et le
            contenu commencent une page neuve à l'impression, pour ne jamais se couper. */}
        <section
          className="flex flex-col gap-3 print:break-before-page"
          data-testid="market-update-ranking"
        >
          <SectionTitle number={sectionNumber('lines')} title={t.rankingTitle} />
          {ranking ? (
            <PriceRankingView
              ranking={ranking}
              meetingDay={shortDay(summary.meetingDate)}
              pointDay={shortDay(document.madeAt)}
              searchedRange={summary.newcomersSearch?.priceRange ?? null}
              language={language}
            />
          ) : (
            <p className="border border-dashed border-zinc-300 px-3 py-4 text-center text-sm text-zinc-500">
              {t.noRanking}
            </p>
          )}
        </section>

        <footer className="mt-2 flex flex-col gap-2 break-inside-avoid">
          <div className={`${kicker} border-t-2 border-brand-deep pt-2 text-brand-deep`}>
            {t.readingTitle}
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">{t.reading}</p>
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

export { MARKET_UPDATE_STATE_LABELS };
