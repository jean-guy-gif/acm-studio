'use client';

import { useEffect, useState } from 'react';

import {
  LIVE_BUYERS_FINANCING,
  liveBuyersTitle,
  type LiveBuyersReveal,
} from '@/features/live-seller/services/live-buyers';

// Mission 133 — le compteur caché du Live. Une pastille neutre — un point, sans chiffre ni texte —
// dans un coin de la scène, sur tous les écrans après l'introduction, à partir de 5 acquéreurs
// prêts (sous 5, la page ne la reçoit pas). Le conseiller la touche : une petite bulle, pour lui
// seul, dit le nombre et propose « Montrer au vendeur » ou « Fermer ». Montrer ouvre un écran plein
// — le titre, puis les cartes anonymes — et « Revenir au rendez-vous » rend le même écran du Live,
// sans rien changer à l'adresse ; les flèches du clavier sont suspendues pendant ce temps (comme
// « Revoir », M113). `onShow` note le moment sur le Live, en fond.
export function LiveBuyersBadge({
  reveal,
  onShow,
}: {
  reveal: LiveBuyersReveal;
  onShow: () => void;
}) {
  const [bubble, setBubble] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!shown) return;
    document.body.dataset.review = 'open';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShown(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      delete document.body.dataset.review;
      window.removeEventListener('keydown', onKey);
    };
  }, [shown]);

  return (
    <>
      <div
        className="fixed bottom-28 left-2 z-40 print:hidden"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <button
          type="button"
          aria-label="Acquéreurs de l’agence"
          aria-expanded={bubble}
          onClick={() => setBubble((open) => !open)}
          data-testid="live-buyers-dot"
          className="flex size-8 items-center justify-center rounded-full"
        >
          <span aria-hidden className="size-2.5 rounded-full bg-zinc-400/50 stage:bg-white/25" />
        </button>
        {bubble ? (
          <div
            role="dialog"
            aria-label="Acquéreurs de l’agence"
            data-testid="live-buyers-bubble"
            className="absolute bottom-full left-1 mb-1 flex w-48 flex-col gap-1.5 rounded-lg border border-zinc-200 bg-white p-2 text-zinc-800 shadow-lg"
          >
            <p className="text-xs font-semibold">{reveal.count} acquéreurs prêts</p>
            <button
              type="button"
              autoFocus
              onClick={() => {
                setBubble(false);
                setShown(true);
                onShow();
              }}
              className="rounded-md bg-brand px-2 py-1 text-xs font-semibold text-white hover:bg-brand-deep"
            >
              Montrer au vendeur
            </button>
            <button
              type="button"
              onClick={() => setBubble(false)}
              className="rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Fermer
            </button>
          </div>
        ) : null}
      </div>

      {shown ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="live-buyers-title"
          data-testid="live-buyers-screen"
          className="fixed inset-0 z-[55] overflow-y-auto bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-8 stage:bg-[#051826] stage:text-white"
        >
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
            <h2
              id="live-buyers-title"
              className="font-title text-3xl leading-tight font-bold text-brand-deep sm:text-4xl stage:text-white"
            >
              {liveBuyersTitle(reveal.count)}
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reveal.cards.map((card, index) => (
                <li
                  key={index}
                  data-testid="live-buyer-card"
                  className="flex flex-col gap-1.5 rounded-2xl border border-zinc-200 bg-white p-5 stage:border-white/10 stage:bg-white/5"
                >
                  <span className="font-title text-lg font-semibold">{card.sector}</span>
                  {card.budget ? (
                    <span className="text-base text-zinc-700 stage:text-white/80">
                      {card.budget}
                    </span>
                  ) : null}
                  <span className="text-sm font-semibold text-emerald-700 stage:text-emerald-300">
                    {LIVE_BUYERS_FINANCING}
                  </span>
                  <span className="text-sm text-zinc-500 stage:text-white/60">{card.since}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              autoFocus
              onClick={() => setShown(false)}
              data-testid="live-buyers-back"
              className="inline-flex min-h-12 items-center justify-center self-start rounded-xl bg-brand px-6 py-2.5 font-title text-base font-semibold text-white hover:bg-brand-deep"
            >
              Revenir au rendez-vous
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
