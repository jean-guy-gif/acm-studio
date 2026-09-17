'use server';

import { revalidatePath } from 'next/cache';

import type { RecordDecisionResult } from '@/features/competitor-search/types';
import { isAllowedProtocol, normalizeUrl } from '@/features/comparable-import/utils/normalize-url';
import { getProfile } from '@/lib/auth/get-profile';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

type DecisionInsert = Database['public']['Tables']['competitor_decisions']['Insert'];

// Une décision par annonce, sans motif obligatoire : décocher est libre, le motif
// reste facultatif (donné carte par carte pour qui veut). Une décision sans motif
// est déjà du signal — retenue ou écartée.
export type BatchDecision = {
  url: string;
  decision: 'accepted' | 'rejected';
  price: number | null;
  surfaceArea: number | null;
  roomsCount: number | null;
  city: string | null;
  propertyType: string | null;
};

const GENERIC_ERROR = 'Les décisions n’ont pas pu être enregistrées.';

// MISSION 50 §8 — validation en lot : on écrit toutes les décisions d'un coup, au clic
// (le geste humain). Les retenues (importées) en « accepted », les décochées en
// « rejected » sans motif. L'instantané prix/surface/pièces/commune est conservé pour
// que l'apprentissage garde son sens quand l'annonce disparaît du portail.
export async function recordCompetitorDecisions(
  projectId: string,
  decisions: BatchDecision[],
): Promise<RecordDecisionResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }

  const userClient = await createClient();
  const { data: project } = await userClient
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!project) {
    return { ok: false, error: 'Dossier introuvable pour votre agence.' };
  }

  const now = new Date().toISOString();
  const rows: DecisionInsert[] = [];
  for (const entry of decisions) {
    const url = normalizeUrl(entry.url);
    if (!url || !isAllowedProtocol(url)) {
      continue; // une entrée illisible est ignorée, pas bloquante
    }
    rows.push({
      agency_id: profile.agency_id,
      project_id: projectId,
      listing_url: url.href,
      listing_host: url.hostname.toLowerCase(),
      decision: entry.decision,
      reason: null,
      comment: null,
      price: entry.price != null && entry.price > 0 ? entry.price : null,
      surface_area: entry.surfaceArea != null && entry.surfaceArea > 0 ? entry.surfaceArea : null,
      rooms_count: entry.roomsCount != null && entry.roomsCount > 0 ? entry.roomsCount : null,
      city: entry.city ? entry.city.slice(0, 120) : null,
      district: null,
      property_type: entry.propertyType ? entry.propertyType.slice(0, 120) : null,
      updated_at: now,
    });
  }

  if (rows.length === 0) {
    return { ok: true };
  }

  // Revenir sur une décision la remplace : une seule par annonce et par dossier.
  const { error } = await createServiceRoleClient()
    .from('competitor_decisions')
    .upsert(rows, { onConflict: 'project_id,listing_url' });
  if (error) {
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(`/builder/${projectId}/comparables/find`);
  return { ok: true };
}
