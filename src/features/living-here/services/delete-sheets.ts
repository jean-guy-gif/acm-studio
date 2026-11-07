import 'server-only';

import { reportServerError } from '@/lib/app-errors/report-server-error';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 142 — une fiche « Vivre ici » n'a pas de lien en base vers son dossier ou son concurrent
// (sa clé est un texte, relecture du gardien-sql du 07/11) : la suppression d'un concurrent, la
// remise à zéro de la démo et l'effacement réel l'effacent par sa clé. Une fiche d'une annonce
// (`listing:…`) reste : elle ne porte que des données publiques autour du quartier, et un autre
// dossier ou acquéreur de l'agence peut la lire. Un échec entre au journal, sans bloquer.
export async function deleteLivingHereSheets(agencyId: string, keys: string[]): Promise<void> {
  const own = keys.filter((key) => key.startsWith('project:') || key.startsWith('competitor:'));
  if (own.length === 0) return;
  const { error } = await createServiceRoleClient()
    .from('living_here_sheets')
    .delete()
    .eq('agency_id', agencyId)
    .in('property_key', own);
  if (error) await reportServerError('living-here:delete', error);
}
