import type { ConfidenceLevel } from '@/features/price-positioning/types/price-positioning';
import type { SavedPricePositioning } from '@/features/price-positioning/types/saved-price-positioning';
import type { PositioningStatus } from '@/features/seller-presentation/types/seller-presentation';

const LEVEL_LABEL: Record<ConfidenceLevel, string> = {
  very_high: 'Très forte',
  high: 'Forte',
  medium: 'Moyenne',
  low: 'Faible',
};

function euro(value: number | null): string {
  return value != null ? `${value.toLocaleString('fr-FR')} €` : '—';
}

// Read-only. The saved decision is shown as-is and is never replaced by the
// current calculation. An outdated decision is kept with a discreet notice.
export function LiveAdvisorDecisionSection({
  saved,
  positioningStatus,
}: {
  saved: SavedPricePositioning | null;
  positioningStatus: PositioningStatus;
}) {
  if (saved == null) {
    return (
      <p className="text-lg text-zinc-500">
        Aucune décision de positionnement n’a été enregistrée.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-sm text-zinc-500">Prix conseillé validé</div>
        <div className="text-3xl font-semibold">{euro(saved.advisorPrice)}</div>
      </div>

      <p className="text-lg">
        Fourchette enregistrée : {euro(saved.rangeLow)} · {euro(saved.rangeCentral)} ·{' '}
        {euro(saved.rangeHigh)}
      </p>
      <p className="text-lg">
        Confiance : {LEVEL_LABEL[saved.confidenceLevel]} ({saved.confidenceScore}/100)
      </p>

      {saved.justification ? (
        <div>
          <div className="text-sm text-zinc-500">Justification</div>
          <p className="whitespace-pre-wrap text-lg text-zinc-700 dark:text-zinc-300">
            {saved.justification}
          </p>
        </div>
      ) : null}

      <p className="text-sm text-zinc-500">
        Validé le {new Date(saved.validatedAt).toLocaleDateString('fr-FR')}
        {saved.validatedByName ? ` par ${saved.validatedByName}` : ''}.
      </p>

      {positioningStatus === 'outdated' ? (
        <p className="rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          Les données ont évolué depuis la validation de ce positionnement.
        </p>
      ) : null}
    </div>
  );
}
