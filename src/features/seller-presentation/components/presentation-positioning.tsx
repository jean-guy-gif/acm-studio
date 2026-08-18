import { card, hintText, sectionTitle, softPanel } from '@/components/ui/styles';
import type {
  ConfidenceLevel,
  PricePositioning,
} from '@/features/price-positioning/types/price-positioning';
import type { SavedPricePositioning } from '@/features/price-positioning/types/saved-price-positioning';
import type { PositioningStatus } from '@/features/seller-presentation/types/seller-presentation';

const LEVEL_LABEL: Record<ConfidenceLevel, string> = {
  very_high: 'Très forte',
  high: 'Forte',
  medium: 'Moyenne',
  low: 'Faible',
};

const STATUS_LABEL: Record<PositioningStatus, string> = {
  not_saved: 'Aucune décision enregistrée',
  up_to_date: 'À jour',
  outdated: 'À actualiser',
};

function euro(value: number | null | undefined): string {
  return value != null ? `${value.toLocaleString('fr-FR')} €` : '—';
}

export function PresentationPositioning({
  current,
  saved,
  positioningStatus,
}: {
  current: PricePositioning | null;
  saved: SavedPricePositioning | null;
  positioningStatus: PositioningStatus;
}) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>Positionnement prix</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Current calculation */}
        <div className={`${softPanel} flex flex-col gap-2 p-3.5`}>
          <h3 className="text-sm font-semibold text-zinc-700 stage:text-white/80">
            Calcul courant
          </h3>
          {current && current.status === 'ready' && current.recommendedRange ? (
            <div className="text-sm text-zinc-600 stage:text-white/65">
              <p>
                Fourchette : {euro(current.recommendedRange.low)} ·{' '}
                {euro(current.recommendedRange.central)} · {euro(current.recommendedRange.high)}
              </p>
              <p>
                Confiance : {LEVEL_LABEL[current.confidence.level]} ({current.confidence.score}/100)
              </p>
            </div>
          ) : (
            <p className={hintText}>Positionnement indisponible (données insuffisantes).</p>
          )}
        </div>

        {/* Saved decision — separate, never replaced by the current calc */}
        <div className={`${softPanel} flex flex-col gap-2 p-3.5`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-700 stage:text-white/80">
              Décision enregistrée
            </h3>
            <span className="text-xs font-medium text-zinc-400 stage:text-white/45">
              {STATUS_LABEL[positioningStatus]}
            </span>
          </div>
          {saved ? (
            <div className="text-sm text-zinc-600 stage:text-white/65">
              <p>Prix conseillé validé : {euro(saved.advisorPrice)}</p>
              <p>Prix vendeur : {euro(saved.sellerPrice)}</p>
              <p>
                Fourchette : {euro(saved.rangeLow)} · {euro(saved.rangeCentral)} ·{' '}
                {euro(saved.rangeHigh)}
              </p>
              <p>
                Confiance : {LEVEL_LABEL[saved.confidenceLevel]} ({saved.confidenceScore}/100) ·
                Moteur v{saved.snapshot.engineVersion}
              </p>
              {saved.justification ? <p>Justification : {saved.justification}</p> : null}
              <p className="text-xs text-zinc-400 stage:text-white/40">
                Validé le {new Date(saved.validatedAt).toLocaleString('fr-FR')}
                {saved.validatedByName ? ` par ${saved.validatedByName}` : ''}.
              </p>
            </div>
          ) : (
            <p className={hintText}>Aucune décision enregistrée.</p>
          )}
        </div>
      </div>
    </section>
  );
}
