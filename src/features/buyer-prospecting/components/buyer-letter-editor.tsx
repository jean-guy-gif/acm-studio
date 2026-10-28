'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useState, useTransition } from 'react';

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
import { saveBuyerLetter } from '@/features/buyer-prospecting/actions/save-buyer-letter';
import { BuyerLetterDocument } from '@/features/buyer-prospecting/components/buyer-letter-document';
import type { BuyerLetterTexts } from '@/features/buyer-prospecting/services/buyer-letter';
import type { QrCode } from '@/features/contact-card/services/qr-code';
import {
  initialTheirPhotoChoice,
  theirPhotoDisplayUrl,
  type SavedTheirPhoto,
  type TheirPhotoChoice,
} from '@/features/prospecting-file/services/their-photo';
import type { AddressSource, ProspectingSender } from '@/features/prospecting-file/types';
import { useUnsavedChangesGuard } from '@/lib/navigation/use-unsaved-changes-guard';

const tile = (selected: boolean): string =>
  `cursor-pointer overflow-hidden rounded-lg border-2 ${selected ? 'border-brand' : 'border-transparent'}`;

function ListingThumb({ url, index }: { url: string; index: number }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className="flex h-16 items-center justify-center bg-zinc-100 text-xs text-zinc-500">
      Indisponible
    </span>
  ) : (
    <img
      src={url}
      alt={`Photo ${index + 1} de son annonce`}
      className="h-16 w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

// Mission 120 — l'écran d'édition du courrier au propriétaire né d'une recherche acquéreur : à
// gauche les textes, tous modifiables, et la photo de son bien (au choix, « Sans photo » par
// défaut, M115) ; à droite la feuille telle qu'elle s'imprimera. « Télécharger le PDF » enregistre
// puis ouvre l'impression du navigateur, comme le courrier de prospection (M84).
export function BuyerLetterEditor({
  originId,
  buyerId,
  addressee,
  addressSource,
  defaults,
  initial,
  sender,
  theirPhoto,
  qr,
}: {
  originId: string;
  buyerId: string;
  addressee: { lead: string; nameLines: string[] };
  addressSource: AddressSource;
  defaults: BuyerLetterTexts;
  initial: BuyerLetterTexts;
  sender: ProspectingSender;
  theirPhoto: {
    listing: string[];
    saved: SavedTheirPhoto;
    signed: Record<string, string | null>;
    prefix: string;
  };
  qr: QrCode;
}) {
  const [texts, setTexts] = useState<BuyerLetterTexts>(initial);
  const [choice, setChoice] = useState<TheirPhotoChoice>(() => {
    const initialChoice = initialTheirPhotoChoice(
      theirPhoto.saved,
      theirPhoto.listing,
      theirPhoto.prefix,
    );
    return initialChoice.mode === 'upload' ? { mode: 'none' } : initialChoice;
  });
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);
  const current = JSON.stringify({ texts, choice });
  const [savedSnapshot, setSavedSnapshot] = useState(current);
  useUnsavedChangesGuard(current !== savedSnapshot);

  const set = (patch: Partial<BuyerLetterTexts>) => {
    setTexts((value) => ({ ...value, ...patch }));
    setState(null);
  };

  const save = (thenPrint: boolean) => {
    setState(null);
    startTransition(async () => {
      const result = await saveBuyerLetter(originId, {
        ...texts,
        theirPhoto: choice.mode === 'listing' ? choice : { mode: 'none' },
      }).catch(() => ({ ok: false as const, error: 'Connexion perdue — réessayez.' }));
      if (!result.ok) {
        setState({ ok: false, message: result.error });
        return;
      }
      setSavedSnapshot(current);
      setState(
        'warning' in result && result.warning
          ? { ok: false, message: `Enregistré. ${result.warning}` }
          : { ok: true, message: 'Enregistré.' },
      );
      if (thenPrint) {
        window.print();
      }
    });
  };

  // Un champ vidé reprend le texte proposé, à l'aperçu comme à l'enregistrement.
  const shown: BuyerLetterTexts = {
    title: texts.title.trim() || defaults.title,
    letter: texts.letter.trim() || defaults.letter,
    contactHook: texts.contactHook.trim() || defaults.contactHook,
  };
  const theirPhotoUrl = theirPhotoDisplayUrl(choice, theirPhoto.saved, theirPhoto.signed);
  const area = `${inputBase} w-full resize-y`;

  return (
    <div className="flex min-h-screen flex-col gap-6 bg-zinc-100 p-4 lg:flex-row lg:items-start lg:p-6 print:block print:bg-white print:p-0">
      <aside className="flex w-full shrink-0 flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-[24rem] lg:overflow-y-auto print:hidden">
        <Link href={`/acquereurs/${buyerId}`} className={backLink}>
          ← Retour à la fiche
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className={sectionTitle}>Courrier au propriétaire</h1>
          <p className={hintText}>
            Né de la recherche de votre acquéreur. Il ne dit ni son nom, ni son budget, et ne promet
            rien. Chaque texte est modifiable ; un champ vidé reprend le texte proposé.
          </p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Titre</span>
          <textarea
            rows={2}
            maxLength={200}
            value={texts.title}
            onChange={(event) => set({ title: event.target.value })}
            className={area}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Lettre</span>
          <textarea
            rows={10}
            maxLength={3000}
            value={texts.letter}
            onChange={(event) => set({ letter: event.target.value })}
            className={area}
            data-testid="buyer-letter-text"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Accroche du contact</span>
          <input
            type="text"
            maxLength={200}
            value={texts.contactHook}
            onChange={(event) => set({ contactHook: event.target.value })}
            className={inputBase}
          />
        </label>

        <fieldset className="flex flex-col gap-2" data-testid="their-photo-choice">
          <span className={fieldLabel}>Photo de son bien</span>
          <div className="grid grid-cols-4 gap-2">
            {theirPhoto.listing.map((url, index) => {
              const selected = choice.mode === 'listing' && choice.url === url;
              return (
                <label key={url} className={tile(selected)}>
                  <input
                    type="radio"
                    name="their-photo"
                    className="sr-only"
                    checked={selected}
                    onChange={() => {
                      setChoice({ mode: 'listing', url });
                      setState(null);
                    }}
                  />
                  <ListingThumb url={url} index={index} />
                </label>
              );
            })}
            <label className={tile(choice.mode === 'none')}>
              <input
                type="radio"
                name="their-photo"
                className="sr-only"
                checked={choice.mode === 'none'}
                onChange={() => {
                  setChoice({ mode: 'none' });
                  setState(null);
                }}
              />
              <span className="flex h-16 items-center justify-center bg-zinc-100 px-1 text-center text-xs font-medium text-zinc-600">
                Sans photo
              </span>
            </label>
          </div>
          <span className="text-xs text-zinc-500">
            Une photo de son annonce, à votre choix, ou aucune.
          </span>
        </fieldset>

        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={pending}
              onClick={() => save(true)}
              data-testid="buyer-letter-print"
            >
              {pending ? 'Enregistrement…' : 'Télécharger le PDF'}
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={pending}
              onClick={() => save(false)}
              data-testid="buyer-letter-save"
            >
              Enregistrer
            </button>
          </div>
          {state ? (
            <span className={state.ok ? okText : errorText} role="status">
              {state.message}
            </span>
          ) : null}
          <span className="text-xs text-zinc-500">
            Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF », format A4, sans
            marges. Le courrier se retrouve dans Prospection, « Recherche acquéreur ».
          </span>
        </div>
      </aside>

      <div className="min-w-0 overflow-x-auto print:overflow-visible">
        <BuyerLetterDocument
          addressee={addressee}
          addressSource={addressSource}
          texts={shown}
          sender={sender}
          theirPhotoUrl={theirPhotoUrl}
          qr={qr}
        />
      </div>
    </div>
  );
}
