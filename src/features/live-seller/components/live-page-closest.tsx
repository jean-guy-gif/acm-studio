'use client';

import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import { LivePhoto } from '@/features/live-seller/components/live-photo';
import { question, questionHint } from '@/features/live-seller/components/live-stage';
import type { AuthorizedSellerComparable } from '@/features/live-seller/services/project-live-for-seller';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { formatEuro } from '@/lib/format';

// Mission 131 — présentation directe : « Le concurrent le plus proche de votre bien », proposé par
// le CONSEILLER (rien n'est choisi d'avance, le choix reste facultatif). Le vendeur le voit mis en
// avant ; il n'a rien à répondre. Les biens montrés pendant la séance, avec leur prix affiché.
export function LivePageClosest({
  comparables,
  selectedId,
  busy,
  onPick,
}: {
  comparables: AuthorizedSellerComparable[];
  selectedId: string | null;
  busy: boolean;
  onPick: (comparableId: string | null) => void;
}) {
  const { language, texts } = useLiveTexts();
  const t = texts.live.closest;
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col gap-3">
        <h2 className={question}>{t.title}</h2>
        <p className={questionHint}>{t.hint}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-closest-list>
        {comparables.map((entry) => {
          const chosen = entry.id === selectedId;
          const label = neutralComparableLabel(entry, language);
          return (
            <button
              key={entry.id}
              type="button"
              disabled={busy}
              aria-pressed={chosen}
              onClick={() => onPick(chosen ? null : entry.id)}
              data-testid="closest-competitor"
              className={`flex flex-col overflow-hidden rounded-2xl border-2 bg-white text-left shadow-card transition-all select-none stage:bg-white/5 stage:shadow-none ${
                chosen
                  ? 'border-brand shadow-xl shadow-brand/25 stage:border-brand stage:bg-brand/15'
                  : 'border-zinc-200 hover:border-brand stage:border-white/15 stage:hover:border-brand'
              }`}
            >
              <LivePhoto photoUrl={entry.photoUrl} photoUrls={[]} alt={label} compact />
              <div className="flex flex-col gap-2 p-4">
                {chosen ? (
                  <span className="w-fit rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                    {t.badge}
                  </span>
                ) : null}
                <span className="font-title text-lg leading-snug font-semibold text-zinc-900 stage:text-white">
                  {label}
                </span>
                <span className="font-title text-2xl font-bold text-brand-deep stage:text-white">
                  {formatEuro(entry.price, { language })}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
