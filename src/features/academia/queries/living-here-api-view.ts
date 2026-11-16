import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  livingHereExpiry,
  type LivingHereExpiry,
} from '@/features/academia/services/living-here-age';
import { academiaLivingHereUrl } from '@/lib/academia';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';

// Mission 157 — ce que la carte « Le bien dans Academia » montre du lien créé par l'API, au chargement
// de Bien vendeur (planche M157-1) : le lien du mandat et son expiration s'il vient de l'API, une
// demande en préparation, ou rien encore. L'âge de l'expiration est calculé ici, au serveur (jamais
// au rendu du navigateur).

export type LivingHereApiInitial =
  | { kind: 'ready'; url: string; expiresAt: string; expiry: LivingHereExpiry }
  | { kind: 'waiting' }
  // `stale` : un lien créé pour une adresse du bien qui a changé depuis : oublié (contrat §3.3).
  | { kind: 'idle'; stale: boolean }
  // La demande n'a pas pu être lue : dit, jamais lu comme « rien » (M98).
  | { kind: 'unread' };

export async function livingHereApiInitial(
  client: SupabaseClient<Database>,
  agencyId: string,
  projectId: string,
  projectUrl: string | null | undefined,
  propertyAddress: string | null,
  now: Date = new Date(),
): Promise<LivingHereApiInitial> {
  const { data, error } = await client
    .from('project_academia_requests')
    .select('state, property_address, link_url, link_expires_at')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (error) {
    await reportServerError('academia:read-api-view', error);
    return { kind: 'unread' };
  }
  if (!data) return { kind: 'idle', stale: false };
  const url = academiaLivingHereUrl(projectUrl);
  if (data.property_address !== propertyAddress) {
    return { kind: 'idle', stale: !!url && data.link_url === url };
  }
  if (data.link_url && data.link_expires_at && url && data.link_url === url) {
    const expiry = livingHereExpiry(data.link_expires_at, now);
    if (expiry) return { kind: 'ready', url, expiresAt: data.link_expires_at, expiry };
  }
  if (data.state === 'en_cours') return { kind: 'waiting' };
  return { kind: 'idle', stale: false };
}
