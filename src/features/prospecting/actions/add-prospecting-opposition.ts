'use server';

import { revalidatePath } from 'next/cache';

import {
  findCard,
  getProspectingCards,
} from '@/features/prospecting/queries/prospecting-card-store';
import { insertOppositions } from '@/features/prospecting/queries/insert-oppositions';
import { addressKey } from '@/features/prospecting/services/address-key';
import { manualOppositionKey } from '@/features/prospecting/services/manual-opposition';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type AddProspectingOppositionResult = { ok: true } | { ok: false; error: string };

const FAILURE = 'L’adresse n’a pas été ajoutée à la liste. Réessayez.';

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
  const key = card.row.confirmed ? addressKey(card.row.address) : null;
  if (key == null) {
    return {
      ok: false,
      error: 'Confirmez d’abord l’adresse : la liste porte sur l’adresse du bien.',
    };
  }

  const inserted = await insertOppositions(
    await createClient(),
    { agencyId: profile.agency_id, profileId: profile.id },
    {
      addressKey: key,
      listingKeys: card.copies.flatMap((copy) => copy.row.listingKey ?? []),
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

// Mission 102 — une opposition inscrite À LA MAIN, pour une adresse qui n'est sur aucune carte :
// un propriétaire qui appelle. Seule la clé de l'adresse est gardée ; l'adresse tapée ne l'est pas.
export async function addManualOpposition(raw: unknown): Promise<AddProspectingOppositionResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const parsed = manualOppositionKey(raw);
  if (!parsed.ok) {
    return parsed;
  }
  const inserted = await insertOppositions(
    await createClient(),
    { agencyId: profile.agency_id, profileId: profile.id },
    { addressKey: parsed.key, listingKeys: [] },
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
