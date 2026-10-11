'use server';

import { revalidatePath } from 'next/cache';

import {
  findCard,
  getProspectingCards,
} from '@/features/prospecting/queries/prospecting-card-store';
import { addressKey } from '@/features/prospecting/services/address-key';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type AddProspectingOppositionResult = { ok: true } | { ok: false; error: string };

const FAILURE = 'L’adresse n’a pas été ajoutée à la liste. Réessayez.';
const UNIQUE_VIOLATION = '23505';

// Mission 98 — « Ne plus solliciter » : l'adresse confirmée de cette carte entre dans la liste
// d'opposition de l'agence. L'adresse n'est jamais reçue du navigateur : elle est relue en base.
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

  const supabase = await createClient();
  const { error } = await supabase
    .from('prospecting_oppositions')
    .insert({ agency_id: profile.agency_id, address_key: key, created_by: profile.id });
  // Déjà sur la liste : la demande est tenue, rien à refaire.
  if (error && error.code !== UNIQUE_VIOLATION) {
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
