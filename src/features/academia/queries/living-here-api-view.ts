import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  livingHereExpiry,
  type LivingHereExpiry,
} from '@/features/academia/services/living-here-age';
import { academiaLivingHereUrl } from '@/lib/academia';
import type { Database } from '@/lib/supabase/database.types';

// Mission 157 — ce que la carte « Le bien dans Academia » montre du lien créé par l'API, au chargement
// de Bien vendeur (planche M157-1) : le lien du mandat et son expiration s'il vient de l'API, une
// demande en préparation, ou rien encore. L'âge de l'expiration est calculé ici, au serveur (jamais
// au rendu du navigateur).

export type LivingHereApiInitial =
  | { kind: 'ready'; url: string; expiresAt: string; expiry: LivingHereExpiry }
  | { kind: 'waiting' }
  | { kind: 'idle' };

export async function livingHereApiInitial(
  client: SupabaseClient<Database>,
  agencyId: string,
  projectId: string,
  projectUrl: string | null | undefined,
  now: Date = new Date(),
): Promise<LivingHereApiInitial | null> {
  const { data, error } = await client
    .from('project_academia_dossiers')
    .select('state, link_url, link_expires_at')
    .eq('project_id', projectId)
    .eq('agency_id', agencyId)
    .maybeSingle();
  // Une lecture en échec n'invente rien : la carte d'aujourd'hui (le lien à coller) reste.
  if (error) return null;
  const url = academiaLivingHereUrl(projectUrl);
  if (data?.link_url && data.link_expires_at && url && data.link_url === url) {
    const expiry = livingHereExpiry(data.link_expires_at, now);
    if (expiry) return { kind: 'ready', url, expiresAt: data.link_expires_at, expiry };
  }
  if (data?.state === 'en_cours') return { kind: 'waiting' };
  return { kind: 'idle' };
}
