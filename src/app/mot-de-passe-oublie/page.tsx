import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthCard } from '@/components/auth/auth-card';
import { SubmitButton } from '@/components/submit-button';
import { btnPrimary, fieldLabel, inputBase, link } from '@/components/ui/styles';

import { requestPasswordReset } from './actions';

export const metadata: Metadata = { title: 'Mot de passe oublié — ACM Studio' };

// Mission 88 — un conseiller qui a oublié son mot de passe n'est pas bloqué. Page publique : elle
// ne lit ni la session ni la base.
export default function ForgottenPasswordPage() {
  return (
    <AuthCard
      kicker="Espace conseiller"
      title="Mot de passe oublié"
      subtitle="Indiquez votre adresse e-mail : nous vous envoyons un lien pour en choisir un nouveau."
    >
      <form action={requestPasswordReset} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Adresse e-mail</span>
          <input type="email" name="email" required autoComplete="email" className={inputBase} />
        </label>
        <SubmitButton pendingLabel="Envoi…" className={`${btnPrimary} mt-1 w-full py-2.5`}>
          Recevoir le lien
        </SubmitButton>
        <Link href="/login" className={`${link} self-center text-sm`}>
          ← Retour à la connexion
        </Link>
      </form>
    </AuthCard>
  );
}
