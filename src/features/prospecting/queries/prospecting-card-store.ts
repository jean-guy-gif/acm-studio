import 'server-only';

import { cache } from 'react';

import { getSuiviDossiers } from '@/features/meeting-conclusion/queries/get-suivi-dossiers';
import { getAgencyProspecting } from '@/features/prospecting/queries/get-agency-prospecting';
import { cardDates } from '@/features/prospecting/services/group-prospecting';
import { OPPOSED_MESSAGE } from '@/features/prospecting/services/opposition';
import {
  applyProspectingMove,
  type ProspectingMove,
} from '@/features/prospecting/services/prospecting-status';
import type { ProspectingCard } from '@/features/prospecting/types';
import type { createClient } from '@/lib/supabase/server';

type Client = Awaited<ReturnType<typeof createClient>>;

// Mission 98 — les cartes de Prospection de l'agence de l'appelant, RELUES en base : une action
// ne se fie jamais au regroupement que l'écran croyait. Seuls les mandats signés y entrent (M75).
// Mission 111 — lu une fois par requête : le lot de courriers interroge la carte de chacun.
export const getProspectingCards = cache(async (): Promise<ProspectingCard[]> => {
  return (await getAgencyProspecting(await getSuiviDossiers())).cards;
});

// Mission 111 — l'opposition suit la CARTE entière, comme le lot et la tournée : une annonce
// retenue dans deux mandats, adresse confirmée sur un seul, inscrite « Ne plus solliciter », ne
// laisse partir aucun courrier, d'aucune de ses copies. La date de la demande, ou null.
export async function cardOpposedOn(
  projectId: string,
  competitorId: string,
): Promise<string | null> {
  return findCard(await getProspectingCards(), projectId, competitorId)?.row.opposedOn ?? null;
}

// Les lignes « Concurrents à prospecter » d'un dossier, chacune avec l'opposition de sa carte.
export async function withCardOpposition<T extends { id: string; opposedOn: string | null }>(
  projectId: string,
  rows: T[],
): Promise<T[]> {
  if (rows.length === 0) return rows;
  const cards = await getProspectingCards();
  return rows.map((row) => ({
    ...row,
    opposedOn: row.opposedOn ?? findCard(cards, projectId, row.id)?.row.opposedOn ?? null,
  }));
}

// La carte qui contient ce concurrent de ce dossier ; null s'il n'est pas à prospecter.
export function findCard(
  cards: ProspectingCard[],
  projectId: string,
  competitorId: string,
): ProspectingCard | null {
  return (
    cards.find((card) =>
      card.copies.some(
        (copy) => copy.row.id === competitorId && copy.seller.projectId === projectId,
      ),
    ) ?? null
  );
}

export type MoveCardResult = { ok: true } | { ok: false; error: string };

// Un statut posé sur une carte vaut pour toutes ses copies : les quatre dates de la carte sont
// écrites sur chacune, qui disent ensuite toutes la même chose. Une adresse de la liste « Ne
// plus solliciter » ne bouge plus.
export async function moveCard(
  supabase: Client,
  agencyId: string,
  card: ProspectingCard,
  move: ProspectingMove,
  now: string,
): Promise<MoveCardResult> {
  if (card.row.opposedOn != null) {
    return { ok: false, error: `${OPPOSED_MESSAGE}.` };
  }
  const result = applyProspectingMove(
    card.row.status,
    move,
    now,
    card.row.step,
    card.row.collaborationDeclinedAt != null,
  );
  if (!result.ok) {
    return result;
  }
  const ids = card.copies.map((copy) => copy.row.id);
  const { data, error } = await supabase
    .from('comparables')
    .update({ ...cardDates(card.copies.map((copy) => copy.row)), ...result.patch })
    .in('id', ids)
    .eq('agency_id', agencyId)
    .eq('is_selected', true)
    .select('id');
  if (error || !data || data.length !== ids.length) {
    return { ok: false, error: 'Le statut n’a pas été enregistré. Réessayez.' };
  }
  return { ok: true };
}
