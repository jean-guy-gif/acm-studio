import { PhotoUrlsField } from '@/features/comparables/components/photo-urls-field';
import type { Comparable } from '@/features/comparables/types';
import {
  EXPOSURES,
  EXPOSURE_LABELS,
  GENERAL_CONDITIONS,
  GENERAL_CONDITION_LABELS,
  OUTDOOR_SPACES,
  OUTDOOR_SPACE_LABELS,
  PARKING_TYPES,
  PARKING_TYPE_LABELS,
  type Exposure,
  type GeneralCondition,
  type OutdoorSpace,
  type ParkingType,
} from '@/features/subject-property/constants/property-options';

// Optional prefill values coming from the URL import (never from an existing row).
export type ComparableFieldDefaults = {
  general_condition?: string | null;
  exposure?: string | null;
  outdoor_spaces?: string[];
  parking_types?: string[];
  title?: string | null;
  listing_url?: string | null;
  source?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  surface_area?: number | null;
  land_area?: number | null;
  rooms_count?: number | null;
  bedrooms_count?: number | null;
  bathrooms_count?: number | null;
  energy_rating?: string | null;
  ges_rating?: string | null;
  construction_year?: number | null;
  heating_type?: string | null;
  energy_source?: string | null;
  district?: string | null;
  portal_price_per_square_meter?: number | null;
  price?: number | null;
  advisor_notes?: string | null;
  photo_urls?: string[];
  listing_description?: string | null;
  listing_features?: string[];
};

