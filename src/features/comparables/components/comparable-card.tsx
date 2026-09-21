'use client';

import Link from 'next/link';
import { useState } from 'react';

import { RemoteImage } from '@/components/ui/remote-image';
import {
  badgeNeutral,
  badgeSelected,
  btnDangerGhost,
  btnSecondary,
  card,
} from '@/components/ui/styles';
import {
  pricePerSquareMeter,
  surfaceComparison,
} from '@/features/comparables/services/calculate-comparable-summary';
import type { Comparable } from '@/features/comparables/types';
import { getComparablePhotoUrls } from '@/features/comparables/utils/comparable-photos';

type ServerAction = (formData: FormData) => void | Promise<void>;

type ComparableCardProps = {
  comparable: Comparable;
  editHref: string;
  subjectSurfaceArea: number | null;
  toggleAction: ServerAction;
  deleteAction: ServerAction;
  // Reordering is only offered for retained comparables.
  moveAction?: ServerAction;
  isFirst?: boolean;
  isLast?: boolean;
};

const smallBtn = `${btnSecondary} px-3 py-1.5 text-xs`;

// Origin is derived deterministically from existing data: an imported comparable
// always carries the source listing URL, a manual one does not.
function originLabel(comparable: Comparable): 'Import URL' | 'Manuel' {
  return comparable.listing_url && comparable.listing_url.trim() !== '' ? 'Import URL' : 'Manuel';
}

export function ComparableCard({
  comparable,
  editHref,
  subjectSurfaceArea,
  toggleAction,
  deleteAction,
  moveAction,
  isFirst,
  isLast,
}: ComparableCardProps) {
  const photos = getComparablePhotoUrls(comparable);
  const [photoIndex, setPhotoIndex] = useState(0);
  const acmPricePerSquareMeter = pricePerSquareMeter(comparable.price, comparable.surface_area);
  const gap = surfaceComparison(comparable.surface_area, subjectSurfaceArea);

  const shown = photos.length > 0 ? Math.min(photoIndex, photos.length - 1) : 0;
  const step = (delta: number) =>
    setPhotoIndex((index) => (index + delta + photos.length) % photos.length);

  return (
    <li
      className={`${card} flex flex-col gap-4 p-4 transition-colors hover:border-brand/60 sm:flex-row stage:hover:border-brand/60`}
    >
      <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:w-44 stage:bg-white/10">
        {photos.length > 0 ? (
          <RemoteImage
            src={photos[shown]}
            alt={comparable.title ?? 'Bien concurrent'}
            className="h-full w-full object-cover"
            fallbackClassName="h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400 stage:text-white/40">
            Pas de photo
          </div>
        )}
        {/* §3 (revue) — défiler la galerie du concurrent importé, comme sur la carte
            classée : des flèches sur la vignette de la fiche, dans le dossier. */}
        {photos.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Photo précédente"
              onClick={() => step(-1)}
              className="absolute top-1/2 left-1 -translate-y-1/2 rounded-full bg-black/45 px-2 py-1 text-sm leading-none text-white hover:bg-black/65"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Photo suivante"
              onClick={() => step(1)}
              className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full bg-black/45 px-2 py-1 text-sm leading-none text-white hover:bg-black/65"
            >
              ›
            </button>
            <span className="absolute right-1 bottom-1 rounded bg-black/45 px-1.5 py-0.5 text-[10px] text-white">
              {shown + 1}/{photos.length}
            </span>
          </>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
          <span className="font-title text-lg leading-snug font-semibold text-zinc-900 stage:text-white">
            {comparable.title?.trim() || 'Bien concurrent'}
          </span>
          <span className={comparable.is_selected ? badgeSelected : badgeNeutral}>
            {comparable.is_selected ? 'Retenu' : 'Écarté'}
          </span>
        </div>

        <div className="text-sm text-zinc-500 stage:text-white/55">
          <span>{comparable.city?.trim() || 'Ville inconnue'}</span>
          {comparable.district?.trim() ? <span> · {comparable.district.trim()}</span> : null}
          {' · '}
          <span>Origine : {originLabel(comparable)}</span>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span className="font-title text-base font-bold text-brand-deep stage:text-white">
            {comparable.price > 0 ? `${comparable.price.toLocaleString('fr-FR')} €` : 'Prix —'}
          </span>
          <span className="text-zinc-600 stage:text-white/70">
            {comparable.surface_area != null ? `${comparable.surface_area} m²` : 'Surface —'}
          </span>
          <span className="text-zinc-600 stage:text-white/70">
            {acmPricePerSquareMeter != null
              ? `${acmPricePerSquareMeter.toLocaleString('fr-FR')} €/m²`
              : 'Prix/m² —'}
          </span>
          <span className="text-zinc-600 stage:text-white/70">
            {comparable.rooms_count != null ? `${comparable.rooms_count} pièces` : 'Pièces —'}
          </span>
        </div>

        {gap ? (
          <div className="text-xs text-zinc-400 stage:text-white/40">
            Écart de surface avec le bien vendeur : {gap.deltaSquareMeters > 0 ? '+' : ''}
            {gap.deltaSquareMeters} m² ({gap.deltaPercent > 0 ? '+' : ''}
            {Math.round(gap.deltaPercent)} %)
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <form action={toggleAction}>
            <input type="hidden" name="comparableId" value={comparable.id} />
            <button type="submit" className={smallBtn}>
              {comparable.is_selected ? 'Écarter' : 'Réintégrer'}
            </button>
          </form>

          {moveAction ? (
            <>
              <form action={moveAction}>
                <input type="hidden" name="comparableId" value={comparable.id} />
                <input type="hidden" name="direction" value="up" />
                <button type="submit" className={smallBtn} disabled={isFirst}>
                  ↑ Monter
                </button>
              </form>
              <form action={moveAction}>
                <input type="hidden" name="comparableId" value={comparable.id} />
                <input type="hidden" name="direction" value="down" />
                <button type="submit" className={smallBtn} disabled={isLast}>
                  ↓ Descendre
                </button>
              </form>
            </>
          ) : null}

          <Link href={editHref} className={smallBtn}>
            Modifier
          </Link>

          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (!window.confirm('Supprimer définitivement ce bien concurrent ?')) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="comparableId" value={comparable.id} />
            <button type="submit" className={`${btnDangerGhost} px-3 py-1.5 text-xs`}>
              Supprimer
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}
