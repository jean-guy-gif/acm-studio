'use server';

import { revalidatePath } from 'next/cache';

import { closeAiReading } from '@/features/ai-budget/services/ai-budget';
import {
  parseBuyerInput,
  readBuyerFormData,
  type BuyerFormErrors,
} from '@/features/buyers/schemas/buyer-input';
import { buyerColumns, sanitizeSoftCriteria } from '@/features/buyers/services/buyer-row';
import { sanitizeBuyerFieldsToVerify } from '@/features/buyer-notes/services/fields-to-verify';
import { getProfile } from '@/lib/auth/get-profile';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 151 — « Créer la fiche » / « Compléter la fiche » après une lecture de notes. Ce que
// l'écran envoie est relu ici comme toute fiche (M117) ; s'y ajoutent les critères doux (liste
// d'autorisation), le financement proposé et accepté par le conseiller (validé ou en cours, daté,
// M132), et les noms des champs « À vérifier » (M97). AUCUN champ pour les sources : même
// envoyées, elles ne s'écrivent pas (principe 2, décision de Jean-Guy du 12/11). La lecture est
// close sur sa ligne (`ai_usage`) : fiche créée ou complétée, et les noms des champs gardés.

export type SaveFromNotesResult =
  { ok: true; buyerId: string } | { ok: false; error: string; errors?: BuyerFormErrors };

const NOT_CONNECTED = 'Vous devez être connecté.';
const NOT_FOUND = 'Cette fiche acquéreur n’existe plus.';
const NOT_SAVED = 'La fiche n’a pas pu être enregistrée. Réessayez.';

const financingOf = (value: FormDataEntryValue | null): 'validated' | 'in_progress' | null =>
  value === 'validated' || value === 'in_progress' ? value : null;

function softCriteriaOf(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value === '') return [];
  try {
    return sanitizeSoftCriteria(JSON.parse(value));
  } catch {
    return [];
  }
}

export async function saveBuyerFromNotes(formData: FormData): Promise<SaveFromNotesResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, error: NOT_CONNECTED };
  const parsed = parseBuyerInput(readBuyerFormData(formData));
  if (!parsed.ok) return { ok: false, error: parsed.error, errors: parsed.errors };

  const usageId =
    typeof formData.get('usage_id') === 'string' ? String(formData.get('usage_id')) : '';
  const buyerId =
    typeof formData.get('buyer_id') === 'string' ? String(formData.get('buyer_id')) : '';
  const softCriteria = softCriteriaOf(formData.get('soft_criteria'));
  const financing = financingOf(formData.get('financing'));
  const toVerify = sanitizeBuyerFieldsToVerify(formData.getAll('fields_to_verify'));
  const now = new Date().toISOString();
  const client = createServiceRoleClient();

  const columns = {
    ...buyerColumns({ ...parsed.input, softCriteria }),
    ...(financing ? { financing, financing_changed_at: now } : {}),
  };

  let savedId: string;
  if (buyerId) {
    const { data: existing, error: readError } = await client
      .from('buyers')
      .select('id, fields_to_verify')
      .eq('id', buyerId)
      .eq('agency_id', profile.agency_id)
      .is('archived_at', null)
      .maybeSingle();
    if (readError || !existing) return { ok: false, error: NOT_FOUND };
    const merged = sanitizeBuyerFieldsToVerify([...(existing.fields_to_verify ?? []), ...toVerify]);
    const { error } = await client
      .from('buyers')
      .update({ ...columns, fields_to_verify: merged, updated_at: now })
      .eq('id', buyerId)
      .eq('agency_id', profile.agency_id);
    if (error) return { ok: false, error: NOT_SAVED };
    savedId = buyerId;
  } else {
    const { data, error } = await client
      .from('buyers')
      .insert({
        ...columns,
        fields_to_verify: toVerify,
        agency_id: profile.agency_id,
        advisor_id: profile.id,
      })
      .select('id')
      .single();
    if (error || !data) return { ok: false, error: NOT_SAVED };
    savedId = data.id;
  }

  if (usageId) {
    await closeAiReading({
      usageId,
      agencyId: profile.agency_id,
      userId: profile.id,
      outcome: buyerId ? 'completed' : 'created',
      buyerId: savedId,
      fieldsKept: toVerify,
    });
  }
  revalidatePath('/acquereurs');
  revalidatePath(`/acquereurs/${savedId}`);
  return { ok: true, buyerId: savedId };
}

// « Annuler » après une lecture : rien n'est écrit sur aucune fiche ; la ligne de la lecture dit
// « lecture annulée » (qui, quand, le modèle, le coût, l'issue — décision de Jean-Guy, 12/11).
export async function cancelNotesReading(usageId: string): Promise<{ ok: boolean }> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || typeof usageId !== 'string' || !usageId)
    return { ok: false };
  const ok = await closeAiReading({
    usageId,
    agencyId: profile.agency_id,
    userId: profile.id,
    outcome: 'cancelled',
  });
  return { ok };
}

// « Tout est juste » : les pastilles « À vérifier » d'une fiche née d'une lecture partent (M97).
export async function verifyAllBuyerFields(buyerId: string): Promise<{ ok: boolean }> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false };
  const { error } = await createServiceRoleClient()
    .from('buyers')
    .update({ fields_to_verify: [], updated_at: new Date().toISOString() })
    .eq('id', buyerId)
    .eq('agency_id', profile.agency_id)
    .is('archived_at', null);
  if (error) return { ok: false };
  revalidatePath(`/acquereurs/${buyerId}`);
  return { ok: true };
}