// Shared input fields for the create/edit comparable forms. Feature-specific
// (not a generic component). Rendered inside a <form> whose action is provided
// by the page. display_order and is_selected are never edited here.
//
// `values` (raw submitted strings) take precedence over the typed defaults so a
// rejected create submission repopulates exactly what the user typed, including
// invalid values that still need correcting. `errors` places a message under the
// matching field.
export function ComparableFormFields({
  comparable,
  initial,
  values,
  errors,
}: {
  comparable?: Comparable;
  initial?: ComparableFieldDefaults;
  values?: Record<string, string>;
  errors?: Record<string, string>;
}) {
  const inputClass = 'rounded border px-2 py-1';
  const labelClass = 'flex flex-col gap-1';

  // Submitted raw value wins; otherwise the typed default (existing row or import).
  const dv = (name: string, typed: string | number | null | undefined): string =>
    values?.[name] ?? (typed == null ? '' : String(typed));

  const fieldError = (name: string) =>
    errors?.[name] ? (
      <span role="alert" className="text-sm text-red-600 dark:text-red-400">
        {errors[name]}
      </span>
    ) : null;

  const photoUrls: string[] = Array.isArray(comparable?.photo_urls)
    ? comparable.photo_urls.filter((item): item is string => typeof item === 'string')
    : (initial?.photo_urls ?? []);

  const features: string[] = Array.isArray(comparable?.listing_features)
    ? comparable.listing_features.filter((item): item is string => typeof item === 'string')
    : (initial?.listing_features ?? []);

  // Multi-select current selection: submitted values (echo) win, else the row /
  // import defaults. `values` joins repeated form fields with newlines.
  const selectedArray = (name: string, fromRow: unknown, fromInitial?: string[]): string[] => {
    if (values?.[name] != null) {
      return values[name].split('\n').filter(Boolean);
    }
    if (Array.isArray(fromRow)) {
      return fromRow.filter((item): item is string => typeof item === 'string');
    }
    return fromInitial ?? [];
  };
  const outdoorSelected = selectedArray(
    'outdoor_spaces',
    comparable?.outdoor_spaces,
    initial?.outdoor_spaces,
  );
  const parkingSelected = selectedArray(
    'parking_types',
    comparable?.parking_types,
    initial?.parking_types,
  );

  const checkboxGroup = (
    name: string,
    options: readonly string[],
    labels: Record<string, string>,
    selected: string[],
  ) => (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {options.map((option) => (
        <label key={option} className="flex items-center gap-1.5 text-sm font-normal">
          <input
            type="checkbox"
            name={name}
            value={option}
            defaultChecked={selected.includes(option)}
          />
          {labels[option]}
        </label>
      ))}
    </div>
  );

  return (
    <>
      <div className={labelClass}>
        <span>Photos</span>
        <PhotoUrlsField
          name="photo_urls"
          initialUrls={
            values?.photo_urls != null ? values.photo_urls.split('\n').filter(Boolean) : photoUrls
          }
        />
      </div>
      <label className={labelClass}>
        Titre ou référence
        <input
          type="text"
          name="title"
          defaultValue={dv('title', comparable?.title ?? initial?.title)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Lien de l’annonce
        <input
          type="url"
          name="listing_url"
          defaultValue={dv('listing_url', comparable?.listing_url ?? initial?.listing_url)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Source
        <input
          type="text"
          name="source"
          defaultValue={dv('source', comparable?.source ?? initial?.source)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Adresse
        <input
          type="text"
          name="address"
          defaultValue={dv('address', comparable?.address ?? initial?.address)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Code postal
        <input
          type="text"
          name="postal_code"
          defaultValue={dv('postal_code', comparable?.postal_code ?? initial?.postal_code)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Ville
        <input
          type="text"
          name="city"
          defaultValue={dv('city', comparable?.city ?? initial?.city)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Quartier
        <input
          type="text"
          name="district"
          defaultValue={dv('district', comparable?.district ?? initial?.district)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Surface
        <input
          type="number"
          name="surface_area"
          min={0}
          step="any"
          defaultValue={dv('surface_area', comparable?.surface_area ?? initial?.surface_area)}
          className={inputClass}
        />
        {fieldError('surface_area')}
      </label>
      <label className={labelClass}>
        Terrain
        <input
          type="number"
          name="land_area"
          min={0}
          step="any"
          defaultValue={dv('land_area', comparable?.land_area ?? initial?.land_area)}
          className={inputClass}
        />
        {fieldError('land_area')}
      </label>
      <label className={labelClass}>
        Nombre de pièces
        <input
          type="number"
          name="rooms_count"
          min={0}
          step={1}
          defaultValue={dv('rooms_count', comparable?.rooms_count ?? initial?.rooms_count)}
          className={inputClass}
        />
        {fieldError('rooms_count')}
      </label>
      <label className={labelClass}>
        Chambres
        <input
          type="number"
          name="bedrooms_count"
          min={0}
          step={1}
          defaultValue={dv('bedrooms_count', comparable?.bedrooms_count ?? initial?.bedrooms_count)}
          className={inputClass}
        />
        {fieldError('bedrooms_count')}
      </label>
      <label className={labelClass}>
        Salles de bains
        <input
          type="number"
          name="bathrooms_count"
          min={0}
          step={1}
          defaultValue={dv(
            'bathrooms_count',
            comparable?.bathrooms_count ?? initial?.bathrooms_count,
          )}
          className={inputClass}
        />
        {fieldError('bathrooms_count')}
      </label>
      <label className={labelClass}>
        Classe DPE
        <input
          type="text"
          name="energy_rating"
          defaultValue={dv('energy_rating', comparable?.energy_rating ?? initial?.energy_rating)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Classe GES
        <input
          type="text"
          name="ges_rating"
          defaultValue={dv('ges_rating', comparable?.ges_rating ?? initial?.ges_rating)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        État général
        <select
          name="general_condition"
          defaultValue={dv(
            'general_condition',
            comparable?.general_condition ?? initial?.general_condition,
          )}
          className={inputClass}
        >
          <option value="">— Non renseigné —</option>
          {GENERAL_CONDITIONS.map((value) => (
            <option key={value} value={value}>
              {GENERAL_CONDITION_LABELS[value as GeneralCondition]}
            </option>
          ))}
        </select>
        {fieldError('general_condition')}
      </label>
      <label className={labelClass}>
        Exposition
        <select
          name="exposure"
          defaultValue={dv('exposure', comparable?.exposure ?? initial?.exposure)}
          className={inputClass}
        >
          <option value="">— Non renseignée —</option>
          {EXPOSURES.map((value) => (
            <option key={value} value={value}>
              {EXPOSURE_LABELS[value as Exposure]}
            </option>
          ))}
        </select>
        {fieldError('exposure')}
      </label>
      <fieldset className={labelClass}>
        <legend>Extérieurs</legend>
        {checkboxGroup(
          'outdoor_spaces',
          OUTDOOR_SPACES,
          OUTDOOR_SPACE_LABELS as Record<OutdoorSpace, string>,
          outdoorSelected,
        )}
        {fieldError('outdoor_spaces')}
      </fieldset>
      <fieldset className={labelClass}>
        <legend>Stationnements</legend>
        {checkboxGroup(
          'parking_types',
          PARKING_TYPES,
          PARKING_TYPE_LABELS as Record<ParkingType, string>,
          parkingSelected,
        )}
        {fieldError('parking_types')}
      </fieldset>
      <label className={labelClass}>
        Année de construction
        <input
          type="number"
          name="construction_year"
          min={0}
          step={1}
          defaultValue={dv(
            'construction_year',
            comparable?.construction_year ?? initial?.construction_year,
          )}
          className={inputClass}
        />
        {fieldError('construction_year')}
      </label>
      <label className={labelClass}>
        Chauffage
        <input
          type="text"
          name="heating_type"
          defaultValue={dv('heating_type', comparable?.heating_type ?? initial?.heating_type)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Source d’énergie
        <input
          type="text"
          name="energy_source"
          defaultValue={dv('energy_source', comparable?.energy_source ?? initial?.energy_source)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Prix
        <input
          type="number"
          name="price"
          min={0}
          step="any"
          required
          defaultValue={dv('price', comparable?.price ?? initial?.price)}
          className={inputClass}
        />
        {fieldError('price')}
      </label>
      <label className={labelClass}>
        Prix au m² (portail)
        <input
          type="number"
          name="portal_price_per_square_meter"
          min={0}
          step="any"
          defaultValue={dv(
            'portal_price_per_square_meter',
            comparable?.portal_price_per_square_meter ?? initial?.portal_price_per_square_meter,
          )}
          className={inputClass}
        />
        {fieldError('portal_price_per_square_meter')}
      </label>
      <label className={labelClass}>
        Délai de commercialisation (jours)
        <input
          type="number"
          name="days_on_market"
          min={0}
          step={1}
          defaultValue={dv('days_on_market', comparable?.days_on_market)}
          className={inputClass}
        />
        {fieldError('days_on_market')}
      </label>
      <label className={labelClass}>
        Montant de baisse
        <input
          type="number"
          name="price_drop_amount"
          min={0}
          step="any"
          defaultValue={dv('price_drop_amount', comparable?.price_drop_amount)}
          className={inputClass}
        />
        {fieldError('price_drop_amount')}
      </label>
      <label className={labelClass}>
        Pourcentage de baisse
        <input
          type="number"
          name="price_drop_percentage"
          min={0}
          step="any"
          defaultValue={dv('price_drop_percentage', comparable?.price_drop_percentage)}
          className={inputClass}
        />
        {fieldError('price_drop_percentage')}
      </label>
      <label className={labelClass}>
        Description de l’annonce
        <textarea
          name="listing_description"
          rows={5}
          defaultValue={dv(
            'listing_description',
            comparable?.listing_description ?? initial?.listing_description,
          )}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Caractéristiques (une par ligne)
        <textarea
          name="listing_features"
          rows={5}
          defaultValue={values?.listing_features ?? features.join('\n')}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Notes conseiller
        <textarea
          name="advisor_notes"
          rows={3}
          defaultValue={dv('advisor_notes', comparable?.advisor_notes ?? initial?.advisor_notes)}
          className={inputClass}
        />
      </label>
    </>
  );
}
