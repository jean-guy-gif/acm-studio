'use client';

import { useActionState, useRef, useState, useTransition } from 'react';

import { SubmitButton } from '@/components/submit-button';
import { ExtensionRequiredNotice } from '@/features/browser-extension/extension-required-notice';
import { useBrowserExtension } from '@/features/browser-extension/use-browser-extension';
import { importListingFromUrl } from '@/features/comparable-import/services/import-listing-from-url';
import {
  alertError,
  btnPrimary,
  card,
  formSectionTitle,
  hintText,
  inputBase,
} from '@/components/ui/styles';
import {
  initialCreateComparableState,
  type CreateComparableState,
} from '@/features/comparables/actions/create-comparable-state';
import { ListingHistorySummary } from '@/features/comparable-import/components/listing-history-summary';
import type {
  ComparableImportResult,
  ImportedComparableData,
  ListingHistory,
} from '@/features/comparable-import/types';
import {
  ComparableFormFields,
  type ComparableFieldDefaults,
} from '@/features/comparables/comparable-form-fields';
import { formatEuroPerSquareMeter } from '@/lib/format';

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
  daysOnMarket: 'Délai de commercialisation',
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
    // Mission 48 — extérieurs lus dans la prose (Green Acres), proposés « à confirmer ».
    outdoor_suggestions: data.outdoorSuggestions,
    // Mission 33 — délai déduit de la date de mise en ligne publiée par le
    // portail. Le conseiller peut toujours corriger.
    days_on_market: data.daysOnMarket,
    listing_published_at: data.listingPublishedAt,
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
  importHtmlAction: (formData: FormData) => Promise<ComparableImportResult>;
  // URL pré-remplie (arrivée depuis « Trouver des concurrents »).
  initialUrl?: string;
};

