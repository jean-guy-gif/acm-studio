import 'server-only';

import { AI_DEFAULT_MONTHLY_CAP_CENTS, type AiOutcome } from '@/features/ai-budget/constants';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { startOfParisMonth } from '@/lib/paris-time';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 151 — le budget d'IA, sur le modèle exact de celui de la recherche (M105) : le coût le
// pire d'une lecture est RÉSERVÉ avant l'appel, en une seule opération qui verrouille le compteur
// de l'agence (`reserve_ai_budget`) ; après l'appel, la ligne prend le coût réel et l'issue
// (`settle_ai_budget`). La ligne est aussi la trace de la lecture : qui, quand, le modèle, le
// coût, l'issue, les NOMS des champs — jamais une valeur, jamais une ligne des notes.

export type AiReservation =
  | { ok: true; usageId: string }
  // `reached` : le mois n'a plus de quoi payer cette lecture ; `unavailable` : la base n'a pas
  // répondu — un budget illisible n'est pas un budget libre (M100).
  | { ok: false; reason: 'reached' | 'unavailable' };

export async function reserveAiBudget(input: {
  agencyId: string;
  userId: string | null;
  purpose: 'notes' | 'ranking';
  model: string;
  source: 'photo' | 'file' | 'text' | 'listings';
  wantedMillicents: number;
  now?: Date;
}): Promise<AiReservation> {
  try {
    const { data, error } = await createServiceRoleClient().rpc('reserve_ai_budget', {
      p_agency_id: input.agencyId,
      // Le type généré veut un texte ; la fonction accepte NULL (le cron n'a pas d'auteur).
      p_user_id: input.userId as string,
      p_purpose: input.purpose,
      p_model: input.model,
      p_source: input.source,
      p_wanted_millicents: Math.max(1, Math.ceil(input.wantedMillicents)),
      p_since: startOfParisMonth(input.now ?? new Date()).toISOString(),
      p_default_cap_cents: AI_DEFAULT_MONTHLY_CAP_CENTS,
    });
    if (error) {
      await reportServerError('reserveAiBudget', error);
      return { ok: false, reason: 'unavailable' };
    }
    return typeof data === 'string' && data
      ? { ok: true, usageId: data }
      : { ok: false, reason: 'reached' };
  } catch (error) {
    await reportServerError('reserveAiBudget', error);
    return { ok: false, reason: 'unavailable' };
  }
}

// Après l'appel : le coût réel, l'issue et les noms des champs proposés. Un échec du règlement est
// une vraie panne : il entre au journal, et la réservation reste comptée au pire — par prudence.
export async function settleAiBudget(input: {
  usageId: string;
  costMillicents: number;
  outcome: AiOutcome;
  fieldsProposed?: string[];
  personalMentionsSkipped?: number | null;
}): Promise<void> {
  try {
    const { error } = await createServiceRoleClient().rpc('settle_ai_budget', {
      p_usage_id: input.usageId,
      p_cost_millicents: Math.max(0, Math.ceil(input.costMillicents)),
      p_outcome: input.outcome,
      p_fields_proposed: (input.fieldsProposed ?? []) as string[],
      p_personal_mentions_skipped: input.personalMentionsSkipped as number,
    });
    if (error) await reportServerError('settleAiBudget', error);
  } catch (error) {
    await reportServerError('settleAiBudget', error);
  }
}

// L'issue d'une lecture déjà réglée : fiche créée ou complétée (avec la fiche et les noms des
// champs gardés), lecture annulée. Seulement une lecture de cette agence et de cet auteur, encore
// « en attente » : une issue ne se réécrit pas.
export async function closeAiReading(input: {
  usageId: string;
  agencyId: string;
  userId: string;
  outcome: 'created' | 'completed' | 'cancelled';
  buyerId?: string;
  fieldsKept?: string[];
}): Promise<boolean> {
  try {
    const { data, error } = await createServiceRoleClient()
      .from('ai_usage')
      .update({
        outcome: input.outcome,
        ...(input.buyerId ? { buyer_id: input.buyerId } : {}),
        fields_kept: (input.fieldsKept ?? []).slice(0, 60),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.usageId)
      .eq('agency_id', input.agencyId)
      .eq('user_id', input.userId)
      .eq('purpose', 'notes')
      .eq('outcome', 'pending')
      .eq('reserved', false)
      .select('id');
    if (error) {
      await reportServerError('closeAiReading', error);
      return false;
    }
    return (data ?? []).length === 1;
  } catch (error) {
    await reportServerError('closeAiReading', error);
    return false;
  }
}

// Mission 151 (partie B) — la veille de nuit ne prend que la moitié du plafond d'IA de l'agence
// (Jean-Guy, 12/11) : ce que le classement de nuit (sans auteur) a déjà coûté ce mois, plus ce
// qu'il veut réserver, reste sous la moitié. Une lecture en échec ne laisse aucune place (M98). La
// veille passe un acquéreur après l'autre : la vérification suffit sans verrou.
export async function nightRankingRoom(input: {
  agencyId: string;
  capCents: number;
  wantedMillicents: number;
  now?: Date;
}): Promise<boolean> {
  try {
    const { data, error } = await createServiceRoleClient()
      .from('ai_usage')
      .select('cost_millicents')
      .eq('agency_id', input.agencyId)
      .eq('purpose', 'ranking')
      .is('user_id', null)
      .gte('created_at', startOfParisMonth(input.now ?? new Date()).toISOString());
    if (error) {
      await reportServerError('nightRankingRoom', error);
      return false;
    }
    const spent = (data ?? []).reduce((sum, row) => sum + row.cost_millicents, 0);
    return spent + input.wantedMillicents <= (input.capCents * 1000) / 2;
  } catch (error) {
    await reportServerError('nightRankingRoom', error);
    return false;
  }
}
