import { normalizeCommuneName } from '@/features/competitor-search/utils/commune-name';
import { manualCommuneLookupName } from '@/features/prospecting/services/manual-opposition';

// Mission 105 — les oppositions « commune non vérifiée » (M104), revérifiées chaque nuit dès que
// le service des communes répond. Pur.
//   • commune reconnue : le repère « non vérifiée » est retiré — la clé ne change pas ;
//   • commune inconnue : le repère « commune inconnue » est posé, le manager le voit ;
//   • service muet : rien ne change, on réessaie la nuit suivante.
// Une opposition n'est jamais retirée ni affaiblie par cette vérification.

export const UNKNOWN_COMMUNE_NOTICE = 'Opposition à vérifier : commune inconnue';

export type RecheckDecision = 'verified' | 'unknown' | 'retry';

export function recheckDecision(
  typedCommune: string,
  found: { nom: string }[] | null,
): RecheckDecision {
  if (found == null) return 'retry';
  const wanted = manualCommuneLookupName(typedCommune);
  return found.some((commune) => normalizeCommuneName(commune.nom) === wanted)
    ? 'verified'
    : 'unknown';
}

// Le jeton de la tâche planifiée (Vercel Cron envoie « Authorization: Bearer <CRON_SECRET> »).
// Sans secret configuré, personne n'entre.
export function isCronAuthorized(
  authorization: string | null,
  secret: string | undefined,
): boolean {
  return secret != null && secret.length >= 16 && authorization === `Bearer ${secret}`;
}
