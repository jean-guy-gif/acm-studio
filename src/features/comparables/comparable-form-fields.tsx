import { checkChip, errorText, hintText, inputBase } from '@/components/ui/styles';
import { VerifyMark, VerifyScope } from '@/features/imported-fields/components/verify-fields';
import {
  COMPETITOR_VERIFIABLE_FIELDS,
  importedFields,
  sanitizeFieldsToVerify,
} from '@/features/imported-fields/services/fields-to-verify';
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
  // Mission 48 — extérieurs mentionnés dans la PROSE (Green Acres) : proposés au
  // conseiller sous le champ, « à confirmer ». Jamais cochés d'office.
  outdoor_suggestions?: string[];
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
  // Mission 33 — prérempli depuis la date de mise en ligne publiée par le
  // portail. Reste modifiable : le conseiller a le dernier mot.
  days_on_market?: number | null;
  listing_published_at?: string | null;
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
  const inputClass = inputBase;
  const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-zinc-600 stage:text-white/70';
  const labelWide = `${labelClass} sm:col-span-2`;

  // Submitted raw value wins; otherwise the typed default (existing row or import).
  const dv = (name: string, typed: string | number | null | undefined): string =>
    values?.[name] ?? (typed == null ? '' : String(typed));

  // Mission 33 — date de mise en ligne publiée par le portail (jamais saisie).
  const listingPublishedAt =
    values?.listing_published_at ??
    comparable?.listing_published_at ??
    initial?.listing_published_at ??
    null;

  const fieldError = (name: string) =>
    errors?.[name] ? (
      <span role="alert" className={errorText}>
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
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label key={option} className={checkChip}>
          <input
            type="checkbox"
            name={name}
            value={option}
            defaultChecked={selected.includes(option)}
            className="accent-brand"
          />
          {labels[option]}
        </label>
      ))}
    </div>
  );

  // Mission 97 — ce qui vient d'un import se vérifie : les champs encore à relire (ceux de la
  // base pour un concurrent existant, ceux que l'import vient de remplir pour un nouveau).
  const fieldsToVerify =
    values?.fields_to_verify != null
      ? sanitizeFieldsToVerify(values.fields_to_verify, COMPETITOR_VERIFIABLE_FIELDS)
      : comparable
        ? sanitizeFieldsToVerify(comparable.fields_to_verify, COMPETITOR_VERIFIABLE_FIELDS)
        : importedFields(initial, COMPETITOR_VERIFIABLE_FIELDS);

  return (
    <VerifyScope key={fieldsToVerify.join(',')} initialFields={fieldsToVerify}>
      <div className={labelWide}>
        <span>Photos</span>
        <PhotoUrlsField
          name="photo_urls"
          initialUrls={
            values?.photo_urls != null ? values.photo_urls.split('\n').filter(Boolean) : photoUrls
          }
        />
      </div>
      <label className={labelWide}>
        <span>
          Titre ou référence
          <VerifyMark field="title" />
        </span>
        <input
          type="text"
          name="title"
          defaultValue={dv('title', comparable?.title ?? initial?.title)}
          className={inputClass}
        />
      </label>
      <label className={labelWide}>
        <span>
          Lien de l’annonce
          <VerifyMark field="listing_url" />
        </span>
        <input
          type="url"
          name="listing_url"
          defaultValue={dv('listing_url', comparable?.listing_url ?? initial?.listing_url)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span>
          Source
          <VerifyMark field="source" />
        </span>
        <input
          type="text"
          name="source"
          defaultValue={dv('source', comparable?.source ?? initial?.source)}
          className={inputClass}
        />
      </label>
      <label className={labelWide}>
        <span>
          Adresse
          <VerifyMark field="address" />
        </span>
        <input
          type="text"
          name="address"
          defaultValue={dv('address', comparable?.address ?? initial?.address)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span>
          Code postal
          <VerifyMark field="postal_code" />
        </span>
        <input
          type="text"
          name="postal_code"
          defaultValue={dv('postal_code', comparable?.postal_code ?? initial?.postal_code)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span>
          Ville
          <VerifyMark field="city" />
        </span>
        <input
          type="text"
          name="city"
          defaultValue={dv('city', comparable?.city ?? initial?.city)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span>
          Quartier
          <VerifyMark field="district" />
        </span>
        <input
          type="text"
          name="district"
          defaultValue={dv('district', comparable?.district ?? initial?.district)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span>
          Surface
          <VerifyMark field="surface_area" />
        </span>
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
        <span>
          Terrain
          <VerifyMark field="land_area" />
        </span>
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
        <span>
          Nombre de pièces
          <VerifyMark field="rooms_count" />
        </span>
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
        <span>
          Chambres
          <VerifyMark field="bedrooms_count" />
        </span>
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
        <span>
          Salles de bains
          <VerifyMark field="bathrooms_count" />
        </span>
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
        <span>
          Classe DPE
          <VerifyMark field="energy_rating" />
        </span>
        <input
          type="text"
          name="energy_rating"
          defaultValue={dv('energy_rating', comparable?.energy_rating ?? initial?.energy_rating)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span>
          Classe GES
          <VerifyMark field="ges_rating" />
        </span>
        <input
          type="text"
          name="ges_rating"
          defaultValue={dv('ges_rating', comparable?.ges_rating ?? initial?.ges_rating)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span>
          État général
          <VerifyMark field="general_condition" />
        </span>
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
        <span>
          Exposition
          <VerifyMark field="exposure" />
        </span>
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
      <fieldset className={labelWide}>
        <legend>Extérieurs</legend>
        {checkboxGroup(
          'outdoor_spaces',
          OUTDOOR_SPACES,
          OUTDOOR_SPACE_LABELS as Record<OutdoorSpace, string>,
          outdoorSelected,
        )}
        {/* Mission 48 §3 — Green Acres ne publie pas les cases d'extérieurs ; ce que
            la description mentionne est PROPOSÉ ici, jamais coché d'office. Le
            conseiller coche lui-même la case correspondante ci-dessus. */}
        {initial?.outdoor_suggestions && initial.outdoor_suggestions.length > 0 ? (
          <p className="mt-1 text-xs text-amber-700 stage:text-amber-300">
            La description mentionne : {initial.outdoor_suggestions.join(', ')}. — à confirmer
          </p>
        ) : null}
        {fieldError('outdoor_spaces')}
      </fieldset>
      <fieldset className={labelWide}>
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
        <span>
          Année de construction
          <VerifyMark field="construction_year" />
        </span>
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
        <span>
          Chauffage
          <VerifyMark field="heating_type" />
        </span>
        <input
          type="text"
          name="heating_type"
          defaultValue={dv('heating_type', comparable?.heating_type ?? initial?.heating_type)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span>
          Source d’énergie
          <VerifyMark field="energy_source" />
        </span>
        <input
          type="text"
          name="energy_source"
          defaultValue={dv('energy_source', comparable?.energy_source ?? initial?.energy_source)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        <span>
          Prix
          <VerifyMark field="price" />
        </span>
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
        <span>
          Prix au m² (portail)
          <VerifyMark field="portal_price_per_square_meter" />
        </span>
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
        <span>
          Délai de commercialisation (jours)
          <VerifyMark field="days_on_market" />
        </span>
        <input
          type="number"
          name="days_on_market"
          min={0}
          step={1}
          defaultValue={dv('days_on_market', comparable?.days_on_market ?? initial?.days_on_market)}
          className={inputClass}
        />
        {/* Mission 33 — la date vient de l'annonce, jamais d'une saisie : champ
            caché. Elle permet de recalculer le délai le jour du Live plutôt que
            de figer le nombre du jour de l'import. Corriger le délai à la main
            l'écarte (voir comparable-input). */}
        <input
          type="hidden"
          name="listing_published_at"
          value={listingPublishedAt ?? ''}
          readOnly
        />
        {listingPublishedAt ? (
          <span className={hintText}>
            Mise en ligne le {new Date(listingPublishedAt).toLocaleDateString('fr-FR')} d’après le
            portail — le délai est recalculé le jour du rendez-vous. Une correction manuelle a
            priorité.
          </span>
        ) : null}
        {fieldError('days_on_market')}
      </label>
      <label className={labelClass}>
        <span>
          Montant de baisse
          <VerifyMark field="price_drop_amount" />
        </span>
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
        <span>
          Pourcentage de baisse
          <VerifyMark field="price_drop_percentage" />
        </span>
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
      <label className={labelWide}>
        <span>
          Description de l’annonce
          <VerifyMark field="listing_description" />
        </span>
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
      <label className={labelWide}>
        <span>
          Caractéristiques (une par ligne)
          <VerifyMark field="listing_features" />
        </span>
        <textarea
          name="listing_features"
          rows={5}
          defaultValue={values?.listing_features ?? features.join('\n')}
          className={inputClass}
        />
      </label>
      <label className={labelWide}>
        <span>
          Notes conseiller
          <VerifyMark field="advisor_notes" />
        </span>
        <textarea
          name="advisor_notes"
          rows={3}
          defaultValue={dv('advisor_notes', comparable?.advisor_notes ?? initial?.advisor_notes)}
          className={inputClass}
        />
      </label>
    </VerifyScope>
  );
}
