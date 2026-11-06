'use client';

import { useEffect, useState } from 'react';

import { stageGlow, stageGlowLayer } from '@/features/live-seller/components/live-stage';
import {
  LIVE_BUYERS_FINANCING,
  LIVE_BUYERS_PHRASE,
  LIVE_BUYERS_PROMISE,
  type LiveBuyersReveal,
} from '@/features/live-seller/services/live-buyers';

// Mission 133 — le compteur caché du Live. Une pastille neutre — un point, sans chiffre ni texte —
// dans la barre du bas, à côté de « Précédent » (essai de Jean-Guy, 06/11), sur tous les écrans
// après l'introduction, à partir de 5 acquéreurs prêts (sous 5, la page ne la reçoit pas). Le
// conseiller la touche : une petite bulle, pour lui seul, dit le nombre et propose « Montrer au
// vendeur » ou « Fermer ».
export function LiveBuyersDot({ count, onShow }: { count: number; onShow: () => void }) {
  const [bubble, setBubble] = useState(false);
  return (
    <span className="relative inline-flex print:hidden">
      <button
        type="button"
        aria-label="Acquéreurs de l’agence"
        aria-expanded={bubble}
        onClick={() => setBubble((open) => !open)}
        data-testid="live-buyers-dot"
        className="flex size-9 items-center justify-center rounded-full"
      >
        <span aria-hidden className="size-2.5 rounded-full bg-zinc-400/50 stage:bg-white/25" />
      </button>
      {bubble ? (
        <span
          role="dialog"
          aria-label="Acquéreurs de l’agence"
          data-testid="live-buyers-bubble"
          className="absolute bottom-full left-0 mb-2 flex w-48 flex-col gap-1.5 rounded-lg border border-zinc-200 bg-white p-2 text-zinc-800 shadow-lg"
        >
          <span className="text-xs font-semibold">{count} acquéreurs prêts</span>
          <button
            type="button"
            autoFocus
            onClick={() => {
              setBubble(false);
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
        </span>
      ) : null}
    </span>
  );
}

// « Montrer au vendeur » : un écran plein, dans le style du Live — le chiffre en très grand, la
// phrase, les cartes anonymes lisibles à deux mètres, puis la phrase du conseiller. « Revenir au
// rendez-vous » rend le même écran du Live, sans rien changer à l'adresse ; les flèches du clavier
// sont suspendues pendant ce temps (comme « Revoir », M113).
export function LiveBuyersScreen({
  reveal,
  onClose,
}: {
  reveal: LiveBuyersReveal;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.dataset.review = 'open';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      delete document.body.dataset.review;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-buyers-title"
      data-testid="live-buyers-screen"
      className="fixed inset-0 z-[55] overflow-y-auto bg-white text-zinc-900 stage:bg-gradient-to-br stage:from-brand-deep stage:via-brand-darker stage:to-brand-darkest stage:text-white"
    >
      <div className={stageGlowLayer} aria-hidden>
        <div className={stageGlow} />
      </div>
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
        <h2 id="live-buyers-title" className="flex flex-col gap-3">
          <span
            data-testid="live-buyers-count"
            className="font-title text-[7rem] leading-none font-bold tracking-tight text-brand-deep sm:text-[9rem] stage:text-white"
          >
            {reveal.count}
          </span>
          <span className="font-title max-w-4xl text-4xl leading-[1.1] font-bold tracking-tight text-brand-deep sm:text-5xl stage:text-white">
            {LIVE_BUYERS_PHRASE}
          </span>
        </h2>
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reveal.cards.map((card, index) => (
            <li
              key={index}
              data-testid="live-buyer-card"
              className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-card sm:p-7 stage:border-white/15 stage:bg-white/10 stage:shadow-none"
            >
              <span className="font-title text-2xl leading-tight font-bold sm:text-3xl">
                {card.sector}
              </span>
              {card.budget ? (
                <span className="font-title text-3xl font-bold text-brand-deep sm:text-4xl stage:text-brand">
                  {card.budget}
                </span>
              ) : null}
              <span className="text-xl font-semibold text-emerald-700 sm:text-2xl stage:text-emerald-300">
                {LIVE_BUYERS_FINANCING}
              </span>
              <span className="text-lg text-zinc-600 sm:text-xl stage:text-white/75">
                {card.since}
              </span>
            </li>
          ))}
        </ul>
        <p
          data-testid="live-buyers-promise"
          className="font-title text-2xl leading-snug font-semibold text-zinc-800 sm:text-3xl stage:text-white"
        >
          {LIVE_BUYERS_PROMISE}
        </p>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          data-testid="live-buyers-back"
          className="inline-flex min-h-12 items-center justify-center self-start rounded-xl border border-zinc-300 bg-white px-6 py-2.5 font-title text-base font-semibold text-zinc-700 hover:border-brand hover:text-brand-deep stage:border-white/25 stage:bg-white/5 stage:text-white/90 stage:hover:bg-white/15"
        >
          Revenir au rendez-vous
        </button>
      </div>
    </div>
  );
}
