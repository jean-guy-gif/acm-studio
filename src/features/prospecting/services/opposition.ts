import { addressKey } from '@/features/prospecting/services/address-key';
import { shortDate } from '@/features/prospecting/services/prospecting-status';

// Mission 98 — « Ne plus solliciter » : la liste d'opposition de l'agence, sur l'adresse
// normalisée. Elle vaut pour TOUS les dossiers, présents et futurs : une adresse de la liste ne
// reçoit plus de courrier et sort de la tournée. À ne pas confondre avec « Pas intéressé », qui
// dit « pas maintenant, pour ce bien » et ne bloque pas un contact futur. Pur.

// Clé d'adresse → date de la demande.
export type Oppositions = ReadonlyMap<string, string>;

export const NO_OPPOSITIONS: Oppositions = new Map();

// La date de la demande si cette adresse est sur la liste, sinon null. L'adresse compte dès
// qu'elle est connue, confirmée ou non : dans le doute, on ne sollicite pas.
export function opposedOn(
  address: string | null | undefined,
  oppositions: Oppositions,
): string | null {
  const key = addressKey(address);
  return key == null ? null : (oppositions.get(key) ?? null);
}

// « Ne plus solliciter (demandé le 11/10) »
export function oppositionBadge(requestedOn: string): string {
  const date = shortDate(requestedOn);
  return date ? `Ne plus solliciter (demandé le ${date})` : 'Ne plus solliciter';
}

export const OPPOSED_MESSAGE = 'Ce propriétaire a demandé à ne plus être sollicité';
