/* eslint-disable @next/next/no-img-element */
import { PriceLineBand, ALIGNMENT_CLASSES } from '@/features/market-update/components/price-line';
import { daysLabel } from '@/features/market-update/services/meeting-days';
import { MARKET_UPDATE_STATE_LABELS } from '@/features/market-update/services/market-update-summary';
import type { MarketUpdateCompetitor } from '@/features/market-update/services/market-update-summary';
import { PriceLinesFigure } from '@/features/market-update/components/price-lines-figure';
import { NO_NEWCOMER_LABEL } from '@/features/market-update/services/price-lines';

// Mission 127 B — le même libellé que sur le Suivi, sans importer le composant client.
const NEWCOMERS_LIMITED_LABEL = 'Recherche limitée aux biens à votre prix ou moins';
import type { MarketUpdateDocument as MarketUpdateDocumentData } from '@/features/market-update/types';
import { priceAlignment } from '@/features/price-positioning/services/price-alignment';
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

// Mission 127 — le « Point marché » : ce qui a bougé depuis le rendez-vous, à la forme de la
// synthèse (M113) — couverture en pleine photo, titres numérotés, une fiche par concurrent qui ne
// se coupe jamais, puis les trois lignes de prix à la même échelle. Il ne lit que le type
// `MarketUpdateDocument` (liste d'autorisation) : rien d'une annonce n'y entre. Tout « estimé »
// le dit ; aucune recommandation de prix.

const shortDay = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
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

function days(item: MarketUpdateCompetitor): string | null {
  return item.daysOnMarket != null
    ? daysLabel({ days: item.daysOnMarket, approximate: item.daysApproximate })
    : null;
}

// Mission 127 B — le bloc d'un nouveau venu : « Vu sur le marché depuis le … » à la place du prix
// du rendez-vous (il n'était pas là), son prix affiché, son prix au m².
function NewcomerPriceBlock({ item }: { item: MarketUpdateCompetitor }) {
  const perSquareMeter =
    item.currentPrice != null && item.surfaceArea
      ? formatEuroPerSquareMeter(item.currentPrice / item.surfaceArea)
      : null;
  return (
    <div
      className="flex flex-col gap-1.5"
      data-testid="market-update-prices"
      data-state={item.state}
    >
      <div className={`${kicker} border-t-2 border-brand-deep pt-2 text-brand-deep`}>
        Le prix, depuis son arrivée sur le marché
      </div>
      <div className={`${row} text-[0.78rem]`}>
        <div className={card}>
          <div className={kicker}>Vu sur le marché depuis le</div>
          <div className="font-title text-base font-bold text-zinc-900">
            {item.seenSince ? shortDay(item.seenSince) : '—'}
          </div>
          <div className="text-zinc-500">pas encore en vente au rendez-vous</div>
        </div>
        <div className={`border px-3.5 py-3 break-inside-avoid ${STATE_CARD.newcomer}`}>
          <div className={kicker}>Prix affiché</div>
          <div className={bigNumber}>
            {item.currentPrice != null ? formatEuro(item.currentPrice) : '—'}
          </div>
          {perSquareMeter ? <div className="text-zinc-600">{perSquareMeter}</div> : null}
        </div>
      </div>
      <p className="text-[0.78rem] text-zinc-600">
        Retenu par votre conseiller pour la comparaison : il entre dans la ligne « Face aux nouveaux
        venus », pas dans « Au rendez-vous » ni « Aujourd’hui ».
      </p>
    </div>
  );
}

