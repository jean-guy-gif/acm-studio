import { PositioningStatus } from '@/features/price-positioning/components/positioning-status';
import type { ConfidenceLevel } from '@/features/price-positioning/types/price-positioning';
import type {
  PositioningFreshness,
  SavedPricePositioning,
} from '@/features/price-positioning/types/saved-price-positioning';

const LEVEL_LABEL: Record<ConfidenceLevel, string> = {
  very_high: 'Très forte',
  high: 'Forte',
  medium: 'Moyenne',
  low: 'Faible',
};

function euro(value: number | null): string {
  return value != null ? `${value.toLocaleString('fr-FR')} €` : '—';
}

export function SavedPositioningCard({
  saved,
  freshness,
}: {
  saved: SavedPricePositioning;
  freshness: PositioningFreshness;
}) {
  return (
    <section className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-medium">Positionnement enregistré</h2>
        <PositioningStatus freshness={freshness} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <div className="text-xs text-zinc-500">Prix conseillé validé</div>
          <div className="font-medium">{euro(saved.advisorPrice)}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Prix vendeur</div>
          <div className="font-medium">{euro(saved.sellerPrice)}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500">Confiance</div>
          <div className="font-medium">
            {LEVEL_LABEL[saved.confidenceLevel]} ({saved.confidenceScore}/100)
          </div>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <div className="text-xs text-zinc-500">Fourchette enregistrée</div>
          <div className="font-medium">
            {euro(saved.rangeLow)} · {euro(saved.rangeCentral)} · {euro(saved.rangeHigh)}
          </div>
        </div>
      </div>

      {saved.justification ? (
        <div className="text-sm">
          <div className="text-xs text-zinc-500">Justification</div>
          <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {saved.justification}
          </p>
        </div>
      ) : null}

      <p className="text-xs text-zinc-500">
        Validé le {new Date(saved.validatedAt).toLocaleString('fr-FR')}
        {saved.validatedByName ? ` par ${saved.validatedByName}` : ''}.
      </p>
    </section>
  );
}
