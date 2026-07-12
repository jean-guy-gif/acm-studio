import type { Comparable } from '@/features/comparables/types';

// Shared input fields for the create/edit comparable forms. Feature-specific
// (not a generic component). Rendered inside a <form> whose action is provided
// by the page. display_order and is_selected are never edited here.
export function ComparableFormFields({ comparable }: { comparable?: Comparable }) {
  const inputClass = 'rounded border px-2 py-1';
  const labelClass = 'flex flex-col gap-1';

  return (
    <>
      <label className={labelClass}>
        Titre ou référence
        <input
          type="text"
          name="title"
          defaultValue={comparable?.title ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Lien de l’annonce
        <input
          type="url"
          name="listing_url"
          defaultValue={comparable?.listing_url ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Source
        <input
          type="text"
          name="source"
          defaultValue={comparable?.source ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Adresse
        <input
          type="text"
          name="address"
          defaultValue={comparable?.address ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Code postal
        <input
          type="text"
          name="postal_code"
          defaultValue={comparable?.postal_code ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Ville
        <input
          type="text"
          name="city"
          defaultValue={comparable?.city ?? ''}
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
          defaultValue={comparable?.surface_area ?? ''}
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
          defaultValue={comparable?.land_area ?? ''}
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
          defaultValue={comparable?.rooms_count ?? ''}
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
          defaultValue={comparable?.bedrooms_count ?? ''}
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
          defaultValue={comparable?.bathrooms_count ?? ''}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Classe DPE
        <input
          type="text"
          name="energy_rating"
          defaultValue={comparable?.energy_rating ?? ''}
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
          defaultValue={comparable?.price ?? ''}
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
        Notes conseiller
        <textarea
          name="advisor_notes"
          rows={3}
          defaultValue={comparable?.advisor_notes ?? ''}
          className={inputClass}
        />
      </label>
    </>
  );
}
