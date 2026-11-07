import type { GeoPoint } from '@/features/competitor-search/types';
import { DEMO_LIVING_HERE } from '@/features/demo/data/living-here';
import type { LivingHereBlocks } from '@/features/living-here/types';

// Mission 142 — la fiche « Vivre ici » de la démo (M114) : au point de départ d'une des deux fiches
// relevées, ses données ; ailleurs, rien trouvé. Aucun appel réseau.
export function demoLivingHereBlocks(from: GeoPoint, now: Date): LivingHereBlocks {
  const readAt = now.toISOString();
  const found = DEMO_LIVING_HERE.find(
    (sheet) =>
      Math.abs(sheet.from.lat - from.lat) < 1e-6 && Math.abs(sheet.from.lon - from.lon) < 1e-6,
  );
  const ok = <T>(data: T) => ({ state: 'ok' as const, readAt, sourceDate: null, data });
  const empty = { state: 'empty' as const, readAt, sourceDate: null };
  if (!found)
    return { daily: empty, schools: empty, moves: empty, surroundings: empty, risks: empty };
  return {
    daily: ok(found.daily),
    schools: ok(found.schools),
    moves: ok(found.moves),
    surroundings: ok(found.surroundings),
    risks: ok(found.risks),
  };
}
