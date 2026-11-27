import {
  arrondissementLabel,
  readArrondissementName,
  resolveArrondissement,
} from '@/features/competitor-search/utils/arrondissements';
import { normalizeCommuneName } from '@/features/competitor-search/utils/commune-name';
import { addressKey } from '@/features/prospecting/services/address-key';
import { manualCommuneLookupName } from '@/features/prospecting/services/manual-opposition';

// Mission 105 — les oppositions « commune non vérifiée » (M104), revérifiées chaque nuit dès que
// le service des communes répond. Pur.
//   • commune reconnue : le repère « non vérifiée » est retiré — la clé ne change pas ;
//   • commune inconnue : le repère « commune inconnue » est posé, le manager le voit ;
//   • service muet : rien ne change, on réessaie la nuit suivante.
// Une opposition n'est jamais retirée ni affaiblie par cette vérification.

export const UNKNOWN_COMMUNE_NOTICE = 'Opposition à vérifier\u00a0: commune inconnue';

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

// Mission 107 — le manager corrige la commune d'une opposition « commune inconnue ». La rue est
// la clé gardée moins la commune tapée ; la nouvelle clé est construite par la fonction des
// cartes (`addressKey`), avec la commune reconnue. null : rien à corriger sûrement (commune non
// reconnue, rue introuvable dans la clé, arrondissement manquant).
export function correctedOppositionKey(input: {
  addressKey: string;
  communeTyped: string | null;
  correctedCommune: string;
  found: { nom: string }[];
}): string | null {
  const typed = input.communeTyped ? addressKey(input.communeTyped) : null;
  const key = addressKey(input.addressKey);
  if (!typed || !key || !key.endsWith(` ${typed}`)) return null;
  const street = key.slice(0, key.length - typed.length - 1);
  const wanted = manualCommuneLookupName(input.correctedCommune);
  const commune = input.found.find((candidate) => normalizeCommuneName(candidate.nom) === wanted);
  if (!commune || !/^\d/.test(street)) return null;
  let name = commune.nom;
  if (
    readArrondissementName(input.correctedCommune) != null ||
    readArrondissementName(name) != null
  ) {
    const arrondissement = resolveArrondissement(input.correctedCommune, null);
    if (arrondissement == null) return null;
    name = arrondissementLabel(arrondissement);
  }
  return addressKey(`${street}, ${name}`);
}
