import type { Comparable } from '@/features/comparables/types';

// Optional prefill values coming from the URL import (never from an existing row).
export type ComparableFieldDefaults = {
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
export function ComparableFormFields({
  comparable,
  initial,
}: {
  comparable?: Comparable;
  initial?: ComparableFieldDefaults;
}) {
  const inputClass = 'rounded border px-2 py-1';
  const labelClass = 'flex flex-col gap-1';

  const photoUrls: string[] = Array.isArray(comparable?.photo_urls)
    ? comparable.photo_urls.filter((item): item is string => typeof item === 'string')
    : (initial?.photo_urls ?? []);

  const features: string[] = Array.isArray(comparable?.listing_features)
    ? comparable.listing_features.filter((item): item is string => typeof item === 'string')
    : (initial?.listing_features ?? []);

  return (
    <>
      <input type="hidden" name="photo_urls" value={JSON.stringify(photoUrls)} />
      <label className={labelClass}>
        Titre ou référence
        <input
          type="text"
          name="title"
          defaultValue={comparable?.title ?? initial?.title ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Lien de l’annonce
        <input
          type="url"
          name="listing_url"
          defaultValue={comparable?.listing_url ?? initial?.listing_url ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Source
        <input
          type="text"
          name="source"
          defaultValue={comparable?.source ?? initial?.source ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Adresse
        <input
          type="text"
          name="address"
          defaultValue={comparable?.address ?? initial?.address ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Code postal
        <input
          type="text"
          name="postal_code"
          defaultValue={comparable?.postal_code ?? initial?.postal_code ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Ville
        <input
          type="text"
          name="city"
          defaultValue={comparable?.city ?? initial?.city ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Quartier
        <input
          type="text"
          name="district"
          defaultValue={comparable?.district ?? initial?.district ?? ''}
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
          defaultValue={comparable?.surface_area ?? initial?.surface_area ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Terrain
        <input
          type="number"
          name="land_area"
          min={0}
          step="any"
          defaultValue={comparable?.land_area ?? initial?.land_area ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Nombre de pièces
        <input
          type="number"
          name="rooms_count"
          min={0}
          step={1}
          defaultValue={comparable?.rooms_count ?? initial?.rooms_count ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Chambres
        <input
          type="number"
          name="bedrooms_count"
          min={0}
          step={1}
          defaultValue={comparable?.bedrooms_count ?? initial?.bedrooms_count ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Salles de bains
        <input
          type="number"
          name="bathrooms_count"
          min={0}
          step={1}
          defaultValue={comparable?.bathrooms_count ?? initial?.bathrooms_count ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Classe DPE
        <input
          type="text"
          name="energy_rating"
          defaultValue={comparable?.energy_rating ?? initial?.energy_rating ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Classe GES
        <input
          type="text"
          name="ges_rating"
          defaultValue={comparable?.ges_rating ?? initial?.ges_rating ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Année de construction
        <input
          type="number"
          name="construction_year"
          min={0}
          step={1}
          defaultValue={comparable?.construction_year ?? initial?.construction_year ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Chauffage
        <input
          type="text"
          name="heating_type"
          defaultValue={comparable?.heating_type ?? initial?.heating_type ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Source d’énergie
        <input
          type="text"
          name="energy_source"
          defaultValue={comparable?.energy_source ?? initial?.energy_source ?? ''}
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
          defaultValue={comparable?.price ?? initial?.price ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Prix au m² (portail)
        <input
          type="number"
          name="portal_price_per_square_meter"
          min={0}
          step="any"
          defaultValue={
            comparable?.portal_price_per_square_meter ??
            initial?.portal_price_per_square_meter ??
            ''
          }
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Délai de commercialisation (jours)
        <input
          type="number"
          name="days_on_market"
          min={0}
          step={1}
          defaultValue={comparable?.days_on_market ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Montant de baisse
        <input
          type="number"
          name="price_drop_amount"
          min={0}
          step="any"
          defaultValue={comparable?.price_drop_amount ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Pourcentage de baisse
        <input
          type="number"
          name="price_drop_percentage"
          min={0}
          step="any"
          defaultValue={comparable?.price_drop_percentage ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Description de l’annonce
        <textarea
          name="listing_description"
          rows={5}
          defaultValue={comparable?.listing_description ?? initial?.listing_description ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Caractéristiques (une par ligne)
        <textarea
          name="listing_features"
          rows={5}
          defaultValue={features.join('\n')}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Notes conseiller
        <textarea
          name="advisor_notes"
          rows={3}
          defaultValue={comparable?.advisor_notes ?? initial?.advisor_notes ?? ''}
          className={inputClass}
        />
      </label>
      {photoUrls.length > 0 ? (
        <p className="text-sm text-zinc-500">{photoUrls.length} photo(s) détectée(s)</p>
      ) : null}
    </>
  );
}
