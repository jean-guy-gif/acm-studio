'use client';

import type { ReactNode } from 'react';

import {
  alertError,
  badgeBrand,
  btnSecondary,
  card,
  fieldLabel,
  hintText,
  inputBase,
  link,
} from '@/components/ui/styles';
import {
  describeSearchCriteria,
  SEARCH_RADIUS_CHOICES,
  sectorLabel,
  wholeCommuneLabel,
  type SearchDefaults,
  type SearchSettings,
  type SearchSettingsInput,
} from '@/features/competitor-search/services/search-settings';
import { STREAM_ESTATE_TARGET } from '@/features/competitor-search/services/stream-estate-tiers';

const option =
  'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-deep has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 border-zinc-200 text-zinc-700 stage:border-white/15 stage:text-white/80 stage:has-[:checked]:bg-brand/15 stage:has-[:checked]:text-white';

export const CUSTOM_SETTING_LABEL = 'réglé par vous';

type Props = {
  // Ce qui est enregistré sur le dossier, et ce que le conseiller est en train de saisir.
  saved: SearchSettings;
  input: SearchSettingsInput;
  // Ce que l'outil utiliserait seul, calculé côté serveur depuis la fiche.
  defaults: SearchDefaults;
  dirty: boolean;
  saving: boolean;
  disabled: boolean;
  error: string | null;
  onChange: (next: SearchSettingsInput) => void;
  onSave: () => void;
};

function Row({
  label,
  custom,
  onReset,
  disabled,
  children,
}: {
  label: string;
  custom: boolean;
  onReset: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5" data-setting-custom={custom ? 'true' : 'false'}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={fieldLabel}>{label}</span>
        {custom ? (
          <>
            <span className={badgeBrand}>{CUSTOM_SETTING_LABEL}</span>
            <button
              type="button"
              onClick={onReset}
              disabled={disabled}
              className={`${link} text-xs hover:underline`}
            >
              Remettre par défaut
            </button>
          </>
        ) : null}
      </div>
      {children}
    </div>
  );
}

