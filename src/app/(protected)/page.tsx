import { redirect } from 'next/navigation';

import { getProfile } from '@/lib/auth/get-profile';
import { countOwnDossiers } from '@/features/welcome/queries/count-own-dossiers';
import { homeHref } from '@/features/welcome/services/welcome';

// Mission 97 — l'entrée de l'application : « Bienvenue » tant que le conseiller n'a aucun
// dossier, sinon « Aujourd'hui » (M145). Sans réponse de la base, on ne détourne personne.
export default async function ProtectedHomePage() {
  const [count, profile] = await Promise.all([countOwnDossiers(), getProfile()]);
  redirect(count == null ? '/aujourdhui' : homeHref(count, profile?.expert_mode === true));
}
