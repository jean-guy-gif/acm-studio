'use server';

import { z } from 'zod';

import {
  DOSSIER_TOKEN_PATTERN,
  hashDossierToken,
} from '@/features/buyer-dossier/services/dossier-token';
import { DOSSIER_NO_CHOICE } from '@/features/buyer-dossier/types';
import {
  isPendingVisit,
  toVisitRequest,
} from '@/features/buyer-presentation/services/visit-request-row';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type DossierVisitsResult = { ok: true; requested: number } | { ok: false; error: string };

const FAILURE = 'Votre demande n’a pas pu être envoyée. Réessayez.';

// Mission 119 (partie B) — sur le lien public, l'acquéreur coche les biens qu'il veut visiter et
// envoie : SANS compte ni e-mail. Le jeton est relu (forme, condensat, expiration), les biens cochés
// sont ceux de la sélection du lien et d'elle seule, chaque coche crée une demande datée
// (`requested_during = 'dossier'`), visible sur Visites ; une demande déjà vivante sur un bien ne
// se redouble pas. Le conseiller est le seul à y donner suite. Aucune autre saisie que ces coches.
// Décision de Jean-Guy (25/10) : un acquéreur archivé ne reçoit plus de demande, ici comme depuis
// le conseiller (`visit-requests.ts`) — le jeton seul ne suffit pas.
export async function requestVisitsFromDossier(
  token: unknown,
  rawItemIds: unknown,
): Promise<DossierVisitsResult> {
  if (typeof token !== 'string' || !DOSSIER_TOKEN_PATTERN.test(token)) {
    return { ok: false, error: FAILURE };
  }
  const parsed = z.array(z.uuid()).max(3).safeParse(rawItemIds);
  if (!parsed.success) return { ok: false, error: FAILURE };
  const itemIds = [...new Set(parsed.data)];
  if (itemIds.length === 0) return { ok: false, error: DOSSIER_NO_CHOICE };

  const admin = createServiceRoleClient();
  const { data: link } = await admin
    .from('buyer_dossier_links')
    .select('agency_id, buyer_id, selection_id')
    .eq('token_hash', hashDossierToken(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (!link) return { ok: false, error: 'Ce lien n’est plus valable.' };
  const { data: buyer } = await admin
    .from('buyers')
    .select('id')
    .eq('id', link.buyer_id)
    .eq('agency_id', link.agency_id)
    .is('archived_at', null)
    .maybeSingle();
  if (!buyer) return { ok: false, error: 'Ce lien n’est plus valable.' };

  const [{ data: items }, { data: existing }] = await Promise.all([
    admin
      .from('buyer_selection_items')
      .select('id')
      .eq('selection_id', link.selection_id)
      .eq('agency_id', link.agency_id)
      // Mission 122 — un bien retiré de la sélection ne se demande plus.
      .is('removed_at', null)
      .in('id', itemIds),
    admin
      .from('buyer_visit_requests')
      .select('*')
      .eq('buyer_id', link.buyer_id)
      .in('buyer_selection_item_id', itemIds),
  ]);
  const alive = new Set(
    (existing ?? [])
      .map(toVisitRequest)
      .filter(isPendingVisit)
      .map((request) => request.itemId),
  );
  const toCreate = (items ?? []).map((item) => item.id).filter((id) => !alive.has(id));
  if (toCreate.length === 0) return { ok: true, requested: 0 };
  const { error } = await admin.from('buyer_visit_requests').insert(
    toCreate.map((itemId) => ({
      agency_id: link.agency_id,
      buyer_id: link.buyer_id,
      buyer_selection_item_id: itemId,
      requested_during: 'dossier',
    })),
  );
  if (error) return { ok: false, error: FAILURE };
  return { ok: true, requested: toCreate.length };
}
