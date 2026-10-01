'use client';

import { useState, useTransition } from 'react';

import { btnPrimary, errorText, fieldLabel, inputBase } from '@/components/ui/styles';
import { acceptInvitation } from '@/app/accept-invitation/actions';

// Mission 60 — l'invité choisit son nom et son mot de passe. L'agence et le rôle ne sont PAS ici :
// ils viennent de l'invitation, côté serveur.
export function AcceptForm({ email }: { email: string }) {
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
          const result = await acceptInvitation(formData);
          // En cas de succès l'action redirige ; on n'arrive ici qu'en cas d'erreur.
          setError(result.error);
        });
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Adresse e-mail</span>
        <input value={email} readOnly className={`${inputBase} bg-zinc-50 text-zinc-500`} />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Prénom</span>
          <input name="first_name" required autoComplete="given-name" className={inputBase} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Nom</span>
          <input name="last_name" required autoComplete="family-name" className={inputBase} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={fieldLabel}>Mot de passe (8 caractères minimum)</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputBase}
        />
      </label>
      {error ? (
        <p role="alert" className={errorText}>
          {error}
        </p>
      ) : null}
      <button type="submit" className={btnPrimary} disabled={pending}>
        {pending ? 'Validation…' : 'Rejoindre l’agence'}
      </button>
    </form>
  );
}
