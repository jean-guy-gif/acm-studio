import 'server-only';

import { DEMO_STAGES, type DemoStage } from '@/features/demo/services/demo-seed';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type DemoDossier = {
  id: string;
  sellerName: string;
  stage: DemoStage;
  status: string;
};

// Mission 114 (partie B) — les dossiers de démo du closer connecté : les siens, marqués, dans son
// agence (la RLS y veille) ; dans l'ordre des étapes.
export async function getDemoDossiers(): Promise<DemoDossier[]> {
  const profile = await getProfile();
  if (!profile) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('projects')
    .select('id, seller_name, demo_stage, status')
    .eq('agency_id', profile.agency_id)
    .eq('advisor_id', profile.id)
    .not('demo_stage', 'is', null)
    .neq('status', 'archived');
  const order = (stage: string | null) => DEMO_STAGES.indexOf(stage as DemoStage);
  return (data ?? [])
    .filter((row): row is typeof row & { demo_stage: DemoStage } =>
      (DEMO_STAGES as readonly string[]).includes(row.demo_stage ?? ''),
    )
    .sort((a, b) => order(a.demo_stage) - order(b.demo_stage))
    .map((row) => ({
      id: row.id,
      sellerName: row.seller_name,
      stage: row.demo_stage,
      status: row.status,
    }));
}
