import { addressKey } from '@/features/prospecting/services/address-key';

// Mission 102 — l'adresse tapée pour une opposition inscrite à la main. Pur. Il faut un numéro
// et une commune : « rue des Pins » bloquerait toute une rue, ou rien.
export const MANUAL_OPPOSITION_MAX_LENGTH = 200;

export const MANUAL_OPPOSITION_INCOMPLETE =
  'Saisissez l’adresse complète : numéro, rue, code postal, ville.';

export function manualOppositionKey(
  raw: unknown,
): { ok: true; key: string } | { ok: false; error: string } {
  const address = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
  const key = address.length <= MANUAL_OPPOSITION_MAX_LENGTH ? addressKey(address) : null;
  if (key == null || !/^\d/.test(key) || key.split(' ').length < 4) {
    return { ok: false, error: MANUAL_OPPOSITION_INCOMPLETE };
  }
  return { ok: true, key };
}
