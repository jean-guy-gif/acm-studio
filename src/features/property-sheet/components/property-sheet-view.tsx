'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { badgeBrand, hintText, link } from '@/components/ui/styles';
import { budgetGap } from '@/features/buyers/services/buyer-journey';
import type { PropertySheet } from '@/features/property-sheet/services/property-sheet';
import { formatEuro } from '@/lib/format';
import { displayPhotoUrl } from '@/lib/photo-url';

// Mission 152 (partie B) — la fiche complète d'un bien (maquette M152-5) : pour le conseiller SEUL.
// Panneau à droite sur ordinateur, plein écran sur tablette et téléphone ; le carrousel (glisser au
// doigt, flèches, flèches du clavier, « 1 / 20 », vignettes), le prix et ses dates, la raison de son
// rang quand l'écran la connaît, toutes les caractéristiques connues, le texte complet, « Voir
// l'annonce en ligne ↗ » ; en bas, la barre que l'écran lui donne (« Retenir ce bien »). Échap ou
// « ← » la ferment ; le focus revient où il était.

export type SheetState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; sheet: PropertySheet };

const SWIPE_PX = 40;

function Carousel({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState<Set<number>>(() => new Set());
  const start = useRef<number | null>(null);
  const count = photos.length;
  const go = (delta: number) => setIndex((current) => (current + delta + count) % count);
  if (count === 0) {
    return (
      <div
        className="flex h-60 w-full items-center justify-center bg-zinc-100 text-sm text-zinc-500 lg:h-72"
        data-testid="sheet-no-photo"
      >
        Aucune photo
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative h-60 w-full touch-pan-y overflow-hidden bg-zinc-200 select-none sm:h-80 lg:h-72"
        data-testid="sheet-carousel"
        onPointerDown={(event) => {
          start.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (start.current == null) return;
          const dx = event.clientX - start.current;
          start.current = null;
          if (Math.abs(dx) >= SWIPE_PX) go(dx < 0 ? 1 : -1);
        }}
      >
        {broken.has(index) ? null : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photos[index]}
            src={displayPhotoUrl(photos[index])}
            alt={`Photo ${index + 1} sur ${count}`}
            draggable={false}
            className="h-full w-full object-cover"
            onError={() => setBroken((current) => new Set([...current, index]))}
          />
        )}
        {count > 1 ? (
          <>
            <button
              type="button"
              aria-label="Photo précédente"
              className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-zinc-800 shadow"
              onClick={() => go(-1)}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Photo suivante"
              className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-zinc-800 shadow"
              onClick={() => go(1)}
            >
              ›
            </button>
          </>
        ) : null}
        <span
          className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white"
          data-testid="sheet-photo-count"
        >
          {index + 1} / {count}
        </span>
      </div>
      {count > 1 ? (
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 lg:px-5" data-testid="sheet-thumbs">
          {photos.map((photo, position) => (
            <button
              key={`${photo}-${position}`}
              type="button"
              aria-label={`Voir la photo ${position + 1}`}
              aria-current={position === index}
              className={`h-12 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-200 ${position === index ? 'ring-2 ring-brand-deep' : 'opacity-80'}`}
              onClick={() => setIndex(position)}
            >
              {broken.has(position) ? null : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayPhotoUrl(photo)}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={() => setBroken((current) => new Set([...current, position]))}
                />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PropertySheetView({
  state,
  onClose,
  backLabel,
  budgetMax = null,
  rankLine = null,
  footer = null,
}: {
  state: SheetState;
  onClose: () => void;
  // « Leurs biens idéaux », « Sa sélection », « Proposer ce bien » : où « ← » ramène.
  backLabel: string;
  // Le budget plafond de l'acquéreur, pour l'écart (vert dans le budget, orange au-dessus, M122 B).
  budgetMax?: number | null;
  // Ce que l'écran sait du rang du bien (« Correspondance forte · 8 critères sur 8 »).
  rankLine?: string | null;
  footer?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  const sheet = state.status === 'ready' ? state.sheet : null;
  const gap = sheet ? budgetGap(sheet.price, budgetMax) : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="property-sheet-layer">
      <button
        type="button"
        aria-label="Fermer la fiche"
        tabIndex={-1}
        className="absolute inset-0 hidden bg-zinc-900/40 lg:block"
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={sheet ? `Fiche complète\u00a0: ${sheet.label}` : 'Fiche complète'}
        tabIndex={-1}
        data-testid="property-sheet"
        className="relative flex h-dvh w-full flex-col bg-white shadow-2xl outline-none lg:w-[600px]"
        onKeyDown={(event) => {
          // Tab reste dans la fiche : la page derrière n'est pas atteignable tant qu'elle est ouverte.
          if (event.key === 'Tab') {
            const focusable = [
              ...(panel.current?.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
              ) ?? []),
            ];
            const first = focusable[0];
            const last = focusable.at(-1);
            if (first && last) {
              const active = document.activeElement;
              if (event.shiftKey && (active === first || active === panel.current)) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
              }
            }
            return;
          }
          // Les flèches du clavier passent les photos (le carrousel les écoute par ses boutons).
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          const target = event.target as HTMLElement;
          if (target.closest('input, textarea, select')) return;
          const button = panel.current?.querySelector<HTMLButtonElement>(
            `[aria-label="${event.key === 'ArrowLeft' ? 'Photo précédente' : 'Photo suivante'}"]`,
          );
          if (button) {
            event.preventDefault();
            button.click();
          }
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 lg:px-5">
          <button
            type="button"
            className={`${link} text-sm font-semibold`}
            onClick={onClose}
            data-testid="sheet-close"
          >
            ← {backLabel}
          </button>
          {sheet ? (
            <span className={badgeBrand} data-testid="sheet-origin">
              {sheet.originLabel}
            </span>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {state.status === 'loading' ? (
            <p className={`${hintText} p-5`} role="status">
              Ouverture de la fiche…
            </p>
          ) : state.status === 'error' ? (
            <p role="alert" className="p-5 text-sm font-semibold text-red-700">
              {state.error}
            </p>
          ) : sheet ? (
            <div className="flex flex-col gap-4 pb-6">
              <Carousel photos={sheet.photos} />
              <div className="flex flex-col gap-4 px-4 lg:px-5">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h2
                      className="font-title text-2xl leading-tight font-bold text-brand-deep"
                      data-testid="sheet-label"
                    >
                      {sheet.label}
                    </h2>
                    {sheet.priceLine ? (
                      <p className="text-sm text-zinc-500" data-testid="sheet-price-line">
                        {sheet.priceLine}
                      </p>
                    ) : null}
                  </div>
                  {sheet.price != null ? (
                    <div className="flex flex-col items-start text-left sm:items-end sm:text-right">
                      <span
                        className="font-title text-2xl font-bold text-zinc-900"
                        data-testid="sheet-price"
                      >
                        {formatEuro(sheet.price)}
                      </span>
                      {gap ? (
                        <span
                          className={`text-sm ${gap.tone === 'green' ? 'text-emerald-700' : 'text-amber-700'}`}
                        >
                          {gap.tone === 'green'
                            ? budgetMax != null && sheet.price != null && budgetMax > sheet.price
                              ? `${formatEuro(budgetMax - sheet.price)} sous le budget`
                              : 'dans le budget'
                            : gap.negotiable
                              ? `+${formatEuro(gap.over)}, à négocier`
                              : `+${formatEuro(gap.over)}, au-dessus du budget`}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {rankLine ? (
                  <p
                    className="rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-700"
                    data-testid="sheet-rank"
                  >
                    {rankLine}
                  </p>
                ) : null}
                {sheet.characteristics.length > 0 ? (
                  <section className="flex flex-col gap-2" data-testid="sheet-characteristics">
                    <h3 className="text-xs font-bold tracking-widest text-zinc-600 uppercase">
                      Caractéristiques
                    </h3>
                    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {sheet.characteristics.map((entry) => (
                        <div
                          key={entry.label}
                          className="flex min-w-0 flex-col rounded-lg bg-zinc-50 px-3 py-2"
                        >
                          <dt className="text-xs text-zinc-500">{entry.label}</dt>
                          <dd className="text-sm font-semibold break-words text-zinc-900">
                            {entry.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ) : null}
                {sheet.strengths.length > 0 ? (
                  <section className="flex flex-col gap-2">
                    <h3 className="text-xs font-bold tracking-widest text-zinc-600 uppercase">
                      Points forts
                    </h3>
                    <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-zinc-800">
                      {sheet.strengths.map((strength) => (
                        <li key={strength}>{strength}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {sheet.description ? (
                  <section className="flex flex-col gap-2" data-testid="sheet-text">
                    <h3 className="text-xs font-bold tracking-widest text-zinc-600 uppercase">
                      {sheet.fromAgency ? 'La description' : 'Le texte de l’annonce'}
                    </h3>
                    <p className="text-sm leading-relaxed break-words whitespace-pre-line text-zinc-800">
                      {sheet.description}
                    </p>
                  </section>
                ) : null}
                {sheet.onlineUrl ? (
                  <a
                    href={sheet.onlineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className={`${link} self-start text-sm font-semibold`}
                    data-testid="sheet-online"
                  >
                    Voir l’annonce en ligne ↗
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        {footer && sheet ? (
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-white px-4 py-3 lg:px-5"
            data-testid="sheet-footer"
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
