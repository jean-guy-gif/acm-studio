'use client';

import Link from 'next/link';

import {
  pricePerSquareMeter,
  surfaceComparison,
} from '@/features/comparables/services/calculate-comparable-summary';
import type { Comparable } from '@/features/comparables/types';
import { getMainPhotoUrl } from '@/features/comparables/utils/comparable-photos';

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

const buttonClass =
  'rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800 disabled:opacity-50';

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
  const photo = getMainPhotoUrl(comparable);
  const acmPricePerSquareMeter = pricePerSquareMeter(comparable.price, comparable.surface_area);
  const gap = surfaceComparison(comparable.surface_area, subjectSurfaceArea);
  const statut = comparable.is_selected ? 'Retenu' : 'Écarté';

  return (
    <li className="flex flex-col gap-3 rounded border border-zinc-200 p-3 sm:flex-row dark:border-zinc-800">
      <div className="h-24 w-full shrink-0 overflow-hidden rounded bg-zinc-100 sm:w-32 dark:bg-zinc-800">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={comparable.title ?? 'Bien concurrent'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
            Pas de photo
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <span className="font-medium">{comparable.title?.trim() || 'Bien concurrent'}</span>
          <span className="shrink-0 text-sm text-zinc-500">{statut}</span>
        </div>

        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          <span>{comparable.city?.trim() || 'Ville inconnue'}</span>
          {comparable.district?.trim() ? <span> · {comparable.district.trim()}</span> : null}
          {' · '}
          <span>Origine : {originLabel(comparable)}</span>
        </div>

        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          <span>
            Prix : {comparable.price > 0 ? `${comparable.price.toLocaleString('fr-FR')} €` : '—'}
          </span>
          {' · '}
          <span>
            Surface : {comparable.surface_area != null ? `${comparable.surface_area} m²` : '—'}
          </span>
          {' · '}
          <span>
            Prix/m² ACM :{' '}
            {acmPricePerSquareMeter != null
              ? `${acmPricePerSquareMeter.toLocaleString('fr-FR')} €`
              : '—'}
          </span>
          {' · '}
          <span>Pièces : {comparable.rooms_count ?? '—'}</span>
        </div>

        {gap ? (
          <div className="text-sm text-zinc-500">
            Écart de surface avec le bien vendeur : {gap.deltaSquareMeters > 0 ? '+' : ''}
            {gap.deltaSquareMeters} m² ({gap.deltaPercent > 0 ? '+' : ''}
            {Math.round(gap.deltaPercent)} %)
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <form action={toggleAction}>
            <input type="hidden" name="comparableId" value={comparable.id} />
            <button type="submit" className={buttonClass}>
              {comparable.is_selected ? 'Écarter' : 'Réintégrer'}
            </button>
          </form>

          {moveAction ? (
            <>
              <form action={moveAction}>
                <input type="hidden" name="comparableId" value={comparable.id} />
                <input type="hidden" name="direction" value="up" />
                <button type="submit" className={buttonClass} disabled={isFirst}>
                  Monter
                </button>
              </form>
              <form action={moveAction}>
                <input type="hidden" name="comparableId" value={comparable.id} />
                <input type="hidden" name="direction" value="down" />
                <button type="submit" className={buttonClass} disabled={isLast}>
                  Descendre
                </button>
              </form>
            </>
          ) : null}

          <Link href={editHref} className={buttonClass}>
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
            <button type="submit" className={buttonClass}>
              Supprimer
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}
