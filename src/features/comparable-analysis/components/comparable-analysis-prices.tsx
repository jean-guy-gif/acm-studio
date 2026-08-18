import { card, sectionTitle } from '@/components/ui/styles';
import type {
  AnalyzedComparable,
  DispersionLevel,
  PriceAnalysis,
} from '@/features/comparable-analysis/types/comparable-analysis';

const DISPERSION_LABEL: Record<DispersionLevel, string> = {
  faible: 'Faible dispersion',
  moyenne: 'Moyenne dispersion',
  forte: 'Forte dispersion',
};

function label(comparable: AnalyzedComparable): string {
  const title = comparable.title?.trim() || 'Bien concurrent';
  return `${title} — ${comparable.price.toLocaleString('fr-FR')} € (${comparable.pricePerSquareMeter.toLocaleString('fr-FR')} €/m²)`;
}

export function ComparableAnalysisPrices({ priceAnalysis }: { priceAnalysis: PriceAnalysis }) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>Analyse des prix</h2>
      <p className="text-sm text-zinc-600 stage:text-white/65">
        Amplitude :{' '}
        {priceAnalysis.priceRange != null
          ? `${priceAnalysis.priceRange.toLocaleString('fr-FR')} €`
          : '—'}{' '}
        · Dispersion prix/m² :{' '}
        {priceAnalysis.dispersion ? DISPERSION_LABEL[priceAnalysis.dispersion] : '—'}
        {priceAnalysis.pricePerSquareMeterSpreadPercent != null
          ? ` (${priceAnalysis.pricePerSquareMeterSpreadPercent} %)`
          : ''}
      </p>
      <ul className="text-sm text-zinc-600 stage:text-white/65">
        <li>Le moins cher : {priceAnalysis.cheapest ? label(priceAnalysis.cheapest) : '—'}</li>
        <li>
          Le plus cher : {priceAnalysis.mostExpensive ? label(priceAnalysis.mostExpensive) : '—'}
        </li>
        <li>Autour de la médiane : {priceAnalysis.aroundMedian.length} bien(s)</li>
      </ul>
    </section>
  );
}
