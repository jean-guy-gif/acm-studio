import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { academiaLivingHereUrl } from '@/lib/academia';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';

// Mission 147 (partie A) — le lien client « Vivre ici » d'Academia collé sur des mandats, pour ce
// qui part vers l'acquéreur (son lien, « Confirmer la visite ») : seulement un MANDAT SIGNÉ de
// l'agence, non archivé (seul un mandat se propose, M145 A ; l'écran du conseiller le dit), et
// seulement un lien d'Academia, relu. Une lecture en échec n'est jamais « pas de lien » (M98) : elle
// est dite (`ok: false`) et entre au journal (M100).
// Mission 156 — et la date du collage de chaque lien (`dates`, nulle pour un lien d'avant), pour
// l'avertissement aux 25e et 30e jours.
export type AcademiaLinksRead =
  { ok: true; links: Map<string, string>; dates: Map<string, string | null> } | { ok: false };

export async function readMandateAcademiaLinks(
  client: SupabaseClient<Database>,
  agencyId: string,
  projectIds: string[],
): Promise<AcademiaLinksRead> {
  const ids = [...new Set(projectIds)];
  if (ids.length === 0) return { ok: true, links: new Map(), dates: new Map() };
  const projects = await client
    .from('projects')
    .select('id, academia_living_here_url, academia_living_here_pasted_at')
    .eq('agency_id', agencyId)
    .neq('status', 'archived')
    .in('id', ids);
  if (projects.error) {
    await reportServerError('academia:read-links', projects.error);
    return { ok: false };
  }
  // Aucun lien collé : rien de plus à lire.
  if (!(projects.data ?? []).some((row) => row.academia_living_here_url)) {
    return { ok: true, links: new Map(), dates: new Map() };
  }
  const conclusions = await client
    .from('project_meeting_conclusions')
    .select('project_id')
    .eq('agency_id', agencyId)
    .eq('outcome', 'signed')
    .in('project_id', ids);
  if (conclusions.error) {
    await reportServerError('academia:read-links', conclusions.error);
    return { ok: false };
  }
  const signed = new Set((conclusions.data ?? []).map((row) => row.project_id));
  const links = new Map<string, string>();
  const dates = new Map<string, string | null>();
  for (const row of projects.data ?? []) {
    const url = academiaLivingHereUrl(row.academia_living_here_url);
    if (url && signed.has(row.id)) {
      links.set(row.id, url);
      dates.set(row.id, row.academia_living_here_pasted_at ?? null);
    }
  }
  return { ok: true, links, dates };
}
