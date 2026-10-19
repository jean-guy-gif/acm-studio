import { redirect } from 'next/navigation';

import { getProfile } from '@/lib/auth/get-profile';
import { countOwnDossiers } from '@/features/welcome/queries/count-own-dossiers';
import { homeHref } from '@/features/welcome/services/welcome';

// Mission 97 — l'entrée de l'application : « Bienvenue » tant que le conseiller n'a aucun
// dossier, sinon ses dossiers. Sans réponse de la base, on ne détourne personne : ses dossiers.
export default async function ProtectedHomePage() {
  const [count, profile] = await Promise.all([countOwnDossiers(), getProfile()]);
  redirect(count == null ? '/builder' : homeHref(count, profile?.expert_mode === true));
}
