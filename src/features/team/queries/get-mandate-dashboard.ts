import 'server-only';

import {
  buildMandateDashboard,
  type MandateDashboard,
} from '@/features/team/services/build-mandate-dashboard';
import {
  buildBuyerSearchFigures,
  type BuyerSearchCard,
  type BuyerSearchFigures,
} from '@/features/team/services/build-buyer-search-figures';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

// Mission 110 — les chiffres de la prise de mandat de l'agence de l'appelant. Les lectures sont
// cadrées sur l'agence par la RLS, et le filtre le redit : rien ne sort de l'agence. Appelé
// seulement après le garde de rôle de la page (manager).
export async function getMandateDashboard(): Promise<
  (MandateDashboard & { buyerSearches: BuyerSearchFigures | null }) | null
> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) {
    return null;
  }
  const supabase = await createClient();
  const [projects, conclusions, profiles, collaborations] = await Promise.all([
    supabase
      .from('projects')
      .select('id, advisor_id, is_example')
      .eq('agency_id', profile.agency_id)
      .neq('status', 'archived'),
    supabase
      .from('project_meeting_conclusions')
      .select(
        'project_id, outcome, mandate_type, concluded_at, signed_at, first_outcome, objections',
      )
      .eq('agency_id', profile.agency_id),
    supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('agency_id', profile.agency_id),
    // Mission 115 — les collaborations obtenues avec un confrère, un fait posé par le conseiller.
    supabase
      .from('comparables')
      .select('project_id')
      .eq('agency_id', profile.agency_id)
      .eq('is_selected', true)
      .not('prospecting_collaboration_at', 'is', null),
  ]);
  if (projects.error || conclusions.error || profiles.error || collaborations.error) {
    return null;
  }
  const advisors = (profiles.data ?? []).map((row) => ({
    id: row.id,
    name: [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || 'Conseiller',
  }));
  const dashboard = buildMandateDashboard({
    projects: (projects.data ?? []).map((row) => ({
      id: row.id,
      advisorId: row.advisor_id,
      isExample: row.is_example === true,
    })),
    conclusions: (conclusions.data ?? []).map((row) => ({
      projectId: row.project_id,
      outcome: row.outcome,
      mandateType: row.mandate_type,
      concludedAt: row.concluded_at,
      signedAt: row.signed_at,
      firstOutcome: row.first_outcome,
      objections: row.objections,
    })),
    advisors,
    collaborations: (collaborations.data ?? []).map((row) => ({ projectId: row.project_id })),
  });
  return {
    ...dashboard,
    buyerSearches: await buyerSearches(supabase, profile.agency_id, advisors),
  };
}

const FACT_COLUMNS =
  'id, prospecting_handed_at, prospecting_meeting_at, prospecting_mandate_at, prospecting_collaboration_at';

// Mission 120 B — les biens démarchés depuis une recherche acquéreur, chacun une fois (un bien
// démarché ou le concurrent qui porte sa carte), au conseiller qui a préparé son premier courrier.
// Une lecture en échec n'est jamais « aucun courrier » : le bloc ne s'affiche pas.
async function buyerSearches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  agencyId: string,
  advisors: { id: string; name: string }[],
): Promise<BuyerSearchFigures | null> {
  const { data: origins, error } = await supabase
    .from('buyer_prospect_origins')
    .select('created_by, prospect_id, comparable_id, created_at')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: true });
  if (error) return null;
  const firstBy = new Map<string, string | null>();
  for (const origin of origins ?? []) {
    const key = origin.prospect_id ? `p:${origin.prospect_id}` : `c:${origin.comparable_id}`;
    if (!firstBy.has(key)) firstBy.set(key, origin.created_by);
  }
  const ids = (prefix: string) =>
    [...firstBy.keys()].filter((key) => key.startsWith(prefix)).map((key) => key.slice(2));
  const prospectIds = ids('p:');
  const comparableIds = ids('c:');
  const [prospects, comparables] = await Promise.all([
    prospectIds.length > 0
      ? supabase
          .from('buyer_prospects')
          .select(FACT_COLUMNS)
          .eq('agency_id', agencyId)
          .in('id', prospectIds)
      : Promise.resolve({ data: [], error: null }),
    comparableIds.length > 0
      ? supabase
          .from('comparables')
          .select(FACT_COLUMNS)
          .eq('agency_id', agencyId)
          .in('id', comparableIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (prospects.error || comparables.error) return null;
  const card =
    (prefix: string) =>
    (row: {
      id: string;
      prospecting_handed_at: string | null;
      prospecting_meeting_at: string | null;
      prospecting_mandate_at: string | null;
      prospecting_collaboration_at: string | null;
    }): BuyerSearchCard => ({
      advisorId: firstBy.get(`${prefix}${row.id}`) ?? null,
      handedAt: row.prospecting_handed_at,
      meetingAt: row.prospecting_meeting_at,
      mandateAt: row.prospecting_mandate_at,
      collaborationAt: row.prospecting_collaboration_at,
    });
  return buildBuyerSearchFigures(
    [...(prospects.data ?? []).map(card('p:')), ...(comparables.data ?? []).map(card('c:'))],
    advisors,
  );
}
