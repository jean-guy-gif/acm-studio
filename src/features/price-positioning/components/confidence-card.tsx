import { card, hintText, sectionTitle } from '@/components/ui/styles';
import type {
  ConfidenceLevel,
  PositioningConfidence,
} from '@/features/price-positioning/types/price-positioning';

const LEVEL_LABEL: Record<ConfidenceLevel, string> = {
  very_high: 'Très forte',
  high: 'Forte',
  medium: 'Moyenne',
  low: 'Faible',
};

export function ConfidenceCard({ confidence }: { confidence: PositioningConfidence }) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>Indice de confiance</h2>
      <p className="text-sm text-zinc-600 stage:text-white/65">
        Niveau : <span className="font-medium">{LEVEL_LABEL[confidence.level]}</span> · Score :{' '}
        {confidence.score} / 100
      </p>
      <p className="text-xs text-zinc-400 stage:text-white/40">
        Grille métier indicative sur la qualité des données — jamais une garantie.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 stage:text-white/80">
            Facteurs positifs
          </h3>
          {confidence.positiveFactors.length === 0 ? (
            <p className={hintText}>Aucun.</p>
          ) : (
            <ul className="text-sm text-zinc-600 stage:text-white/65">
              {confidence.positiveFactors.map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-700 stage:text-white/80">
            Points de vigilance
          </h3>
          {confidence.warningFactors.length === 0 ? (
            <p className={hintText}>Aucun.</p>
          ) : (
            <ul className="text-sm font-medium text-amber-700 stage:text-amber-300">
              {confidence.warningFactors.map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
