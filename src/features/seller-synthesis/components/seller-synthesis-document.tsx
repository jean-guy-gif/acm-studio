import { guessGapSentence } from '@/features/seller-synthesis/services/build-seller-synthesis';
import type { SellerSynthesis } from '@/features/seller-synthesis/types';
import { formatEuro } from '@/lib/format';

// Mission 110 — la synthèse laissée au vendeur, une ou deux pages A4. Elle ne lit que le type
// `SellerSynthesis` (liste d'autorisation) : rien d'une annonce n'y entre.
const section = 'flex flex-col gap-2 break-inside-avoid';
const title = 'font-title text-lg font-semibold text-zinc-900';
const line = 'flex justify-between gap-4 border-b border-zinc-100 py-1.5 text-sm';

function meetingDay(value: string | null): string | null {
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

export function SellerSynthesisDocument({ synthesis }: { synthesis: SellerSynthesis }) {
  const { sellerSaid, market, decision, agency } = synthesis;
  const day = meetingDay(synthesis.meetingDate);
  const gap = guessGapSentence(sellerSaid.averageGuessGapPercent);
  const all = market.competitors.map((item) => item.price);
  const low = market.lowestPrice;
  const high = market.highestPrice;
  const position = (value: number) =>
    low != null && high != null && high > low
      ? `${Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100))}%`
      : '50%';
  const markers = [
    { label: 'Votre valeur perçue', value: sellerSaid.perceivedPrice },
    { label: 'Votre prix après le marché', value: sellerSaid.revisedPrice },
  ].filter((marker): marker is { label: string; value: number } => marker.value != null);

  return (
    <article
      className="mx-auto flex w-full max-w-[210mm] flex-col gap-6 bg-white p-8 text-zinc-800 print:p-0"
      data-testid="seller-synthesis"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-title text-2xl font-semibold text-zinc-900">
            Notre rendez-vous{day ? ` du ${day}` : ''}
          </h1>
          <p className="text-sm text-zinc-500">Pour {synthesis.sellerName}</p>
        </div>
        {agency.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agency.logoUrl}
            alt={agency.name}
            className="max-h-14 max-w-40 object-contain"
          />
        ) : (
          <span className="font-title text-lg font-semibold">{agency.name}</span>
        )}
      </header>

      <section className={section}>
        <h2 className={title}>Ce que vous nous avez dit</h2>
        {sellerSaid.perceivedPrice != null ? (
          <p className={line}>
            <span>Votre valeur perçue, en début de rendez-vous</span>
            <strong>{formatEuro(sellerSaid.perceivedPrice)}</strong>
          </p>
        ) : null}
        {sellerSaid.revisedPrice != null ? (
          <p className={line}>
            <span>Votre prix après avoir vu le marché</span>
            <strong>{formatEuro(sellerSaid.revisedPrice)}</strong>
          </p>
        ) : null}
        {gap ? <p className="text-sm">{gap}</p> : null}
      </section>

      {market.competitors.length > 0 ? (
        <section className={section}>
          <h2 className={title}>Le marché vu ensemble</h2>
          <p className="text-sm text-zinc-500">
            Les biens en vente que nous avons regardés, du moins cher au plus cher
            {market.medianPrice != null ? ` · prix médian ${formatEuro(market.medianPrice)}` : ''}.
          </p>
          <div className="relative my-3 h-2 rounded-full bg-zinc-200" data-synthesis-band>
            {all.map((price, index) => (
              <span
                key={`${price}-${index}`}
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-500"
                style={{ left: position(price) }}
              />
            ))}
            {markers.map((marker) => (
              <span
                key={marker.label}
                title={marker.label}
                className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 bg-emerald-600"
                style={{ left: position(marker.value) }}
              />
            ))}
          </div>
          <ul className="flex flex-col">
            {market.competitors.map((item, index) => (
              <li key={`${item.label}-${index}`} className={line}>
                <span>{item.label}</span>
                <span>{formatEuro(item.price)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {decision || synthesis.commercializationPrice != null ? (
        <section className={section}>
          {/* Mission 111 — les libellés du Live (M89) ; un montant absent n'a pas de ligne. */}
          <h2 className={title}>Les prix du rendez-vous</h2>
          {decision?.competitorPrice != null ? (
            <p className={line}>
              <span>Prix des concurrents</span>
              <strong>{formatEuro(decision.competitorPrice)}</strong>
            </p>
          ) : null}
          {decision?.advisorAnalysis != null ? (
            <p className={line}>
              <span>Analyse du conseiller</span>
              <strong>{formatEuro(decision.advisorAnalysis)}</strong>
            </p>
          ) : null}
          {decision?.justification ? (
            <p className="text-sm whitespace-pre-wrap">{decision.justification}</p>
          ) : null}
          {synthesis.commercializationPrice != null ? (
            <p className={line}>
              <span>Prix de commercialisation convenu ensemble</span>
              <strong>{formatEuro(synthesis.commercializationPrice)}</strong>
            </p>
          ) : null}
        </section>
      ) : null}

      <footer className="flex flex-col gap-1 border-t border-zinc-200 pt-4 text-xs text-zinc-600">
        <p className="font-semibold text-zinc-800">{agency.name}</p>
        {agency.advisorName ? (
          <p>
            Votre conseiller : {agency.advisorName}
            {agency.advisorPhone ? ` · ${agency.advisorPhone}` : ''}
            {agency.advisorEmail ? ` · ${agency.advisorEmail}` : ''}
          </p>
        ) : null}
        {agency.postalAddress ? <p>{agency.postalAddress}</p> : null}
        {agency.professionalCard && agency.professionalCardIssuer ? (
          <p>
            Carte professionnelle {agency.professionalCard} délivrée par{' '}
            {agency.professionalCardIssuer}
          </p>
        ) : null}
        <p>{agency.financialGuarantee?.trim() || 'Ne peut recevoir aucun fonds'}</p>
      </footer>
    </article>
  );
}