export function NewComparablePanel({
  createAction,
  importAction,
  importHtmlAction,
  initialUrl,
}: Props) {
  const extension = useBrowserExtension();
  const [url, setUrl] = useState(initialUrl ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    data: ImportedComparableData;
    found: string[];
    missing: string[];
    history: ListingHistory | null;
  } | null>(null);
  const [importKey, setImportKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [createState, createFormAction] = useActionState(
    createAction,
    initialCreateComparableState,
  );

  // Photos already present in the form (manual or a previous import). An import
  // must never erase or reduce this gallery: the imported photos are UNIONED
  // with the existing ones, so an empty / smaller import is harmless.
  function readExistingPhotos(): string[] {
    return (
      formRef.current
        ?.querySelector<HTMLInputElement>('input[name="photo_urls"]')
        ?.value.split('\n')
        .map((value) => value.trim())
        .filter(Boolean) ?? []
    );
  }

  function applyImportResult(res: ComparableImportResult, existingPhotos: string[]) {
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
        history: res.history ?? null,
      });
      setImportKey((value) => value + 1);
      setError(null);
    } else {
      setError(res.error);
      setResult(null);
    }
  }

  function handleImport(targetUrl: string = url) {
    setError(null);
    const existingPhotos = readExistingPhotos();
    startTransition(async () => {
      // Shared import path (Mission 46): a competitor never exists other than online,
      // so this screen benefits most from the extension. Extension → robots + page in
      // the advisor's browser → HTML import; else server import.
      const res = await importListingFromUrl({
        url: targetUrl,
        extensionAvailable: extension.available === true,
        importUrlAction: importAction,
        importHtmlAction,
      });
      applyImportResult(res, existingPhotos);
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
      <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
        <h2 className={formSectionTitle}>Importer depuis une annonce</h2>
        <p className={hintText}>
          Collez le lien SeLoger, Bien’ici, Green-Acres, Maisons et Appartements… — photos, texte et
          caractéristiques sont aspirés pour vous.
        </p>
        {extension.available === false ? <ExtensionRequiredNotice reason="missing" /> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…"
            className={`${inputBase} flex-1`}
          />
          <button
            type="button"
            onClick={() => handleImport()}
            disabled={pending || url.trim() === ''}
            className={btnPrimary}
          >
            {pending ? 'Analyse de l’annonce…' : 'Importer l’annonce'}
          </button>
        </div>
        {error ? (
          <p role="alert" className={alertError}>
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-sm stage:border-emerald-400/25 stage:bg-emerald-500/[0.07]">
            <div>
              <p className="font-semibold text-emerald-800 stage:text-emerald-300">
                Informations détectées
              </p>
              <p className="text-zinc-600 stage:text-white/65">
                {result.found.length > 0 ? result.found.map(label).join(', ') : 'Aucune'}
              </p>
            </div>
            <div>
              <p className="font-semibold text-zinc-700 stage:text-white/85">
                Informations à compléter
              </p>
              <p className="text-zinc-600 stage:text-white/65">
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
                  <p className="font-semibold text-zinc-700 stage:text-white/85">Prix au m²</p>
                  <p className="text-zinc-600 stage:text-white/65">
                    Portail : {portal != null ? formatEuroPerSquareMeter(portal) : '—'} · Calculé
                    ACM : {acm != null ? formatEuroPerSquareMeter(acm) : '—'}
                  </p>
                  {overThreshold ? (
                    <p role="alert" className="font-medium text-amber-600 stage:text-amber-300">
                      Écart supérieur à 1 % entre le prix/m² du portail et celui calculé par ACM —
                      vérifiez le prix et la surface.
                    </p>
                  ) : null}
                </div>
              );
            })()}
            {(() => {
              // Mission 33 — la date de mise en ligne vient de l'annonce
              // elle-même (le portail la publie). On l'affiche telle quelle :
              // le conseiller voit d'où sort le délai et peut le corriger.
              const publishedAt = result.data.listingPublishedAt;
              const days = result.data.daysOnMarket;
              if (publishedAt == null || days == null) {
                return null;
              }
              return (
                <div>
                  <p className="font-semibold text-zinc-700 stage:text-white/85">
                    Délai de commercialisation
                  </p>
                  <p className="text-zinc-600 stage:text-white/65">
                    Mise en ligne le {new Date(publishedAt).toLocaleDateString('fr-FR')} · {days}{' '}
                    {days > 1 ? 'jours' : 'jour'} — d’après la date publiée par le portail.
                  </p>
                </div>
              );
            })()}
          </div>
        ) : null}
        {result ? (
          <ListingHistorySummary
            history={result.history}
            viewCount={result.data.viewCount}
            viewCountSince={result.data.viewCountSince}
          />
        ) : null}
        <p className="text-xs text-zinc-400 stage:text-white/40">
          L’import est une aide à la saisie. Vérifiez et complétez le formulaire avant
          d’enregistrer.
        </p>
      </section>

      <form
        key={importKey}
        ref={formRef}
        action={createFormAction}
        className={`${card} grid w-full max-w-3xl grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6`}
      >
        <h2 className={`${formSectionTitle} sm:col-span-2`}>Saisir ou vérifier la fiche</h2>
        {createState.error ? (
          <p role="alert" className={`${alertError} sm:col-span-2`}>
            {createState.error}
          </p>
        ) : null}
        <input type="hidden" name="__importGen" value={String(importKey)} />
        {/* Mission 83 — vendeur et exclusivité lus sur l'annonce importée : ils suivent la fiche
            jusqu'à l'enregistrement, et se corrigent ensuite sur la carte du concurrent. */}
        <input type="hidden" name="sold_by" value={result?.data.soldBy ?? ''} />
        <input type="hidden" name="sold_by_source" value={result?.data.soldBySource ?? ''} />
        <input type="hidden" name="exclusivity" value={result?.data.exclusivity ?? ''} />
        <input
          type="hidden"
          name="exclusivity_source"
          value={result?.data.exclusivitySource ?? ''}
        />
        <ComparableFormFields
          initial={initial}
          values={echoValues}
          errors={createState.fieldErrors}
        />
        <SubmitButton
          pendingLabel="Enregistrement…"
          className={`${btnPrimary} mt-2 self-start justify-self-start sm:col-span-2`}
        >
          Enregistrer le bien concurrent
        </SubmitButton>
      </form>
    </div>
  );
}
