'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  alertError,
  btnPrimary,
  btnSecondary,
  card,
  formSectionTitle,
  hintText,
  inputBase,
  link,
} from '@/components/ui/styles';
import { ImportBookmarklet } from '@/features/comparable-import/components/import-bookmarklet';
import { ListingPasteZone } from '@/features/comparable-import/components/listing-paste-zone';
import type { ComparableImportResult } from '@/features/comparable-import/types';
import type { RecoverPropertyPhotoResult } from '@/features/subject-property-import/actions/recover-property-photos';
import { mapListingToProperty } from '@/features/subject-property-import/services/map-listing-to-property';
import type {
  SubjectPropertyImportInfo,
  SubjectPropertyImportPrefill,
} from '@/features/subject-property-import/types';

// The advisor-facing labels for the fields the aspiration reports as detected /
// missing (informational only — reused vocabulary, not a duplicated engine).
const FIELD_LABELS: Record<string, string> = {
  price: 'Prix (indicatif)',
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
  constructionYear: 'Année de construction',
  heatingType: 'Chauffage',
  listingDescription: 'Description',
  photoUrls: 'Photos',
};

const label = (key: string): string => FIELD_LABELS[key] ?? key;

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

// Rebranding the three online-listing gestures already used for competitors onto
// the SUBJECT property: paste the address (URL), paste the page, or the "Envoyer
// vers ACM Studio" favourite. It CALLS importComparableUrl / importComparableHtml
// (read-only, they write nothing) and hands the mapped prefill up to the form.
export function SubjectPropertyImportPanel({
  importAction,
  importHtmlAction,
  recoverAction,
  onImported,
}: {
  importAction: (formData: FormData) => Promise<ComparableImportResult>;
  importHtmlAction: (formData: FormData) => Promise<ComparableImportResult>;
  recoverAction: (url: string) => Promise<RecoverPropertyPhotoResult>;
  onImported: (prefill: SubjectPropertyImportPrefill) => void;
}) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [summary, setSummary] = useState<{
    found: string[];
    missing: string[];
    info: SubjectPropertyImportInfo;
    photoUrls: string[];
  } | null>(null);
  // Photo recovery is browser-driven, one image at a time (see the server action
  // comment). Never automatic — it only runs on the explicit click below.
  const [recovering, setRecovering] = useState(false);
  const [recovery, setRecovery] = useState<{ done: number; ok: number; failed: number } | null>(
    null,
  );

  function apply(res: ComparableImportResult, onRefused?: () => void) {
    if (res.ok) {
      const { prefill, info } = mapListingToProperty(res.data);
      setSummary({
        found: res.foundFields,
        missing: res.missingFields,
        info,
        photoUrls: res.data.photoUrls,
      });
      setRecovery(null);
      setError(null);
      onImported(prefill);
    } else {
      setError(res.error);
      setSummary(null);
      setRecovery(null);
      onRefused?.();
    }
  }

  // Explicit click only. Drives the queue serially (writes to the shared photo
  // list must not race) and reports how many photos were recovered / failed.
  async function recoverPhotos(urls: string[]) {
    setRecovering(true);
    setRecovery({ done: 0, ok: 0, failed: 0 });
    let ok = 0;
    let failed = 0;
    for (const photoUrl of urls) {
      const result = await recoverAction(photoUrl);
      if (result.ok) {
        ok += 1;
      } else {
        failed += 1;
      }
      setRecovery({ done: ok + failed, ok, failed });
    }
    setRecovering(false);
    // Refresh so the recovered photos appear in the "Photos du bien vendeur" field.
    router.refresh();
  }

  function importFromUrl(targetUrl: string = url) {
    setError(null);
    const formData = new FormData();
    formData.set('url', targetUrl);
    startTransition(async () => {
      const res = await importAction(formData);
      // A refused / failed fetch is exactly what the paste fallback solves.
      apply(res, () => setShowPaste(true));
    });
  }

  function importFromHtml(sourceUrl: string, html: string) {
    setError(null);
    const formData = new FormData();
    formData.set('url', sourceUrl);
    formData.set('html', html);
    startTransition(async () => {
      apply(await importHtmlAction(formData));
    });
  }

  // Paste in the dedicated zone: either the ADDRESS (re-run the remote import) or
  // the PAGE itself (analyse it as the advisor sees it).
  function handleZonePaste({ html, text }: { html: string; text: string }) {
    const trimmed = text.trim();
    if (html.trim() === '' && /^https?:\/\/\S+$/i.test(trimmed)) {
      setUrl(trimmed);
      importFromUrl(trimmed);
      return;
    }
    if (url.trim() === '') {
      setError('Collez d’abord l’adresse de l’annonce dans le champ ci-dessus.');
      return;
    }
    importFromHtml(url, html.trim() !== '' ? html : text);
  }

  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={formSectionTitle}>Importer depuis une annonce en ligne</h2>
      <p className={hintText}>
        Le bien est déjà commercialisé ? Collez le lien SeLoger, Bien’ici, Figaro Immo, Green-Acres…
        — infos et caractéristiques sont reprises pour vous, à relire avant d’enregistrer.
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
          onClick={() => importFromUrl()}
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
            Ce portail refuse l’analyse à distance. Copiez la page comme vous copieriez un texte,
            l’outil se charge du reste.
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

      {summary ? (
        <div className="flex flex-col gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-sm stage:border-emerald-400/25 stage:bg-emerald-500/[0.07]">
          <div>
            <p className="font-semibold text-emerald-800 stage:text-emerald-300">
              Informations détectées
            </p>
            <p className="text-zinc-600 stage:text-white/65">
              {summary.found.length > 0 ? summary.found.map(label).join(', ') : 'Aucune'}
            </p>
          </div>
          <div>
            <p className="font-semibold text-zinc-700 stage:text-white/85">
              Informations à compléter
            </p>
            <p className="text-zinc-600 stage:text-white/65">
              {summary.missing.length > 0 ? summary.missing.map(label).join(', ') : 'Aucune'}
            </p>
          </div>
          {summary.info.readPrice != null ? (
            <div>
              <p className="font-semibold text-zinc-700 stage:text-white/85">
                Prix lu sur l’annonce
              </p>
              <p className="text-zinc-600 stage:text-white/65">
                {euro(summary.info.readPrice)}
                {summary.info.readPortalPricePerSquareMeter != null
                  ? ` · ${summary.info.readPortalPricePerSquareMeter.toLocaleString('fr-FR')} €/m² (portail)`
                  : ''}{' '}
                — pour information : l’outil ne l’enregistre pas et ne préremplit pas votre
                fourchette.
              </p>
            </div>
          ) : null}
          {summary.info.detectedPhotoCount > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-zinc-600 stage:text-white/65">
                {summary.info.detectedPhotoCount} photo(s) détectée(s) sur l’annonce.
              </p>
              <button
                type="button"
                onClick={() => recoverPhotos(summary.photoUrls)}
                disabled={recovering}
                className={`${btnSecondary} self-start`}
              >
                {recovering
                  ? `Récupération… ${recovery?.done ?? 0}/${summary.photoUrls.length}`
                  : 'Récupérer ces photos'}
              </button>
              {recovery && !recovering ? (
                <p className="text-zinc-600 stage:text-white/65">
                  {recovery.ok} photo(s) récupérée(s)
                  {recovery.failed > 0 ? ` · ${recovery.failed} échec(s)` : ''} — visibles dans «
                  Photos du bien vendeur ».
                </p>
              ) : (
                <p className="text-xs text-zinc-400 stage:text-white/40">
                  Les photos récupérées s’ajoutent à celles déjà présentes, sans les remplacer.
                </p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs text-zinc-400 stage:text-white/40">
        L’import est une aide à la saisie. Vérifiez et complétez la fiche avant d’enregistrer.
      </p>
    </section>
  );
}
