import type { ListingHistory } from '@/features/comparable-import/types';

// Shows what ACM knows about a listing over time (Mission 47 §5). Rules held here:
//   - the source is ALWAYS named ("d'après SeLoger", "(Bien'ici)", "par ACM") — a
//     bare number of days a seller cannot trace does not defend itself;
//   - a LOWER BOUND is shown verbatim and NEVER converted to a number of days;
//   - the first ACM observation says "Vue par ACM depuis…", never "en vente depuis";
//   - a price change is a CONSTAT proposed to the advisor, with its two dates, never
//     written in silence.

const euro = (value: number): string => `${Math.round(value).toLocaleString('fr-FR')} €`;

const frDate = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
};

function AgeLine({ age }: { age: NonNullable<ListingHistory['age']> }) {
  if (age.kind === 'exact') {
    return (
      <p className="text-zinc-600 stage:text-white/65">
        En vente depuis le {frDate(age.publishedAt)} · {age.days} {age.days > 1 ? 'jours' : 'jour'}{' '}
        — d’après {age.source}.
      </p>
    );
  }
  if (age.kind === 'lowerBound') {
    return (
      <p className="text-zinc-600 stage:text-white/65">
        En vente depuis {age.label} ({age.source}).
      </p>
    );
  }
  return (
    <p className="text-zinc-600 stage:text-white/65">
      Vue par ACM depuis {age.days} {age.days > 1 ? 'jours' : 'jour'}.
    </p>
  );
}

export function ListingHistorySummary({
  history,
  viewCount,
  viewCountSince,
}: {
  history: ListingHistory | null | undefined;
  viewCount: number | null;
  viewCountSince: string | null;
}) {
  const age = history?.age ?? null;
  const change = history?.priceChange ?? null;
  if (!age && !change && viewCount == null) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3.5 text-sm stage:border-white/10 stage:bg-white/5">
      <p className="font-semibold text-zinc-700 stage:text-white/85">Historique</p>
      {age ? <AgeLine age={age} /> : null}
      {viewCount != null ? (
        <p className="text-zinc-600 stage:text-white/65">
          Vu {viewCount.toLocaleString('fr-FR')} fois
          {viewCountSince ? ` depuis le ${frDate(viewCountSince)}` : ''} (Green Acres).
        </p>
      ) : null}
      {change ? (
        <p className="font-medium text-amber-700 stage:text-amber-300">
          {change.amount >= 0 ? 'Baisse' : 'Hausse'} constatée par ACM : {euro(change.fromPrice)} le{' '}
          {frDate(change.fromDate)}, {euro(change.toPrice)} le {frDate(change.toDate)}, soit{' '}
          {change.amount >= 0 ? '−' : '+'}
          {euro(Math.abs(change.amount))} ({change.amount >= 0 ? '−' : '+'}
          {Math.abs(change.percentage)} %). À valider avant d’enregistrer.
        </p>
      ) : null}
    </div>
  );
}
