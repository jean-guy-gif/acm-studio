import { card, sectionTitle } from '@/components/ui/styles';
import { describePricedComparable } from '@/features/comparable-analysis/services/describe-priced-comparable';
import type {
  DispersionLevel,
  PriceAnalysis,
} from '@/features/comparable-analysis/types/comparable-analysis';
import { formatEuro, formatPercent } from '@/lib/format';

const DISPERSION_LABEL: Record<DispersionLevel, string> = {
  faible: 'Faible dispersion',
  moyenne: 'Moyenne dispersion',
  forte: 'Forte dispersion',
};

export function ComparableAnalysisPrices({ priceAnalysis }: { priceAnalysis: PriceAnalysis }) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>Analyse des prix</h2>
      <p className="text-sm text-zinc-600 stage:text-white/65">
        Amplitude : {priceAnalysis.priceRange != null ? formatEuro(priceAnalysis.priceRange) : '—'}{' '}
        · Dispersion prix/m² :{' '}
        {priceAnalysis.dispersion ? DISPERSION_LABEL[priceAnalysis.dispersion] : '—'}
        {priceAnalysis.pricePerSquareMeterSpreadPercent != null
          ? ` (${formatPercent(priceAnalysis.pricePerSquareMeterSpreadPercent)})`
          : ''}
      </p>
      <ul className="text-sm text-zinc-600 stage:text-white/65">
        <li>
          Le moins cher :{' '}
          {priceAnalysis.cheapest ? describePricedComparable(priceAnalysis.cheapest) : '—'}
        </li>
        <li>
          Le plus cher :{' '}
          {priceAnalysis.mostExpensive
            ? describePricedComparable(priceAnalysis.mostExpensive)
            : '—'}
        </li>
        <li>Autour de la médiane : {priceAnalysis.aroundMedian.length} bien(s)</li>
      </ul>
    </section>
  );
}
