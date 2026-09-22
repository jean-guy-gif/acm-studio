import { card, metaLabel } from '@/components/ui/styles';
import {
  amountRows,
  conclusionGaps,
} from '@/features/meeting-conclusion/services/conclusion-amounts';
import type { ConclusionAmounts } from '@/features/meeting-conclusion/types';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : 'Non renseigné';

const gapText = (amount: number | null, percentage: number | null): string => {
  if (amount == null || percentage == null) {
    return '—';
  }
  const sign = amount >= 0 ? '+' : '';
  return `${sign}${amount.toLocaleString('fr-FR')} € (${sign}${percentage} %)`;
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
export function ConclusionAmountsPanel({ amounts }: { amounts: ConclusionAmounts }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={`${card} flex flex-col gap-1 p-5`}>
        <div className={`${metaLabel} mb-1`}>Les quatre repères</div>
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