// MISSION 99 — « Réglages de la recherche », au-dessus de « Chercher les concurrents ». Replié par
// défaut, il dit les valeurs que l'outil utiliserait seul ; déplié, chaque critère se règle, porte
// « réglé par vous » dès qu'il n'est plus automatique, et se remet par défaut. Un champ vide est
// automatique : son repère (en gris) est la valeur que l'outil utiliserait.
export function SearchSettingsBlock({
  saved,
  input,
  defaults,
  dirty,
  saving,
  disabled,
  error,
  onChange,
  onSave,
}: Props) {
  const set = (patch: Partial<SearchSettingsInput>) => onChange({ ...input, ...patch });
  const locked = disabled || saving;
  const anyCustom =
    saved.sector != null ||
    saved.price != null ||
    saved.rooms != null ||
    saved.surface != null ||
    !saved.autoWiden;
  const summary = [
    ...describeSearchCriteria(saved, defaults),
    saved.autoWiden ? null : 'sans élargissement',
  ].filter((part): part is string => part != null);

  const pair = (
    minKey: 'priceMin' | 'roomsMin' | 'surfaceMin',
    maxKey: 'priceMax' | 'roomsMax' | 'surfaceMax',
    placeholders: [string, string],
    unit: string,
    name: string,
  ) => (
    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 stage:text-white/70">
      <span>de</span>
      <input
        type="text"
        inputMode="numeric"
        aria-label={`${name} : de`}
        value={input[minKey]}
        placeholder={placeholders[0]}
        disabled={locked}
        onChange={(event) => set({ [minKey]: event.target.value })}
        className={`${inputBase} w-28`}
      />
      <span>à</span>
      <input
        type="text"
        inputMode="numeric"
        aria-label={`${name} : à`}
        value={input[maxKey]}
        placeholder={placeholders[1]}
        disabled={locked}
        onChange={(event) => set({ [maxKey]: event.target.value })}
        className={`${inputBase} w-28`}
      />
      <span>{unit}</span>
    </div>
  );
  const text = (value: number | null | undefined): string => (value == null ? '—' : String(value));

  return (
    <details className={`${card} p-4`} data-search-settings>
      <summary className="cursor-pointer text-sm">
        <span className="font-title font-semibold text-zinc-800 stage:text-white">
          Réglages de la recherche
        </span>{' '}
        <span className={hintText}>
          — {summary.join(' · ')}
          {anyCustom ? ` · ${CUSTOM_SETTING_LABEL}` : ''}
        </span>
      </summary>
      <div className="mt-4 flex flex-col gap-4">
        <Row
          label="Secteur"
          custom={input.sector !== 'auto'}
          onReset={() => set({ sector: 'auto' })}
          disabled={locked}
        >
          <div className="flex flex-wrap gap-2">
            {(
              [
                [
                  'auto',
                  `Automatique (${sectorLabel(null, defaults.located, defaults.arrondissement).toLowerCase()})`,
                ],
                ['commune', wholeCommuneLabel(defaults.arrondissement ?? false)],
                ...SEARCH_RADIUS_CHOICES.map(
                  (km) => [String(km), `Rayon ${km} km autour du bien`] as const,
                ),
              ] as const
            ).map(([value, label]) => (
              <label key={value} className={option}>
                <input
                  type="radio"
                  name="search_sector"
                  value={value}
                  checked={input.sector === value}
                  disabled={locked}
                  onChange={() => set({ sector: value as SearchSettingsInput['sector'] })}
                  className="accent-brand"
                />
                {label}
              </label>
            ))}
          </div>
        </Row>
        <Row
          label="Prix"
          custom={input.priceMin !== '' || input.priceMax !== ''}
          onReset={() => set({ priceMin: '', priceMax: '' })}
          disabled={locked}
        >
          {pair(
            'priceMin',
            'priceMax',
            [text(defaults.price?.min), text(defaults.price?.max)],
            '€',
            'Prix',
          )}
          <p className="text-xs text-zinc-500 stage:text-white/50">
            {defaults.price
              ? 'Par défaut, votre fourchette. La modifier ici ne change pas celle de la fiche.'
              : 'Pas de fourchette sur la fiche : sans réglage, le prix ne filtre pas.'}
          </p>
        </Row>
        <Row
          label="Pièces"
          custom={input.roomsMin !== '' || input.roomsMax !== ''}
          onReset={() => set({ roomsMin: '', roomsMax: '' })}
          disabled={locked}
        >
          {pair(
            'roomsMin',
            'roomsMax',
            [text(defaults.rooms), text(defaults.rooms)],
            'pièces',
            'Pièces',
          )}
        </Row>
        <Row
          label="Surface"
          custom={input.surfaceMin !== '' || input.surfaceMax !== ''}
          onReset={() => set({ surfaceMin: '', surfaceMax: '' })}
          disabled={locked}
        >
          {pair(
            'surfaceMin',
            'surfaceMax',
            [text(defaults.surface?.min), text(defaults.surface?.max)],
            'm²',
            'Surface',
          )}
        </Row>
        <Row
          label={`Élargir automatiquement si moins de ${STREAM_ESTATE_TARGET} concurrents`}
          custom={!input.autoWiden}
          onReset={() => set({ autoWiden: true })}
          disabled={locked}
        >
          <div className="flex flex-wrap gap-2">
            {(
              [
                [true, 'Oui'],
                [false, 'Non'],
              ] as const
            ).map(([value, label]) => (
              <label key={label} className={option}>
                <input
                  type="radio"
                  name="search_auto_widen"
                  checked={input.autoWiden === value}
                  disabled={locked}
                  onChange={() => set({ autoWiden: value })}
                  className="accent-brand"
                />
                {label}
              </label>
            ))}
          </div>
        </Row>
        <p className={hintText}>
          Un critère réglé ne s’élargit plus : la recherche n’élargit que ce que vous laissez
          automatique. Les réglages valent pour « Chercher les concurrents », pas pour vos
          recherches sur les portails.
        </p>
        {error ? (
          <p role="alert" className={alertError}>
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={locked || !dirty}
            className={`${btnSecondary} px-3 py-1.5 text-sm`}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer les réglages'}
          </button>
          <span className={hintText}>
            {dirty
              ? 'Réglages non enregistrés — « Chercher les concurrents » les enregistre aussi.'
              : 'Réglages enregistrés sur ce dossier.'}
          </span>
        </div>
      </div>
    </details>
  );
}
