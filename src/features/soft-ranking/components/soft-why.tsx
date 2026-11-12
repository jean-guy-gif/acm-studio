import {
  mentionsLine,
  saysNothing,
  whyRows,
  whyTitle,
} from '@/features/soft-ranking/services/judgments';
import type { SimpleReason, SoftReasons } from '@/features/soft-ranking/types';

// Mission 151 (partie B) — la raison du rang, sur la carte d'un bien (planche 4), pour le conseiller
// seul : par critère, ✓ dit clairement, ≈ avec réserve, ? n'en dit rien, ✗ le contraire, avec les
// mots exacts de l'annonce. En classement simplifié (planche 4 b) : seulement les mots trouvés.

const MARK_TONE: Record<string, string> = {
  '✓': 'text-emerald-700 stage:text-emerald-300',
  '≈': 'text-amber-700 stage:text-amber-300',
  '?': 'text-zinc-500 stage:text-white/50',
  '✗': 'text-red-700 stage:text-red-300',
};

export function SoftWhy({
  reasons,
  rank,
  onOpen,
}: {
  reasons: SoftReasons | undefined;
  rank: number;
  // « Voir » : la fiche complète du bien (planche 4, sur la ligne qui ne dit rien).
  onOpen?: () => void;
}) {
  const box =
    'flex flex-col gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 stage:border-white/10 stage:bg-white/5';
  const title = 'text-xs font-extrabold uppercase tracking-wider text-brand-deep stage:text-brand';
  if (reasons == null) return null;
  if ('mentions' in reasons) {
    return (
      <div className={`${box} sm:flex-row sm:items-baseline sm:gap-3`} data-testid="soft-why">
        <span className={title}>Ce qui compte pour eux</span>
        <span className="text-sm text-zinc-600 stage:text-white/70">
          {mentionsLine(reasons.mentions)}
        </span>
      </div>
    );
  }
  if ('noText' in reasons || saysNothing(reasons.judgments)) {
    return (
      <div className={`${box} sm:flex-row sm:items-baseline sm:gap-3`} data-testid="soft-why">
        <span className={title}>{whyTitle(rank)}</span>
        <span className="text-sm text-zinc-600 stage:text-white/70">
          {'noText' in reasons
            ? 'Aucun texte d’annonce à lire pour ce qui compte pour eux'
            : 'L’annonce ne dit rien de ce qui compte pour eux'}
          {onOpen ? (
            <>
              {' · '}
              <button
                type="button"
                className="font-semibold text-brand-deep underline stage:text-brand"
                onClick={onOpen}
              >
                Voir
              </button>
            </>
          ) : null}
        </span>
      </div>
    );
  }
  return (
    <div className={box} data-testid="soft-why">
      <span className={title}>{whyTitle(rank)}</span>
      <ul className="flex flex-col gap-1">
        {whyRows(reasons.judgments).map((row) => (
          <li
            key={row.label}
            className="grid grid-cols-[1.25rem_1fr] gap-x-2 text-sm sm:grid-cols-[1.25rem_11rem_1fr]"
          >
            <span className={`text-center font-extrabold ${MARK_TONE[row.mark]}`} aria-hidden>
              {row.mark}
            </span>
            <b className="font-semibold text-zinc-900 stage:text-white">{row.label}</b>
            <span
              className={`col-start-2 sm:col-start-auto ${row.mark === '?' ? 'text-zinc-500 stage:text-white/50' : 'text-zinc-700 stage:text-white/80'}`}
            >
              {row.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Le bandeau au-dessus des biens (planches 4 et 4 b). `labels` : les critères doux de la fiche.
export function softBanner(
  state: { mode: 'full' } | { mode: 'simple'; reason: SimpleReason },
  labels: readonly string[],
): { strong: string; text: string } {
  if (state.mode === 'full') {
    return {
      strong: 'ce qui compte pour eux',
      text: ` — ${labels.join(', ')} —, puis par ressemblance, puis par prix. Aucun bien n’est écarté pour ces critères.`,
    };
  }
  switch (state.reason) {
    case 'before':
      return {
        strong: 'Classement simplifié',
        text: ' jusqu’à la recherche du marché : les biens de l’agence sont rangés par ressemblance, puis par prix. Au lancement de la recherche, leurs annonces sont lues pour ce qui compte pour eux, avec celles du marché.',
      };
    case 'failed':
      return {
        strong: 'Classement simplifié',
        text: ' : la lecture des annonces n’a pas abouti à temps. Les biens sont rangés par ressemblance, puis par prix ; aucun n’est écarté.',
      };
    case 'budget':
      return { strong: 'Classement simplifié', text: ' : budget de lecture du mois atteint.' };
    default:
      return { strong: 'Classement simplifié', text: '' };
  }
}

export function SoftBanner({
  state,
  labels,
}: {
  state: { mode: 'full' } | { mode: 'simple'; reason: SimpleReason };
  labels: readonly string[];
}) {
  const { strong, text } = softBanner(state, labels);
  return (
    <p
      className={`rounded-xl border border-zinc-200 border-l-4 bg-white px-4 py-2.5 text-sm text-zinc-700 stage:border-white/10 stage:bg-white/5 stage:text-white/80 ${state.mode === 'full' ? 'border-l-brand-deep' : 'border-l-zinc-400'}`}
      data-testid="soft-banner"
    >
      {state.mode === 'full' ? 'Rangés par ' : null}
      <b>{strong}</b>
      {text}
    </p>
  );
}
