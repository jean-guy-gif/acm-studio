import { redirect } from 'next/navigation';

import { countOwnDossiers } from '@/features/welcome/queries/count-own-dossiers';
import { homeHref } from '@/features/welcome/services/welcome';

// Mission 97 — l'entrée de l'application : « Bienvenue » tant que le conseiller n'a aucun
// dossier, sinon ses dossiers. Sans réponse de la base, on ne détourne personne : ses dossiers.
export default async function ProtectedHomePage() {
  const count = await countOwnDossiers();
  redirect(count == null ? '/builder' : homeHref(count));
}
