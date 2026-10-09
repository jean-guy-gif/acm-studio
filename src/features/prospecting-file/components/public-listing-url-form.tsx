'use client';

import { useState, useTransition } from 'react';

import {
  btnSecondary,
  errorText,
  fieldLabel,
  hintText,
  inputBase,
  okText,
} from '@/components/ui/styles';
import { savePublicListingUrl } from '@/features/prospecting-file/actions/save-public-listing-url';

// Mission 84 — le lien de l'annonce publiée de notre bien. Tant qu'il manque, aucun dossier
// de prospection : seules les informations publiques de notre annonce sortent de l'agence.
export function PublicListingUrlForm({
  projectId,
  initialUrl,
}: {
  projectId: string;
  initialUrl: string | null;
}) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <form
      className="flex flex-col gap-1.5 print:hidden"
      onSubmit={(event) => {
        event.preventDefault();
        setState(null);
        startTransition(async () => {
          const result = await savePublicListingUrl(projectId, url);
          setState(
            result.ok
              ? { ok: true, message: 'Lien enregistré.' }
              : { ok: false, message: result.error },
          );
        });
      }}
    >
      <label htmlFor="public-listing-url" className={fieldLabel}>
        Lien de l’annonce publiée de votre bien
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id="public-listing-url"
          type="url"
          inputMode="url"
          maxLength={500}
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setState(null);
          }}
          placeholder="https://…"
          className={`${inputBase} min-w-0 flex-1`}
        />
        <button type="submit" className={btnSecondary} disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer le lien'}
        </button>
      </div>
      {state ? (
        <span className={state.ok ? okText : errorText}>{state.message}</span>
      ) : (
        <span className={hintText}>
          Les dossiers de prospection ne reprennent que ce que cette annonce publie.
        </span>
      )}
    </form>
  );
}
