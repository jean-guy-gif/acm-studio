/* eslint-disable @next/next/no-img-element */
import { RemoteImage } from '@/components/ui/remote-image';
import { DpeLetter } from '@/features/dpe/components/dpe-letter';
import { bandPosition } from '@/features/live-seller/services/market-reading';
import { priceAlignment } from '@/features/price-positioning/services/price-alignment';
import { SERIOUS_COMPETITOR_LABELS } from '@/features/live-seller/constants';
import type { SellerSynthesis, SynthesisCompetitor } from '@/features/seller-synthesis/types';
import {
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

const SERIOUS_SHORT: Record<'yes' | 'unsure' | 'no', string> = {
  yes: 'Oui',
  unsure: SERIOUS_COMPETITOR_LABELS.unsure,
  no: SERIOUS_COMPETITOR_LABELS.no,
};

// Les couleurs de la grille du Live (M40), sémantiques : la charte n'y touche pas (M55).
const STATUS = {
  competitor_advantage: {
    label: 'Avantage pour lui',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  },
  same: { label: 'Équivalent', className: 'border-zinc-300 bg-zinc-100 text-zinc-600' },
  competitor_weakness: {
    label: 'Avantage pour vous',
    className: 'border-amber-300 bg-amber-50 text-amber-800',
  },
} as const;

// Mission 129 — le Point marché lit la grille du côté du vendeur, aux couleurs de son classement
// (Jean-Guy, 05/11) : vert ce qui l'avantage, orange (« attention ») ce qui avantage le concurrent.
const SELLER_STATUS = {
  ...STATUS,
  competitor_advantage: {
    ...STATUS.competitor_advantage,
    className: 'border-amber-300 bg-orange-50 text-amber-800',
  },
  competitor_weakness: {
    ...STATUS.competitor_weakness,
    className: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  },
} as const;

export const kicker = 'text-[0.62rem] font-semibold tracking-[0.14em] text-zinc-500 uppercase';
export const card = 'border border-zinc-200 bg-white px-3.5 py-3 break-inside-avoid';
// Les cartes d'une même ligne se partagent toute la largeur, qu'il y en ait une, deux ou trois.
export const row = 'flex flex-col gap-2 sm:flex-row [&>*]:min-w-0 [&>*]:flex-1';
export const bigNumber = 'font-title text-xl leading-tight font-bold text-brand-darker';

export function meetingDay(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Paris',
      });
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
  palette = 'live',
}: {
  competitor: SynthesisCompetitor;
  // 'live' : les couleurs de la grille du Live (M40) ; 'seller' : celles du Point marché.
  palette?: 'live' | 'seller';
}) {
  if (competitor.features.length === 0) return null;
  const statuses = palette === 'seller' ? SELLER_STATUS : STATUS;
  return (
    <table className="w-full border-collapse text-[0.78rem]">
      <tbody>
        {competitor.features.map((feature) => (
          <tr key={feature.label} className="border-b border-zinc-100">
            <td className="w-[30%] py-1 pr-2 text-zinc-500">{feature.label}</td>
            <td className="py-1 pr-2 break-words">
              {feature.value}
              {feature.sellerValue ? (
                <span className="text-zinc-500"> (vous : {feature.sellerValue})</span>
              ) : null}
            </td>
            <td className="py-1 text-right">
              <span
                className={`inline-block rounded-full border px-2 py-px text-[0.65rem] font-semibold sm:whitespace-nowrap ${statuses[feature.status].className}`}
              >
                {statuses[feature.status].label}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Pair({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 whitespace-nowrap">
      <span className="text-zinc-500">{label}</span>
      <span
        className={strong ? 'font-title text-base font-bold text-brand-darker' : 'font-semibold'}
      >
        {value}
      </span>
    </div>
  );
}

function CompetitorCard({
  competitor,
  dangerousReason,
}: {
  competitor: SynthesisCompetitor;
  // Défini : la fiche du « plus dangereux », avec son motif.
  dangerousReason?: string | null;
}) {
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
      <div className="flex flex-col gap-2 p-3.5">
        <div>
          <div className={kicker}>Concurrent {competitor.position}</div>
          <h3 className="font-title text-base leading-snug font-bold text-brand-darker">
            {competitor.label}
          </h3>
        </div>
        <Grid competitor={competitor} />
        {!dangerous && competitor.serious ? (
          <p className="text-sm">
            <span className={kicker}>Un sérieux concurrent ?</span>{' '}
            <b>{SERIOUS_SHORT[competitor.serious]}</b>
          </p>
        ) : null}
        {!dangerous && competitor.serious === 'no' ? (
          <p className="bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
            Pas un concurrent pour vous : son prix n’a pas été regardé.
          </p>
        ) : null}
        {revealed && !dangerous ? (
          <div className={`${row} text-[0.78rem]`}>
            <div className={`${card} flex flex-col gap-0.5`}>
              <div className={kicker}>Le prix</div>
              <Pair label="Vous imaginiez" value={formatEuro(revealed.guess)} />
              <Pair label="Affiché" value={formatEuro(revealed.price)} strong />
              <div className="font-semibold text-brand-deep">
                {[
                  revealed.gapPercent != null && revealed.gapPercent !== 0
                    ? `${formatPercent(revealed.gapPercent, { signed: true, maxDecimals: 1 })} par rapport à votre réponse`
                    : null,
                  revealed.pricePerSquareMeter != null
                    ? formatEuroPerSquareMeter(revealed.pricePerSquareMeter)
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
            {revealed.duration ? (
              <div className={`${card} flex flex-col gap-0.5`}>
                <div className={kicker}>La durée en vente</div>
                <Pair
                  label="Vous imaginiez"
                  value={`${formatNumber(revealed.duration.guessDays)} jours`}
                />
                {revealed.duration.days != null ? (
                  <Pair
                    label="En vente depuis"
                    value={`${formatNumber(revealed.duration.days)} jours`}
                    strong
                  />
                ) : null}
                {revealed.priceDrop ? (
                  <div className="text-zinc-600">
                    Baisse de prix connue : {formatEuro(revealed.priceDrop.amount)}
                    {revealed.priceDrop.percent != null
                      ? ` (${formatPercent(revealed.priceDrop.percent, { maxDecimals: 1 })})`
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
                <div className={kicker}>Prix affiché</div>
                <div className={bigNumber}>{formatEuro(revealed.price)}</div>
                <div className="text-zinc-500">
                  {[
                    revealed.pricePerSquareMeter != null
                      ? formatEuroPerSquareMeter(revealed.pricePerSquareMeter)
                      : null,
                    revealed.duration?.days != null
                      ? `en vente depuis ${formatNumber(revealed.duration.days)} jours`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            ) : null}
            {dangerousReason ? (
              <div className="border border-amber-300 bg-amber-50 px-3.5 py-3">
                <div className={`${kicker} text-amber-800`}>Pourquoi, selon vous</div>
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
function PriceBand({ prices, markers }: { prices: number[]; markers: Marker[] }) {
  const all = [...prices, ...markers.map((marker) => marker.value)];
  const at = (value: number) => `${Math.round(bandPosition(value, all) * 1000) / 10}%`;
  const tone = {
    muted: 'bg-zinc-400 text-zinc-600',
    brand: 'bg-brand text-brand-deep',
    // Mission 115 — « Le plus dangereux selon vous » : couleur de l'agence, lisible au premier regard.
    deep: 'bg-brand-deep text-brand-deep font-semibold',
    dark: 'bg-brand-darker text-brand-darker',
  };
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return (
    <div className="flex flex-col gap-1">
      <div className="relative mx-[12%] h-24">
        <div className="absolute inset-x-0 top-[3.25rem] h-[3px] bg-zinc-200" />
        {prices.map((price, index) => (
          <span
            key={`${price}-${index}`}
            className="absolute top-[2.9rem] h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-zinc-400"
            style={{ left: at(price) }}
          />
        ))}
        {markers.map((marker, index) => {
          const below = index % 2 === 1;
          return (
            <div
              key={marker.label}
              className={`absolute flex -translate-x-1/2 flex-col items-center text-center text-[0.68rem] leading-tight whitespace-nowrap ${tone[marker.tone].split(' ')[1]} ${
                below ? 'top-[3.5rem]' : 'top-0'
              }`}
              style={{ left: at(marker.value) }}
            >
              {below ? (
                <span className={`mb-0.5 h-4 w-0.5 ${tone[marker.tone].split(' ')[0]}`} />
              ) : null}
              <span>{marker.label}</span>
              <b>{formatEuro(marker.value)}</b>
              {below ? null : (
                <span className={`mt-0.5 h-4 w-0.5 ${tone[marker.tone].split(' ')[0]}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{formatEuro(low)}</span>
        <span>{formatEuro(high)}</span>
      </div>
    </div>
  );
}

export function SellerSynthesisDocument({ synthesis }: { synthesis: SellerSynthesis }) {
  const { property, agency, analysis, decision } = synthesis;
  const day = meetingDay(synthesis.meetingDate);
  const footer = ['Étude confidentielle', synthesis.commune, day].filter(Boolean).join(' · ');
  const cover = property?.photos[0] ?? null;
  const dangerous = synthesis.dangerous
    ? (synthesis.competitors.find((item) => item.id === synthesis.dangerous!.competitorId) ?? null)
    : null;
  // Les sections présentes, dans l'ordre du Live : leur numéro (« 01 », « 02 »…) en découle.
  const sections = [
    property || synthesis.perceivedPrice != null ? 'property' : null,
    synthesis.competitors.length > 0 ? 'competitors' : null,
    synthesis.dpe ? 'dpe' : null,
    dangerous ? 'dangerous' : null,
    analysis || decision ? 'analysis' : null,
    'path',
  ].filter((key): key is string => key != null);
  const sectionNumber = (key: string) => sections.indexOf(key) + 1;

  const coverFigures = [
    synthesis.commercializationPrice != null
      ? {
          label: 'Prix de commercialisation convenu',
          value: formatEuro(synthesis.commercializationPrice),
        }
      : null,
    property?.surfaceArea != null
      ? { label: 'Surface habitable', value: formatSquareMeters(property.surfaceArea) }
      : null,
    property?.roomsCount != null
      ? {
          label: 'Pièces · chambres',
          value: [
            `${property.roomsCount} pièce${property.roomsCount > 1 ? 's' : ''}`,
            property.bedroomsCount != null ? `${property.bedroomsCount} ch.` : null,
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
      ? { label: 'Au début', value: synthesis.perceivedPrice, tone: 'muted' as const }
      : null,
    synthesis.revisedPrice != null
      ? { label: 'Après le marché', value: synthesis.revisedPrice, tone: 'brand' as const }
      : null,
    dangerousPrice != null
      ? { label: 'Le plus dangereux selon vous', value: dangerousPrice, tone: 'deep' as const }
      : null,
    decision?.competitorPrice != null
      ? { label: 'Prix des concurrents', value: decision.competitorPrice, tone: 'dark' as const }
      : null,
  ];
  const analysisMarkers = analysisCandidates.filter((item): item is Marker => item != null);
  const pathCandidates: (Marker | null)[] = [
    synthesis.perceivedPrice != null
      ? { label: 'Au début', value: synthesis.perceivedPrice, tone: 'muted' as const }
      : null,
    synthesis.revisedPrice != null
      ? { label: 'Après le marché', value: synthesis.revisedPrice, tone: 'brand' as const }
      : null,
    synthesis.commercializationPrice != null
      ? {
          label: 'Convenu ensemble',
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
      ? { label: 'Au début', value: synthesis.perceivedPrice, hint: 'Votre valeur perçue' }
      : null,
    synthesis.revisedPrice != null
      ? {
          label: 'Après le marché',
          value: synthesis.revisedPrice,
          hint: 'Après avoir vu les biens',
        }
      : null,
    synthesis.commercializationPrice != null
      ? {
          label: 'Convenu ensemble',
          value: synthesis.commercializationPrice,
          hint: 'Prix de commercialisation convenu ensemble',
        }
      : null,
  ].filter((item): item is { label: string; value: number; hint: string } => item != null);

  // Chrome met toutes les pages à la largeur de la première : les marges de côté sont donc nulles
  // partout (la couverture va bord à bord) et les 14 mm de côté vivent dans le contenu.
  const pageRules = `@page{size:A4;margin:12mm 0 16mm 0;@bottom-left{content:${cssString(footer)};padding-left:14mm;font-size:7.5pt;letter-spacing:.08em;text-transform:uppercase;color:#64748b}@bottom-right{content:counter(page,decimal-leading-zero) " / " counter(pages,decimal-leading-zero);padding-right:14mm;font-size:7.5pt;color:#64748b}}@page :first{margin:0;@bottom-left{content:none}@bottom-right{content:none}}`;

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
            Dossier de rendez-vous
          </span>
          {synthesis.propertyLabel ? (
            <span className="mt-3 text-xs tracking-[0.2em] uppercase opacity-85">
              {synthesis.propertyLabel}
            </span>
          ) : null}
          <h1 className="font-title text-4xl leading-tight font-bold sm:text-5xl">
            Notre rendez-vous
            {day ? (
              <>
                <br />
                du {day}
              </>
            ) : null}
          </h1>
          <p className="text-sm opacity-90">Pour {synthesis.sellerName}</p>
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
              title="Votre bien"
              hint="Ce que nous avons regardé ensemble en début de rendez-vous."
            />
            {property && property.photos.length > 0 ? (
              <div
                className={`grid gap-2 ${property.photos.length > 1 ? 'grid-cols-[2fr_1fr]' : 'grid-cols-1'}`}
              >
                <Photo url={property.photos[0]} alt="Votre bien" className="h-64 w-full sm:h-80" />
                {property.photos.length > 1 ? (
                  <div className="grid gap-2">
                    {property.photos.slice(1).map((url) => (
                      <Photo
                        key={url}
                        url={url}
                        alt="Votre bien"
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
                  Ses atouts
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
                <div className={kicker}>Votre valeur perçue, en début de rendez-vous</div>
                <div className="font-title text-3xl font-bold text-brand-darker">
                  {formatEuro(synthesis.perceivedPrice)}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* 02 · Les biens regardés ensemble — une fiche par concurrent montré, dans l'ordre du Live. */}
        {synthesis.competitors.length > 0 ? (
          <section className="flex flex-col gap-3">
            <SectionTitle
              number={sectionNumber('competitors')}
              title="Les biens que nous avons regardés ensemble"
              hint="Dans l’ordre du rendez-vous : ce que nous avons vu, et ce que vous avez répondu."
            />
            {synthesis.competitors.map((competitor) => (
              <CompetitorCard key={competitor.id} competitor={competitor} />
            ))}
          </section>
        ) : null}

        {/* 03 · Le DPE face au marché — seulement si l'écran a eu lieu (M80). */}
        {synthesis.dpe ? (
          <section className="flex flex-col gap-3 break-inside-avoid">
            <SectionTitle
              number={sectionNumber('dpe')}
              title="Le DPE face au marché"
              hint="La classe énergie des biens regardés, et celle du vôtre."
            />
            <div className={row}>
              <div className={`${card} flex flex-col gap-2`}>
                <div className={kicker}>Votre bien</div>
                {synthesis.dpe.subject ? (
                  <span className="self-start">
                    <DpeLetter letter={synthesis.dpe.subject} size="md" />
                  </span>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Pas encore de DPE : il sera établi par le diagnostiqueur.
                  </p>
                )}
              </div>
              <div className={`${card} flex flex-col gap-2`}>
                <div className={kicker}>Vos concurrents</div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {synthesis.dpe.classes.map((entry) => (
                    <span key={entry.letter} className="flex items-center gap-1.5">
                      <DpeLetter letter={entry.letter} />
                      {entry.count} bien{entry.count > 1 ? 's' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="border-l-4 border-brand-deep bg-brand-soft px-4 py-2.5 text-sm">
              Repère du marché : {synthesis.dpe.reference}. {synthesis.dpe.message}
            </p>
          </section>
        ) : null}

        {/* 04 · Le plus dangereux, selon le vendeur. */}
        {dangerous ? (
          <section className="flex flex-col gap-3 break-inside-avoid">
            <SectionTitle
              number={sectionNumber('dangerous')}
              title="Le concurrent le plus dangereux, selon vous"
            />
            <CompetitorCard
              competitor={dangerous}
              dangerousReason={synthesis.dangerous?.reason ?? null}
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
                title="L’analyse des prix"
                hint="Les prix affichés des biens dont nous avons regardé le prix ensemble."
              />
              {analysis ? (
                <div className={card}>
                  <div className={kicker}>Prix affichés, du moins cher au plus cher</div>
                  <PriceBand prices={analysis.prices} markers={analysisMarkers} />
                </div>
              ) : null}
              {decision &&
              (decision.competitorPrice != null || decision.advisorAnalysis != null) ? (
                <div className={row}>
                  {decision.competitorPrice != null ? (
                    <div className="bg-brand-darker px-4 py-3.5 text-white">
                      <div className="text-[0.62rem] font-semibold tracking-[0.14em] text-white/75 uppercase">
                        Prix des concurrents
                      </div>
                      <div className="font-title text-2xl font-bold">
                        {formatEuro(decision.competitorPrice)}
                      </div>
                      {decision.basisLabel ? (
                        <div className="text-xs text-white/80">{decision.basisLabel}</div>
                      ) : null}
                    </div>
                  ) : null}
                  {decision.advisorAnalysis != null ? (
                    <div className="bg-brand-deep px-4 py-3.5 text-white">
                      <div className="text-[0.62rem] font-semibold tracking-[0.14em] text-white/75 uppercase">
                        Analyse du conseiller
                      </div>
                      <div className="font-title text-2xl font-bold">
                        {formatEuro(decision.advisorAnalysis)}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {decision?.justification ? (
                <div className="border-l-4 border-brand-deep bg-brand-soft px-5 py-4">
                  <div className={`${kicker} text-brand-deep`}>Le point à retenir</div>
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
                    <div className={kicker}>Prix médian</div>
                    <div className={bigNumber}>{formatEuro(analysis.medianPrice)}</div>
                  </div>
                ) : null}
                {analysis.medianDaysOnMarket != null ? (
                  <div className={card}>
                    <div className={kicker}>Ancienneté médiane</div>
                    <div className={bigNumber}>
                      {formatNumber(analysis.medianDaysOnMarket)} jours
                    </div>
                  </div>
                ) : null}
                {analysis.droppedCount != null ? (
                  <div className={card}>
                    <div className={kicker}>Baisse de prix connue</div>
                    <div className={bigNumber}>
                      {analysis.droppedCount} sur {analysis.revealedCount}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {analysis && analysis.perSquareMeter.length > 0 ? (
              <div className={card}>
                <div className={`${kicker} mb-1`}>
                  Prix affichés au m², du moins cher au plus cher
                </div>
                {(() => {
                  const rows = [
                    ...analysis.perSquareMeter.map((item) => ({ ...item, median: false })),
                    ...(analysis.medianPerSquareMeter != null
                      ? [{ label: 'Médiane', value: analysis.medianPerSquareMeter, median: true }]
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
                      <b className="text-right">{formatEuroPerSquareMeter(item.value)}</b>
                    </div>
                  ));
                })()}
              </div>
            ) : null}
          </section>
        ) : null}

        {/* 06 · Le chemin de votre prix — « Après avoir vu le marché » et « Sur quel prix partons-nous ? ». */}
        <section className="flex flex-col gap-3">
          <SectionTitle
            number={sectionNumber('path')}
            title="Le chemin de votre prix"
            hint="Au début du rendez-vous, après avoir vu le marché, puis le prix retenu ensemble."
          />
          {steps.length > 0 ? (
            <div className="flex flex-col gap-2 break-inside-avoid sm:flex-row sm:items-stretch">
              {steps.map((step, index) => {
                const last = step.label === 'Convenu ensemble';
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
                            {alignment.label}
                          </span>
                        ) : null}
                      </div>
                      <div
                        className={`font-title text-[1.7rem] leading-tight font-bold ${
                          toneClass ? toneClass.text : last ? '' : 'text-brand-darker'
                        }`}
                      >
                        {formatEuro(step.value)}
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
            <div className="border-l-4 border-brand-deep bg-brand-soft px-5 py-3">
              <div className={`${kicker} text-brand-deep`}>Vos réponses face aux prix affichés</div>
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
                  <div className={kicker}>Prix convenu au m²</div>
                  <div className={bigNumber}>
                    {formatEuroPerSquareMeter(synthesis.agreedPricePerSquareMeter)}
                  </div>
                </div>
              ) : null}
              {synthesis.positionSentence ? (
                <div className={card}>
                  <div className={kicker}>Parmi les biens comparés</div>
                  <div className="font-title text-base font-bold text-brand-darker">
                    {synthesis.positionSentence}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {analysis && pathMarkers.length > 0 ? (
            <div className={card}>
              <div className={kicker}>Les étapes face aux prix affichés des biens regardés</div>
              <PriceBand prices={analysis.prices} markers={pathMarkers} />
            </div>
          ) : null}

          <footer className="mt-2 flex flex-col gap-2 break-inside-avoid">
            <p className="border-t border-zinc-200 pt-3 text-xs text-zinc-500">
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
        </section>
      </div>
    </article>
  );
}
