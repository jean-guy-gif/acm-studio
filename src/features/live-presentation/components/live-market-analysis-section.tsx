import type { ComparableAnalysis } from '@/features/comparable-analysis/types/comparable-analysis';

function euro(value: number | null): string {
  return value != null ? `${value.toLocaleString('fr-FR')} €` : '—';
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-xl font-medium">{value}</div>
    </div>
  );
}

const DISPERSION_LABEL: Record<string, string> = {
  faible: 'Faible',
  moyenne: 'Moyenne',
  forte: 'Forte',
};

// Read-only, synthesised market analysis — the essentials only, not the full
// Builder page.
export function LiveMarketAnalysisSection({ analysis }: { analysis: ComparableAnalysis | null }) {
  if (analysis == null) {
    return (
      <p className="text-lg text-zinc-500">Analyse indisponible : aucun comparable exploitable.</p>
    );
  }

  const { statistics, priceAnalysis, surfaceAnalysis } = analysis;
  const topCity = analysis.locationAnalysis.byCity[0];
  const topFeatures = analysis.featureAnalysis.features.slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="Comparables" value={String(statistics.count)} />
        <Metric label="Prix médian" value={euro(statistics.medianPrice)} />
        <Metric label="Prix moyen" value={euro(statistics.averagePrice)} />
        <Metric label="Prix médian au m²" value={euro(statistics.medianPricePerSquareMeter)} />
        <Metric label="Prix moyen au m²" value={euro(statistics.averagePricePerSquareMeter)} />
        <Metric
          label="Plage de prix"
          value={`${euro(statistics.minimumPrice)} – ${euro(statistics.maximumPrice)}`}
        />
        <Metric
          label="Dispersion prix/m²"
          value={priceAnalysis.dispersion ? DISPERSION_LABEL[priceAnalysis.dispersion] : '—'}
        />
        <Metric label="Comparables atypiques" value={String(analysis.outliers.length)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-sm text-zinc-500">Surfaces proches du bien vendeur (±10 %)</div>
          <div className="text-lg">{surfaceAnalysis.nearSellerSurface.length} bien(s)</div>
        </div>
        {topCity ? (
          <div>
            <div className="text-sm text-zinc-500">Localisation majoritaire</div>
            <div className="text-lg">
              {topCity.label} ({topCity.count})
            </div>
          </div>
        ) : null}
      </div>

      {topFeatures.length > 0 ? (
        <div>
          <div className="text-sm text-zinc-500">Caractéristiques fréquentes</div>
          <div className="text-lg">
            {topFeatures
              .map((f) => `${f.label} (${f.count}/${analysis.featureAnalysis.total})`)
              .join(' · ')}
          </div>
        </div>
      ) : null}
    </div>
  );
}
