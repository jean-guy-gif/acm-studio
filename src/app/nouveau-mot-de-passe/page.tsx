import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { NewPasswordForm } from '@/app/nouveau-mot-de-passe/new-password-form';
import { AuthCard } from '@/components/auth/auth-card';
import { getUser } from '@/lib/auth/get-user';

export const metadata: Metadata = { title: 'Nouveau mot de passe — ACM Studio' };

type NewPasswordPageProps = {
  searchParams: Promise<{ raison?: string }>;
};

// Mission 88 — ouverte par le lien de réinitialisation (via /auth/confirm, qui a ouvert la
// session). Sans session : le lien a expiré ou a déjà servi → connexion, avec la phrase qui le dit.
export default async function NewPasswordPage({ searchParams }: NewPasswordPageProps) {
  const user = await getUser();
  if (!user) {
    redirect('/login?error=lien-invalide');
  }
  const { raison } = await searchParams;

  return (
    <AuthCard
      kicker="Espace conseiller"
      title="Choisir un nouveau mot de passe"
      subtitle={
        raison === 'invitation'
          ? 'Votre accès à l’agence est créé. Il reste à enregistrer votre mot de passe.'
          : `Pour le compte ${user.email ?? ''}.`
      }
    >
      <NewPasswordForm />
    </AuthCard>
  );
}
