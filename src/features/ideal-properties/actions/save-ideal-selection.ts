'use server';

import { revalidatePath } from 'next/cache';

import { demoImportedData } from '@/features/demo/services/demo-listing-data';
import { findDemoListing } from '@/features/demo/services/demo-urls';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import {
  readSelectionInput,
  toSelection,
} from '@/features/ideal-properties/services/ideal-selection';
import type { IdealSelection } from '@/features/ideal-properties/types';
import { readWatchFinds } from '@/features/buyer-watch/services/watch-finds';
import { readSeenProperties } from '@/features/buyers/queries/read-seen-properties';
import { projectsUnderOffer, proposableMandate } from '@/features/buyers/services/proposable';
import {
  candidateTarget,
  seenKeysOf,
  seenMatcher,
} from '@/features/buyers/services/seen-properties';
import { NOT_PROPOSABLE } from '@/features/ideal-properties/services/ideal-agency';
import { getAgencyOfferAnswers } from '@/features/purchase-offer/queries/get-offer-answers';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import { getProfile } from '@/lib/auth/get-profile';
import type { Json } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type SaveIdealSelectionResult =
  | { ok: true; selection: IdealSelection; toImport: { itemId: string; url: string }[] }
  | { ok: false; error: string };

const FAILED = 'La sélection n’a pas pu être enregistrée. Réessayez.';
const ALREADY_SEEN =
  'L’un de ces biens a déjà été vu avec lui, ou écarté pour lui : il ne se retient plus. Rechargez la page.';

