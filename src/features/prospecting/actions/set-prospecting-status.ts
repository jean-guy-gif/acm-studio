'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  findCard,
  getProspectingCards,
  moveCard,
} from '@/features/prospecting/queries/prospecting-card-store';
import { isProspectingMove } from '@/features/prospecting/services/prospecting-status';
import type { ProspectingCard } from '@/features/prospecting/types';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type SetProspectingStatusResult = { ok: true } | { ok: false; error: string };

const FAILURE = 'Le statut n’a pas été enregistré. Réessayez.';
const NOT_FOUND = 'Concurrent introuvable pour votre agence.';

function revalidate(card: ProspectingCard) {
  revalidatePath('/prospection');
  revalidatePath('/prospection/tournee');
  revalidatePath('/prospection/courriers');
  revalidatePath('/suivi');
  for (const seller of card.sellers) {
    revalidatePath(`/builder/${seller.projectId}`);
  }
}

// Mission 86 — le conseiller fait avancer (ou reculer d'un cran) la prospection d'un concurrent :
// dossier remis, rendez-vous obtenu, mandat rentré, pas intéressé. Le geste vient du navigateur :
// revalidé ici sur une liste, puis confronté au statut COURANT relu en base — jamais à celui que
// l'écran croyait. Lecture et écriture cadrées sur l'agence de l'appelant ; le dossier doit être
// conclu « mandat signé », seul cas où la prospection existe (M75).
// Mission 98 — le statut est celui de la CARTE : il s'écrit sur toutes les copies du même bien.
export async function setProspectingStatus(
  projectId: string,
  competitorId: string,
  move: unknown,
): Promise<SetProspectingStatusResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  if (!isProspectingMove(move)) {
    return { ok: false, error: FAILURE };
  }
  const card = findCard(await getProspectingCards(), projectId, competitorId);
  if (!card) {
    return { ok: false, error: NOT_FOUND };
  }
  const result = await moveCard(
    await createClient(),
    profile.agency_id,
    card,
    move,
    new Date().toISOString(),
  );
  if (!result.ok) {
    return result;
  }
  revalidate(card);
  return { ok: true };
}

export type MarkLettersHandedResult = { ok: true; count: number } | { ok: false; error: string };

const lettersSchema = z.array(z.uuid()).min(1).max(100);

// Mission 98 — « Marquer tous remis », après l'impression des courriers d'un bien vendeur. La
// liste vient du navigateur : chaque concurrent est relu, et seul un dossier encore « prêt à
// envoyer » passe à « remis » ; les autres sont laissés tels quels, et le compte le dit.
export async function markLettersHanded(
  projectId: string,
  competitorIds: unknown,
): Promise<MarkLettersHandedResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }
  const parsed = lettersSchema.safeParse(competitorIds);
  if (!parsed.success) {
    return { ok: false, error: FAILURE };
  }
  const cards = await getProspectingCards();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const done = new Set<ProspectingCard>();
  for (const competitorId of parsed.data) {
    const card = findCard(cards, projectId, competitorId);
    if (!card || done.has(card) || card.row.status !== 'ready') {
      continue;
    }
    const result = await moveCard(supabase, profile.agency_id, card, 'handed', now);
    if (result.ok) {
      done.add(card);
    }
  }
  if (done.size === 0) {
    return { ok: false, error: 'Aucun dossier prêt à envoyer n’a été marqué remis.' };
  }
  for (const card of done) {
    revalidate(card);
  }
  return { ok: true, count: done.size };
}
