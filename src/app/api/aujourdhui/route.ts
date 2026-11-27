import { getToday } from '@/features/today/queries/get-today';

// Mission 145 (partie B) — la pastille du menu « Aujourd'hui », dans « Mes tâches », lue une fois
// au chargement (jamais dans la mise en page, M128 B). Une lecture en échec ne compte rien : la
// pastille se tait plutôt que de mentir (M98). Jamais mise en cache. La refonte, lot F (Jean-Guy,
// 26/11) — un même chiffre partout : le nombre de TÂCHES que liste la page (une série de trois
// relances en compte trois), dont « N choses à faire » de Vendeurs et d'Acquéreurs dit sa part.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const today = await getToday('mine').catch(() => null);
  const count = today && today.failed.length === 0 ? today.board.taskCount : null;
  return Response.json({ count }, { headers: { 'Cache-Control': 'private, no-store' } });
}
