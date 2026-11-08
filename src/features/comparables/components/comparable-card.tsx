'use client';

import {
  IMPORTED_FROM_SEARCH_LABEL,
  LISTING_WITHDRAWN_LABEL,
} from '@/features/competitor-search/services/pending-import-labels';
import { displayCommune } from '@/features/competitor-search/utils/arrondissements';
import {
  COMPETITOR_VERIFIABLE_FIELDS,
  VERIFY_LABEL,
  sanitizeFieldsToVerify,
} from '@/features/imported-fields/services/fields-to-verify';
import Link from 'next/link';
import { useState, type HTMLAttributes, type LiHTMLAttributes } from 'react';

import { SubmitButton } from '@/components/submit-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MoreMenu, type MoreMenuItem } from '@/components/ui/more-menu';
import { RemoteImage } from '@/components/ui/remote-image';
import {
  badgeNeutral,
  badgeRejected,
  badgeSelected,
  btnDanger,
  btnSecondary,
  card,
} from '@/components/ui/styles';
import { CompetitorLocationLine } from '@/features/competitor-locator/components/competitor-location-line';
import type { LocatorAvailability } from '@/features/competitor-locator/types';
import { CompetitorMandateLine } from '@/features/competitor-mandate/components/competitor-mandate-line';
import {
  pricePerSquareMeter,
  surfaceComparison,
} from '@/features/comparables/services/calculate-comparable-summary';
import type { Comparable } from '@/features/comparables/types';
import { neutralComparableLabel } from '@/features/live-seller/utils/neutral-comparable-label';
import { getComparablePhotoUrls } from '@/features/comparables/utils/comparable-photos';
import {
  formatEuro,
  formatEuroPerSquareMeter,
  formatPercent,
  formatSquareMeters,
} from '@/lib/format';

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
  // Mission 110 — le Live a commencé : l'ordre est figé, les flèches sont désactivées.
  orderFrozen?: boolean;
  // Sélection de lot (optionnelle) : présente = une case à cocher est affichée, même
  // modèle que la recherche (§8). Absente = carte normale (liste des écartés).
  selection?: { checked: boolean; onToggle: () => void; disabled?: boolean };
  // Mission 75 — présent pour les biens retenus : l'adresse rendue par le Localisateur.
  // `undefined` = carte sans ligne d'adresse (biens écartés).
  locatorAvailability?: LocatorAvailability | null;
  // Mission 98 — l'adresse de ce concurrent est sur la liste « Ne plus solliciter » de l'agence.
  oppositionNote?: string;
  // Mission 146 (I5) — réordonner en glissant la poignée ⋮⋮ (ordinateur et tablette) : les gestes du
  // glisser-déposer, posés sur la carte par la liste des retenus.
  // `handle` se pose sur la poignée seule (rien ne se glisse ailleurs sur la carte) ; `target`
  // sur la carte, qui reçoit le dépôt.
  drag?: {
    handle: HTMLAttributes<HTMLSpanElement>;
    target: LiHTMLAttributes<HTMLLIElement>;
    dragging: boolean;
  } | null;
};

function submitForm(id: string): void {
  const form = document.getElementById(id);
  if (form instanceof HTMLFormElement) form.requestSubmit();
}

// Mission 146 (I5) — le menu « … » d'une carte : Modifier la fiche, Monter et Descendre (le
// clavier, le téléphone ; figés une fois le Live commencé, M110), Supprimer… en bas, en rouge.
export function competitorMenuItems(input: {
  editHref: string;
  movable: boolean;
  isFirst: boolean;
  isLast: boolean;
  orderFrozen: boolean;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}): MoreMenuItem[] {
  return [
    { key: 'edit', label: 'Modifier la fiche', href: input.editHref },
    ...(input.movable
      ? [
          {
            key: 'up',
            label: 'Monter',
            disabled: input.isFirst || input.orderFrozen,
            onSelect: input.onUp,
          },
          {
            key: 'down',
            label: 'Descendre',
            disabled: input.isLast || input.orderFrozen,
            onSelect: input.onDown,
          },
        ]
      : []),
    { key: 'delete', label: 'Supprimer…', danger: true, onSelect: input.onDelete },
  ];
}

// Mission 146 (I5) — la confirmation de « Supprimer… », dans l'écran (plus `window.confirm`).
export const DELETE_COMPETITOR_TITLE = 'Supprimer ce concurrent ?';
export function deleteCompetitorText(label: string): string {
  return `${label} disparaîtra du dossier, avec ses réponses du Live s’il en a. Pour le garder sans le montrer, écartez-le.`;
}

const smallBtn = `${btnSecondary} px-3 py-1.5 text-xs`;

// Mission 103 — retenir une annonce retirée reste le choix du conseiller, mais il le fait en le
// sachant : devant le vendeur, rien ne distingue ce bien d'un bien en vente.
export const WITHDRAWN_REINTEGRATE_WARNING =
  'Cette annonce n’est plus en ligne : elle sera présentée au vendeur comme un bien en vente. Continuer ?';

