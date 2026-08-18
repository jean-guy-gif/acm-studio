import { card, metaLabel, sectionTitle } from '@/components/ui/styles';
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
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <div className="flex items-center justify-between gap-4">
        <h2 className={sectionTitle}>Positionnement enregistré</h2>
        <PositioningStatus freshness={freshness} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <div className={metaLabel}>Prix conseillé validé</div>
          <div className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
            {euro(saved.advisorPrice)}
          </div>
        </div>
        <div>
          <div className={metaLabel}>Prix vendeur</div>
          <div className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
            {euro(saved.sellerPrice)}
          </div>
        </div>
        <div>
          <div className={metaLabel}>Confiance</div>
          <div className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
            {LEVEL_LABEL[saved.confidenceLevel]} ({saved.confidenceScore}/100)
          </div>
        </div>
        <div className="col-span-2 sm:col-span-3">
          <div className={metaLabel}>Fourchette enregistrée</div>
          <div className="font-title text-lg font-semibold text-zinc-900 stage:text-white">
            {euro(saved.rangeLow)} · {euro(saved.rangeCentral)} · {euro(saved.rangeHigh)}
          </div>
        </div>
      </div>

      {saved.justification ? (
        <div className="text-sm">
          <div className={metaLabel}>Justification</div>
          <p className="whitespace-pre-wrap text-zinc-700 stage:text-white/75">
            {saved.justification}
          </p>
        </div>
      ) : null}

      <p className="text-xs text-zinc-400 stage:text-white/40">
        Validé le {new Date(saved.validatedAt).toLocaleString('fr-FR')}
        {saved.validatedByName ? ` par ${saved.validatedByName}` : ''}.
      </p>
    </section>
  );
}
