import type {
  ConfidenceLevel,
  DispersionLevel,
  PricePositioning,
} from '@/features/price-positioning/types/price-positioning';

const LEVEL_LABEL: Record<ConfidenceLevel, string> = {
  very_high: 'Très forte',
  high: 'Forte',
  medium: 'Moyenne',
  low: 'Faible',
};
const DISPERSION_LABEL: Record<DispersionLevel, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Forte',
};

function euro(value: number | null | undefined): string {
  return value != null ? `${value.toLocaleString('fr-FR')} €` : '—';
}

// Read-only. "Positionnement de marché observé" — never presented as an imposed
// automatic price.
export function LivePricePositioningSection({
  positioning,
}: {
  positioning: PricePositioning | null;
}) {
  if (
    positioning == null ||
    positioning.status !== 'ready' ||
    positioning.recommendedRange == null
  ) {
    return (
      <p className="text-lg text-zinc-500">
        Positionnement indisponible : données insuffisantes pour le calculer.
      </p>
    );
  }

  const range = positioning.recommendedRange;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-500">Positionnement de marché observé</p>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-sm text-zinc-500">Borne basse</div>
          <div className="text-2xl font-medium">{euro(range.low)}</div>
        </div>
        <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="text-sm text-zinc-500">Valeur centrale observée</div>
          <div className="text-2xl font-semibold">{euro(range.central)}</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-sm text-zinc-500">Borne haute</div>
          <div className="text-2xl font-medium">{euro(range.high)}</div>
        </div>
      </div>

      <p className="text-lg">
        Dispersion : {DISPERSION_LABEL[range.dispersion]} · Confiance :{' '}
        {LEVEL_LABEL[positioning.confidence.level]} ({positioning.confidence.score}/100)
      </p>

      {positioning.reasons.length > 0 ? (
        <div>
          <div className="text-sm text-zinc-500">Éléments factuels</div>
          <ul className="list-inside list-disc text-lg text-zinc-700 dark:text-zinc-300">
            {positioning.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
