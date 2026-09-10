'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import {
  alertError,
  btnPrimary,
  btnSecondary,
  card,
  formSectionTitle,
  hintText,
} from '@/components/ui/styles';
import type {
  DepositBrochureResult,
  ParseBrochureResult,
} from '@/features/subject-property-import/actions/import-brochure-pdf';
import {
  extractBrochurePhotos,
  readBrochurePages,
} from '@/features/subject-property-import/services/read-brochure-pdf';
import type { BrochureImport } from '@/features/subject-property-import/types';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

// Mission 42 — importing the seller's OWN commercial brochure (PDF). Distinct from
// the online-listing panel: the fiche also fills two diagnostics fields and the
// condominium header. The read price is shown as INFORMATION only (it is the
// advisor's own agency price — the no-estimate rule matters most here). Photos are
// recovered only on the explicit click below, never automatically.
export function BrochureImportPanel({
  parseAction,
  depositAction,
  onImported,
}: {
  parseAction: (pages: string[]) => Promise<ParseBrochureResult>;
  depositAction: (formData: FormData) => Promise<DepositBrochureResult>;
  onImported: (data: BrochureImport) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BrochureImport | null>(null);
  const [depositing, setDepositing] = useState(false);
  const [deposit, setDeposit] = useState<{ deposited: number; failed: number } | null>(null);

  // The PDF is read HERE, in the browser (Mission 43): it never leaves the advisor's
  // machine. Only the extracted text is sent to the server action.
  function analyse() {
    if (!file) return;
    setError(null);
    setDeposit(null);
    startTransition(async () => {
      try {
        const pages = await readBrochurePages(file);
        const result = await parseAction(pages);
        if (result.ok) {
          setSummary(result.data);
          onImported(result.data);
        } else {
          setSummary(null);
          setError(result.error);
        }
      } catch (readError) {
        setSummary(null);
        setError(readError instanceof Error ? readError.message : 'Le PDF n’a pas pu être lu.');
      }
    });
  }

  // Explicit click only. Decodes and re-encodes the fiche's photos to JPEG in the
  // browser (canvas.toBlob), then sends them to the deposit action, which revalidates
  // each one before adding it to the seller-property bucket.
  async function recoverPhotos() {
    if (!file) return;
    setDepositing(true);
    setDeposit(null);
    setError(null);
    try {
      const blobs = await extractBrochurePhotos(file);
      if (blobs.length === 0) {
        setDeposit({ deposited: 0, failed: 0 });
        return;
      }
      const formData = new FormData();
      blobs.forEach((blob, index) => formData.append('photos', blob, `fiche-${index + 1}.jpg`));
      const result = await depositAction(formData);
      if (result.ok) {
        setDeposit({ deposited: result.deposited, failed: result.failed });
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch (extractError) {
      setError(
        extractError instanceof Error
          ? extractError.message
          : 'Les photos n’ont pas pu être extraites.',
      );
    } finally {
      setDepositing(false);
    }
  }

  const info = summary?.info;
  const chargesDiverge = info?.chargesConsistent === false;

  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`}>
      <h2 className={formSectionTitle}>Importer depuis votre fiche (PDF)</h2>
      <p className={hintText}>
        Le bien n’est pas encore commercialisé ? Importez la fiche produite par votre logiciel
        d’agence : caractéristiques, diagnostics et copropriété sont repris, à relire avant
        d’enregistrer.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setSummary(null);
            setError(null);
            setDeposit(null);
          }}
          className="text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-zinc-200 stage:text-white/70"
        />
        <button
          type="button"
          onClick={analyse}
          disabled={pending || file == null}
          className={btnPrimary}
        >
          {pending ? 'Analyse de la fiche…' : 'Analyser la fiche'}
        </button>
      </div>

      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}

      {summary ? (
        <div className="flex flex-col gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-sm stage:border-emerald-400/25 stage:bg-emerald-500/[0.07]">
          <div>
            <p className="font-semibold text-emerald-800 stage:text-emerald-300">
              Informations reprises
            </p>
            <p className="text-zinc-600 stage:text-white/65">
              {summary.found.length > 0 ? summary.found.join(', ') : 'Aucune'}
            </p>
          </div>
          {summary.missing.length > 0 ? (
            <div>
              <p className="font-semibold text-zinc-700 stage:text-white/85">À compléter</p>
              <p className="text-zinc-600 stage:text-white/65">{summary.missing.join(', ')}</p>
            </div>
          ) : null}
          {info?.readPrice != null ? (
            <div>
              <p className="font-semibold text-zinc-700 stage:text-white/85">
                Prix lu sur la fiche
              </p>
              <p className="text-zinc-600 stage:text-white/65">
                {euro(info.readPrice)}
                {info.taxeFonciere != null
                  ? ` · taxe foncière ${euro(info.taxeFonciere)}/an`
                  : ''}{' '}
                — pour information : l’outil ne l’enregistre pas et ne préremplit pas votre
                fourchette.
              </p>
            </div>
          ) : null}
          {chargesDiverge ? (
            <p className="text-amber-700 stage:text-amber-300">
              Attention : les charges mensuelles et la quote-part annuelle du pied de page ne
              concordent pas (12 × mensuel ≠ annuel). À vérifier sur la fiche.
            </p>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-emerald-200/60 pt-2.5 stage:border-emerald-400/20">
            <button
              type="button"
              onClick={recoverPhotos}
              disabled={depositing}
              className={`${btnSecondary} self-start`}
            >
              {depositing ? 'Récupération des photos…' : 'Récupérer les photos de la fiche'}
            </button>
            {deposit ? (
              <p className="text-zinc-600 stage:text-white/65">
                {deposit.deposited} photo(s) récupérée(s)
                {deposit.failed > 0 ? ` · ${deposit.failed} ignorée(s)` : ''} — visibles dans «
                Photos du bien vendeur ».
              </p>
            ) : (
              <p className="text-xs text-zinc-400 stage:text-white/40">
                Les photos récupérées s’ajoutent à celles déjà présentes, sans les remplacer.
              </p>
            )}
          </div>
        </div>
      ) : null}

      <p className="text-xs text-zinc-400 stage:text-white/40">
        L’outil lit les fiches de votre logiciel. Si la vôtre vient d’un autre, envoyez-la nous et
        on l’ajoute. Vérifiez et complétez la fiche avant d’enregistrer.
      </p>
    </section>
  );
}
