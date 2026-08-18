import { card, sectionTitle } from '@/components/ui/styles';
import type {
  AnalyzedComparable,
  DispersionLevel,
  SurfaceAnalysis,
} from '@/features/comparable-analysis/types/comparable-analysis';

const DISPERSION_LABEL: Record<DispersionLevel, string> = {
  faible: 'Faible dispersion',
  moyenne: 'Moyenne dispersion',
  forte: 'Forte dispersion',
};

function label(comparable: AnalyzedComparable): string {
  const title = comparable.title?.trim() || 'Bien concurrent';
  return `${title} — ${comparable.surfaceArea} m²`;
}

export function ComparableAnalysisSurfaces({
  surfaceAnalysis,
}: {
  surfaceAnalysis: SurfaceAnalysis;
}) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={sectionTitle}>Analyse des surfaces</h2>
      <p className="text-sm text-zinc-600 stage:text-white/65">
        Amplitude :{' '}
        {surfaceAnalysis.surfaceRange != null ? `${surfaceAnalysis.surfaceRange} m²` : '—'} ·
        Dispersion :{' '}
        {surfaceAnalysis.dispersion ? DISPERSION_LABEL[surfaceAnalysis.dispersion] : '—'}
        {surfaceAnalysis.surfaceSpreadPercent != null
          ? ` (${surfaceAnalysis.surfaceSpreadPercent} %)`
          : ''}
      </p>
      <ul className="text-sm text-zinc-600 stage:text-white/65">
        <li>Le plus petit : {surfaceAnalysis.smallest ? label(surfaceAnalysis.smallest) : '—'}</li>
        <li>Le plus grand : {surfaceAnalysis.largest ? label(surfaceAnalysis.largest) : '—'}</li>
        <li>
          Proches du bien vendeur (±10 %) : {surfaceAnalysis.nearSellerSurface.length} bien(s)
        </li>
      </ul>
    </section>
  );
}
