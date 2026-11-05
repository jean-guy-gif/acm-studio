import { getSuiviTaskCount } from '@/features/meeting-conclusion/queries/get-suivi-task-count';

// Mission 130 — le nombre de tâches dues du Suivi, pour la pastille du menu, lu une fois au
// chargement de la page (jamais dans la mise en page : M128 B). Le compte de l'agence de
// l'appelant seulement ; rien d'autre ne sort. Jamais mis en cache.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const count = await getSuiviTaskCount().catch(() => null);
  return Response.json({ count }, { headers: { 'Cache-Control': 'private, no-store' } });
}
