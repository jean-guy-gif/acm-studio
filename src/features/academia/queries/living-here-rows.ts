import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  livingHereKeys,
  readPropertyLivingLinks,
} from '@/features/academia/queries/read-property-living-links';
import type { PastedLivingHereLink } from '@/features/academia/services/living-here-age';
import { academiaLivingHereUrl } from '@/lib/academia';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';

// Mission 156 — ce que le bloc « « Vivre ici » de chaque bien » du dossier acquéreur montre au
// conseiller (planche A3-1), bien par bien : pour un mandat, le lien collé sur son dossier et s'il
// est signé (seul un mandat signé montre son lien à l'acquéreur, M147 A) ; pour un bien hors mandat,
// son lien et l'adresse CONFIRMÉE que « Ouvrir Academia » copie (celle du concurrent, ou du bien
// démarché de la même annonce, confirmée par le Localisateur ou le conseiller) — jamais une adresse
// proposée. Pour le conseiller seul : rien de cela ne part vers l'acquéreur. Une lecture en échec
// n'est jamais « pas de lien » (M98).

type Client = SupabaseClient<Database>;

export type LivingHereRow =
  | {
      itemId: string;
      kind: 'mandate';
      projectId: string;
      signed: boolean;
      link: PastedLivingHereLink | null;
    }
  | {
      itemId: string;
      kind: 'outside';
      source: 'competitor' | 'listing';
      link: PastedLivingHereLink | null;
      address: string | null;
    };

export type LivingHereRowsRead = { ok: true; rows: LivingHereRow[] } | { ok: false };

const confirmed = (row: { locator_address: string | null; locator_confirmed: boolean | null }) =>
  row.locator_confirmed === true && (row.locator_address?.trim() ?? '') !== ''
    ? (row.locator_address ?? '').trim()
    : null;

export async function loadLivingHereRows(
  client: Client,
  agencyId: string,
  itemIds: string[],
): Promise<LivingHereRowsRead> {
  if (itemIds.length === 0) return { ok: true, rows: [] };
  const { data: itemRows, error: itemError } = await client
    .from('buyer_selection_items')
    .select('id, source, reference')
    .eq('agency_id', agencyId)
    .is('removed_at', null)
    .in('id', itemIds);
  if (itemError) {
    await reportServerError('academia:living-rows', itemError);
    return { ok: false };
  }
  const byId = new Map((itemRows ?? []).map((row) => [row.id, row]));
  const items = itemIds.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
  const projectIds = items
    .filter((item) => item.source === 'project')
    .map((item) => item.reference);
  const competitorIds = items
    .filter((item) => item.source === 'competitor')
    .map((item) => item.reference);

  const [links, keys, projects, conclusions, competitors] = await Promise.all([
    readPropertyLivingLinks(client, agencyId, items),
    livingHereKeys(client, agencyId, items),
    projectIds.length
      ? client
          .from('projects')
          .select('id, academia_living_here_url, academia_living_here_pasted_at')
          .eq('agency_id', agencyId)
          .neq('status', 'archived')
          .in('id', projectIds)
      : Promise.resolve({ data: [], error: null }),
    projectIds.length
      ? client
          .from('project_meeting_conclusions')
          .select('project_id')
          .eq('agency_id', agencyId)
          .eq('outcome', 'signed')
          .in('project_id', projectIds)
      : Promise.resolve({ data: [], error: null }),
    competitorIds.length
      ? client
          .from('comparables')
          .select('id, locator_address, locator_confirmed')
          .eq('agency_id', agencyId)
          .in('id', competitorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const failed = [projects.error, conclusions.error, competitors.error].find(Boolean);
  if (!links.ok || !keys.ok || failed) {
    if (failed) await reportServerError('academia:living-rows', failed);
    return { ok: false };
  }

  // Un bien du marché : l'adresse confirmée du bien démarché de la même annonce (M120 A).
  const identities = [
    ...new Set(
      items.flatMap((item) => {
        const key = item.source === 'listing' ? keys.keys.get(item.id) : undefined;
        return key && !key.startsWith('listing:http') ? [key.slice('listing:'.length)] : [];
      }),
    ),
  ];
  const prospectAddress = new Map<string, string>();
  if (identities.length > 0) {
    const { data, error } = await client
      .from('buyer_prospects')
      .select('listing_key, locator_address, locator_confirmed')
      .eq('agency_id', agencyId)
      .in('listing_key', identities);
    if (error) {
      await reportServerError('academia:living-rows', error);
      return { ok: false };
    }
    for (const row of data ?? []) {
      const address = confirmed(row);
      if (address) prospectAddress.set(row.listing_key, address);
    }
  }

  const projectById = new Map((projects.data ?? []).map((row) => [row.id, row]));
  const signed = new Set((conclusions.data ?? []).map((row) => row.project_id));
  const competitorAddress = new Map(
    (competitors.data ?? []).map((row) => [row.id, confirmed(row)]),
  );
  const rows = items.flatMap((item): LivingHereRow[] => {
    if (item.source === 'project') {
      const project = projectById.get(item.reference);
      if (!project) return [];
      const url = academiaLivingHereUrl(project.academia_living_here_url);
      return [
        {
          itemId: item.id,
          kind: 'mandate',
          projectId: project.id,
          signed: signed.has(project.id),
          link: url ? { url, pastedAt: project.academia_living_here_pasted_at } : null,
        },
      ];
    }
    if (item.source !== 'competitor' && item.source !== 'listing') return [];
    if (!keys.keys.has(item.id)) return [];
    const key = keys.keys.get(item.id) ?? '';
    const address =
      item.source === 'competitor'
        ? (competitorAddress.get(item.reference) ?? null)
        : (prospectAddress.get(key.slice('listing:'.length)) ?? null);
    return [
      {
        itemId: item.id,
        kind: 'outside',
        source: item.source,
        link: links.links.get(item.id) ?? null,
        address,
      },
    ];
  });
  return { ok: true, rows };
}