// Mission 118 — « Retenir la sélection » : jusqu'à trois biens, enregistrés d'un coup pour la fiche
// (une sélection précédente reste lisible, la nouvelle vaut). Les annonces du marché retenues
// gardent ce que la recherche en a dit ; en démonstration (M114), leurs données importées viennent
// du jeu de données côté serveur ; ailleurs, l'écran lit ensuite chaque page par l'extension
// (`importIdealListing`). Le serveur seul écrit, dans l'agence de l'appelant.
export async function saveIdealSelection(
  buyerId: string,
  rawItems: unknown,
  seenOn: unknown,
): Promise<SaveIdealSelectionResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: 'Vous devez être connecté.' };
  const read = readSelectionInput(rawItems);
  if (!read.ok) return { ok: false, error: read.error };
  const priceSeenOn =
    typeof seenOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(seenOn) ? seenOn : null;

  const client = createServiceRoleClient();
  const { data: buyer } = await client
    .from('buyers')
    .select('id')
    .eq('id', buyerId)
    .eq('agency_id', profile.agency_id)
    .is('archived_at', null)
    .maybeSingle();
  if (!buyer) return { ok: false, error: 'Cette fiche acquéreur n’existe plus.' };

  const demo = await isDemoAgency(profile.agency_id);
  // Essai de Jean-Guy (26/10) — une annonce gardée de la sélection précédente, au même prix, garde
  // sa date « affiché le » et ses données importées : jamais une date du jour qu'elle n'a pas eue,
  // jamais une page à relire pour rien. Lue avant d'écrire la nouvelle sélection.
  const { data: previous } = await client
    .from('buyer_selections')
    .select('id')
    .eq('buyer_id', buyerId)
    .eq('agency_id', profile.agency_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: previousItems } = previous?.id
    ? await client
        .from('buyer_selection_items')
        .select('source, reference, listed_price, price_seen_on, imported, snapshot')
        .eq('selection_id', previous.id)
        .eq('agency_id', profile.agency_id)
    : { data: [] };
  const kept = new Map(
    (Array.isArray(previousItems) ? previousItems : []).map((row) => [
      `${row.source}:${row.reference}`,
      row,
    ]),
  );
  // Lancement, mission 3 (suite, Jean-Guy, 25/11) — un bien qu'il a déjà reçu, visité ou refusé, ou
  // que le conseiller a écarté pour lui, ne se retient plus : relu en base, jamais cru du
  // navigateur, et reconnu aussi sous une autre annonce (`seenMatcher`). Un bien gardé de sa
  // sélection en cours, pas encore reçue, reste (le conseiller la compose). Une lecture en échec
  // n'écrit rien : jamais lue comme « rien de vu » (M98).
  const seenRead = await readSeenProperties(client, profile.agency_id, buyerId);
  if (!seenRead) return { ok: false, error: FAILED };
  const composing = previous?.id != null && seenRead.receivedAt(previous.id) == null;
  const seenOf = seenMatcher(seenKeysOf(seenRead.seen, buyerId), seenRead.marks(buyerId));
  const alreadySeen = read.items.some((item) => {
    const key = seenRead.keyOf(item);
    if (!key) return false;
    const facts =
      item.source === 'listing' && typeof item.snapshot === 'object' && item.snapshot != null
        ? (item.snapshot as Record<string, unknown>)
        : null;
    const text = (value: unknown) => (typeof value === 'string' && value ? value : null);
    const number = (value: unknown) => (typeof value === 'number' ? value : null);
    const reason = seenOf(
      facts
        ? candidateTarget(key, {
            key: text(facts.key),
            city: text(facts.city),
            roomsCount: number(facts.roomsCount),
            surfaceArea: number(facts.surfaceArea),
            price: item.listedPrice,
          })
        : { key },
    );
    // Gardé de sa sélection en cours, pas encore reçue : un bien envoyé ou visité (une deuxième
    // visite) reste ; refusé ou écarté pour lui, jamais (Lancement 3, « ne se recoche pas »).
    if (composing && kept.has(`${item.source}:${item.reference}`)) {
      return reason === 'refused' || reason === 'dismissed';
    }
    return reason != null;
  });
  if (alreadySeen) return { ok: false, error: ALREADY_SEEN };

  // Mission 145 (partie A) — un bien de l'agence NOUVEAU dans la sélection doit être un mandat
  // signé sans offre acceptée (décision de Jean-Guy, 07/11) : ni un vendeur à relancer, ni un
  // dossier sans mandat ; relu en base, jamais cru du navigateur. Un bien déjà retenu reste.
  const newProjects = read.items
    .filter((item) => item.source === 'project' && !kept.has(`project:${item.reference}`))
    .map((item) => item.reference);
  if (newProjects.length > 0) {
    const { data: conclusions, error: conclusionsError } = await client
      .from('project_meeting_conclusions')
      .select('project_id, outcome')
      .eq('agency_id', profile.agency_id)
      .in('project_id', newProjects);
    if (conclusionsError) return { ok: false, error: FAILED };
    const answers = await getAgencyOfferAnswers(client, profile.agency_id);
    if (answers == null) return { ok: false, error: FAILED };
    const outcomeOf = new Map((conclusions ?? []).map((row) => [row.project_id, row.outcome]));
    const held = projectsUnderOffer(answers);
    const refused = newProjects.some(
      (projectId) => !proposableMandate(outcomeOf.get(projectId), projectId, held),
    );
    if (refused) return { ok: false, error: NOT_PROPOSABLE };
  }

  const { data: selection, error } = await client
    .from('buyer_selections')
    .insert({ agency_id: profile.agency_id, buyer_id: buyerId, created_by: profile.id })
    .select('*')
    .single();
  if (error || !selection) return { ok: false, error: FAILED };

  const now = new Date();
  // Mission 136 — le jour « affiché le » d'une annonce trouvée par la veille : relu en base, jamais
  // cru du navigateur — le jour d'un passage de cet acquéreur qui a trouvé cette annonce.
  const watchDays = new Map<string, string>();
  if (read.items.some((item) => item.seenOn != null)) {
    const { data: runs } = await client
      .from('buyer_watch_runs')
      .select('ran_at, finds')
      .eq('buyer_id', buyerId)
      .eq('agency_id', profile.agency_id)
      .eq('status', 'done')
      .gt('found_count', 0)
      .order('ran_at', { ascending: false })
      .limit(10);
    for (const run of runs ?? []) {
      for (const find of readWatchFinds(run.finds)) {
        if (!watchDays.has(find.url)) watchDays.set(find.url, parisDay(new Date(run.ran_at)));
      }
    }
  }
  const rows = read.items.map((item, index) => {
    const demoListing = demo && item.source === 'listing' ? findDemoListing(item.reference) : null;
    const before =
      item.source === 'listing' ? kept.get(`${item.source}:${item.reference}`) : undefined;
    const reuse = before != null && before.listed_price === item.listedPrice;
    return {
      agency_id: profile.agency_id,
      selection_id: selection.id,
      position: index + 1,
      source: item.source,
      reference: item.reference,
      label: item.label,
      listed_price: item.listedPrice,
      price_seen_on:
        item.source === 'listing'
          ? reuse
            ? before.price_seen_on
            : ((item.seenOn != null && watchDays.get(item.reference) === item.seenOn
                ? item.seenOn
                : null) ?? priceSeenOn)
          : null,
      category: item.category,
      gaps: item.gaps,
      snapshot: (item.snapshot ?? (reuse ? before.snapshot : null) ?? null) as Json | null,
      imported: (demoListing
        ? demoImportedData(demoListing, now)
        : reuse
          ? (before.imported ?? null)
          : null) as unknown as Json | null,
    };
  });
  const { data: items, error: itemsError } = await client
    .from('buyer_selection_items')
    .insert(rows)
    .select('*');
  if (itemsError || !items) {
    await client.from('buyer_selections').delete().eq('id', selection.id);
    return { ok: false, error: FAILED };
  }
  revalidatePath(`/acquereurs/${buyerId}`);
  revalidatePath(`/acquereurs/${buyerId}/biens-ideaux`);
  return {
    ok: true,
    selection: toSelection(selection, items),
    toImport: demo
      ? []
      : items
          .filter((item) => item.source === 'listing' && item.imported == null)
          .map((item) => ({ itemId: item.id, url: item.reference })),
  };
}
