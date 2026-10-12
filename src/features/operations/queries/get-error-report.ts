import 'server-only';

import {
  ERRORS_WINDOW_DAYS,
  groupErrors,
  type ErrorGroup,
} from '@/features/operations/services/group-errors';
import {
  IMPORT_SOURCE,
  importFailureStats,
  type PortalFailureStats,
} from '@/features/operations/services/import-failures';
import { startOfParisYesterday } from '@/lib/paris-time';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Au-delà, la page le dit plutôt que de laisser croire qu'elle a tout compté.
const MAX_ROWS = 5000;

export type ErrorReport = { groups: ErrorGroup[]; total: number; truncated: boolean };

// Mission 100 — À APPELER APRÈS `requireOperator` : la clé service lit le journal de toutes les
// agences. Une lecture en échec lève : la page d'erreur vaut mieux qu'un « aucune erreur » faux.
export async function getErrorReport(now: Date = new Date()): Promise<ErrorReport> {
  const admin = createServiceRoleClient();
  const since = new Date(now.getTime() - ERRORS_WINDOW_DAYS * 86_400_000).toISOString();
  const [errors, agencies] = await Promise.all([
    admin
      .from('app_errors')
      .select('created_at, agency_id, source, page, message, version')
      .gte('created_at', since)
      // Mission 101 — les échecs de lecture d'annonce ne sont pas des pannes : comptés à part.
      .neq('source', IMPORT_SOURCE)
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS),
    admin.from('agencies').select('id, name'),
  ]);
  if (errors.error || agencies.error) {
    throw new Error('Lecture du journal des erreurs impossible.');
  }
  const names = new Map(agencies.data.map((agency) => [agency.id, agency.name]));
  return {
    groups: groupErrors(errors.data, names),
    total: errors.data.length,
    truncated: errors.data.length === MAX_ROWS,
  };
}

// La pastille du menu. null : le compte n'a rien pu lire — pas de pastille, plutôt qu'un zéro faux.
export async function countErrorsSinceYesterday(now: Date = new Date()): Promise<number | null> {
  try {
    const { count, error } = await createServiceRoleClient()
      .from('app_errors')
      .select('id', { count: 'exact', head: true })
      // Hors pastille : un robots.txt qui refuse n'est pas une erreur de l'outil (mission 101).
      .neq('source', IMPORT_SOURCE)
      .gte('created_at', startOfParisYesterday(now).toISOString());
    return error ? null : (count ?? 0);
  } catch {
    return null;
  }
}

// Mission 101 — À APPELER APRÈS `requireOperator`. Le taux réel d'échec de lecture par portail,
// sur 7 jours : les biens dont la page n'a pas pu être lue (journal, origine « import ») face aux
// concurrents créés depuis leur page (hors création depuis la recherche). Une lecture en échec lève.
export async function getImportFailureReport(
  now: Date = new Date(),
): Promise<PortalFailureStats[]> {
  const admin = createServiceRoleClient();
  const since = new Date(now.getTime() - ERRORS_WINDOW_DAYS * 86_400_000).toISOString();
  const [failures, imported] = await Promise.all([
    admin
      .from('app_errors')
      .select('message')
      .eq('source', IMPORT_SOURCE)
      .gte('created_at', since)
      .limit(MAX_ROWS),
    admin
      .from('comparables')
      .select('listing_url')
      .eq('imported_from_search', false)
      .not('listing_url', 'is', null)
      .gte('created_at', since)
      .limit(MAX_ROWS),
  ]);
  if (failures.error || imported.error) {
    throw new Error('Lecture des échecs d’import impossible.');
  }
  return importFailureStats(
    failures.data.map((row) => row.message),
    imported.data.map((row) => row.listing_url),
  );
}
