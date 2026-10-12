import 'server-only';

import { reportServerError } from '@/lib/app-errors/report-server-error';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 100 — chaque annonce facturée est comptée. La table ne s'écrit que d'ici, avec la clé
// service, APRÈS que l'action a vérifié l'appelant et son agence : le navigateur ne peut ni
// ajouter ni retirer une ligne de consommation. Un échec d'écriture est une vraie panne (de
// l'argent dépensé et non compté) : il entre au journal des erreurs.
export async function recordStreamEstateUsage(usage: {
  agencyId: string;
  projectId: string;
  userId: string;
  adverts: number;
}): Promise<void> {
  if (!Number.isInteger(usage.adverts) || usage.adverts <= 0) return;
  try {
    const { error } = await createServiceRoleClient().from('stream_estate_usage').insert({
      agency_id: usage.agencyId,
      project_id: usage.projectId,
      user_id: usage.userId,
      adverts: usage.adverts,
    });
    if (error) await reportServerError('recordStreamEstateUsage', error);
  } catch (error) {
    await reportServerError('recordStreamEstateUsage', error);
  }
}
