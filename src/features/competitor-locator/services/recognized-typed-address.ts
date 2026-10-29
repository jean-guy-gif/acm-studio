import 'server-only';

import {
  MANUAL_OPPOSITION_INCOMPLETE,
  TYPED_ADDRESS_CHOOSE_COMMUNE,
  parseManualAddress,
} from '@/features/prospecting/services/manual-opposition';
import { resolveManualOpposition } from '@/features/prospecting/services/resolve-typed-address';
import { reportServerError } from '@/lib/app-errors/report-server-error';

// L'adresse tapée, sa commune reconnue par le référentiel des communes. Écrite « rue, code postal
// commune » (le courrier a besoin du code postal) : `addressKey` en tire la même clé que celle
// d'une opposition inscrite à la main. Service des communes en panne : la commune tapée suffit
// (M104), et le journal le note — la commune seule, jamais l'adresse (M100) ; l'agence, l'auteur
// et l'heure y sont, et la fiche se retrouve par la date de son adresse (`locator_address_at`).
export async function recognizedTypedAddress(
  raw: unknown,
): Promise<{ ok: true; address: string } | { ok: false; error: string }> {
  const decision = await resolveManualOpposition(raw, null);
  if (decision.status === 'error') {
    return { ok: false, error: decision.error };
  }
  if (decision.status === 'choose') {
    return { ok: false, error: TYPED_ADDRESS_CHOOSE_COMMUNE };
  }
  const parts = parseManualAddress(raw);
  if (!parts) {
    return { ok: false, error: MANUAL_OPPOSITION_INCOMPLETE };
  }
  // La commune telle que le conseiller l'a tapée (« Juan-les-Pins » : c'est elle que le
  // propriétaire lit sur le courrier) ; le nom officiel seulement quand il n'a donné que le code
  // postal. La clé est la même : `addressKey` lit le nom d'usage comme la commune (M86).
  const commune = parts.commune ?? decision.display.slice(parts.street.length + 2);
  if (!decision.verified) {
    await reportServerError(
      'adresse saisie par le conseiller',
      new Error(`commune non vérifiée (service des communes indisponible) : ${decision.commune}`),
    );
  }
  return {
    ok: true,
    // Mission 109 — avec ou sans code postal, la commune tapée reste celle du courrier.
    address: parts.postalCode
      ? `${parts.street}, ${parts.postalCode} ${commune}`
      : `${parts.street}, ${commune}`,
  };
}
