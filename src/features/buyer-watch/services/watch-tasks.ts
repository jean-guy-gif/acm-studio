import { watchKey, type WatchFind } from '@/features/buyer-watch/services/watch-finds';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import type { SuiviTask } from '@/features/meeting-conclusion/services/suivi-tasks';

// Mission 136 — ce que la veille fait naître dans « À faire aujourd'hui » (M130). Pur.
//   • une tâche par acquéreur : « 2 nouveaux biens pour la famille Keller », qui ouvre ses biens
//     idéaux avec ces biens en tête ;
//   • un bien trouvé pour PLUSIEURS acquéreurs fait une seule tâche, « 2 acquéreurs pour la maison
//     de Mougins (220 m², 1 720 000 €) » (M134), et n'est plus compté dans leurs tâches à eux ;
// due le jour du passage, jamais en retard ; elle se vide quand le bien est retenu, proposé ou
// refusé, ou au passage suivant.

export type WatchRunFinds = { buyerId: string; ranAt: string; finds: WatchFind[] };

export function watchTasks(runs: WatchRunFinds[], names: Map<string, string>): SuiviTask[] {
  const buyersOf = new Map<string, { buyerId: string; ranAt: string; find: WatchFind }[]>();
  for (const run of runs) {
    for (const find of run.finds) {
      const key = watchKey(find.url);
      const list = buyersOf.get(key) ?? [];
      if (!list.some((entry) => entry.buyerId === run.buyerId)) {
        list.push({ buyerId: run.buyerId, ranAt: run.ranAt, find });
      }
      buyersOf.set(key, list);
    }
  }
  const tasks: SuiviTask[] = [];
  const shared = new Set<string>();
  for (const [key, entries] of buyersOf) {
    if (entries.length < 2) continue;
    shared.add(key);
    const find = entries[0]!.find;
    const latest = entries.reduce((max, entry) => (entry.ranAt > max ? entry.ranAt : max), '');
    tasks.push({
      kind: 'buyer_watch',
      projectId: '',
      sellerName: '',
      dueOn: parisDay(new Date(latest)),
      count: entries.length,
      propertyKey: key,
      property: { propertyType: find.propertyType, city: find.city },
      figures: { surfaceArea: find.surfaceArea, price: find.price },
      watchBuyers: entries.map((entry) => ({
        id: entry.buyerId,
        name: names.get(entry.buyerId) ?? 'Acquéreur',
      })),
    });
  }
  for (const run of runs) {
    const own = run.finds.filter((find) => !shared.has(watchKey(find.url)));
    if (own.length === 0) continue;
    tasks.push({
      kind: 'buyer_watch',
      projectId: '',
      sellerName: '',
      dueOn: parisDay(new Date(run.ranAt)),
      count: own.length,
      buyerId: run.buyerId,
      buyerName: names.get(run.buyerId) ?? null,
    });
  }
  return tasks;
}
