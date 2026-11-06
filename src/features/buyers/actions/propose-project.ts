'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createDossierLink } from '@/features/buyer-dossier/actions/dossier-links';
import { buyerToCriteria } from '@/features/buyers/services/buyer-criteria';
import {
  getPropertyBuyers,
  loadLoopProperties,
} from '@/features/buyers/queries/get-property-buyers';
import {
  NOT_MATCHING_MESSAGE,
  NOT_SIGNED_MESSAGE,
} from '@/features/buyers/services/property-buyers';
import { idealLabel } from '@/features/ideal-properties/services/ideal-label';
import { MAX_IDEAL_SELECTION } from '@/features/ideal-properties/types';
import { negotiationNote } from '@/features/meeting-conclusion/services/buyer-rules';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type ProposeProjectResult = { ok: true; url: string } | { ok: false; error: string };

const FAILED = 'Le lien n’a pas pu être préparé. Réessayez.';

// Mission 133 — « Envoyer le lien », depuis un mandat signé : le dossier acquéreur (M119, M122 B)
// avec CE bien en tête de sa sélection. Une nouvelle sélection est retenue pour la fiche — ce bien,
// puis les deux premiers biens encore retenus de sa sélection actuelle, tels quels — et un lien est
// créé pour elle ; le lien précédent cesse de marcher (M122 B), ses réponses restent. Le bien se
// décrit comme dans « Biens idéaux » (libellé neutre, prix de commercialisation, note de
// négociation) ; rien ne vient du navigateur que les deux identifiants, relus ici.
export async function proposeProjectToBuyer(
  buyerId: unknown,
  projectId: unknown,
): Promise<ProposeProjectResult> {
  const profile = await getProfile();
  if (
    !profile ||
    profile.removed_at ||
    !z.uuid().safeParse(buyerId).success ||
    !z.uuid().safeParse(projectId).success
  ) {
    return { ok: false, error: FAILED };
  }
  const buyerKey = buyerId as string;
  const projectKey = projectId as string;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from('projects')
    .select('id, status, is_example')
    .eq('id', projectKey)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  const { data: conclusion } = await supabase
    .from('project_meeting_conclusions')
    .select('outcome, commercialization_price')
    .eq('project_id', projectKey)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (
    !project ||
    project.is_example ||
    project.status !== 'meeting_completed' ||
    conclusion?.outcome !== 'signed'
  ) {
    return { ok: false, error: NOT_SIGNED_MESSAGE };
  }

  // La même règle que le bloc et la tâche : l'acquéreur correspond, aujourd'hui.
  const [matching, loop] = await Promise.all([
    getPropertyBuyers(profile.agency_id, projectKey, new Date()),
    loadLoopProperties(profile.agency_id, [projectKey]),
  ]);
  if (matching == null || loop.failed) return { ok: false, error: FAILED };
  const entry = [...matching.ready, ...matching.others].find(({ buyer }) => buyer.id === buyerKey);
  const bien = loop.properties.get(projectKey);
  if (!entry || !bien) return { ok: false, error: NOT_MATCHING_MESSAGE };

  const client = createServiceRoleClient();
  // La sélection actuelle : ses biens encore retenus, dans leur ordre, sans ce bien.
  const { data: previous } = await client
    .from('buyer_selections')
    .select('id')
    .eq('buyer_id', buyerKey)
    .eq('agency_id', profile.agency_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: previousItems, error: previousError } = previous?.id
    ? await client
        .from('buyer_selection_items')
        .select(
          'source, reference, label, listed_price, price_seen_on, category, gaps, snapshot, imported, pitch, dossier_hide_photo',
        )
        .eq('selection_id', previous.id)
        .eq('agency_id', profile.agency_id)
        .is('removed_at', null)
        .order('position', { ascending: true })
    : { data: [], error: null };
  if (previousError) return { ok: false, error: FAILED };
  const kept = (previousItems ?? [])
    .filter((item) => !(item.source === 'project' && item.reference === projectKey))
    .slice(0, MAX_IDEAL_SELECTION - 1);

  const { data: selection, error } = await client
    .from('buyer_selections')
    .insert({ agency_id: profile.agency_id, buyer_id: buyerKey, created_by: profile.id })
    .select('id')
    .single();
  if (error || !selection) return { ok: false, error: FAILED };

  const price = conclusion.commercialization_price ?? bien.price;
  const note =
    price == null
      ? null
      : negotiationNote(buyerToCriteria(entry.buyer), {
          roomsCount: bien.property.roomsCount,
          surfaceArea: bien.property.surfaceArea,
          city: bien.property.city,
          price,
        });
  const rows = [
    {
      source: 'project',
      reference: projectKey,
      label: idealLabel(bien.property),
      listed_price: price,
      price_seen_on: null,
      category: 'agency',
      gaps: note ? [note] : [],
      snapshot: null,
      imported: null,
      pitch: null,
      dossier_hide_photo: false,
    },
    ...kept,
  ].map((item, index) => ({
    ...item,
    agency_id: profile.agency_id,
    selection_id: selection.id,
    position: index + 1,
  }));
  const { error: itemsError } = await client.from('buyer_selection_items').insert(rows);
  if (itemsError) {
    await client.from('buyer_selections').delete().eq('id', selection.id);
    return { ok: false, error: FAILED };
  }

  const link = await createDossierLink(buyerKey, true);
  revalidatePath(`/acquereurs/${buyerKey}`);
  revalidatePath(`/builder/${projectKey}`);
  revalidatePath('/suivi');
  if (!link.ok) return { ok: false, error: link.error };
  return { ok: true, url: link.url };
}
