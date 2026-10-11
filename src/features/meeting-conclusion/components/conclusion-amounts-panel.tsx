import { card, metaLabel } from '@/components/ui/styles';
import {
  amountRows,
  conclusionGaps,
} from '@/features/meeting-conclusion/services/conclusion-amounts';
import type { ConclusionAmounts } from '@/features/meeting-conclusion/types';
import { formatEuro, formatPercent } from '@/lib/format';

const euro = (value: number | null): string =>
  value != null ? formatEuro(value) : 'Non renseigné';

const gapText = (amount: number | null, percentage: number | null): string => {
  if (amount == null || percentage == null) {
    return '—';
  }
  return `${formatEuro(amount, { signed: true })} (${formatPercent(percentage, { signed: true })})`;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-zinc-100 py-2 last:border-0 stage:border-white/10">
      <span className="text-sm text-zinc-500 stage:text-white/60">{label}</span>
      <span className="text-right font-title font-semibold text-zinc-900 stage:text-white">
        {value}
      </span>
    </div>
  );
}

// Mission 53 §3 — les quatre montants figés, nommés pour se distinguer, et les écarts du
// prix convenu. Rien n'est recalculé ici : on lit les faits, on affiche les écarts.
// Mission 94 — le chemin du vendeur pendant le rendez-vous : son prix en arrivant, puis celui
// qu'il a reformulé après avoir vu le marché (s'il l'a donné). Côté conseiller seulement.
export function ConclusionAmountsPanel({
  amounts,
  sellerPath = null,
}: {
  amounts: ConclusionAmounts;
  sellerPath?: { start: number | null; revised: number | null } | null;
}) {
  const showPath = sellerPath != null && (sellerPath.start != null || sellerPath.revised != null);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {showPath ? (
        <div className={`${card} flex flex-col gap-1 p-5 lg:col-span-2`} data-seller-path>
          <div className={`${metaLabel} mb-1`}>Le prix du vendeur pendant le rendez-vous</div>
          <Row label="Au début du rendez-vous" value={euro(sellerPath.start)} />
          {sellerPath.revised != null ? (
            <Row label="Après avoir vu le marché" value={euro(sellerPath.revised)} />
          ) : null}
        </div>
      ) : null}
      <div className={`${card} flex flex-col gap-1 p-5`}>
        <div className={`${metaLabel} mb-1`}>Les repères</div>
        {amountRows(amounts).map((row) => (
          <Row key={row.key} label={row.label} value={euro(row.value)} />
        ))}
      </div>
      <div className={`${card} flex flex-col gap-1 p-5`}>
        <div className={`${metaLabel} mb-1`}>Écarts du prix convenu</div>
        {conclusionGaps(amounts).map((g) => (
          <Row key={g.key} label={g.label} value={gapText(g.amount, g.percentage)} />
        ))}
      </div>
    </div>
  );
}
