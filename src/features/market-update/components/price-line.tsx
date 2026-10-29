import { bandPosition } from '@/features/live-seller/services/market-reading';
import type { PriceLine } from '@/features/market-update/services/price-lines';
import type { PriceAlignment } from '@/features/price-positioning/services/price-alignment';
import { formatEuro } from '@/lib/format';

// Mission 127 — une ligne de prix graduée, à l'échelle commune des trois lignes : les prix des
// concurrents en points gris, les repères (plus bas, médiane, plus haut, le plus dangereux) et
// le prix du vendeur, seul en couleur (M116 : vert, orange, rouge face à l'analyse du conseiller ;
// sans analyse, la couleur de l'agence). Sur écran étroit, les libellés quittent la ligne pour une
// liste dessous. Affichage seulement.

export const ALIGNMENT_CLASSES = {
  green: { text: 'text-emerald-700', dot: 'bg-emerald-600', border: 'border-emerald-600' },
  orange: { text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-500' },
  red: { text: 'text-red-700', dot: 'bg-red-600', border: 'border-red-600' },
} as const;

type Marker = { key: string; label: string; value: number; tone: 'muted' | 'deep' | 'subject' };

export function PriceLineBand({
  line,
  scale,
  subjectLabel,
  alignment,
  compact = false,
}: {
  line: PriceLine;
  scale: { min: number; max: number };
  subjectLabel: string;
  alignment: PriceAlignment | null;
  compact?: boolean;
}) {
  const all = [scale.min, scale.max];
  const at = (value: number) => `${Math.round(bandPosition(value, all) * 1000) / 10}%`;
  const markers: Marker[] = [
    { key: 'lowest', label: 'Le plus bas', value: line.lowest, tone: 'muted' },
    { key: 'median', label: 'Prix médian', value: line.median, tone: 'muted' },
    { key: 'highest', label: 'Le plus haut', value: line.highest, tone: 'muted' },
    ...(line.dangerousPrice != null
      ? [
          {
            key: 'dangerous',
            label: 'Le plus dangereux, selon vous',
            value: line.dangerousPrice,
            tone: 'deep' as const,
          },
        ]
      : []),
    ...(line.subjectPrice != null
      ? [
          {
            key: 'subject',
            label: subjectLabel,
            value: line.subjectPrice,
            tone: 'subject' as const,
          },
        ]
      : []),
  ];
  const subjectClasses = alignment ? ALIGNMENT_CLASSES[alignment.tone] : null;
  const toneText = (tone: Marker['tone']) =>
    tone === 'subject'
      ? (subjectClasses?.text ?? 'text-brand-deep')
      : tone === 'deep'
        ? 'text-brand-deep'
        : 'text-zinc-500';
  const toneDot = (tone: Marker['tone']) =>
    tone === 'subject'
      ? (subjectClasses?.dot ?? 'bg-brand-deep')
      : tone === 'deep'
        ? 'bg-brand-deep'
        : 'bg-zinc-400';
  return (
    <div className="flex flex-col gap-1" data-testid="price-line">
      <div className={`relative mx-[6%] ${compact ? 'h-10' : 'h-16 sm:h-24'}`}>
        <div
          className={`absolute inset-x-0 h-[3px] bg-zinc-200 ${compact ? 'top-[1.1rem]' : 'top-[1.75rem] sm:top-[3.25rem]'}`}
        />
        {line.prices.map((price, index) => (
          <span
            key={`${price}-${index}`}
            className={`absolute h-3 w-3 -translate-x-1/2 rounded-full bg-zinc-400 ${compact ? 'top-[0.8rem]' : 'top-[1.45rem] sm:top-[2.95rem]'}`}
            style={{ left: at(price) }}
          />
        ))}
        {markers.map((marker, index) => {
          const below = index % 2 === 1;
          const strong = marker.tone !== 'muted';
          return (
            <div
              key={marker.key}
              className={`absolute flex -translate-x-1/2 flex-col items-center text-center leading-tight whitespace-nowrap ${toneText(marker.tone)} ${
                compact ? 'top-[0.5rem]' : below ? 'top-[2rem] sm:top-[3.5rem]' : 'top-0 sm:top-0'
              } ${compact ? 'text-[0.6rem]' : 'hidden text-[0.66rem] sm:flex'}`}
              style={{ left: at(marker.value) }}
            >
              {compact ? (
                <span
                  className={`h-4 w-4 rounded-full border-2 border-white ${toneDot(marker.tone)} ${strong ? '' : 'opacity-70'}`}
                  title={`${marker.label} : ${formatEuro(marker.value)}`}
                />
              ) : (
                <>
                  {below ? <span className={`mb-0.5 h-4 w-0.5 ${toneDot(marker.tone)}`} /> : null}
                  <span className={strong ? 'font-semibold' : ''}>{marker.label}</span>
                  <b>{formatEuro(marker.value)}</b>
                  {below ? null : <span className={`mt-0.5 h-4 w-0.5 ${toneDot(marker.tone)}`} />}
                </>
              )}
            </div>
          );
        })}
      </div>
      {/* Téléphone (et affichage compact) : les libellés en liste sous la ligne. */}
      <ul
        className={`flex flex-wrap gap-x-3 gap-y-0.5 text-[0.7rem] ${compact ? '' : 'sm:hidden'}`}
      >
        {markers.map((marker) => (
          <li key={marker.key} className={`flex items-center gap-1 ${toneText(marker.tone)}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${toneDot(marker.tone)}`} />
            {marker.label} <b>{formatEuro(marker.value)}</b>
          </li>
        ))}
      </ul>
      {!compact ? (
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{formatEuro(scale.min)}</span>
          <span>{formatEuro(scale.max)}</span>
        </div>
      ) : null}
    </div>
  );
}
