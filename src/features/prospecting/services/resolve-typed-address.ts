import 'server-only';

import { fetchCommunes } from '@/features/competitor-search/services/fetch-geo';
import {
  MANUAL_OPPOSITION_INCOMPLETE,
  MANUAL_OPPOSITION_NO_COMMUNE,
  decideManualOpposition,
  manualCommuneLookupName,
  parseManualAddress,
  unverifiedManualOpposition,
  type ManualOppositionDecision,
} from '@/features/prospecting/services/manual-opposition';

// Mission 108 — partagé par l'opposition à la main (M103) et l'adresse saisie par le conseiller.
// L'adresse tapée, relue ici : sa commune est reconnue par le référentiel des communes
// (geo.api.gouv.fr), jamais crue sur parole. Une panne du référentiel n'inscrit rien.
// Mission 114 — `lookup` : le référentiel de l'agence (public, ou la table locale de la
// démonstration), choisi par l'appelant sur le repère de l'agence.
export async function resolveManualOpposition(
  raw: unknown,
  rawCommuneCode: unknown,
  lookup: typeof fetchCommunes = fetchCommunes,
): Promise<ManualOppositionDecision> {
  const parts = parseManualAddress(raw);
  if (!parts) {
    return { status: 'error', error: MANUAL_OPPOSITION_INCOMPLETE };
  }
  if (parts.postalCode == null && parts.commune == null) {
    return { status: 'error', error: MANUAL_OPPOSITION_NO_COMMUNE };
  }
  const found = await lookup(
    parts.postalCode != null
      ? { postalCode: parts.postalCode }
      : { name: manualCommuneLookupName(parts.commune ?? '') },
  );
  if (found == null) {
    // Mission 104 — le service ne répond pas, même au second essai : la commune tapée suffit.
    return unverifiedManualOpposition(parts);
  }
  const communes = found
    .filter((commune) => typeof commune.code === 'string' && typeof commune.nom === 'string')
    .map((commune) => ({ code: commune.code, name: commune.nom }));
  const chosenCode =
    typeof rawCommuneCode === 'string' && /^[0-9AB]{5}$/.test(rawCommuneCode)
      ? rawCommuneCode
      : null;
  return decideManualOpposition(parts, communes, chosenCode);
}
