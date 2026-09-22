'use server';

import { revalidatePath } from 'next/cache';

import { loadLivePresentation } from '@/features/live-seller/services/load-live-presentation';
import { commercializationPriceSchema } from '@/features/meeting-conclusion/schemas/conclusion-input';
import { liveDerivedAmounts } from '@/features/meeting-conclusion/services/resolve-conclusion-amounts';
import { getProfile } from '@/lib/auth/get-profile';
import type { Database } from '@/lib/supabase/database.types';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

type SaveArgs = Database['public']['Functions']['save_commercialization_price']['Args'];

export type SaveCommercializationResult = { ok: true } | { ok: false; error: string };

// Mission 53 §1 — dernier écran du Live : « Sur quel prix partons-nous ? ». Enregistrer le
// prix de commercialisation FIGE ①②③ à cet instant (§7.1). Le navigateur ne fournit que
// le prix ; ①②③ sont dérivés côté serveur de la présentation courante. N'écrit PAS le
// status : le dossier reste dans le Live tant qu'il n'est pas conclu (§2).
export async function saveCommercializationPrice(
  projectId: string,
  formData: FormData,
): Promise<SaveCommercializationResult> {
  const profile = await getProfile();
  if (!profile) {
    return { ok: false, error: 'Vous devez être connecté.' };
  }

  const parsed = commercializationPriceSchema.safeParse({
    commercialization_price: formData.get('commercialization_price'),
  });
  if (!parsed.success) {
    return { ok: false, error: 'Saisissez un prix de commercialisation valide.' };
  }

  // Autorisation : loadLivePresentation passe par getProject, cadré sur l'agence → null
  // pour un dossier étranger ou absent.
  const presentation = await loadLivePresentation(projectId);
  if (!presentation) {
    return { ok: false, error: 'Dossier introuvable pour votre agence.' };
  }
  const amounts = liveDerivedAmounts(presentation.live);

  const serviceClient = createServiceRoleClient();
  // Les montants figés acceptent null en base (function non typée pour la nullabilité) :
  // le cast n'affecte que le typage, PG reçoit bien null quand un repère manque.
  const args: SaveArgs = {
    p_project_id: projectId,
    p_agency_id: profile.agency_id,
    p_price: parsed.data.commercialization_price,
    p_market_computed: amounts.marketComputed as number,
    p_advisor_analysis: amounts.advisorAnalysis as number,
    p_advisor_price: amounts.advisorPrice as number,
  };
  const { error } = await serviceClient.rpc('save_commercialization_price', args);
  if (error) {
    return { ok: false, error: 'L’enregistrement a échoué. Réessayez.' };
  }

  revalidatePath(`/builder/${projectId}/conclusion`);
  revalidatePath('/suivi');
  return { ok: true };
}
