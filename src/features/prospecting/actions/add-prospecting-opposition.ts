'use server';

import { revalidatePath } from 'next/cache';

import { fetchCommunes } from '@/features/competitor-search/services/fetch-geo';
import {
  findCard,
  getProspectingCards,
} from '@/features/prospecting/queries/prospecting-card-store';
import { insertOppositions } from '@/features/prospecting/queries/insert-oppositions';
import { addressKey } from '@/features/prospecting/services/address-key';
import {
  MANUAL_OPPOSITION_CHOOSE,
  MANUAL_OPPOSITION_INCOMPLETE,
  MANUAL_OPPOSITION_NO_COMMUNE,
  decideManualOpposition,
  manualCommuneLookupName,
  parseManualAddress,
  unverifiedManualOpposition,
  type ManualCommune,
  type ManualOppositionDecision,
} from '@/features/prospecting/services/manual-opposition';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type AddProspectingOppositionResult = { ok: true } | { ok: false; error: string };

// Mission 104 — dit quand l'écriture n'est pas confirmée en base : rien n'est promis.
const FAILURE =
  'L’inscription n’a pas été confirmée : l’adresse n’est pas sur la liste « Ne plus solliciter ». Réessayez.';

// Mission 98 — « Ne plus solliciter » : l'adresse confirmée de cette carte entre dans la liste
// d'opposition de l'agence. L'adresse n'est jamais reçue du navigateur : elle est relue en base.
// Mission 102 — avec elle, l'identité de l'annonce de chaque copie de la carte : l'opposition
// suit le BIEN, y compris dans un futur dossier qui désigne la même annonce.
// La liste ne se vide pas depuis l'écran (l'effacement suit docs/PROCEDURE_EFFACEMENT.md).
export async function addProspectingOpposition(
  projectId: string,
  competitorId: string,
): Promise<AddProspectingOppositionResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const card = findCard(await getProspectingCards(), projectId, competitorId);
  if (!card) {
    return { ok: false, error: 'Concurrent introuvable pour votre agence.' };
  }
  // Mission 107 — toujours possible : sans adresse confirmée, l'opposition porte sur les annonces
  // de la carte (le bien est bloqué partout où elles apparaissent) ; la clé d'adresse s'y
  // ajoutera quand le Localisateur la confirmera (competitor-locations.ts).
  const key = card.row.confirmed ? addressKey(card.row.address) : null;
  const listingKeys = card.copies.flatMap((copy) => copy.row.listingKey ?? []);
  if (key == null && listingKeys.length === 0) {
    return {
      ok: false,
      error: 'Ni adresse confirmée ni annonce : saisissez l’adresse du bien pour l’inscrire.',
    };
  }

  const inserted = await insertOppositions(
    await createClient(),
    { agencyId: profile.agency_id, profileId: profile.id },
    {
      addressKey: key,
      listingKeys,
    },
  );
  if (!inserted) {
    return { ok: false, error: FAILURE };
  }

  revalidatePath('/prospection');
  revalidatePath('/prospection/tournee');
  revalidatePath('/prospection/courriers');
  revalidatePath('/suivi');
  for (const seller of card.sellers) {
    revalidatePath(`/builder/${seller.projectId}`);
  }
  return { ok: true };
}

export type ManualOppositionCheck =
  | { ok: true; status: 'ready'; display: string; verified: boolean }
  | { ok: true; status: 'choose'; communes: ManualCommune[] }
  | { ok: false; error: string };

// L'adresse tapée, relue ici : sa commune est reconnue par le référentiel des communes
// (geo.api.gouv.fr), jamais crue sur parole. Une panne du référentiel n'inscrit rien.
async function resolveManualOpposition(
  raw: unknown,
  rawCommuneCode: unknown,
): Promise<ManualOppositionDecision> {
  const parts = parseManualAddress(raw);
  if (!parts) {
    return { status: 'error', error: MANUAL_OPPOSITION_INCOMPLETE };
  }
  if (parts.postalCode == null && parts.commune == null) {
    return { status: 'error', error: MANUAL_OPPOSITION_NO_COMMUNE };
  }
  const found = await fetchCommunes(
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

// Mission 103 — AVANT d'inscrire, l'écran montre l'adresse comprise (« 14 chemin des Oliviers,
// Cagnes-sur-Mer — Inscrire ? »), ou demande la commune quand le code postal en couvre plusieurs.
// Rien n'est écrit ici.
export async function checkManualOpposition(
  raw: unknown,
  communeCode?: unknown,
): Promise<ManualOppositionCheck> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const decision = await resolveManualOpposition(raw, communeCode);
  if (decision.status === 'error') {
    return { ok: false, error: decision.error };
  }
  return decision.status === 'ready'
    ? { ok: true, status: 'ready', display: decision.display, verified: decision.verified }
    : { ok: true, status: 'choose', communes: decision.communes };
}

// Mission 102 — une opposition inscrite À LA MAIN, pour une adresse qui n'est sur aucune carte :
// un propriétaire qui appelle. Seule la clé de l'adresse est gardée ; l'adresse tapée ne l'est pas.
// Mission 103 — la clé n'est jamais reçue du navigateur : l'adresse est relue et sa commune
// reconnue de nouveau, puis la clé est construite comme celle des cartes (`addressKey`).
export async function addManualOpposition(
  raw: unknown,
  communeCode?: unknown,
): Promise<AddProspectingOppositionResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const decision = await resolveManualOpposition(raw, communeCode);
  if (decision.status === 'error') {
    return { ok: false, error: decision.error };
  }
  if (decision.status === 'choose') {
    return { ok: false, error: MANUAL_OPPOSITION_CHOOSE };
  }
  const inserted = await insertOppositions(
    await createClient(),
    { agencyId: profile.agency_id, profileId: profile.id },
    {
      addressKey: decision.key,
      listingKeys: [],
      communeUnverified: !decision.verified,
      communeTyped: decision.verified ? null : decision.commune,
    },
  );
  if (!inserted) {
    return { ok: false, error: FAILURE };
  }
  revalidatePath('/prospection');
  revalidatePath('/prospection/tournee');
  revalidatePath('/prospection/courriers');
  revalidatePath('/suivi');
  revalidatePath('/builder', 'layout');
  return { ok: true };
}
