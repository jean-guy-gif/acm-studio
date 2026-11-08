import { getToday } from '@/features/today/queries/get-today';

// Mission 145 (partie B) — la pastille du menu « Aujourd'hui » : le nombre de lignes de la page,
// dans « Mes tâches », lu une fois au chargement (jamais dans la mise en page, M128 B). Une lecture
// en échec ne compte rien : la pastille se tait plutôt que de mentir (M98). Jamais mise en cache.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const today = await getToday('mine').catch(() => null);
  const count = today && today.failed.length === 0 ? today.board.lineCount : null;
  return Response.json({ count }, { headers: { 'Cache-Control': 'private, no-store' } });
}
