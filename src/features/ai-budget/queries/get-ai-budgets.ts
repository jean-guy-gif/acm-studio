import 'server-only';

import { AI_DEFAULT_MONTHLY_CAP_CENTS } from '@/features/ai-budget/constants';
import { startOfParisMonth } from '@/lib/paris-time';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// Mission 151 — le budget d'IA de chaque agence pour la page des opérateurs (M100) : le plafond du
// mois (réglé, sinon 10 €) et ce qui a été dépensé, en centimes. null : la lecture a échoué — une
// panne ne se lit jamais comme « rien dépensé » (M98).
// `posed` : un opérateur a posé ce plafond ; sans lui, la lecture de l'agence est fermée
// (`reading-gate.ts`), le plafond affiché n'est que celui qui servirait à l'ouverture.
export type AiBudget = { capCents: number; spentCents: number; posed: boolean };

export async function getAiBudgets(now: Date = new Date()): Promise<Map<string, AiBudget> | null> {
  const admin = createServiceRoleClient();
  const [caps, usage] = await Promise.all([
    admin.from('agency_ai_budgets').select('agency_id, monthly_cap_cents'),
    admin.rpc('ai_usage_since', { p_since: startOfParisMonth(now).toISOString() }),
  ]);
  if (caps.error || usage.error) return null;
  const spent = new Map(
    (usage.data ?? []).map((row) => [row.agency_id, Math.ceil(Number(row.cost_millicents) / 1000)]),
  );
  const budgets = new Map<string, AiBudget>();
  for (const row of caps.data ?? []) {
    budgets.set(row.agency_id, {
      capCents: row.monthly_cap_cents,
      spentCents: spent.get(row.agency_id) ?? 0,
      posed: true,
    });
  }
  for (const [agencyId, cents] of spent) {
    if (!budgets.has(agencyId))
      budgets.set(agencyId, {
        capCents: AI_DEFAULT_MONTHLY_CAP_CENTS,
        spentCents: cents,
        posed: false,
      });
  }
  return budgets;
}

export function aiBudgetOf(budgets: Map<string, AiBudget>, agencyId: string): AiBudget {
  return (
    budgets.get(agencyId) ?? { capCents: AI_DEFAULT_MONTHLY_CAP_CENTS, spentCents: 0, posed: false }
  );
}

// Le budget d'IA d'UNE agence, pour son manager (Administration) : il le lit, il ne le règle pas
// (M55). null : la lecture a échoué.
export async function getAgencyAiBudget(
  agencyId: string,
  now: Date = new Date(),
): Promise<AiBudget | null> {
  const admin = createServiceRoleClient();
  const [cap, usage] = await Promise.all([
    admin
      .from('agency_ai_budgets')
      .select('monthly_cap_cents')
      .eq('agency_id', agencyId)
      .maybeSingle(),
    admin
      .from('ai_usage')
      .select('cost_millicents')
      .eq('agency_id', agencyId)
      .gte('created_at', startOfParisMonth(now).toISOString()),
  ]);
  if (cap.error || usage.error) return null;
  const millicents = (usage.data ?? []).reduce((sum, row) => sum + row.cost_millicents, 0);
  return {
    capCents: cap.data?.monthly_cap_cents ?? AI_DEFAULT_MONTHLY_CAP_CENTS,
    spentCents: Math.ceil(millicents / 1000),
    posed: cap.data != null,
  };
}

// Mission 151 — le plafond POSÉ par un opérateur pour une agence, qui ouvre la lecture par l'IA
// (`reading-gate.ts`) : null sans ligne, ou si la lecture échoue (fermé, M98).
export async function getPosedAiCap(agencyId: string | null | undefined): Promise<number | null> {
  if (!agencyId) return null;
  const { data, error } = await createServiceRoleClient()
    .from('agency_ai_budgets')
    .select('monthly_cap_cents')
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (error || !data) return null;
  return data.monthly_cap_cents;
}

// Ouverte : un plafond posé au-dessus de 0 € (la démo, simulée, l'est toujours).
export function aiBudgetOpen(budget: AiBudget, isDemo: boolean): boolean {
  return isDemo || (budget.posed && budget.capCents > 0);
}
