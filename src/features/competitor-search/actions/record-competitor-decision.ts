'use server';

import { revalidatePath } from 'next/cache';

import {
  DECISION_REASONS,
  type DecisionReason,
} from '@/features/competitor-search/services/learn-from-decisions';
import type { RecordDecisionResult } from '@/features/competitor-search/types';
import { normalizeUrl, isAllowedProtocol } from '@/features/comparable-import/utils/normalize-url';
import { getProfile } from '@/lib/auth/get-profile';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

type DecisionInsert = Database['public']['Tables']['competitor_decisions']['Insert'];

const GENERIC_ERROR = 'La décision n’a pas pu être enregistrée.';
const MAX_COMMENT = 500;

// Enregistre le « oui, c'est un concurrent » ou le « non, et voici pourquoi ».
//
// C'est cette trace qui rend la recherche suivante meilleure — voir
// services/learn-from-decisions. L'autorisation passe par le client UTILISATEUR
// (le dossier doit appartenir à son agence) ; seule l'écriture finale utilise le
// client de service, après ce contrôle.
//
// L'instantané du bien (prix, surface, quartier) est conservé volontairement :
// sans lui, l'apprentissage perdrait son sens dès que l'annonce disparaît du
// portail.
export async function recordCompetitorDecision(
  projectId: string,
  formData: FormData,
): Promise<RecordDecisionResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }

  const rawUrl = String(formData.get('listing_url') ?? '').trim();
  const url = normalizeUrl(rawUrl);
  if (!url || !isAllowedProtocol(url)) {
    return { ok: false, error: 'Adresse d’annonce invalide.' };
  }

  const rawDecision = String(formData.get('decision') ?? '');
  if (rawDecision !== 'accepted' && rawDecision !== 'rejected') {
    return { ok: false, error: GENERIC_ERROR };
  }

  const rawReason = String(formData.get('reason') ?? '').trim();
  const reason: DecisionReason | null = (DECISION_REASONS as readonly string[]).includes(rawReason)
    ? (rawReason as DecisionReason)
    : null;

  const comment = String(formData.get('comment') ?? '').trim();
  if (comment.length > MAX_COMMENT) {
    return { ok: false, error: 'Le commentaire est trop long.' };
  }

  const numberOrNull = (name: string): number | null => {
    const value = Number(String(formData.get(name) ?? '').replace(',', '.'));
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  const textOrNull = (name: string): string | null => {
    const value = String(formData.get(name) ?? '').trim();
    return value === '' ? null : value.slice(0, 120);
  };

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

  const row: DecisionInsert = {
    agency_id: profile.agency_id,
    project_id: projectId,
    listing_url: url.href,
    listing_host: url.hostname.toLowerCase(),
    decision: rawDecision,
    reason,
    comment: comment === '' ? null : comment,
    price: numberOrNull('price'),
    surface_area: numberOrNull('surface_area'),
    rooms_count: numberOrNull('rooms_count'),
    city: textOrNull('city'),
    district: textOrNull('district'),
    property_type: textOrNull('property_type'),
    updated_at: new Date().toISOString(),
  };

  // Revenir sur une décision la remplace : une seule par annonce et par dossier.
  const { error } = await createServiceRoleClient()
    .from('competitor_decisions')
    .upsert(row, { onConflict: 'project_id,listing_url' });
  if (error) {
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(`/builder/${projectId}/comparables/find`);
  return { ok: true };
}