// Le bloc des prix d'un concurrent : au rendez-vous, aujourd'hui, l'écart — ou ce qu'il est devenu.
function PriceBlock({ item, madeAt }: { item: MarketUpdateCompetitor; madeAt: string }) {
  const gone = item.goneAt != null;
  // Mission 127 A 2 — un prix du rendez-vous repris à la migration (source 'current') n'est pas un
  // prix relevé au rendez-vous : « Non relu », annonce disparue comprise.
  const unread =
    item.state === 'unread' || item.meetingPriceSource === 'current' || item.meetingPrice == null;
  const perSquareMeter =
    item.currentPrice != null && item.surfaceArea
      ? formatEuroPerSquareMeter(item.currentPrice / item.surfaceArea)
      : null;
  return (
    <div
      className="flex flex-col gap-1.5"
      data-testid="market-update-prices"
      data-state={item.state}
    >
      <div className={`${kicker} border-t-2 border-brand-deep pt-2 text-brand-deep`}>
        Le prix, depuis le rendez-vous
      </div>
      <div className={`${row} text-[0.78rem]`}>
        <div className={card}>
          <div className={kicker}>Au rendez-vous</div>
          {unread ? (
            <>
              <div className="font-title text-base font-bold text-amber-800">Non relu</div>
              <div className="text-zinc-500">le prix d’alors n’a pas été relevé</div>
            </>
          ) : (
            <>
              <div className={bigNumber}>
                {item.meetingPrice != null ? formatEuro(item.meetingPrice) : '—'}
              </div>
              <div className="text-zinc-500">prix affiché au rendez-vous</div>
            </>
          )}
        </div>
        <div className={`border px-3.5 py-3 break-inside-avoid ${STATE_CARD[item.state]}`}>
          <div className={kicker}>{!gone && unread ? 'Prix du jour' : 'Aujourd’hui'}</div>
          {gone ? (
            <>
              <div className="font-title text-base leading-snug font-bold text-zinc-900">
                Retirée{item.goneAt ? ` le ${shortDay(item.goneAt)}` : ''}
                {days(item) ? `, après ${days(item)}` : ''}
              </div>
              <div className="text-zinc-600">
                dernier prix affiché :{' '}
                {item.currentPrice != null ? formatEuro(item.currentPrice) : '—'}
              </div>
            </>
          ) : (
            <>
              <div className={bigNumber}>
                {item.currentPrice != null ? formatEuro(item.currentPrice) : '—'}
              </div>
              <div className="text-zinc-600">
                {item.state === 'dropped' || item.state === 'raised'
                  ? `${item.state === 'dropped' ? 'baisse' : 'hausse'} vue le ${shortDay(madeAt)}`
                  : `relu le ${shortDay(madeAt)}`}
              </div>
            </>
          )}
        </div>
        <div className={card}>
          <div className={kicker}>{gone ? 'Conclusion' : 'Écart'}</div>
          {gone && item.conclusion ? (
            <div className="font-title text-base leading-snug font-bold text-zinc-900">
              {item.conclusion.label}
            </div>
          ) : gone ? (
            <>
              <div className="font-title text-base font-bold text-zinc-500">—</div>
              <div className="text-zinc-600">durée en vente inconnue : aucune conclusion</div>
            </>
          ) : item.gapPercent != null && item.gapAmount != null ? (
            <>
              <div
                className={`${bigNumber} ${item.gapAmount < 0 ? 'text-emerald-700' : item.gapAmount > 0 ? 'text-zinc-900' : ''}`}
              >
                {formatPercent(item.gapPercent, { signed: true, maxDecimals: 1 })}
              </div>
              <div className="text-zinc-600">
                {item.gapAmount === 0
                  ? 'prix inchangé'
                  : `soit ${formatEuro(Math.abs(item.gapAmount))} de ${item.gapAmount < 0 ? 'moins' : 'plus'}`}
              </div>
            </>
          ) : (
            <>
              <div className="font-title text-base font-bold text-zinc-500">—</div>
              <div className="text-zinc-600">sans prix du rendez-vous, pas d’écart</div>
            </>
          )}
        </div>
      </div>
      {gone && item.conclusion?.kind === 'probable_sale' ? (
        <div className="border-l-4 border-orange-400 bg-orange-50 px-4 py-2.5 text-[0.82rem]">
          <b>
            Prix de vente estimé : entre {formatEuro(item.conclusion.estimatedMin as number)} et{' '}
            {formatEuro(item.conclusion.estimatedMax as number)}
          </b>
          <p className="mt-0.5 text-zinc-600">
            Déduit de la durée de commercialisation au retrait, selon la règle de l’agence : rien ne
            dit que ce bien est vendu, ni à quel prix.
          </p>
        </div>
      ) : null}
      {gone && item.conclusion?.kind === 'withdrawn' ? (
        <p className="text-[0.78rem] text-zinc-600">
          Plus de 300 jours en vente au retrait : retiré du marché sans vente.
        </p>
      ) : null}
      {!gone ? (
        <p className="text-[0.78rem] text-zinc-600">
          {[
            'Toujours en vente',
            days(item) ? `depuis ${days(item)}` : null,
            perSquareMeter ? `${perSquareMeter} aujourd’hui` : null,
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
}: {
  item: MarketUpdateCompetitor;
  view: MarketUpdateDocumentData['competitors'][number] | undefined;
  madeAt: string;
}) {
  const photos = view?.photoUrls ?? [];
  return (
    <article
      className={`flex flex-col gap-3 border border-t-[3px] bg-white p-4 break-inside-avoid ${
        item.dangerous
          ? 'border-zinc-200 border-t-amber-600'
          : 'border-zinc-200 border-t-brand-deep'
      }`}
      data-testid="market-update-competitor"
    >
      <div>
        <div className={kicker}>
          {item.newcomer ? 'Nouveau venu' : `Concurrent ${item.position}`}
          {item.dangerous ? ' · Le plus dangereux, selon vous' : ''}
          {!item.newcomer && !item.shownAtMeeting ? ' · Non montré au rendez-vous' : ''}
        </div>
        <h3 className="font-title text-lg leading-snug font-bold text-brand-darker">
          {item.label}
        </h3>
      </div>
      {photos.length > 0 ? (
        <div
          className={`grid gap-1.5 ${photos.length === 1 ? 'grid-cols-1' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-[2fr_1fr]'}`}
        >
          <Photo url={photos[0]} alt={item.label} className="h-36 w-full sm:h-44" />
          {photos.length > 1 ? (
            <div className="grid gap-1.5">
              {photos.slice(1, 4).map((url) => (
                <Photo key={url} url={url} alt={item.label} className="h-full min-h-16 w-full" />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {view && view.features.length > 0 ? (
        <div className="flex flex-col gap-1">
          <div className={`${kicker} border-t-2 border-zinc-200 pt-2`}>
            Ses caractéristiques face à votre bien
          </div>
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
          />
        </div>
      ) : null}
      {item.newcomer ? (
        <NewcomerPriceBlock item={item} />
      ) : (
        <PriceBlock item={item} madeAt={madeAt} />
      )}
    </article>
  );
}

export function MarketUpdateDocument({ document }: { document: MarketUpdateDocumentData }) {
  const { summary, agency } = document;
  const pointDay = meetingDay(document.madeAt);
  const meeting = meetingDay(summary.meetingDate);
  const footer = ['Étude confidentielle', document.commune, pointDay].filter(Boolean).join(' · ');
  const alignment = priceAlignment(summary.agreedPrice, summary.advisorAnalysis);
  const subjectClasses = alignment ? ALIGNMENT_CLASSES[alignment.tone] : null;
  const viewById = new Map(document.competitors.map((item) => [item.id, item]));
  const newcomers = summary.competitors.filter((item) => item.newcomer);
  const hasNewcomers = newcomers.length > 0;
  const sections = ['competitors', hasNewcomers ? 'newcomers' : null, 'lines'].filter(
    (key): key is string => key != null,
  );
  const sectionNumber = (key: string) => sections.indexOf(key) + 1;
  const { lines } = summary;
  const scale = lines.scale;
  const pageRules = `@page{size:A4;margin:12mm 0 16mm 0;@bottom-left{content:${cssString(footer)};padding-left:14mm;font-size:7.5pt;letter-spacing:.08em;text-transform:uppercase;color:#64748b}@bottom-right{content:counter(page,decimal-leading-zero) " / " counter(pages,decimal-leading-zero);padding-right:14mm;font-size:7.5pt;color:#64748b}}@page :first{margin:0;@bottom-left{content:none}@bottom-right{content:none}}`;
  const coverFigures = [
    summary.agreedPrice != null
      ? { label: 'Prix retenu ensemble', value: formatEuro(summary.agreedPrice) }
      : null,
    {
      label: 'Concurrents suivis',
      value: String(summary.competitors.filter((item) => !item.newcomer).length),
    },
    // Mission 127 B — ce chiffre n'existe qu'après une recherche : sans elle, « 0 » dirait « rien
    // de nouveau sur le marché ».
    summary.newcomersSearch || newcomers.length > 0
      ? { label: 'Nouveaux venus retenus', value: String(newcomers.length) }
      : null,
  ].filter((item): item is { label: string; value: string } => item != null);

  const lineBlock = (
    number: number,
    title: string,
    hint: string,
    line: typeof lines.meeting,
    subjectLabel: string,
    extra?: React.ReactNode,
  ) => (
    <div className={`${card} flex flex-col gap-2`} data-testid="market-update-line">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="border border-brand-deep px-1.5 py-px font-title text-xs text-brand-deep">
          {number}
        </span>
        <span className="font-title text-base font-bold text-brand-darker">{title}</span>
        <span className="text-xs text-zinc-500">{hint}</span>
      </div>
      {extra}
      {line && scale ? (
        <PriceLineBand
          line={line}
          scale={scale}
          subjectLabel={subjectLabel}
          alignment={alignment}
        />
      ) : (
        <p className="border border-dashed border-zinc-300 px-3 py-4 text-center text-sm text-zinc-500">
          {number === 3
            ? summary.newcomersSearch
              ? `Aucun nouveau venu sur le marché${meeting ? ` depuis le ${meeting}` : ' depuis le rendez-vous'}, avec les critères de votre bien, à votre prix ou moins.`
              : NO_NEWCOMER_LABEL
            : 'Aucun prix à placer sur cette ligne.'}
        </p>
      )}
      {line?.sentence ? (
        <p className="border-l-4 border-brand-deep bg-brand-soft px-4 py-2 text-[0.9rem]">
          {line.sentence}
        </p>
      ) : null}
    </div>
  );

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
              src={document.coverPhotoUrl}
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
            Point marché
          </span>
          {document.propertyLabel ? (
            <span className="mt-3 text-xs tracking-[0.2em] uppercase opacity-85">
              {document.propertyLabel}
            </span>
          ) : null}
          <h1 className="font-title text-4xl leading-tight font-bold sm:text-5xl">
            Point marché
            {pointDay ? (
              <>
                <br />
                du {pointDay}
              </>
            ) : null}
          </h1>
          <p className="text-sm opacity-90">
            {[
              meeting ? `Depuis notre rendez-vous du ${meeting}` : null,
              document.sellerName.trim() ? `Pour ${document.sellerName.trim()}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
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
            title="Les concurrents, depuis le rendez-vous"
            hint="Pour chaque concurrent retenu : son prix au rendez-vous, son prix aujourd’hui, et ce qu’il est devenu."
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
              />
            ))}
        </section>

        {/* 02 · Les nouveaux venus — après les concurrents du rendez-vous, avant les trois lignes
            (décision de Jean-Guy, 29/10) : une fiche par nouveau venu retenu, même forme. */}
        {hasNewcomers ? (
          <section className="flex flex-col gap-3" data-testid="market-update-newcomers">
            <SectionTitle
              number={sectionNumber('newcomers')}
              title="Nouveaux sur le marché depuis le rendez-vous"
              hint={`Les biens vus sur le marché${meeting ? ` depuis le ${meeting}` : ' depuis le rendez-vous'}, à votre prix ou moins, et retenus par votre conseiller pour la comparaison.`}
            />
            {newcomers.map((item) => (
              <CompetitorPage
                key={item.id}
                item={item}
                view={viewById.get(item.id)}
                madeAt={document.madeAt}
              />
            ))}
          </section>
        ) : null}

        {/* 03 · Où en est votre prix — trois lignes à la même échelle. */}
        <section className="flex flex-col gap-3">
          <SectionTitle
            number={sectionNumber('lines')}
            title="Où en est votre prix"
            hint="Trois lignes, à la même échelle, pour comparer d’un coup d’œil."
          />
          {/* La figure (maquette M127B-lignes) à l'écran large et à l'impression ; sur téléphone,
              les trois lignes en liste, la barre et les repères sous chaque bande. */}
          <div className="hidden sm:block" data-testid="price-lines-figure-wrap">
            <PriceLinesFigure
              summary={summary}
              alignment={alignment}
              meetingLabel={`Au rendez-vous${meeting ? ` du ${meeting}` : ''}`}
              todayLabel={`Aujourd’hui${pointDay ? `, ${pointDay}` : ''}`}
            />
          </div>
          <div className="flex flex-col gap-3 sm:hidden">
            {lineBlock(
              1,
              `Au rendez-vous${meeting ? ` du ${meeting}` : ''}`,
              `${summary.competitors.filter((item) => !item.newcomer).length} concurrent${summary.competitors.filter((item) => !item.newcomer).length > 1 ? 's' : ''} · prix du rendez-vous`,
              lines.meeting,
              'Votre prix',
            )}
            {lineBlock(
              2,
              `Aujourd’hui${pointDay ? `, ${pointDay}` : ''}`,
              `${lines.today?.prices.length ?? 0} encore en vente`,
              lines.today,
              'Votre prix',
              lines.todayGone.probableSale + lines.todayGone.withdrawn + lines.todayGone.unknown >
                0 ? (
                <p className="self-start rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600">
                  {[
                    lines.todayGone.probableSale > 0
                      ? `${lines.todayGone.probableSale} vente${lines.todayGone.probableSale > 1 ? 's' : ''} probable${lines.todayGone.probableSale > 1 ? 's' : ''}`
                      : null,
                    lines.todayGone.withdrawn > 0
                      ? `${lines.todayGone.withdrawn} retiré${lines.todayGone.withdrawn > 1 ? 's' : ''} sans vente`
                      : null,
                    lines.todayGone.unknown > 0
                      ? `${lines.todayGone.unknown} retirée${lines.todayGone.unknown > 1 ? 's' : ''}, durée inconnue`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}{' '}
                  · comptés à part
                </p>
              ) : undefined,
            )}
            {lineBlock(
              3,
              'Face aux nouveaux venus',
              hasNewcomers
                ? `${newcomers.length} nouveau${newcomers.length > 1 ? 'x' : ''} venu${newcomers.length > 1 ? 's' : ''} · à votre prix ou moins`
                : summary.newcomersSearch
                  ? NEWCOMERS_LIMITED_LABEL
                  : 'vus sur le marché après le rendez-vous',
              lines.newcomers,
              'Votre prix',
            )}
            {alignment ? (
              <p className={`text-xs font-semibold ${subjectClasses?.text ?? 'text-brand-deep'}`}>
                Votre prix : {alignment.label}
              </p>
            ) : null}
          </div>
          {alignment ? (
            <p className="text-xs text-zinc-500">
              Couleur de votre prix, la même sur les trois lignes : vert sous +5 % de l’analyse de
              votre conseiller, orange de +5 à +10&nbsp;%, rouge au-delà.
            </p>
          ) : null}
        </section>

        <footer className="mt-2 flex flex-col gap-2 break-inside-avoid">
          <div className={`${kicker} border-t-2 border-brand-deep pt-2 text-brand-deep`}>
            Pour lire ce document
          </div>
          <p className="text-xs leading-relaxed text-zinc-500">
            Les prix cités sont ceux des annonces, pas des prix de vente. Une annonce disparue n’est
            pas une vente constatée : « vente probable » et la négociation « estimée » sont déduites
            de la durée de commercialisation au retrait, selon la règle de l’agence ; « retiré sans
            vente » dit une annonce retirée après plus de 300 jours. Rien ici n’affirme qu’un bien
            est vendu, ni à quel prix. Surfaces et caractéristiques telles qu’annoncées, à vérifier.
            « Vu sur le marché depuis le … » est la date de publication dite par l’annonce, sinon le
            jour où votre conseiller l’a retenue : jamais une date inventée.
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

export { MARKET_UPDATE_STATE_LABELS };
