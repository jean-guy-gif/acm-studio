import 'server-only';

import { readBuyers } from '@/features/buyers/queries/get-buyers';
import { getBuyersProgress } from '@/features/buyers/queries/get-buyers-progress';
import { buyerReadiness } from '@/features/buyers/services/buyer-readiness';
import { NO_PROGRESS } from '@/features/buyers/services/buyer-progress';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';
import { createClient } from '@/lib/supabase/server';

// Mission 132 — « Reprendre contact avec la famille Keller » : une tâche par acquéreur actif de
// l'agence (M59), due 30 jours après son dernier échange, à venir sinon. Les mêmes faits que la
// fiche et la liste (`buyerReadiness`). Une lecture en échec ne fabrique aucune tâche et le dit
// (`failed`) : le compteur du menu se tait plutôt que de mentir (M98).
export async function getBuyerRecontactTasks(
  profile: { agency_id: string },
  now: Date,
): Promise<{ tasks: SuiviTask[]; failed: boolean }> {
  const { buyers, failed } = await readBuyers();
  if (failed) return { tasks: [], failed: true };
  if (buyers.length === 0) return { tasks: [], failed: false };
  const progress = await getBuyersProgress(
    await createClient(),
    profile.agency_id,
    buyers.map((buyer) => buyer.id),
  );
  if ([...progress.values()].some((facts) => facts.unread)) return { tasks: [], failed: true };
  const tasks: SuiviTask[] = [];
  for (const buyer of buyers) {
    const readiness = buyerReadiness(buyer, progress.get(buyer.id) ?? NO_PROGRESS, now);
    if (readiness.recontactOn == null) continue;
    tasks.push({
      kind: 'buyer_recontact',
      projectId: '',
      sellerName: '',
      dueOn: readiness.recontactOn,
      buyerId: buyer.id,
      buyerName: buyer.name,
      sinceDays: readiness.sinceDays ?? undefined,
    });
  }
  return { tasks, failed: false };
}
