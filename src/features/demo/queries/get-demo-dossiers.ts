import 'server-only';

import {
  DEMO_SEEDS,
  DEMO_STAGES,
  demoSeedPlan,
  type DemoStage,
} from '@/features/demo/services/demo-seed';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type DemoDossier = {
  id: string;
  sellerName: string;
  stage: DemoStage;
  status: string;
};

// Mission 114 (partie B) — les dossiers de démo du closer connecté : les siens, marqués, dans son
// agence (la RLS y veille) ; dans l'ordre des étapes. Mission 145 — deux mandats signés (Mougins,
// puis Vence) ; huit depuis la M155, dans l'ordre des dossiers de la démo. Mission 147
// (partie B) — une lecture en échec rend null, jamais une liste vide (M98) : « Ma démo » le dit et
// ne propose pas « Préparer ma démo », qui recréerait six dossiers à côté des siens.
export async function getDemoDossiers(): Promise<DemoDossier[] | null> {
  const profile = await getProfile();
  if (!profile) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, seller_name, demo_stage, status, created_at')
    .eq('agency_id', profile.agency_id)
    .eq('advisor_id', profile.id)
    .not('demo_stage', 'is', null)
    .neq('status', 'archived');
  if (error) return null;
  const order = (stage: string | null) => DEMO_STAGES.indexOf(stage as DemoStage);
  // Mission 155 — les dossiers se créent en même temps : à étape égale, l'ordre des dossiers de la
  // démo (Mougins, puis Vence…), lu sur le vendeur ; un dossier inconnu après, par création.
  const now = new Date();
  const sellers = DEMO_SEEDS.map((key) => demoSeedPlan(key, now).sellerName);
  const rank = (seller: string) => {
    const index = sellers.indexOf(seller);
    return index < 0 ? sellers.length : index;
  };
  return (data ?? [])
    .filter((row): row is typeof row & { demo_stage: DemoStage } =>
      (DEMO_STAGES as readonly string[]).includes(row.demo_stage ?? ''),
    )
    .sort(
      (a, b) =>
        order(a.demo_stage) - order(b.demo_stage) ||
        rank(a.seller_name) - rank(b.seller_name) ||
        a.created_at.localeCompare(b.created_at),
    )
    .map((row) => ({
      id: row.id,
      sellerName: row.seller_name,
      stage: row.demo_stage,
      status: row.status,
    }));
}
