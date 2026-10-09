'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';

import {
  backLink,
  btnPrimary,
  btnSecondary,
  errorText,
  fieldLabel,
  hintText,
  inputBase,
  okText,
  sectionTitle,
} from '@/components/ui/styles';
import { saveProspectingFile } from '@/features/prospecting-file/actions/save-prospecting-file';
import { ProspectingFileDocument } from '@/features/prospecting-file/components/prospecting-file-document';
import {
  buildProspectingFile,
  resolveTexts,
} from '@/features/prospecting-file/services/build-prospecting-file';
import {
  defaultShowPrices,
  pricesKnown,
} from '@/features/prospecting-file/services/compare-properties';
import { chosenPhotoPath } from '@/features/prospecting-file/services/file-overrides';
import type { QrCode } from '@/features/prospecting-file/services/qr-code';
import {
  PROSPECTING_FILE_VERSION_LABELS,
  type ProspectingFileFacts,
  type ProspectingFileOverrides,
  type ProspectingFileTexts,
  type ProspectingFileVersion,
  type ProspectingSender,
} from '@/features/prospecting-file/types';

type Photo = { path: string; url: string | null };

const PROPOSAL_LABELS = ['Proposition — point 1', 'Proposition — point 2', 'Proposition — point 3'];

// Mission 84 — l'écran d'édition du dossier : à gauche les textes, tous modifiables ; à droite
// la feuille telle qu'elle s'imprimera. « Télécharger le PDF » enregistre puis ouvre
// l'impression du navigateur (« Enregistrer au format PDF »).
export function ProspectingFileEditor({
  projectId,
  competitorId,
  version,
  facts,
  sender,
  overrides,
  photos,
  qr,
}: {
  projectId: string;
  competitorId: string;
  version: ProspectingFileVersion;
  facts: ProspectingFileFacts;
  sender: ProspectingSender;
  overrides: ProspectingFileOverrides;
  photos: Photo[];
  qr: QrCode;
}) {
  const canShowPrices = pricesKnown(facts);
  const [showPrices, setShowPrices] = useState(
    canShowPrices && (overrides.showPrices ?? defaultShowPrices(facts)),
  );
  const file = useMemo(
    () => buildProspectingFile(facts, version, { showPrices }),
    [facts, version, showPrices],
  );
  const [texts, setTexts] = useState<ProspectingFileTexts>(() =>
    resolveTexts(file.defaults, overrides),
  );
  const [photoPath, setPhotoPath] = useState<string | null>(() =>
    chosenPhotoPath(
      overrides,
      photos.map((photo) => photo.path),
    ),
  );
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);

  const set = (patch: Partial<ProspectingFileTexts>) => {
    setTexts((current) => ({ ...current, ...patch }));
    setState(null);
  };
  const setProposal = (index: number, value: string) => {
    const proposals: ProspectingFileTexts['proposals'] = [...texts.proposals];
    proposals[index] = value;
    set({ proposals });
  };

  const save = (thenPrint: boolean) => {
    setState(null);
    startTransition(async () => {
      const result = await saveProspectingFile(projectId, competitorId, {
        version,
        ...texts,
        showPrices,
        photoPath,
      });
      if (!result.ok) {
        setState({ ok: false, message: result.error });
        return;
      }
      setState({ ok: true, message: 'Enregistré.' });
      if (thenPrint) {
        window.print();
      }
    });
  };

  // Un champ vidé reprend le texte proposé, à l'aperçu comme à l'enregistrement.
  const shown: ProspectingFileTexts = {
    title: texts.title.trim() || file.defaults.title,
    letter: texts.letter.trim() || file.defaults.letter,
    keyMessage: texts.keyMessage.trim() || file.defaults.keyMessage,
    proposals: [
      texts.proposals[0].trim() || file.defaults.proposals[0],
      texts.proposals[1].trim() || file.defaults.proposals[1],
      texts.proposals[2].trim() || file.defaults.proposals[2],
    ],
    contactHook: texts.contactHook.trim() || file.defaults.contactHook,
  };
  const photoUrl = photos.find((photo) => photo.path === photoPath)?.url ?? null;
  const area = `${inputBase} w-full resize-y`;

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-zinc-100 p-4 lg:flex-row lg:items-start lg:p-6 print:block print:bg-white print:p-0">
      <aside className="flex w-full shrink-0 flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-[24rem] lg:overflow-y-auto print:hidden">
        <Link href={`/builder/${projectId}`} className={backLink}>
          ← Retour au dossier
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className={sectionTitle}>Dossier de prospection</h1>
          <p className={hintText}>
            Version {PROSPECTING_FILE_VERSION_LABELS[version].toLowerCase()}. Chaque texte est
            modifiable ; entre astérisques, un passage est *mis en valeur*. Un champ vidé reprend le
            texte proposé.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Titre</span>
          <textarea
            rows={2}
            maxLength={300}
            value={texts.title}
            onChange={(event) => set({ title: event.target.value })}
            className={area}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Lettre</span>
          <textarea
            rows={9}
            maxLength={2000}
            value={texts.letter}
            onChange={(event) => set({ letter: event.target.value })}
            className={area}
          />
        </label>
        {version === 'owner' ? (
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>Message clé</span>
            <textarea
              rows={3}
              maxLength={400}
              value={texts.keyMessage}
              onChange={(event) => set({ keyMessage: event.target.value })}
              className={area}
            />
          </label>
        ) : null}
        {PROPOSAL_LABELS.map((label, index) => (
          <label key={label} className="flex flex-col gap-1.5">
            <span className={fieldLabel}>{label}</span>
            <textarea
              rows={3}
              maxLength={300}
              value={texts.proposals[index]}
              onChange={(event) => setProposal(index, event.target.value)}
              className={area}
            />
          </label>
        ))}
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Accroche du contact</span>
          <input
            type="text"
            maxLength={120}
            value={texts.contactHook}
            onChange={(event) => set({ contactHook: event.target.value })}
            className={inputBase}
          />
        </label>

        <label className="flex items-start gap-2.5 text-sm text-zinc-700">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={showPrices}
            disabled={!canShowPrices}
            onChange={(event) => {
              setShowPrices(event.target.checked);
              setState(null);
            }}
          />
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">Afficher les prix</span>
            <span className="text-xs text-zinc-500">
              {canShowPrices
                ? 'Éteint, la ligne devient « Même gamme de prix », sans chiffre.'
                : 'Le prix de commercialisation n’est pas renseigné à la conclusion : aucun chiffre.'}
            </span>
          </span>
        </label>

        {version === 'owner' ? (
          <fieldset className="flex flex-col gap-2">
            <span className={fieldLabel}>Photo de notre bien</span>
            {photos.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {photos.map((photo, index) => (
                  <label
                    key={photo.path}
                    className={`cursor-pointer overflow-hidden rounded-lg border-2 ${
                      photo.path === photoPath ? 'border-brand' : 'border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="photo"
                      className="sr-only"
                      checked={photo.path === photoPath}
                      onChange={() => {
                        setPhotoPath(photo.path);
                        setState(null);
                      }}
                    />
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt={`Photo ${index + 1}`}
                        className="h-16 w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-16 items-center justify-center bg-zinc-100 text-xs text-zinc-500">
                        Indisponible
                      </span>
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <span className="text-xs text-zinc-500">
                Aucune photo sur la fiche du bien vendeur : la carte s’imprime sans photo.
              </span>
            )}
          </fieldset>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={pending}
              onClick={() => save(true)}
            >
              {pending ? 'Enregistrement…' : 'Télécharger le PDF'}
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={pending}
              onClick={() => save(false)}
            >
              Enregistrer
            </button>
          </div>
          {state ? <span className={state.ok ? okText : errorText}>{state.message}</span> : null}
          <span className="text-xs text-zinc-500">
            Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF », format A4, sans
            marges.
          </span>
        </div>
      </aside>

      <div className="min-w-0 overflow-x-auto print:overflow-visible">
        <ProspectingFileDocument
          file={file}
          texts={shown}
          sender={sender}
          photoUrl={version === 'owner' ? photoUrl : null}
          qr={qr}
        />
      </div>
    </div>
  );
}
