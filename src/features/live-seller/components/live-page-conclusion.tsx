import { DANGEROUS_REASON_LABELS, type DangerousReason } from '@/features/live-seller/constants';
import type { LiveComparativeData } from '@/features/seller-presentation/types/seller-presentation';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-2 text-sm last:border-0 dark:border-zinc-800">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function LivePageConclusion({ live }: { live: LiveComparativeData }) {
  const summary = live.sellerSummary;
  const dangerous = live.comparables.find(
    (c) => c.id === summary?.seller_most_dangerous_comparable_id,
  );
  const decision = live.advisorDecision;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold">Conclusion</h2>
      <div className="rounded-card border border-zinc-200 p-4 dark:border-zinc-800">
        <Line
          label="Valeur perçue par le vendeur"
          value={euro(summary?.seller_perceived_property_price ?? null)}
        />
        <Line
          label="Positionnement observé sur le marché concurrentiel"
          value={euro(live.competitiveMarketCentral)}
        />
        <Line
          label="Analyse comparative de marché du conseiller"
          value={euro(summary?.advisor_comparative_market_price ?? null)}
        />
        <Line label="Prix conseillé (validé)" value={euro(decision?.advisorPrice ?? null)} />
        <Line
          label="Prix souhaité par le vendeur (enregistré)"
          value={euro(decision?.sellerPrice ?? null)}
        />
        <Line
          label="Concurrent le plus dangereux"
          value={
            dangerous
              ? `${dangerous.title ?? 'Bien concurrent'}${
                  summary?.seller_most_dangerous_reason
                    ? ` — ${DANGEROUS_REASON_LABELS[summary.seller_most_dangerous_reason as DangerousReason]}`
                    : ''
                }`
              : 'Non sélectionné'
          }
        />
      </div>
      {decision?.justification ? (
        <div className="text-sm">
          <div className="text-xs text-zinc-500">Justification du conseiller</div>
          <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {decision.justification}
          </p>
        </div>
      ) : null}
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
        Le marché concurrentiel montre à quels biens votre logement sera comparé. L’analyse
        comparative du conseiller détermine le positionnement professionnel proposé.
      </p>
    </div>
  );
}
