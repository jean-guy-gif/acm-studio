import { hintText, metaLabel, sectionTitle } from '@/components/ui/styles';
import type { MarketGlance } from '@/features/before-meeting/services/market-glance';
import { formatEuro, formatEuroPerSquareMeter, formatNumber } from '@/lib/format';

const figure = 'font-title text-xl font-bold text-brand-deep stage:text-white';

// Mission 91 — « Le marché en un coup d'œil ». Un chiffre qui manque ne s'affiche pas.
export function MarketGlanceCard({ glance }: { glance: MarketGlance }) {
  const count = glance.competitorCount;
  const figures: { label: string; value: string }[] = [];
  if (glance.medianPricePerSquareMeter != null) {
    figures.push({
      label: 'Prix médian au m²',
      value: formatEuroPerSquareMeter(glance.medianPricePerSquareMeter),
    });
  }
  if (glance.lowestPrice != null && glance.highestPrice != null) {
    figures.push({
      label: 'Prix affichés',
      value:
        glance.lowestPrice === glance.highestPrice
          ? formatEuro(glance.lowestPrice)
          : `${formatEuro(glance.lowestPrice)} à ${formatEuro(glance.highestPrice)}`,
    });
  }
  if (glance.medianDaysOnMarket != null) {
    figures.push({
      label: 'Ancienneté médiane',
      value: `${formatNumber(glance.medianDaysOnMarket)} jour${glance.medianDaysOnMarket > 1 ? 's' : ''}`,
    });
  }
  if (glance.droppedCount != null) {
    figures.push({ label: 'Ont déjà baissé', value: `${glance.droppedCount} sur ${count}` });
  }

  const first = glance.dots[0];
  const last = glance.dots[glance.dots.length - 1];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className={sectionTitle}>Le marché en un coup d’œil</h2>
        <p className={hintText}>
          {count === 0
            ? 'Aucun concurrent retenu pour l’instant.'
            : count === 1
              ? 'Le concurrent retenu, tel que le vendeur le découvrira.'
              : `Les ${count} concurrents retenus, tels que le vendeur les découvrira.`}
        </p>
      </div>

      {figures.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {figures.map((entry) => (
            <div key={entry.label} className="flex flex-col gap-0.5">
              <dd className={figure}>{entry.value}</dd>
              <dt className={metaLabel}>{entry.label}</dt>
            </div>
          ))}
        </dl>
      ) : null}

      {glance.dots.length > 1 && first && last ? (
        <div className="flex flex-col gap-2">
          <span className={metaLabel}>Prix au m² des concurrents</span>
          <div className="px-2">
            <div className="relative h-8">
              <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-300 stage:bg-white/25" />
              {glance.medianPosition != null ? (
                <div
                  className="absolute top-0 h-full w-0.5 -translate-x-1/2 bg-brand"
                  style={{ left: `${glance.medianPosition * 100}%` }}
                  title="Médiane"
                />
              ) : null}
              {glance.dots.map((dot) => (
                <span
                  key={dot.id}
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-deep stage:border-zinc-900 stage:bg-white"
                  style={{ left: `${dot.position * 100}%` }}
                  title={formatEuroPerSquareMeter(dot.pricePerSquareMeter)}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-between gap-3 text-xs text-zinc-500 stage:text-white/50">
            <span>{formatEuroPerSquareMeter(first.pricePerSquareMeter)}</span>
            <span>Trait : la médiane</span>
            <span>{formatEuroPerSquareMeter(last.pricePerSquareMeter)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
