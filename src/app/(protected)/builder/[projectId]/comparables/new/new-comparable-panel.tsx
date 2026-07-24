'use client';

import { useActionState, useRef, useState, useTransition } from 'react';

import { SubmitButton } from '@/components/submit-button';
import {
  initialCreateComparableState,
  type CreateComparableState,
} from '@/features/comparables/actions/create-comparable-state';
import type {
  ComparableImportResult,
  ImportedComparableData,
} from '@/features/comparable-import/types';
import {
  ComparableFormFields,
  type ComparableFieldDefaults,
} from '@/features/comparables/comparable-form-fields';

const FIELD_LABELS: Record<string, string> = {
  title: 'Titre',
  price: 'Prix',
  surfaceArea: 'Surface',
  landArea: 'Terrain',
  roomsCount: 'Pièces',
  bedroomsCount: 'Chambres',
  bathroomsCount: 'Salles de bains',
  energyRating: 'DPE',
  gesRating: 'GES',
  address: 'Adresse',
  postalCode: 'Code postal',
  city: 'Ville',
  district: 'Quartier',
  portalPricePerSquareMeter: 'Prix/m² portail',
  listingDescription: 'Description',
  photoUrls: 'Photos',
};

const label = (key: string): string => FIELD_LABELS[key] ?? key;

// Maps imported data to form defaults. description is intentionally NOT copied
// into advisor_notes (advisor decides); it stays in the import summary only.
function toDefaults(data: ImportedComparableData): ComparableFieldDefaults {
  return {
    title: data.title,
    listing_url: data.listingUrl,
    source: data.source,
    address: data.address,
    postal_code: data.postalCode,
    city: data.city,
    surface_area: data.surfaceArea,
    land_area: data.landArea,
    rooms_count: data.roomsCount,
    bedrooms_count: data.bedroomsCount,
    bathrooms_count: data.bathroomsCount,
    energy_rating: data.energyRating,
    ges_rating: data.gesRating,
    construction_year: data.constructionYear,
    heating_type: data.heatingType,
    energy_source: data.energySource,
    district: data.district,
    portal_price_per_square_meter: data.portalPricePerSquareMeter,
    price: data.price,
    photo_urls: data.photoUrls,
    listing_description: data.listingDescription,
    listing_features: data.listingFeatures,
    general_condition: data.generalCondition,
    exposure: data.exposure,
    outdoor_spaces: data.outdoorSpaces,
    parking_types: data.parkingTypes,
  };
}

// ACM's own price/m², recomputed from the (editable) imported price and surface.
function acmPricePerSquareMeter(data: ImportedComparableData): number | null {
  if (data.price && data.price > 0 && data.surfaceArea && data.surfaceArea > 0) {
    return Math.round(data.price / data.surfaceArea);
  }
  return null;
}

type Props = {
  createAction: (
    state: CreateComparableState,
    formData: FormData,
  ) => Promise<CreateComparableState>;
  importAction: (formData: FormData) => Promise<ComparableImportResult>;
};

export function NewComparablePanel({ createAction, importAction }: Props) {
  const [url, setUrl] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    data: ImportedComparableData;
    found: string[];
    missing: string[];
  } | null>(null);
  const [importKey, setImportKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [createState, createFormAction] = useActionState(
    createAction,
    initialCreateComparableState,
  );

  function handleImport() {
    setError(null);
    const formData = new FormData();
    formData.set('url', url);
    // Photos already present in the form (manual or a previous import). An import
    // must never erase or reduce this gallery: the imported photos are UNIONED
    // with the existing ones, so an empty / smaller import is harmless.
    const existingPhotos =
      formRef.current
        ?.querySelector<HTMLInputElement>('input[name="photo_urls"]')
        ?.value.split('\n')
        .map((value) => value.trim())
        .filter(Boolean) ?? [];
    startTransition(async () => {
      const res = await importAction(formData);
      if (res.ok) {
        const mergedPhotos = [...existingPhotos];
        for (const photo of res.data.photoUrls) {
          if (!mergedPhotos.includes(photo)) {
            mergedPhotos.push(photo);
          }
        }
        setResult({
          data: { ...res.data, photoUrls: mergedPhotos.slice(0, 20) },
          found: res.foundFields,
          missing: res.missingFields,
        });
        setImportKey((value) => value + 1);
      } else {
        setError(res.error);
        setResult(null);
      }
    });
  }

  const initial = result ? toDefaults(result.data) : undefined;
  // Repopulate the manual form with the rejected submission's values only when no
  // fresh import has happened since (matching generation). A newer import wins.
  const echoValues =
    createState.values && createState.importGen === String(importKey)
      ? createState.values
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-medium">Importer depuis une annonce</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…"
            className="flex-1 rounded border px-2 py-1"
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={pending || url.trim() === ''}
            className="rounded border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {pending ? 'Analyse de l’annonce…' : 'Importer l’annonce'}
          </button>
        </div>
        {error ? <p role="alert">{error}</p> : null}
        {result ? (
          <div className="flex flex-col gap-2 text-sm">
            <div>
              <p className="font-medium">Informations détectées</p>
              <p className="text-zinc-500">
                {result.found.length > 0 ? result.found.map(label).join(', ') : 'Aucune'}
              </p>
            </div>
            <div>
              <p className="font-medium">Informations à compléter</p>
              <p className="text-zinc-500">
                {result.missing.length > 0 ? result.missing.map(label).join(', ') : 'Aucune'}
              </p>
            </div>
            {(() => {
              const portal = result.data.portalPricePerSquareMeter;
              const acm = acmPricePerSquareMeter(result.data);
              if (portal == null && acm == null) {
                return null;
              }
              const gap = portal != null && acm != null ? Math.abs(acm - portal) / portal : null;
              const overThreshold = gap != null && gap > 0.01;
              return (
                <div>
                  <p className="font-medium">Prix au m²</p>
                  <p className="text-zinc-500">
                    Portail : {portal != null ? `${portal.toLocaleString('fr-FR')} €/m²` : '—'} ·
                    Calculé ACM : {acm != null ? `${acm.toLocaleString('fr-FR')} €/m²` : '—'}
                  </p>
                  {overThreshold ? (
                    <p role="alert" className="text-amber-600">
                      Écart supérieur à 1 % entre le prix/m² du portail et celui calculé par ACM —
                      vérifiez le prix et la surface.
                    </p>
                  ) : null}
                </div>
              );
            })()}
          </div>
        ) : null}
        <p className="text-xs text-zinc-500">
          L’import est une aide à la saisie. Vérifiez et complétez le formulaire avant
          d’enregistrer.
        </p>
      </section>

      <form
        key={importKey}
        ref={formRef}
        action={createFormAction}
        className="flex max-w-xl flex-col gap-3"
      >
        <h2 className="text-lg font-medium">Saisir manuellement</h2>
        {createState.error ? <p role="alert">{createState.error}</p> : null}
        <input type="hidden" name="__importGen" value={String(importKey)} />
        <ComparableFormFields
          initial={initial}
          values={echoValues}
          errors={createState.fieldErrors}
        />
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </form>
    </div>
  );
}
