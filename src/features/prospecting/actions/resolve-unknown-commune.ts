'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { geoProviderFor } from '@/features/competitor-search/services/geo-provider';
import { manualCommuneLookupName } from '@/features/prospecting/services/manual-opposition';
import { correctedOppositionKey } from '@/features/prospecting/services/opposition-recheck';
import { isManagerRole } from '@/features/team/services/role';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type ResolveUnknownCommuneResult = { ok: true } | { ok: false; error: string };

const MANAGERS_ONLY = 'Seul un manager de l’agence peut traiter cette alerte.';

// Mission 107 — une opposition « commune inconnue » se corrige, par un manager non retiré de son
// agence. La liste n'est jamais modifiable depuis le navigateur (M102) : l'écriture passe par la
// clé service, après le garde. Rien n'est retiré ni affaibli : l'ancienne ligne reste, son alerte
// est seulement levée.
async function scope(id: unknown) {
  const profile = await getProfile();
  if (!profile || profile.removed_at || !isManagerRole(profile.role)) return null;
  if (!z.uuid().safeParse(id).success) return null;
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from('prospecting_oppositions')
    .select('id, address_key, commune_typed')
    .eq('id', id as string)
    .eq('agency_id', profile.agency_id)
    .eq('commune_unknown', true)
    .maybeSingle();
  return data ? { profile, admin, row: data } : null;
}

const lift = { commune_unknown: false, commune_unverified: false };

// La bonne commune : la clé est reconstruite par la fonction des cartes, une opposition s'ajoute
// avec elle, et l'alerte disparaît.
export async function correctOppositionCommune(
  id: string,
  rawCommune: unknown,
): Promise<ResolveUnknownCommuneResult> {
  const s = await scope(id);
  if (!s) return { ok: false, error: MANAGERS_ONLY };
  const commune = typeof rawCommune === 'string' ? rawCommune.replace(/\s+/g, ' ').trim() : '';
  if (commune.length < 2 || commune.length > 120 || s.row.address_key == null) {
    return { ok: false, error: 'Tapez le nom de la commune.' };
  }
  // Mission 114 — le référentiel des communes de l'agence (public, ou local en démonstration).
  const geo = await geoProviderFor(s.profile.agency_id);
  const found = await geo.fetchCommunes({ name: manualCommuneLookupName(commune) });
  if (found == null) {
    return {
      ok: false,
      error: 'Service des communes indisponible\u00a0: réessayez dans un instant.',
    };
  }
  const key = correctedOppositionKey({
    addressKey: s.row.address_key,
    communeTyped: s.row.commune_typed,
    correctedCommune: commune,
    found,
  });
  if (key == null) {
    return {
      ok: false,
      error:
        'Commune non reconnue\u00a0: vérifiez son nom (et l’arrondissement à Paris, Lyon, Marseille).',
    };
  }
  const { error: insertError } = await s.admin
    .from('prospecting_oppositions')
    .insert({ agency_id: s.profile.agency_id, created_by: s.profile.id, address_key: key });
  if (insertError && insertError.code !== '23505') {
    await reportServerError('correctOppositionCommune', insertError);
    return { ok: false, error: 'La correction n’a pas été enregistrée. Réessayez.' };
  }
  const { error } = await s.admin
    .from('prospecting_oppositions')
    .update({ ...lift, commune_checked_at: new Date().toISOString() })
    .eq('id', s.row.id);
  if (error) {
    await reportServerError('correctOppositionCommune', error);
    return { ok: false, error: 'La correction n’a pas été enregistrée. Réessayez.' };
  }
  revalidatePath('/admin');
  revalidatePath('/prospection');
  return { ok: true };
}

// « Traitée » : l'alerte disparaît, l'opposition reste telle quelle (et n'est plus revérifiée).
export async function markOppositionAlertTreated(id: string): Promise<ResolveUnknownCommuneResult> {
  const s = await scope(id);
  if (!s) return { ok: false, error: MANAGERS_ONLY };
  const { error } = await s.admin
    .from('prospecting_oppositions')
    .update({ ...lift, commune_checked_at: new Date().toISOString() })
    .eq('id', s.row.id);
  if (error) {
    await reportServerError('markOppositionAlertTreated', error);
    return { ok: false, error: 'L’alerte n’a pas été levée. Réessayez.' };
  }
  revalidatePath('/admin');
  return { ok: true };
}
