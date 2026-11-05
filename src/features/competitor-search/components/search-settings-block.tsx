'use client';

import { useState, type ReactNode } from 'react';

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
  settingsToStore,
  wholeCommuneLabel,
  type SearchDefaults,
  type SearchSettings,
  type SearchSettingsInput,
} from '@/features/competitor-search/services/search-settings';
import { STREAM_ESTATE_TARGET } from '@/features/competitor-search/services/stream-estate-limits';
import {
  DPE_FILTER_HINT,
  DPE_NO_FILTER_HINT,
  isDefaultFilters,
  OUTDOOR_CHOICE_LABELS,
  OUTDOOR_CHOICES,
  type SearchFiltersInput,
} from '@/features/competitor-search/services/search-filters';
import type { SavedSearch } from '@/features/competitor-search/services/saved-searches';
import { DPE_CLASSES } from '@/features/dpe/services/dpe';

const option =
  'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-deep has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 border-zinc-200 text-zinc-700 stage:border-white/15 stage:text-white/80 stage:has-[:checked]:bg-brand/15 stage:has-[:checked]:text-white';

export const CUSTOM_SETTING_LABEL = 'réglé par vous';
// Mission 108 — les réglages du dossier sont ceux que le conseiller garde par défaut.
export const ADVISOR_DEFAULTS_LABEL = 'vos réglages par défaut';
// Mission 109 — seuls le secteur et l'élargissement : le libellé le dit.
export const KEEP_AS_DEFAULTS_LABEL =
  'Garder ce secteur et l’élargissement pour mes prochains dossiers';
export const SEARCH_DEFAULTS_SAVED =
  'Secteur et élargissement gardés : ils s’appliqueront à vos prochains dossiers.';
// Mission 110 — une recherche nommée ne garde ni prix, ni pièces, ni surface : le libellé le dit.
export const SAVE_NAMED_SEARCH_LABEL = 'Enregistrer cette recherche';
export const NAMED_SEARCH_HINT =
  'Garde le secteur, l’élargissement et les critères ci-dessus — jamais le prix, les pièces ni la surface, propres à chaque bien.';

