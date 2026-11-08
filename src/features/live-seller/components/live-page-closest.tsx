'use client';

import { RemoteImage } from '@/components/ui/remote-image';
import { useLiveTexts } from '@/features/live-seller/components/live-texts';
import {
  question,
  questionHint,
  screen,
  screenHead,
} from '@/features/live-seller/components/live-stage';
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
    // Mission 148 — la même grille compacte que le plus dangereux (planche 5).
    <div className={screen}>
      <div className={screenHead}>
        <h2 className={question}>{t.title}</h2>
        <p className={questionHint}>{t.hint}</p>
      </div>
      <div
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:landscape:grid-cols-3"
        data-closest-list
      >
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
              className={`grid grid-cols-[5.5rem_1fr] overflow-hidden rounded-xl border-2 bg-white text-left shadow-card transition-all select-none stage:bg-white/5 stage:shadow-none ${
                chosen
                  ? 'border-brand shadow-xl shadow-brand/25 stage:border-brand stage:bg-brand/15'
                  : 'border-zinc-200 hover:border-brand stage:border-white/15 stage:hover:border-brand'
              }`}
            >
              {entry.photoUrl ? (
                <RemoteImage
                  src={entry.photoUrl}
                  alt={label}
                  className="h-full min-h-24 w-full object-cover"
                  fallbackClassName="h-full min-h-24 w-full"
                  fallbackLabel={texts.common.photos.short}
                  eager
                />
              ) : (
                <div className="flex h-full min-h-24 items-center justify-center bg-zinc-50 text-xs text-zinc-500 stage:bg-white/5 stage:text-white/40">
                  {texts.common.photos.short}
                </div>
              )}
              <div className="flex min-w-0 flex-col gap-1 px-3 py-2">
                {chosen ? (
                  <span className="w-fit rounded-full bg-brand-deep px-3 py-1 text-xs font-semibold text-white stage:bg-white stage:text-brand-deep">
                    {t.badge}
                  </span>
                ) : null}
                <span className="font-title text-sm leading-snug font-semibold text-zinc-900 stage:text-white">
                  {label}
                </span>
                <span className="font-title text-lg font-bold text-brand-deep stage:text-white">
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
