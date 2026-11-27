/* eslint-disable @next/next/no-img-element */
import { RemoteImage } from '@/components/ui/remote-image';
import { DpeLetter } from '@/features/dpe/components/dpe-letter';
import { NeighbourhoodLinkBlock } from '@/features/neighbourhood-link/components/neighbourhood-link-block';
import { NeighbourhoodDocumentBlocks } from '@/features/neighbourhood-link/components/neighbourhood-document';
import { priceAlignment } from '@/features/price-positioning/services/price-alignment';
import { layoutBand, type BandLayout } from '@/features/seller-synthesis/services/band-labels';
import type { SellerSynthesis, SynthesisCompetitor } from '@/features/seller-synthesis/types';
import {
  GUESS_GAP_BORDER,
  GUESS_GAP_DOT,
  GUESS_GAP_TEXT,
  guessGapPhrase,
} from '@/features/live-seller/services/guess-gap';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import type { ClientTexts } from '@/lib/client-texts/types';
import {
  formatDay,
  formatEuro,
  formatEuroPerSquareMeter,
  formatNumber,
  formatPercent,
  formatSquareMeters,
} from '@/lib/format';
import { displayPhotoUrl } from '@/lib/photo-url';

// Mission 110, refondue par la mission 113 — la synthèse laissée au vendeur : le rendez-vous,
// raconté dans l'ordre du Live, à la forme du dossier « Villa Biot » (couverture en pleine photo,
// titres numérotés, chiffres en cartes, fiches de concurrents, encadré « le point à retenir »).
// Elle ne lit que le type `SellerSynthesis` (liste d'autorisation) : rien d'une annonce n'y entre.
//
// Impression A4 : les pages se suivent naturellement, une fiche ne se coupe jamais, et le pied de
// page — « Étude confidentielle · commune · date » et le numéro — est posé par le navigateur
// (marges de page CSS). À l'écran, même document, lisible sur téléphone.

// Les couleurs de la grille, du côté du vendeur, comme au Live et sur le Point marché (Jean-Guy,
// 05/11) : vert ce qui l'avantage, orange (« attention ») ce qui avantage le concurrent ; la charte
// n'y touche pas (M55).
const STATUS = {
  competitor_advantage: { className: 'border-amber-300 bg-orange-50 text-amber-800' },
  same: { className: 'border-zinc-300 bg-zinc-100 text-zinc-600' },
  competitor_weakness: { className: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
} as const;

export const kicker = 'text-[0.62rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase';
export const card = 'border border-zinc-200 bg-white px-3.5 py-3 break-inside-avoid';
// Les cartes d'une même ligne se partagent toute la largeur, qu'il y en ait une, deux ou trois.
export const row = 'flex flex-col gap-2 sm:flex-row [&>*]:min-w-0 [&>*]:flex-1';
export const bigNumber = 'font-title text-xl leading-tight font-bold text-brand-darker';

// Mission 140 — « 6 novembre 2026 », « 6 November 2026 » : dans la langue du vendeur.
export function meetingDay(value: string | null, language: TextLanguage = 'fr'): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatDay(date.toISOString(), language);
}

// Une chaîne pour une feuille de style : ni guillemet, ni antislash, ni balise ne s'en échappe.
export function cssString(value: string): string {
  return `"${value
    .replace(/[\\"]/g, '\\$&')
    .replace(/[\n\r]/g, ' ')
    .replace(/</g, '\\3C ')}"`;
}

