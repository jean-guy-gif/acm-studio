'use client';

// Aperçu d'une image locale ou d'une URL signée : <img> à dessein.
/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from 'react';

import {
  btnPrimary,
  errorText,
  fieldLabel,
  formSection,
  hintText,
  inputBase,
  okText,
} from '@/components/ui/styles';
import { saveAdvisorProfile } from '@/features/advisor-profile/actions/save-advisor-profile';

// Mission 84 — le téléphone et la photo du conseiller, imprimés sur ses dossiers de prospection.
export function AdvisorProfileForm({
  initialPhone,
  initialPhotoUrl,
}: {
  initialPhone: string;
  initialPhotoUrl: string | null;
}) {
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <form
      className={formSection}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setState(null);
        startTransition(async () => {
          const result = await saveAdvisorProfile(formData);
          setState(
            result.ok
              ? { ok: true, message: 'Profil enregistré.' }
              : { ok: false, message: result.error },
          );
        });
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Téléphone</span>
        <input
          type="tel"
          name="phone"
          maxLength={25}
          defaultValue={initialPhone}
          placeholder="06 12 34 56 78"
          className={`${inputBase} max-w-xs`}
        />
        <span className={hintText}>
          Imprimé sur vos dossiers de prospection, et dans la mention « Pour ne plus être sollicité
          ».
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Photo</span>
        <span className="flex flex-wrap items-center gap-4">
          {photoUrl ? (
            <img src={photoUrl} alt="Votre photo" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-zinc-300 text-xs text-zinc-400 stage:border-white/20 stage:text-white/40">
              Aucune
            </span>
          )}
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                setPhotoUrl(URL.createObjectURL(file));
              }
            }}
            className="text-sm"
          />
        </span>
        <span className={hintText}>JPEG, PNG ou WebP, 8 Mo au plus.</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={btnPrimary} disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {state ? <span className={state.ok ? okText : errorText}>{state.message}</span> : null}
      </div>
    </form>
  );
}
