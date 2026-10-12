import 'server-only';

import { headers } from 'next/headers';

import { recordAppError } from '@/lib/app-errors/record';
import { getProfile } from '@/lib/auth/get-profile';

// Mission 100 — une erreur inattendue ATTRAPÉE par une action ou un service (elle ne remonte pas
// jusqu'à Next.js, qui ne la verrait donc pas) : elle va au journal du serveur, comme avant, et
// au journal des erreurs. À attendre (`await`) : sans cela, la fonction peut s'arrêter avant
// l'écriture. Ne lève jamais.
export async function reportServerError(scope: string, error: unknown): Promise<void> {
  console.error(`[${scope}]`, error instanceof Error ? error.message : error);
  let agencyId: string | null = null;
  let userId: string | null = null;
  let page: string | null = null;
  try {
    const profile = await getProfile();
    agencyId = profile?.agency_id ?? null;
    userId = profile?.id ?? null;
    // Une action est appelée depuis une page : c'est elle que dit l'en-tête.
    page = (await headers()).get('referer');
  } catch {
    // Hors d'une requête (compilation, tâche) : pas d'identité, pas de page.
  }
  await recordAppError({ source: 'server', page, error, scope, agencyId, userId });
}