export function SectionTitle({
  number,
  title,
  hint,
}: {
  number: number;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 break-after-avoid">
      <div className="flex items-center gap-3">
        <span className="border border-brand-deep px-2 py-0.5 font-title text-sm text-brand-deep">
          {String(number).padStart(2, '0')}
        </span>
        <h2 className="font-title text-2xl leading-tight font-bold text-brand-darker">{title}</h2>
      </div>
      {hint ? <p className="pl-12 text-sm text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function Photo({
  url,
  alt,
  className,
}: {
  url: string | null;
  alt: string;
  className: string;
}) {
  // Une photo absente ou qui ne se charge pas laisse un cadre gris, jamais une image cassée (M87).
  return url ? (
    <RemoteImage
      src={url}
      alt={alt}
      className={`object-cover object-center ${className}`}
      fallbackClassName={`bg-zinc-200 ${className}`}
      fallbackLabel=""
      eager
    />
  ) : (
    <div className={`bg-zinc-200 ${className}`} aria-hidden />
  );
}

export function Grid({
  competitor,
  language = 'fr',
}: {
  competitor: SynthesisCompetitor;
  language?: TextLanguage;
}) {
  const texts = clientTexts(language);
  if (competitor.features.length === 0) return null;
  return (
    <table className="w-full border-collapse text-[0.78rem]">
      <tbody>
        {competitor.features.map((feature) => (
          <tr key={feature.label} className="border-b border-zinc-100">
            <td className="w-[30%] py-1 pr-2 text-zinc-500 print:py-0.5">{feature.label}</td>
            <td className="py-1 pr-2 break-words print:py-0.5">
              {feature.value}
              {feature.sellerValue ? (
                <span className="text-zinc-500">
                  {texts.documents.common.yours(feature.sellerValue)}
                </span>
              ) : null}
            </td>
            <td className="py-1 text-right print:py-0.5">
              <span
                className={`inline-block rounded-full border px-2 py-px text-[0.65rem] font-semibold sm:whitespace-nowrap ${STATUS[feature.status].className}`}
              >
                {texts.common.grid.status[feature.status]}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Pair({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  // Mission 148 — la couleur de la réponse du vendeur face au prix affiché.
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 whitespace-nowrap">
      <span className="text-zinc-500">{label}</span>
      <span
        className={
          strong
            ? 'font-title text-base font-bold text-brand-darker'
            : `font-semibold ${tone ?? ''}`
        }
      >
        {value}
      </span>
    </div>
  );
}

function CompetitorCard({
  competitor,
  dangerousReason,
  language,
}: {
  competitor: SynthesisCompetitor;
  // Défini : la fiche du « plus dangereux », avec son motif.
  dangerousReason?: string | null;
  language: TextLanguage;
}) {
  const texts = clientTexts(language);
  const t = texts.documents.synthesis;
  const c = texts.documents.common;
  const euro = (value: number) => formatEuro(value, { language });
  const perSqm = (value: number) => formatEuroPerSquareMeter(value, { language });
  const days = (value: number) => c.days(formatNumber(value, { language }));
  const revealed = competitor.revealed;
  const dangerous = dangerousReason !== undefined;
  return (
    <article
      className={`grid grid-cols-1 border border-t-[3px] border-zinc-200 bg-white break-inside-avoid ${
        competitor.photoUrl ? 'sm:grid-cols-[52mm_1fr]' : ''
      } ${dangerous ? 'border-t-amber-600' : 'border-t-brand-deep'}`}
      data-testid="synthesis-competitor"
    >
      {competitor.photoUrl ? (
        <Photo url={competitor.photoUrl} alt={competitor.label} className="h-44 w-full sm:h-full" />
      ) : null}
      <div className="flex flex-col gap-2 p-3.5 print:gap-1.5 print:p-3">
        <div>
          <div className={kicker}>
            {texts.live.competitorReview.competitor(competitor.position)}
          </div>
          <h3 className="font-title text-base leading-snug font-bold text-brand-darker">
            {competitor.label}
          </h3>
        </div>
        <Grid competitor={competitor} language={language} />
        {!dangerous && competitor.serious ? (
          <p className="text-sm">
            <span className={kicker}>{t.seriousQuestion}</span>{' '}
            <b>{t.seriousShort[competitor.serious]}</b>
          </p>
        ) : null}
        {!dangerous && competitor.serious === 'no' ? (
          <p className="bg-zinc-100 px-3 py-2 text-sm text-zinc-600">{t.notConsidered}</p>
        ) : null}
        {revealed && !dangerous ? (
          <div className={`${row} text-[0.78rem]`}>
            {/* Mission 148 — « Vous imaginiez » à la couleur de l'écart, un filet de la même couleur
                à gauche, et l'écart écrit avec les mots du Live : lisible en noir et blanc. */}
            <div
              className={`${card} flex flex-col gap-0.5 ${
                revealed.guessGap ? `border-l-4 ${GUESS_GAP_BORDER[revealed.guessGap.tone]}` : ''
              }`}
              data-guess-gap={revealed.guessGap?.tone ?? 'none'}
            >
              <div className={kicker}>{t.thePrice}</div>
              {revealed.guess != null ? (
                <Pair
                  label={t.youImagined}
                  value={euro(revealed.guess)}
                  tone={revealed.guessGap ? GUESS_GAP_TEXT[revealed.guessGap.tone] : undefined}
                />
              ) : null}
              <Pair label={t.listedShort} value={euro(revealed.price)} strong />
              <div
                className={`flex items-start gap-1.5 font-semibold ${
                  revealed.guessGap ? GUESS_GAP_TEXT[revealed.guessGap.tone] : 'text-brand-deep'
                }`}
              >
                {revealed.guessGap ? (
                  <span
                    className={`mt-1 size-2 shrink-0 rounded-full ${GUESS_GAP_DOT[revealed.guessGap.tone]}`}
                    aria-hidden
                  />
                ) : null}
                <span>
                  {[
                    revealed.guessGap ? guessGapPhrase(revealed.guessGap, texts, language) : null,
                    revealed.pricePerSquareMeter != null
                      ? perSqm(revealed.pricePerSquareMeter)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            </div>
            {revealed.duration ? (
              <div className={`${card} flex flex-col gap-0.5`}>
                <div className={kicker}>{t.durationTitle}</div>
                {revealed.duration.guessDays != null ? (
                  <Pair label={t.youImagined} value={days(revealed.duration.guessDays)} />
                ) : null}
                {revealed.duration.days != null ? (
                  <Pair label={c.since} value={days(revealed.duration.days)} strong />
                ) : null}
                {revealed.priceDrop ? (
                  <div className="text-zinc-600">
                    {t.knownDrop(euro(revealed.priceDrop.amount))}
                    {revealed.priceDrop.percent != null
                      ? ` (${formatPercent(revealed.priceDrop.percent, { maxDecimals: 1, language })})`
                      : ''}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {dangerous ? (
          <div className={`${row} text-[0.78rem]`}>
            {revealed ? (
              <div className={card}>
                <div className={kicker}>{t.listed}</div>
                <div className={bigNumber}>{euro(revealed.price)}</div>
                <div className="text-zinc-500">
                  {[
                    revealed.pricePerSquareMeter != null
                      ? perSqm(revealed.pricePerSquareMeter)
                      : null,
                    revealed.duration?.days != null
                      ? c.onMarketFor(formatNumber(revealed.duration.days, { language }))
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            ) : null}
            {dangerousReason ? (
              <div className="border border-amber-300 bg-amber-50 px-3.5 py-3">
                <div className={`${kicker} text-amber-800`}>{t.whyYou}</div>
                <div className="font-title text-base font-bold text-zinc-900">
                  {dangerousReason}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

type Marker = { label: string; value: number; tone: 'muted' | 'brand' | 'deep' | 'dark' };

// Mission 116 — les couleurs du prix convenu, lisibles à l'écran comme à l'impression ; en noir
// et blanc, le libellé suffit.
const ALIGNMENT_TONE = {
  green: { text: 'text-emerald-700', border: 'border-emerald-600' },
  orange: { text: 'text-amber-700', border: 'border-amber-500' },
  red: { text: 'text-red-700', border: 'border-red-600' },
} as const;

// La bande des prix affichés (M94), avec ses repères.
// Mission 148 A — son échelle couvre tout ce qu'elle montre, prix et repères, et ses étiquettes ne
// se touchent jamais (`layoutBand`). La page est rendue au serveur, sans connaître la largeur de la
// frise : la mise en page est calculée pour trois largeurs de frise — téléphone, tablette, écran
// large et PDF A4 (≈ 658 px) — et chacune ne s'affiche que si la frise mesure AU MOINS sa largeur
// de calcul : la requête porte sur la frise elle-même (`@container`), jamais sur l'écran, que les
// marges ou une barre de défilement rétrécissent.
const BAND_LAYOUTS = [
  // Une frise de moins de 480 px (téléphone) : calculée pour 200 px, un écran de 302 px et plus.
  { width: 200, className: '@min-[480px]:hidden' },
  // De 480 à 619 px.
  { width: 480, className: 'hidden @min-[480px]:block @min-[620px]:hidden' },
  // 620 px et plus : l'écran large et l'impression A4.
  { width: 620, className: 'hidden @min-[620px]:block' },
] as const;

const BAND_TONE = {
  muted: { bar: 'bg-zinc-400', text: 'text-zinc-600' },
  brand: { bar: 'bg-brand', text: 'text-brand-deep' },
  // Mission 115 — « Le plus dangereux selon vous » : couleur de l'agence, lisible au premier regard.
  deep: { bar: 'bg-brand-deep', text: 'text-brand-deep font-semibold' },
  dark: { bar: 'bg-brand-darker', text: 'text-brand-darker' },
} as const;

// Hauteurs de la frise, en px : une étiquette tient sur deux lignes (≈ 28 px), un rond numéroté
// fait 20 px et sa rangée 24.
const LABEL_HEIGHT = 28;
const ROW_HEIGHT = 24;

function PriceBand({
  prices,
  markers,
  language,
}: {
  prices: number[];
  markers: Marker[];
  language: TextLanguage;
}) {
  const euro = (value: number) => formatEuro(value, { language });
  const legend = clientTexts(language).live.analysis.band.marker;
  const bandMarkers = markers.map((marker) => ({ ...marker, amount: euro(marker.value) }));
  const ends = layoutBand(prices, bandMarkers, BAND_LAYOUTS[0].width);
  return (
    <div className="@container flex flex-col gap-1">
      {BAND_LAYOUTS.map(({ width, className }) => (
        <BandAtWidth
          key={width}
          layout={layoutBand(prices, bandMarkers, width)}
          className={className}
          euro={euro}
          legend={legend}
        />
      ))}
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{euro(ends.low)}</span>
        <span>{euro(ends.high)}</span>
      </div>
    </div>
  );
}

function BandAtWidth({
  layout,
  className,
  euro,
  legend,
}: {
  layout: BandLayout<Marker['tone']>;
  className: string;
  euro: (value: number) => string;
  legend: (label: string, price: string) => string;
}) {
  const pct = (position: number) => `${Math.round(position * 10_000) / 100}%`;
  const at = (position: number, offset: number, width: number) =>
    `clamp(0px, calc(${pct(position)} - ${offset}px), calc(100% - ${width}px))`;
  const numbered = layout.mode === 'numbered';
  const hasBelow = !numbered && layout.groups.some((group) => group.lane === 'below');
  // La ligne de la frise : sous les étiquettes du dessus, ou sous les rangées de ronds.
  const line = numbered ? layout.rows * ROW_HEIGHT + 6 : LABEL_HEIGHT + 12;
  const height = numbered ? line + 10 : hasBelow ? line + 14 + LABEL_HEIGHT : line + 10;
  return (
    <div className={className} data-band data-band-mode={layout.mode}>
      <div className="relative" style={{ height }} data-band-area>
        <div className="absolute inset-x-0 h-[3px] bg-zinc-200" style={{ top: line }} />
        {layout.dots.map((position, index) => (
          <span
            key={`${position}-${index}`}
            className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-400"
            style={{ left: pct(position), top: line + 1.5 }}
          />
        ))}
        {layout.groups.map((group) => {
          const tone = BAND_TONE[group.tone];
          if (numbered) {
            const top = (layout.rows - 1 - group.row) * ROW_HEIGHT;
            return (
              <div key={group.value}>
                <span
                  className={`absolute w-0.5 -translate-x-1/2 ${tone.bar}`}
                  style={{ left: pct(group.position), top: top + 20, height: line - top - 20 }}
                />
                <span
                  data-band-label
                  className={`absolute flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-bold text-white ${tone.bar}`}
                  style={{ left: at(group.position, 10, 20), top }}
                >
                  {group.number}
                </span>
              </div>
            );
          }
          const above = group.lane === 'above';
          const top = above ? 0 : line + 14;
          const align =
            group.offset < group.width / 3
              ? 'text-left'
              : group.offset > (group.width * 2) / 3
                ? 'text-right'
                : 'text-center';
          return (
            <div key={group.value}>
              <span
                className={`absolute w-0.5 -translate-x-1/2 ${tone.bar}`}
                style={
                  above
                    ? { left: pct(group.position), top: LABEL_HEIGHT, height: line - LABEL_HEIGHT }
                    : { left: pct(group.position), top: line + 3, height: 11 }
                }
              />
              <div
                data-band-label
                className={`absolute flex flex-col text-[0.68rem] leading-tight whitespace-nowrap ${align} ${tone.text}`}
                style={{
                  left: at(group.position, group.offset, group.width),
                  width: group.width,
                  top,
                }}
              >
                <span>{group.labels.join(' · ')}</span>
                <b>{euro(group.value)}</b>
              </div>
            </div>
          );
        })}
      </div>
      {numbered ? (
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] leading-tight">
          {layout.groups.map((group) => {
            const tone = BAND_TONE[group.tone];
            return (
              <li key={group.value} className={`flex items-center gap-1.5 ${tone.text}`}>
                <span
                  className={`flex h-4 w-4 flex-none items-center justify-center rounded-full text-[0.6rem] font-bold text-white ${tone.bar}`}
                >
                  {group.number}
                </span>
                <span>{legend(group.labels.join(' · '), euro(group.value))}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function SellerSynthesisDocument({ synthesis }: { synthesis: SellerSynthesis }) {
  const { property, agency, analysis, decision, language } = synthesis;
  const texts: ClientTexts = clientTexts(language);
  const t = texts.documents.synthesis;
  const c = texts.documents.common;
  const band = texts.live.analysis.band;
  const euro = (value: number) => formatEuro(value, { language });
  const perSqm = (value: number) => formatEuroPerSquareMeter(value, { language });
  const day = meetingDay(synthesis.meetingDate, language);
  const footer = [c.confidential, synthesis.commune, day].filter(Boolean).join(' · ');
  const cover = property?.photos[0] ?? null;
  const dangerous = synthesis.dangerous
    ? (synthesis.competitors.find((item) => item.id === synthesis.dangerous!.competitorId) ?? null)
    : null;
  const QUARTIER_BLOCKS = ['urbanisme', 'risques', 'population', 'copropriete', 'permis'] as const;
  const quartierBlocks = QUARTIER_BLOCKS.filter((key) => synthesis.quartier?.keys.includes(key));
  const quartierSales = synthesis.quartier?.keys.includes('ventes') ?? false;
  // Les sections présentes, dans l'ordre du Live : leur numéro (« 01 », « 02 »…) en découle.
  const sections = [
    property || synthesis.perceivedPrice != null ? 'property' : null,
    // Mission 159 — le quartier vu au Live, après « Votre bien » ; les ventes réelles avant
    // « L'analyse des prix », comme au Live.
    quartierBlocks.length > 0 ? 'quartier' : null,
    synthesis.competitors.length > 0 ? 'competitors' : null,
    synthesis.dpe ? 'dpe' : null,
    dangerous ? 'dangerous' : null,
    quartierSales ? 'sales' : null,
    analysis || decision ? 'analysis' : null,
    'path',
  ].filter((key): key is string => key != null);
  const sectionNumber = (key: string) => sections.indexOf(key) + 1;

  const coverFigures = [
    synthesis.commercializationPrice != null
      ? {
          label: t.agreedPrice,
          value: euro(synthesis.commercializationPrice),
        }
      : null,
    property?.surfaceArea != null
      ? { label: c.livingArea, value: formatSquareMeters(property.surfaceArea, { language }) }
      : null,
    property?.roomsCount != null
      ? {
          label: c.roomsBedrooms,
          value: [
            texts.common.rooms(property.roomsCount),
            property.bedroomsCount != null ? c.bedroomsShort(property.bedroomsCount) : null,
          ]
            .filter(Boolean)
            .join(' · '),
        }
      : null,
  ].filter((item): item is { label: string; value: string } => item != null);

  // Mission 115 — trois repères nommés sur la bande : « Au début », « Après le marché » et « Le
  // plus dangereux selon vous » (son prix affiché, figé au Live ; absent sans désignation, jamais
  // pour un « Non », qui n'a pas de prix révélé, M41), plus le « Prix des concurrents » (M104).
  const dangerousPrice = dangerous?.revealed?.price ?? null;
  const analysisCandidates: (Marker | null)[] = [
    synthesis.perceivedPrice != null
      ? { label: band.start, value: synthesis.perceivedPrice, tone: 'muted' as const }
      : null,
    synthesis.revisedPrice != null
      ? { label: band.revised, value: synthesis.revisedPrice, tone: 'brand' as const }
      : null,
    dangerousPrice != null
      ? {
          label: synthesis.dangerous?.byAdvisor ? texts.live.closest.badge : band.dangerous,
          value: dangerousPrice,
          tone: 'deep' as const,
        }
      : null,
    decision?.competitorPrice != null
      ? { label: band.competitors, value: decision.competitorPrice, tone: 'dark' as const }
      : null,
  ];
  const analysisMarkers = analysisCandidates.filter((item): item is Marker => item != null);
  const pathCandidates: (Marker | null)[] = [
    synthesis.perceivedPrice != null
      ? { label: band.start, value: synthesis.perceivedPrice, tone: 'muted' as const }
      : null,
    synthesis.revisedPrice != null
      ? { label: band.revised, value: synthesis.revisedPrice, tone: 'brand' as const }
      : null,
    synthesis.commercializationPrice != null
      ? {
          label: t.agreedTogether,
          value: synthesis.commercializationPrice,
          tone: 'dark' as const,
        }
      : null,
  ];
  const pathMarkers = pathCandidates.filter((item): item is Marker => item != null);
  // Mission 116 — la couleur du prix convenu, sur les montants figés à la conclusion (M111).
  const agreedAlignment = priceAlignment(
    synthesis.commercializationPrice,
    decision?.advisorAnalysis ?? null,
  );
  const steps = [
    synthesis.perceivedPrice != null
      ? { label: band.start, value: synthesis.perceivedPrice, hint: texts.live.analysis.perceived }
      : null,
    synthesis.revisedPrice != null
      ? {
          label: band.revised,
          value: synthesis.revisedPrice,
          hint: t.afterSeeing,
        }
      : null,
    synthesis.commercializationPrice != null
      ? {
          label: t.agreedTogether,
          value: synthesis.commercializationPrice,
          hint: t.agreedTogetherHint,
        }
      : null,
  ].filter((item): item is { label: string; value: number; hint: string } => item != null);

  // Chrome met toutes les pages à la largeur de la première : les marges de côté sont donc nulles
  // partout (la couverture va bord à bord) et les 14 mm de côté vivent dans le contenu.
  const pageRules = `@page{size:A4;margin:12mm 0 16mm 0;@bottom-left{content:${cssString(footer)};padding-left:14mm;font-size:7.5pt;letter-spacing:.08em;text-transform:uppercase;color:#64748b}@bottom-right{content:counter(page,decimal-leading-zero) " / " counter(pages,decimal-leading-zero);padding-right:14mm;font-size:7.5pt;color:#64748b}}@page\u00a0:first{margin:0;@bottom-left{content:none}@bottom-right{content:none}}`;

  return (
    <article
      className="mx-auto flex w-full max-w-[210mm] flex-col gap-0 bg-zinc-50 text-zinc-800 [print-color-adjust:exact] print:max-w-none print:bg-white"
      data-testid="seller-synthesis"
      data-synthesis=""
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `${pageRules}${synthesis.brandDeclarations ? `[data-synthesis]{${synthesis.brandDeclarations}}` : ''}`,
        }}
      />

      {/* Couverture : la photo principale du bien, sinon un aplat à la couleur de l'agence. */}
      <section className="relative flex min-h-[150mm] flex-col overflow-hidden bg-brand-deep text-white break-after-page print:h-[297mm] print:min-h-0">
        {cover ? (
          <>
            <img
              src={displayPhotoUrl(cover)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-b from-transparent via-brand-darker/75 to-brand-darker/95" />
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
          {synthesis.propertyLabel ? (
            <span className="mt-3 text-xs tracking-[0.2em] uppercase opacity-85">
              {synthesis.propertyLabel}
            </span>
          ) : null}
          <h1 className="font-title text-4xl leading-tight font-bold sm:text-5xl">
            {t.coverTitle}
            {day ? (
              <>
                <br />
                {t.titleDay(day)}
              </>
            ) : null}
          </h1>
          <p className="text-sm opacity-90">{t.forSeller(synthesis.sellerName)}</p>
          {coverFigures.length > 0 ? (
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
          ) : null}
        </div>
      </section>

      <div className="flex flex-col gap-6 p-5 sm:p-8 print:px-[14mm] print:py-0">
        {/* 01 · Votre bien — écrans « Votre bien » et « Votre valeur perçue ». */}
        {property || synthesis.perceivedPrice != null ? (
          <section className="flex flex-col gap-3">
            <SectionTitle
              number={sectionNumber('property')}
              title={t.propertyTitle}
              hint={t.propertyHint}
            />
            {property && property.photos.length > 0 ? (
              <div
                className={`grid gap-2 ${property.photos.length > 1 ? 'grid-cols-[2fr_1fr]' : 'grid-cols-1'}`}
              >
                <Photo
                  url={property.photos[0]}
                  alt={t.propertyTitle}
                  className="h-64 w-full sm:h-80"
                />
                {property.photos.length > 1 ? (
                  <div className="grid gap-2">
                    {property.photos.slice(1).map((url) => (
                      <Photo
                        key={url}
                        url={url}
                        alt={t.propertyTitle}
                        className="h-full min-h-24 w-full"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {property && property.facts.length > 0 ? (
              <dl className="grid grid-cols-2 border-t border-l border-zinc-200 bg-white break-inside-avoid sm:grid-cols-3">
                {property.facts.map((fact) => (
                  <div key={fact.label} className="border-r border-b border-zinc-200 px-3.5 py-2.5">
                    <dt className={kicker}>{fact.label}</dt>
                    <dd className="mt-1 font-semibold">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {property && property.strengths.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <div className={`${kicker} border-t-2 border-brand-deep pt-2 text-brand-deep`}>
                  {t.strengths}
                </div>
                <ul className="grid list-disc grid-cols-1 gap-x-6 gap-y-1 pl-5 text-sm sm:grid-cols-2">
                  {property.strengths.map((strength) => (
                    <li key={strength}>{strength}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {synthesis.perceivedPrice != null ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border border-l-4 border-zinc-200 border-l-brand bg-white px-5 py-4">
                <div className={kicker}>{t.perceivedAtStart}</div>
                <div className="font-title text-3xl font-bold text-brand-darker">
                  {euro(synthesis.perceivedPrice)}
                </div>
              </div>
            ) : null}
            {synthesis.neighbourhood ? (
              <NeighbourhoodLinkBlock link={synthesis.neighbourhood} language={language} />
            ) : null}
          </section>
        ) : null}

        {synthesis.quartier && quartierBlocks.length > 0 ? (
          <section className="flex flex-col gap-3">
            <NeighbourhoodDocumentBlocks
              content={synthesis.quartier}
              only={quartierBlocks}
              language={language}
              heading={
                <SectionTitle number={sectionNumber('quartier')} title={texts.quartier.kicker} />
              }
            />
          </section>
        ) : null}

        {/* 02 · Les biens regardés ensemble — une fiche par concurrent montré, dans l'ordre du Live. */}
        {synthesis.competitors.length > 0 ? (
          <section className="flex flex-col gap-3">
            {/* Mission 162 — le titre s'imprime avec la première fiche : jamais seul en bas de page. */}
            <div className="flex flex-col gap-3 break-inside-avoid">
              <SectionTitle
                number={sectionNumber('competitors')}
                title={t.competitorsTitle}
                hint={t.competitorsHint}
              />
              <CompetitorCard competitor={synthesis.competitors[0]!} language={language} />
            </div>
            {synthesis.competitors.slice(1).map((competitor) => (
              <CompetitorCard key={competitor.id} competitor={competitor} language={language} />
            ))}
          </section>
        ) : null}

        {/* 03 · Le DPE face au marché — seulement si l'écran a eu lieu (M80). */}
        {synthesis.dpe ? (
          <section className="flex flex-col gap-3 break-inside-avoid">
            <SectionTitle
              number={sectionNumber('dpe')}
              title={texts.live.dpe.title}
              hint={t.dpeHint}
            />
            <div className={row}>
              <div className={`${card} flex flex-col gap-2`}>
                <div className={kicker}>{texts.live.dpe.yours}</div>
                {synthesis.dpe.subject ? (
                  <span className="self-start">
                    <DpeLetter letter={synthesis.dpe.subject} size="md" />
                  </span>
                ) : (
                  <p className="text-sm text-zinc-500">{texts.live.dpe.noDpe}</p>
                )}
              </div>
              <div className={`${card} flex flex-col gap-2`}>
                <div className={kicker}>{texts.live.dpe.competitors}</div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {synthesis.dpe.classes.map((entry) => (
                    <span key={entry.letter} className="flex items-center gap-1.5">
                      <DpeLetter letter={entry.letter} />
                      {t.dpeProperties(entry.count)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="border-l-4 border-brand-deep bg-brand-soft px-4 py-2.5 text-sm">
              {t.dpeReference(synthesis.dpe.reference)} {synthesis.dpe.message}
            </p>
          </section>
        ) : null}

        {/* 04 · Le plus dangereux, selon le vendeur. */}
        {dangerous ? (
          <section className="flex flex-col gap-3 break-inside-avoid">
            <SectionTitle
              number={sectionNumber('dangerous')}
              title={
                synthesis.dangerous?.byAdvisor
                  ? texts.live.conclusion.closestCard
                  : t.dangerousTitle
              }
            />
            <CompetitorCard
              competitor={dangerous}
              dangerousReason={synthesis.dangerous?.reason ?? null}
              language={language}
            />
          </section>
        ) : null}

        {synthesis.quartier && quartierSales ? (
          <section className="flex flex-col gap-3">
            <NeighbourhoodDocumentBlocks
              content={synthesis.quartier}
              only={['ventes']}
              language={language}
              heading={
                <SectionTitle number={sectionNumber('sales')} title={texts.quartier.sales.title} />
              }
              blockTitles={false}
            />
          </section>
        ) : null}

        {/* 05 · L'analyse des prix — écran « Analyse des prix ». La bande, les deux prix et le point
            à retenir restent ensemble, titre compris : une page ne se coupe qu'avant eux. */}
        {analysis || decision ? (
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 break-inside-avoid">
              <SectionTitle
                number={sectionNumber('analysis')}
                title={t.analysisTitle}
                hint={t.analysisHint}
              />
              {analysis ? (
                <div className={card}>
                  <div className={kicker}>{t.bandTitle}</div>
                  <PriceBand
                    prices={analysis.prices}
                    markers={analysisMarkers}
                    language={language}
                  />
                </div>
              ) : null}
              {decision &&
              (decision.competitorPrice != null || decision.advisorAnalysis != null) ? (
                <div className={row}>
                  {decision.competitorPrice != null ? (
                    <div className="bg-brand-darker px-4 py-3.5 text-white">
                      <div className="text-[0.62rem] font-semibold tracking-[0.14em] text-white/75 uppercase">
                        {texts.live.analysis.competitorPrice}
                      </div>
                      <div className="font-title text-2xl font-bold">
                        {euro(decision.competitorPrice)}
                      </div>
                      {decision.basisLabel ? (
                        <div className="text-xs text-white/80">{decision.basisLabel}</div>
                      ) : null}
                    </div>
                  ) : null}
                  {decision.advisorAnalysis != null ? (
                    <div className="bg-brand-deep px-4 py-3.5 text-white">
                      <div className="text-[0.62rem] font-semibold tracking-[0.14em] text-white/75 uppercase">
                        {texts.live.analysis.advisor}
                      </div>
                      <div className="font-title text-2xl font-bold">
                        {euro(decision.advisorAnalysis)}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {decision?.justification ? (
                <div className="border-l-4 border-brand-deep bg-brand-soft px-5 py-4">
                  <div className={`${kicker} text-brand-deep`}>{t.keyPoint}</div>
                  <p className="mt-1.5 text-[0.95rem] leading-relaxed whitespace-pre-line">
                    {decision.justification}
                  </p>
                </div>
              ) : null}
            </div>
            {analysis &&
            (analysis.medianPrice != null ||
              analysis.medianDaysOnMarket != null ||
              analysis.droppedCount != null) ? (
              <div className={row}>
                {analysis.medianPrice != null ? (
                  <div className={card}>
                    <div className={kicker}>{texts.live.analysis.median}</div>
                    <div className={bigNumber}>{euro(analysis.medianPrice)}</div>
                  </div>
                ) : null}
                {analysis.medianDaysOnMarket != null ? (
                  <div className={card}>
                    <div className={kicker}>{t.medianAge}</div>
                    <div className={bigNumber}>
                      {c.days(formatNumber(analysis.medianDaysOnMarket, { language }))}
                    </div>
                  </div>
                ) : null}
                {analysis.droppedCount != null ? (
                  <div className={card}>
                    <div className={kicker}>{texts.live.analysis.dropped}</div>
                    <div className={bigNumber}>
                      {texts.live.analysis.droppedValue(
                        analysis.droppedCount,
                        analysis.revealedCount,
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {analysis && analysis.perSquareMeter.length > 0 ? (
              <div className={card}>
                <div className={`${kicker} mb-1`}>{t.perSqmTitle}</div>
                {(() => {
                  const rows = [
                    ...analysis.perSquareMeter.map((item) => ({ ...item, median: false })),
                    ...(analysis.medianPerSquareMeter != null
                      ? [{ label: t.median, value: analysis.medianPerSquareMeter, median: true }]
                      : []),
                  ].sort((a, b) => a.value - b.value);
                  const max = Math.max(...rows.map((item) => item.value));
                  return rows.map((item, index) => (
                    <div
                      key={`${item.label}-${index}`}
                      className="grid grid-cols-[minmax(0,11rem)_1fr_5rem] items-center gap-3 border-b border-zinc-100 py-1 text-[0.78rem] last:border-b-0"
                    >
                      <span className={`truncate ${item.median ? 'font-bold' : ''}`}>
                        {item.label}
                      </span>
                      <span
                        className={`block h-2 rounded-sm ${item.median ? 'bg-brand-deep' : 'bg-zinc-400'}`}
                        style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }}
                      />
                      <b className="text-right">{perSqm(item.value)}</b>
                    </div>
                  ));
                })()}
                {/* Mission 148 B — un « Non » garde sa ligne, sans barre ni prix : les numéros du
                    Live se suivent. */}
                {analysis.notConsideredRows.map((row) => (
                  <div
                    key={row}
                    className="border-b border-zinc-100 py-1 text-[0.78rem] text-zinc-500 last:border-b-0"
                    data-not-considered
                  >
                    {row}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {/* 06 · Le chemin de votre prix — « Après avoir vu le marché » et « Sur quel prix partons-nous ? ». */}
        <section className="flex flex-col gap-3">
          <SectionTitle number={sectionNumber('path')} title={t.pathTitle} hint={t.pathHint} />
          {steps.length > 0 ? (
            <div className="flex flex-col gap-2 break-inside-avoid sm:flex-row sm:items-stretch">
              {steps.map((step, index) => {
                const last = step.label === t.agreedTogether;
                // Mission 116 — le prix convenu en couleur face à l'analyse du conseiller, sur les
                // montants figés à la conclusion (M111) : titre et montant colorés, le libellé à
                // côté. Sans analyse, la carte reste telle quelle.
                const alignment = last ? agreedAlignment : null;
                const toneClass = alignment ? ALIGNMENT_TONE[alignment.tone] : null;
                return (
                  <div
                    key={step.label}
                    className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center"
                  >
                    {index > 0 ? (
                      <span className="text-center font-title text-2xl text-brand-deep" aria-hidden>
                        →
                      </span>
                    ) : null}
                    <div
                      className={`flex-1 px-4 py-4 ${
                        toneClass
                          ? `border-2 bg-white ${toneClass.border}`
                          : last
                            ? 'bg-brand-deep text-white'
                            : 'border border-zinc-200 bg-white'
                      }`}
                      data-testid={last ? 'agreed-price' : undefined}
                      data-alignment={last ? (alignment?.tone ?? '') : undefined}
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <div
                          className={`text-[0.62rem] font-semibold tracking-[0.14em] uppercase ${
                            toneClass ? toneClass.text : last ? 'text-white/75' : 'text-zinc-500'
                          }`}
                        >
                          {step.label}
                        </div>
                        {alignment && toneClass ? (
                          <span
                            data-testid="price-alignment"
                            className={`text-xs font-semibold ${toneClass.text}`}
                          >
                            {texts.common.alignment[alignment.tone]}
                          </span>
                        ) : null}
                      </div>
                      <div
                        className={`font-title text-[1.7rem] leading-tight font-bold ${
                          toneClass ? toneClass.text : last ? '' : 'text-brand-darker'
                        }`}
                      >
                        {euro(step.value)}
                      </div>
                      <div
                        className={`text-xs ${toneClass ? 'text-zinc-600' : last ? 'text-white/80' : 'text-zinc-500'}`}
                      >
                        {step.hint}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
          {synthesis.guessLines.length > 0 ? (
            <div className="border-l-4 border-brand-deep bg-brand-soft px-5 py-3 break-inside-avoid">
              <div className={`${kicker} text-brand-deep`}>{t.answersTitle}</div>
              {synthesis.guessLines.map((line) => (
                <p key={line} className="mt-1 text-[0.95rem]">
                  {line}.
                </p>
              ))}
            </div>
          ) : null}
          {synthesis.agreedPricePerSquareMeter != null || synthesis.positionSentence ? (
            <div className={row}>
              {synthesis.agreedPricePerSquareMeter != null ? (
                <div className={card}>
                  <div className={kicker}>{t.agreedPerSqm}</div>
                  <div className={bigNumber}>{perSqm(synthesis.agreedPricePerSquareMeter)}</div>
                </div>
              ) : null}
              {synthesis.positionSentence ? (
                <div className={card}>
                  <div className={kicker}>{t.amongCompared}</div>
                  <div className="font-title text-base font-bold text-brand-darker">
                    {synthesis.positionSentence}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {analysis && pathMarkers.length > 0 ? (
            <div className={card}>
              <div className={kicker}>{t.stepsBand}</div>
              <PriceBand prices={analysis.prices} markers={pathMarkers} language={language} />
            </div>
          ) : null}

          <footer className="mt-2 flex flex-col gap-2 break-inside-avoid">
            <p className="border-t border-zinc-200 pt-3 text-xs text-zinc-500">{c.disclaimer}</p>
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
        </section>
      </div>
    </article>
  );
}
