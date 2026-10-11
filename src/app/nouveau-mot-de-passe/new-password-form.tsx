'use client';

import { useState, useTransition } from 'react';

import { chooseNewPassword } from '@/app/nouveau-mot-de-passe/actions';
import { btnPrimary, errorText, fieldLabel, inputBase } from '@/components/ui/styles';
import { PASSWORD_MIN_LENGTH } from '@/lib/auth/auth-messages';

export function NewPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          // En cas de succès l'action redirige ; on n'arrive ici qu'en cas d'erreur.
          const result = await chooseNewPassword(formData);
          setError(result.error);
        });
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>
          Nouveau mot de passe ({PASSWORD_MIN_LENGTH} caractères minimum)
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          className={inputBase}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Confirmez le mot de passe</span>
        <input
          name="confirmation"
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          className={inputBase}
        />
      </label>
      {error ? (
        <p role="alert" className={errorText}>
          {error}
        </p>
      ) : null}
      <button type="submit" className={`${btnPrimary} mt-1 w-full py-2.5`} disabled={pending}>
        {pending ? 'Enregistrement…' : 'Enregistrer et me connecter'}
      </button>
    </form>
  );
}