const NO_FILTERS: SearchFiltersInput = {
  dpe: [],
  minFloor: '',
  outdoor: [],
  minLand: '',
  pool: false,
};

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
  advisorDefaults?: SearchSettings | null;
  defaultsNote?: string | null;
  onSaveDefaults?: () => void;
  // Mission 110 — les recherches nommées du conseiller.
  savedSearches?: SavedSearch[];
  namedNote?: string | null;
  onSaveNamed?: (name: string) => void;
  onApplyNamed?: (id: string) => void;
  onDeleteNamed?: (id: string) => void;
  // Mission 111 — l'avertissement avant un réglage qui demande une nouvelle recherche payante.
  paidChangeConfirm?: ReactNode;
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
  advisorDefaults = null,
  defaultsNote = null,
  onSaveDefaults,
  savedSearches = [],
  namedNote = null,
  onSaveNamed,
  onApplyNamed,
  onDeleteNamed,
  paidChangeConfirm = null,
}: Props) {
  const set = (patch: Partial<SearchSettingsInput>) => onChange({ ...input, ...patch });
  const filters = input.filters ?? NO_FILTERS;
  const setFilters = (patch: Partial<SearchFiltersInput>) =>
    set({ filters: { ...filters, ...patch } });
  const toggle = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  const [searchName, setSearchName] = useState('');
  const locked = disabled || saving;
  const anyCustom =
    saved.sector != null ||
    saved.price != null ||
    saved.rooms != null ||
    saved.surface != null ||
    !saved.autoWiden ||
    !isDefaultFilters(saved.filters);
  // Mission 108 — des réglages enregistrés identiques à ceux que le conseiller garde par défaut.
  const fromAdvisorDefaults =
    anyCustom &&
    advisorDefaults != null &&
    JSON.stringify(settingsToStore(saved)) === JSON.stringify(settingsToStore(advisorDefaults));
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
          {anyCustom
            ? ` · ${fromAdvisorDefaults ? ADVISOR_DEFAULTS_LABEL : CUSTOM_SETTING_LABEL}`
            : ''}
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
        {/* Mission 105 — les bornes envoyées à la recherche : « Prix recherchés ». « Fourchette »
            ne désigne que celle du conseiller (M97). */}
        <Row
          label="Prix recherchés"
          custom={input.priceMin !== '' || input.priceMax !== ''}
          onReset={() => set({ priceMin: '', priceMax: '' })}
          disabled={locked}
        >
          {pair(
            'priceMin',
            'priceMax',
            [text(defaults.price?.min), text(defaults.price?.max)],
            '€',
            'Prix recherchés',
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
        {/* Mission 110 — des critères de plus. Le DPE se filtre chez Stream Estate ; l'étage,
            l'extérieur, le terrain et la piscine trient les biens reçus, sans repayer : un bien
            dont la donnée manque est gardé, après les autres, et sa carte le dit. */}
        <Row
          label="DPE"
          custom={filters.dpe.length > 0}
          onReset={() => setFilters({ dpe: [] })}
          disabled={locked}
        >
          <div className="flex flex-wrap gap-2" data-testid="search-filter-dpe">
            {DPE_CLASSES.map((value) => (
              <label key={value} className={option}>
                <input
                  type="checkbox"
                  checked={filters.dpe.includes(value)}
                  disabled={locked}
                  onChange={() => setFilters({ dpe: toggle(filters.dpe, value) })}
                  className="accent-brand"
                />
                {value}
              </label>
            ))}
          </div>
          <p className="text-xs text-zinc-500 stage:text-white/50" data-testid="dpe-filter-hint">
            {DPE_FILTER_HINT} {DPE_NO_FILTER_HINT}
          </p>
        </Row>
        <Row
          label="Étage minimum (appartement)"
          custom={filters.minFloor !== ''}
          onReset={() => setFilters({ minFloor: '' })}
          disabled={locked}
        >
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 stage:text-white/70">
            <input
              type="text"
              inputMode="numeric"
              aria-label="Étage minimum"
              value={filters.minFloor}
              placeholder="—"
              disabled={locked}
              onChange={(event) => setFilters({ minFloor: event.target.value })}
              className={`${inputBase} w-20`}
            />
            <span>e étage ou plus (0 : rez-de-chaussée)</span>
          </div>
        </Row>
        <Row
          label="Extérieur"
          custom={filters.outdoor.length > 0}
          onReset={() => setFilters({ outdoor: [] })}
          disabled={locked}
        >
          <div className="flex flex-wrap gap-2">
            {OUTDOOR_CHOICES.map((value) => (
              <label key={value} className={option}>
                <input
                  type="checkbox"
                  checked={filters.outdoor.includes(value)}
                  disabled={locked}
                  onChange={() => setFilters({ outdoor: toggle(filters.outdoor, value) })}
                  className="accent-brand"
                />
                {OUTDOOR_CHOICE_LABELS[value]}
              </label>
            ))}
          </div>
          <p className="text-xs text-zinc-500 stage:text-white/50">Au moins l’un des cochés.</p>
        </Row>
        <Row
          label="Terrain minimum (maison)"
          custom={filters.minLand !== ''}
          onReset={() => setFilters({ minLand: '' })}
          disabled={locked}
        >
          <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 stage:text-white/70">
            <input
              type="text"
              inputMode="numeric"
              aria-label="Terrain minimum"
              value={filters.minLand}
              placeholder="—"
              disabled={locked}
              onChange={(event) => setFilters({ minLand: event.target.value })}
              className={`${inputBase} w-28`}
            />
            <span>m² ou plus</span>
          </div>
        </Row>
        <Row
          label="Piscine"
          custom={filters.pool}
          onReset={() => setFilters({ pool: false })}
          disabled={locked}
        >
          <label className={`${option} w-fit`}>
            <input
              type="checkbox"
              checked={filters.pool}
              disabled={locked}
              onChange={() => setFilters({ pool: !filters.pool })}
              className="accent-brand"
            />
            Avec piscine
          </label>
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
        {paidChangeConfirm}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={locked || !dirty}
            className={`${btnSecondary} px-3 py-1.5 text-sm`}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer les réglages'}
          </button>
          {onSaveDefaults ? (
            <button
              type="button"
              onClick={onSaveDefaults}
              disabled={locked}
              className={`${link} text-sm hover:underline`}
              data-testid="keep-search-defaults"
            >
              {KEEP_AS_DEFAULTS_LABEL}
            </button>
          ) : null}
          <span className={hintText}>
            {dirty
              ? 'Réglages non enregistrés — « Chercher les concurrents » les enregistre aussi.'
              : 'Réglages enregistrés sur ce dossier.'}
          </span>
        </div>
        {defaultsNote ? (
          <p role="status" className={hintText}>
            {defaultsNote}
          </p>
        ) : null}
        {onSaveNamed ? (
          <div
            className="flex flex-col gap-2 border-t border-zinc-200/80 pt-4 stage:border-white/10"
            data-testid="named-searches"
          >
            <span className={fieldLabel}>Mes recherches</span>
            {savedSearches.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {savedSearches.map((search) => (
                  <li key={search.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-zinc-800 stage:text-white">
                      {search.name}
                    </span>
                    <span className={hintText}>— {search.summary}</span>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => onApplyNamed?.(search.id)}
                      className={`${btnSecondary} px-2.5 py-1 text-xs`}
                    >
                      Appliquer à ce dossier
                    </button>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => onDeleteNamed?.(search.id)}
                      className={`${link} text-xs hover:underline`}
                    >
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={hintText}>Aucune recherche enregistrée.</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                aria-label="Nom de la recherche"
                value={searchName}
                maxLength={60}
                placeholder="Villas Vence"
                disabled={locked}
                onChange={(event) => setSearchName(event.target.value)}
                className={`${inputBase} w-56`}
              />
              <button
                type="button"
                disabled={locked || searchName.trim() === ''}
                onClick={() => onSaveNamed(searchName)}
                className={`${btnSecondary} px-3 py-1.5 text-sm`}
              >
                {SAVE_NAMED_SEARCH_LABEL}
              </button>
            </div>
            <p className="text-xs text-zinc-500 stage:text-white/50">{NAMED_SEARCH_HINT}</p>
            {namedNote ? (
              <p role="status" className={hintText}>
                {namedNote}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </details>
  );
}
