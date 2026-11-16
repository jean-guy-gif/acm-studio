import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  livingHereNeedsLink,
  type PastedLivingHereLink,
} from '@/features/academia/services/living-here-age';
import { dismissalKey } from '@/features/buyer-dismissals/services/dismissal-key';
import { academiaLivingHereUrl } from '@/lib/academia';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import type { Database } from '@/lib/supabase/database.types';

// Mission 156 — le lien « Vivre ici » d'un bien HORS MANDAT d'une sélection acquéreur (un concurrent,
// une annonce du marché), un par bien et par agence (`property_living_here_links`). Le bien est
// repéré par la clé de la boucle (M134, M139) : l'identité publiée de son annonce, sinon le
// concurrent. Un mandat n'a pas de clé ici : son lien reste sur son dossier (M147 A).
//
// La clé, qui peut contenir l'adresse d'une annonce, se calcule ici, au serveur, et ne part jamais
// vers le navigateur : seuls l'id du bien de la sélection, le lien d'Academia relu et sa date en
// sortent. Une lecture en échec n'est jamais « pas de lien » (M98) : elle est dite (`ok: false`) et
// entre au journal (M100).

type Client = SupabaseClient<Database>;

export type SelectionItemRef = { id: string; source: string; reference: string };
export type PropertyLivingLinksRead =
  { ok: true; links: Map<string, PastedLivingHereLink> } | { ok: false };

// La clé de chaque bien hors mandat de la sélection : `itemId → clé`. Un concurrent introuvable
// dans l'agence (supprimé depuis) n'a pas de clé.
export async function livingHereKeys(
  client: Client,
  agencyId: string,
  items: SelectionItemRef[],
): Promise<{ ok: true; keys: Map<string, string> } | { ok: false }> {
  const keys = new Map<string, string>();
  const competitorIds = [
    ...new Set(items.filter((item) => item.source === 'competitor').map((item) => item.reference)),
  ];
  const listingUrls = new Map<string, string | null>();
  if (competitorIds.length > 0) {
    const { data, error } = await client
      .from('comparables')
      .select('id, listing_url')
      .eq('agency_id', agencyId)
      .in('id', competitorIds);
    if (error) {
      await reportServerError('academia:living-keys', error);
      return { ok: false };
    }
    for (const row of data ?? []) listingUrls.set(row.id, row.listing_url);
  }
  for (const item of items) {
    if (item.source === 'listing' && item.reference.trim()) {
      keys.set(item.id, dismissalKey({ source: 'listing', url: item.reference }));
    } else if (item.source === 'competitor' && listingUrls.has(item.reference)) {
      keys.set(
        item.id,
        dismissalKey({
          source: 'competitor',
          competitorId: item.reference,
          listingUrl: listingUrls.get(item.reference) ?? null,
        }),
      );
    }
  }
  return { ok: true, keys };
}

export async function readPropertyLivingLinks(
  client: Client,
  agencyId: string,
  items: SelectionItemRef[],
): Promise<PropertyLivingLinksRead> {
  const outside = items.filter((item) => item.source !== 'project');
  if (outside.length === 0) return { ok: true, links: new Map() };
  const resolved = await livingHereKeys(client, agencyId, outside);
  if (!resolved.ok) return { ok: false };
  const wanted = [...new Set(resolved.keys.values())];
  if (wanted.length === 0) return { ok: true, links: new Map() };
  const { data, error } = await client
    .from('property_living_here_links')
    .select('property_key, url, pasted_at')
    .eq('agency_id', agencyId)
    .in('property_key', wanted);
  if (error) {
    await reportServerError('academia:read-property-links', error);
    return { ok: false };
  }
  const byKey = new Map<string, PastedLivingHereLink>();
  for (const row of data ?? []) {
    const url = academiaLivingHereUrl(row.url);
    if (url) byKey.set(row.property_key, { url, pastedAt: row.pasted_at });
  }
  const links = new Map<string, PastedLivingHereLink>();
  for (const [itemId, key] of resolved.keys) {
    const link = byKey.get(key);
    if (link) links.set(itemId, link);
  }
  return { ok: true, links };
}

// Le lien discret « Ajouter « Vivre ici » » de la fiche acquéreur : un bien hors mandat de sa
// sélection n'a pas de lien, ou un lien de 30 jours et plus (décision de Jean-Guy, 16/11). Une
// lecture en échec ne l'affiche pas : rien n'est inventé (M98).
export async function selectionNeedsLivingHere(
  client: Client,
  agencyId: string,
  items: SelectionItemRef[],
  now: Date,
): Promise<boolean> {
  const outside = items.filter((item) => item.source !== 'project');
  if (outside.length === 0) return false;
  const read = await readPropertyLivingLinks(client, agencyId, outside);
  if (!read.ok) return false;
  return outside.some((item) => livingHereNeedsLink(read.links.get(item.id) ?? null, now));
}
