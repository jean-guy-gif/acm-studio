import 'server-only';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import type { MeetingConclusion } from '@/features/meeting-conclusion/types';

// Lecture de la conclusion d'un dossier (RLS cadré sur l'agence). Null si aucune
// conclusion n'a encore été enregistrée. Les montants sont ceux FIGÉS en base.
export async function getConclusion(projectId: string): Promise<MeetingConclusion | null> {
  const profile = await getProfile();
  if (!profile) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from('project_meeting_conclusions')
    .select(
      'commercialization_price, frozen_market_computed, frozen_advisor_analysis, frozen_advisor_price, outcome, follow_up_reason, concluded_at, outcome_changed_at',
    )
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!data) {
    return null;
  }
  return {
    marketComputed: data.frozen_market_computed,
    advisorAnalysis: data.frozen_advisor_analysis,
    advisorPrice: data.frozen_advisor_price,
    commercializationPrice: data.commercialization_price,
    outcome: (data.outcome as MeetingConclusion['outcome']) ?? null,
    followUpReason: data.follow_up_reason,
    concludedAt: data.concluded_at,
    outcomeChangedAt: data.outcome_changed_at,
  };
}
