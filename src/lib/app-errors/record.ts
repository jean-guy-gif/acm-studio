import 'server-only';

import { sanitizeErrorMessage, sanitizeErrorPage } from '@/lib/app-errors/sanitize';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { deployedCommit } from '@/lib/version';

// « import » (mission 101) : un échec de lecture d'annonce — pas une panne, compté à part.
export type AppErrorSource = 'server' | 'browser' | 'live' | 'import';

export type AppErrorEntry = {
  source: AppErrorSource;
  page: unknown;
  // L'erreur telle qu'elle est arrivée, ou son message : elle est nettoyée ICI, toujours.
  error: unknown;
  // Un préfixe technique écrit dans le dépôt (« [action] », « [searchStreamEstate] »).
  scope?: string;
  agencyId?: string | null;
  userId?: string | null;
};

// Mission 100 — écrit une ligne du journal des erreurs. Ne lève JAMAIS : un journal en panne ne
// doit pas ajouter une erreur à l'erreur. La table n'est écrite que par la clé service, donc
// seulement d'ici ; ni le message ni la page n'y entrent sans passer par le nettoyage.
export async function recordAppError(entry: AppErrorEntry): Promise<void> {
  try {
    const message = sanitizeErrorMessage(entry.error);
    const { error } = await createServiceRoleClient()
      .from('app_errors')
      .insert({
        source: entry.source,
        page: sanitizeErrorPage(entry.page),
        message: sanitizeErrorMessage(entry.scope ? `[${entry.scope}] ${message}` : message),
        agency_id: entry.agencyId ?? null,
        user_id: entry.userId ?? null,
        version: deployedCommit(),
      });
    if (error) {
      console.error('[app_errors] écriture refusée', error.code);
    }
  } catch {
    console.error('[app_errors] journal indisponible');
  }
}
