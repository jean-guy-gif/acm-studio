'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';

import { SubmitButton } from '@/components/submit-button';
import { ImportBookmarklet } from '@/features/comparable-import/components/import-bookmarklet';
import { ListingPasteZone } from '@/features/comparable-import/components/listing-paste-zone';
import { takeTransfer } from '@/features/comparable-import/components/import-transfer';
import {
  alertError,
  btnPrimary,
  card,
  formSectionTitle,
  hintText,
  inputBase,
  link,
} from '@/components/ui/styles';
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
  // URL pré-remplie (arrivée depuis « Trouver des concurrents » ou l'assistant).
  initialUrl?: string;
  // Arrivée depuis l'assistant d'import : la page de l'annonce attend dans le
  // stockage de session et doit être analysée sans rien demander au conseiller.
  fromAssistant?: boolean;
};

export function NewComparablePanel({
  createAction,
  importAction,
  importHtmlAction,
  initialUrl,
  fromAssistant = false,
}: Props) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
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

  function applyImportResult(
    res: ComparableImportResult,
    existingPhotos: string[],
    onRefused?: () => void,
  ) {
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
      setError(null);
    } else {
      setError(res.error);
      setResult(null);
      onRefused?.();
    }
  }

  function handleImport(targetUrl: string = url) {
    setError(null);
    const formData = new FormData();
    formData.set('url', targetUrl);
    const existingPhotos = readExistingPhotos();
    startTransition(async () => {
      const res = await importAction(formData);
      // A refused / failed fetch is exactly the case the paste fallback solves:
      // open it so the advisor can copy the page from his own browser.
      applyImportResult(res, existingPhotos, () => setShowPaste(true));
    });
  }

  function runHtmlImport(sourceUrl: string, html: string) {
    setError(null);
    const formData = new FormData();
    formData.set('url', sourceUrl);
    formData.set('html', html);
    const existingPhotos = readExistingPhotos();
    startTransition(async () => {
      const res = await importHtmlAction(formData);
      applyImportResult(res, existingPhotos);
    });
  }

  // Collage dans la zone dédiée. Deux cas : le conseiller a copié l'ADRESSE de
  // l'annonce (on relance l'import à distance, c'est le chemin le plus simple),
  // ou il a copié la PAGE (on l'analyse telle qu'il la voit).
  function handleZonePaste({ html, text }: { html: string; text: string }) {
    const trimmed = text.trim();
    if (html.trim() === '' && /^https?:\/\/\S+$/i.test(trimmed)) {
      setUrl(trimmed);
      handleImport(trimmed);
      return;
    }
    if (url.trim() === '') {
      setError('Collez d’abord l’adresse de l’annonce dans le champ ci-dessus.');
      return;
    }
    runHtmlImport(url, html.trim() !== '' ? html : text);
  }

  // Arrivée depuis l'assistant : la page de l'annonce nous attend dans le
  // stockage de session (système externe), on la reprend et on lance l'analyse
  // sans rien demander au conseiller. La lecture se fait dans une micro-tâche :
  // aucun changement d'état synchrone dans le corps de l'effet. `takeTransfer`
  // vide le stockage au passage — un rechargement ne rejoue donc pas l'import —
  // et la garde protège du double montage en développement.
  const assistantHandled = useRef(false);
  useEffect(() => {
    if (!fromAssistant || assistantHandled.current) {
      return;
    }
    assistantHandled.current = true;
    queueMicrotask(() => {
      const transfer = takeTransfer();
      if (!transfer) {
        setError(
          'La page envoyée depuis votre navigateur n’a pas pu être récupérée. Collez le code de la page ci-dessous.',
        );
        setShowPaste(true);
        return;
      }
      setUrl(transfer.url);
      runHtmlImport(transfer.url, transfer.html);
    });
    // `runHtmlImport` est stable pour ce montage : la relancer sur changement
    // d'identité rejouerait un import déjà consommé.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromAssistant]);

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
          Collez le lien SeLoger, Bien’ici, Figaro Immo, Green-Acres… — photos, texte et
          caractéristiques sont aspirés pour vous.
        </p>
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

        <button
          type="button"
          onClick={() => setShowPaste((value) => !value)}
          className={`${link} self-start text-sm hover:underline`}
        >
          {showPaste ? 'Masquer' : 'Le site refuse ? Copiez-collez la page en 3 gestes'}
        </button>
        {showPaste ? (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-zinc-300 p-3.5 stage:border-white/20">
            <p className="text-sm text-zinc-600 stage:text-white/70">
              Ce portail refuse l’analyse à distance. Rien de grave : copiez la page comme vous
              copieriez un texte, l’outil se charge du reste.
            </p>
            <ListingPasteZone onPaste={handleZonePaste} disabled={pending} />
            <details className="text-sm">
              <summary className="cursor-pointer text-zinc-500 hover:underline stage:text-white/50">
                Vous importez souvent depuis ce portail ? Un bouton à installer une fois
              </summary>
              <div className="pt-2">
                <ImportBookmarklet />
              </div>
            </details>
          </div>
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
                    Portail : {portal != null ? `${portal.toLocaleString('fr-FR')} €/m²` : '—'} ·
                    Calculé ACM : {acm != null ? `${acm.toLocaleString('fr-FR')} €/m²` : '—'}
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
