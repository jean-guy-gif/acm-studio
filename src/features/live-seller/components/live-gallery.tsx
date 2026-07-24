'use client';

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useState } from 'react';

import { buildMosaic, wrapIndex } from '@/features/live-seller/services/gallery-model';

// Read-only photo gallery for a comparable: a responsive mosaic (main photo +
// thumbnails, with a "+N" overlay) and a fullscreen lightbox (prev/next, keyboard
// ←/→, Esc, counter). Opening/closing the lightbox never changes the Live page.
// While open it flags document.body[data-lightbox] so the Live shell suspends its
// own arrow-key navigation. No upload, no scraping.

export function LiveGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const go = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current == null ? null : wrapIndex(current, delta, photos.length),
      ),
    [photos.length],
  );

  useEffect(() => {
    if (openIndex == null) {
      return;
    }
    document.body.dataset.lightbox = 'open';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      } else if (event.key === 'ArrowLeft') {
        event.stopPropagation();
        go(-1);
      } else if (event.key === 'ArrowRight') {
        event.stopPropagation();
        go(1);
      }
    };
    // Capture phase so the shell's window listener never sees these keys.
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      delete document.body.dataset.lightbox;
    };
  }, [openIndex, close, go]);

  if (photos.length === 0) {
    return (
      <div className="flex h-56 w-full items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-500 sm:h-72 dark:border-zinc-700">
        Photos indisponibles pour cette annonce
      </div>
    );
  }

  const { thumbs, extraCount: extra } = buildMosaic(photos);
  const main = photos[0];

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpenIndex(0)}
        className="block w-full overflow-hidden rounded-lg"
        aria-label={`Agrandir les photos (${photos.length})`}
      >
        <img src={main} alt={alt} className="h-56 w-full object-cover sm:h-80" loading="lazy" />
      </button>
      {thumbs.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {thumbs.map((url, i) => {
            const isLast = i === thumbs.length - 1 && extra > 0;
            return (
              <button
                key={url}
                type="button"
                onClick={() => setOpenIndex(i + 1)}
                className="relative overflow-hidden rounded"
                aria-label={`Photo ${i + 2} sur ${photos.length}`}
              >
                <img
                  src={url}
                  alt={alt}
                  className="h-16 w-full object-cover sm:h-20"
                  loading="lazy"
                />
                {isLast ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-medium text-white">
                    +{extra}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {openIndex != null ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Visionneuse photo"
          onClick={close}
        >
          <div className="flex items-center justify-between text-sm text-white">
            <span>
              Photo {openIndex + 1} sur {photos.length}
            </span>
            <button
              type="button"
              onClick={close}
              className="rounded border border-white/40 px-3 py-1 hover:bg-white/10"
            >
              Fermer
            </button>
          </div>
          <div
            className="flex flex-1 items-center justify-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => go(-1)}
              className="shrink-0 rounded-full border border-white/40 px-3 py-2 text-white hover:bg-white/10"
              aria-label="Photo précédente"
            >
              ‹
            </button>
            <img
              src={photos[openIndex]}
              alt={alt}
              className="max-h-[80vh] max-w-[85vw] rounded object-contain"
            />
            <button
              type="button"
              onClick={() => go(1)}
              className="shrink-0 rounded-full border border-white/40 px-3 py-2 text-white hover:bg-white/10"
              aria-label="Photo suivante"
            >
              ›
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
