import { bandPosition } from '@/features/live-seller/services/market-reading';
import { placeLabels } from '@/features/market-update/services/label-levels';
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
  const RANK: Record<Marker['tone'], number> = { muted: 0, deep: 1, subject: 2 };
  // Un seul repère par prix, du plus bas au plus haut.
  const placed: Marker[] = [...markers]
    .sort((a, b) => a.value - b.value || RANK[b.tone] - RANK[a.tone])
    .reduce<Marker[]>((acc, marker) => {
      const last = acc[acc.length - 1];
      if (last && last.value === marker.value) {
        acc[acc.length - 1] = {
          key: `${last.key}+${marker.key}`,
          label: `${last.label} · ${marker.label}`,
          value: last.value,
          tone: RANK[last.tone] >= RANK[marker.tone] ? last.tone : marker.tone,
        };
        return acc;
      }
      return [...acc, marker];
    }, []);
  const slots = placeLabels(placed, scale);
  // La longueur du trait, par niveau (au-delà de 640 px) ; sur téléphone, un trait court.
  const TICK = ['sm:h-[0.75rem]', 'sm:h-[2.35rem]', 'sm:h-[3.95rem]'] as const;
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
      <div className={`relative mx-[6%] ${compact ? 'h-10' : 'h-16 sm:h-[11.5rem]'}`}>
        <div
          className={`absolute inset-x-0 h-[3px] bg-zinc-200 ${compact ? 'top-[1.1rem]' : 'top-[1.75rem] sm:top-[5.75rem]'}`}
        />
        {line.prices.map((price, index) => (
          <span
            key={`${price}-${index}`}
            className={`absolute h-3 w-3 -translate-x-1/2 rounded-full bg-zinc-400 ${compact ? 'top-[0.8rem]' : 'top-[1.45rem] sm:top-[5.45rem]'}`}
            style={{ left: at(price) }}
          />
        ))}
        {/* Les repères, du plus bas au plus haut, posés sur le premier niveau libre ; deux repères
            au même prix n'en font qu'un, le plus fort en tête ; près d'un bord, le libellé s'ancre
            du côté où il a la place (M115). Sous 640 px, seul le trait coloré reste sur la ligne,
            les libellés passent dans la liste dessous. */}
        {placed.map((marker, index) => {
          const { side, level, anchor } = slots[index];
          const below = side === 'below';
          const strong = marker.tone !== 'muted';
          const anchorClass =
            anchor === 'start'
              ? 'items-start text-left'
              : anchor === 'end'
                ? '-translate-x-full items-end text-right'
                : '-translate-x-1/2 items-center text-center';
          const tick = `w-0.5 h-4 ${TICK[level]} ${toneDot(marker.tone)}`;
          return (
            <div
              key={marker.key}
              className={`absolute flex flex-col leading-tight whitespace-nowrap ${anchorClass} ${toneText(marker.tone)} ${
                compact
                  ? 'top-[0.5rem]'
                  : below
                    ? 'top-[1.75rem] sm:top-[5.75rem]'
                    : 'bottom-[calc(100%-1.75rem)] sm:bottom-[calc(100%-5.75rem)]'
              } ${compact ? 'text-[0.6rem]' : 'text-[0.66rem]'}`}
              style={{ left: at(marker.value) }}
            >
              {compact ? (
                <span
                  className={`h-4 w-4 rounded-full border-2 border-white ${toneDot(marker.tone)} ${strong ? '' : 'opacity-70'}`}
                  title={`${marker.label} : ${formatEuro(marker.value)}`}
                />
              ) : (
                <>
                  {below ? <span className={`mb-0.5 ${tick}`} /> : null}
                  <span className={`hidden sm:block ${strong ? 'font-semibold' : ''}`}>
                    {marker.label}
                  </span>
                  <b className="hidden sm:block">{formatEuro(marker.value)}</b>
                  {below ? null : <span className={`mt-0.5 ${tick}`} />}
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
        {placed.map((marker) => (
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