// On confirme dans l'écran, sans boîte du navigateur ; « Continuer » est le geste qui réintègre.
export function WithdrawnReintegrateWarning({
  comparableId,
  toggleAction,
  onCancel,
}: {
  comparableId: string;
  toggleAction: ServerAction;
  onCancel: () => void;
}) {
  return (
    <form
      action={toggleAction}
      className="flex w-full flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 stage:border-amber-300/40 stage:bg-amber-300/10 stage:text-amber-100"
    >
      <input type="hidden" name="comparableId" value={comparableId} />
      <p role="alert">{WITHDRAWN_REINTEGRATE_WARNING}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={smallBtn} onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className={smallBtn}>
          Continuer
        </button>
      </div>
    </form>
  );
}

// Origin is derived deterministically from existing data: an imported comparable
// always carries the source listing URL, a manual one does not.
// Mission 108 — dit avec les mots du conseiller, jamais « Import URL ».
function originLabel(comparable: Comparable): string {
  return comparable.listing_url && comparable.listing_url.trim() !== ''
    ? 'Importé depuis l’annonce'
    : 'Saisi à la main';
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
  orderFrozen = false,
  selection,
  locatorAvailability,
  oppositionNote,
  drag = null,
}: ComparableCardProps) {
  const photos = getComparablePhotoUrls(comparable);
  const toVerify = sanitizeFieldsToVerify(
    comparable.fields_to_verify ?? [],
    COMPETITOR_VERIFIABLE_FIELDS,
  ).length;
  const [photoIndex, setPhotoIndex] = useState(0);
  const [confirmingWithdrawn, setConfirmingWithdrawn] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Les deux formulaires de l'ordre, cachés, soumis depuis le menu (par leur identifiant).
  const upFormId = `move-up-${comparable.id}`;
  const downFormId = `move-down-${comparable.id}`;
  // Le libellé neutre (M107), comme partout où l'outil nomme un concurrent.
  const label = neutralComparableLabel({
    propertyType: comparable.property_type,
    roomsCount: comparable.rooms_count,
    surfaceArea: comparable.surface_area,
    city: comparable.city,
    district: comparable.district,
  });
  // Mission 146 (I5) — « Écarter » reste visible ; le reste dans « … » : Modifier la fiche, Monter
  // et Descendre (le clavier, le téléphone ; figés une fois le Live commencé, M110),
  // Supprimer… en bas, en rouge, avec sa confirmation dans l'écran.
  const menuItems = competitorMenuItems({
    editHref,
    movable: moveAction != null,
    isFirst: isFirst === true,
    isLast: isLast === true,
    orderFrozen,
    onUp: () => submitForm(upFormId),
    onDown: () => submitForm(downFormId),
    onDelete: () => setDeleting(true),
  });
  const warnBeforeReintegrate = comparable.listing_withdrawn && !comparable.is_selected;
  const acmPricePerSquareMeter = pricePerSquareMeter(comparable.price, comparable.surface_area);
  const gap = surfaceComparison(comparable.surface_area, subjectSurfaceArea);

  const shown = photos.length > 0 ? Math.min(photoIndex, photos.length - 1) : 0;
  const step = (delta: number) =>
    setPhotoIndex((index) => (index + delta + photos.length) % photos.length);

  return (
    <li
      {...drag?.target}
      className={`${card} flex flex-col gap-4 p-4 transition-colors hover:border-brand/60 sm:flex-row sm:items-start stage:hover:border-brand/60 ${
        drag?.dragging ? 'border-brand bg-brand-soft' : ''
      }`}
    >
      {drag ? (
        <span
          {...drag.handle}
          aria-hidden="true"
          title="Glisser pour changer l’ordre du Live"
          data-testid="competitor-drag-handle"
          className="hidden shrink-0 cursor-grab pt-2 text-lg leading-none tracking-[-0.2em] text-zinc-500 select-none sm:block stage:text-white/40"
        >
          ⋮⋮
        </span>
      ) : null}
      {selection ? (
        <label className="flex shrink-0 cursor-pointer items-center pt-1 sm:pt-2">
          <input
            type="checkbox"
            checked={selection.checked}
            onChange={selection.onToggle}
            disabled={selection.disabled}
            aria-label={`Sélectionner ${comparable.title?.trim() || 'ce bien concurrent'}`}
            className="h-4 w-4 accent-brand"
          />
        </label>
      ) : null}
      <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl bg-zinc-100 sm:w-44 stage:bg-white/10">
        {photos.length > 0 ? (
          <RemoteImage
            src={photos[shown]}
            alt={comparable.title ?? 'Bien concurrent'}
            className="h-full w-full object-cover"
            fallbackClassName="h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500 stage:text-white/40">
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
          <span className="flex flex-wrap items-center gap-1.5">
            {/* Mission 97 — des champs importés restent à relire : la fiche du concurrent les montre. */}
            {toVerify > 0 ? (
              <Link
                href={`/builder/${comparable.project_id}/comparables/${comparable.id}/edit`}
                data-testid="competitor-to-verify"
                className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-amber-800 stage:bg-amber-400/20 stage:text-amber-200"
              >
                {VERIFY_LABEL} · {toVerify}
              </Link>
            ) : null}
            {/* Mission 101 — créé depuis les données de la recherche (page illisible), et annonce
                trouvée retirée : dits sur la carte, côté conseiller seulement. */}
            {comparable.imported_from_search ? (
              <span data-testid="imported-from-search" className={badgeNeutral}>
                {IMPORTED_FROM_SEARCH_LABEL}
              </span>
            ) : null}
            {comparable.listing_withdrawn ? (
              <span data-testid="listing-withdrawn" className={badgeRejected}>
                {LISTING_WITHDRAWN_LABEL}
              </span>
            ) : null}
            <span className={comparable.is_selected ? badgeSelected : badgeNeutral}>
              {comparable.is_selected ? 'Retenu' : 'Écarté'}
            </span>
          </span>
        </div>

        <div className="text-sm text-zinc-500 stage:text-white/55">
          <span>{displayCommune(comparable.city, comparable.postal_code) ?? 'Ville inconnue'}</span>
          {comparable.district?.trim() ? <span> · {comparable.district.trim()}</span> : null}
          {' · '}
          <span>{originLabel(comparable)}</span>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span className="font-title text-base font-bold text-brand-deep stage:text-white">
            {comparable.price > 0 ? formatEuro(comparable.price) : 'Prix —'}
          </span>
          <span className="text-zinc-600 stage:text-white/70">
            {comparable.surface_area != null
              ? formatSquareMeters(comparable.surface_area)
              : 'Surface —'}
          </span>
          <span className="text-zinc-600 stage:text-white/70">
            {acmPricePerSquareMeter != null
              ? formatEuroPerSquareMeter(acmPricePerSquareMeter)
              : 'Prix/m² —'}
          </span>
          <span className="text-zinc-600 stage:text-white/70">
            {comparable.rooms_count != null ? `${comparable.rooms_count} pièces` : 'Pièces —'}
          </span>
        </div>

        {gap ? (
          <div className="text-xs text-zinc-500 stage:text-white/40">
            Écart de surface avec le bien vendeur :{' '}
            {formatSquareMeters(gap.deltaSquareMeters, { signed: true })} (
            {formatPercent(gap.deltaPercent, { signed: true })})
          </div>
        ) : null}

        {locatorAvailability !== undefined ? (
          <CompetitorLocationLine competitor={comparable} availability={locatorAvailability} />
        ) : null}
        {oppositionNote ? (
          <p className="text-sm font-semibold text-red-700 stage:text-red-300">{oppositionNote}</p>
        ) : null}

        <CompetitorMandateLine
          competitor={comparable}
          toVerify={comparable.fields_to_verify ?? []}
        />

        <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-1">
          {warnBeforeReintegrate && !confirmingWithdrawn ? (
            <button type="button" className={smallBtn} onClick={() => setConfirmingWithdrawn(true)}>
              Réintégrer
            </button>
          ) : warnBeforeReintegrate ? (
            <WithdrawnReintegrateWarning
              comparableId={comparable.id}
              toggleAction={toggleAction}
              onCancel={() => setConfirmingWithdrawn(false)}
            />
          ) : (
            <form action={toggleAction}>
              <input type="hidden" name="comparableId" value={comparable.id} />
              <button type="submit" className={smallBtn}>
                {comparable.is_selected ? 'Écarter' : 'Réintégrer'}
              </button>
            </form>
          )}

          <MoreMenu items={menuItems} testId="competitor-more" />
          {moveAction ? (
            <>
              <form id={upFormId} action={moveAction} hidden>
                <input type="hidden" name="comparableId" value={comparable.id} />
                <input type="hidden" name="direction" value="up" />
              </form>
              <form id={downFormId} action={moveAction} hidden>
                <input type="hidden" name="comparableId" value={comparable.id} />
                <input type="hidden" name="direction" value="down" />
              </form>
            </>
          ) : null}
        </div>
        {deleting ? (
          <ConfirmDialog
            title={DELETE_COMPETITOR_TITLE}
            text={deleteCompetitorText(label)}
            onCancel={() => setDeleting(false)}
          >
            <form action={deleteAction}>
              <input type="hidden" name="comparableId" value={comparable.id} />
              <SubmitButton pendingLabel="Suppression…" className={btnDanger}>
                Supprimer
              </SubmitButton>
            </form>
          </ConfirmDialog>
        ) : null}
      </div>
    </li>
  );
}
