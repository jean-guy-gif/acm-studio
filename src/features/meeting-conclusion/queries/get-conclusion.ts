import { parseObjections } from '@/features/meeting-conclusion/services/objections';
import 'server-only';

import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';
import {
  isFollowUpMotive,
  isMandateType,
  type MeetingConclusion,
} from '@/features/meeting-conclusion/types';

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
      'commercialization_price, frozen_market_computed, frozen_advisor_analysis, frozen_advisor_price, frozen_seller_perceived_price, frozen_launch_readiness_first, frozen_launch_readiness_last, frozen_launch_readiness_missing, outcome, follow_up_reason, follow_up_motive, follow_up_motive_detail, next_follow_up_on, objections, objection_note, mandate_type, signed_at, concluded_at, outcome_changed_at',
    )
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  if (!data) {
    return null;
  }
  // Mission 94 — le prix reformulé par le vendeur, figé dans le résumé du Live.
  const { data: summary } = await supabase
    .from('live_seller_summary')
    .select('seller_revised_property_price, buyers_shown_count')
    .eq('project_id', projectId)
    .eq('agency_id', profile.agency_id)
    .maybeSingle();
  return {
    marketComputed: data.frozen_market_computed,
    advisorAnalysis: data.frozen_advisor_analysis,
    advisorPrice: data.frozen_advisor_price,
    commercializationPrice: data.commercialization_price,
    sellerPerceivedPrice: data.frozen_seller_perceived_price,
    sellerRevisedPrice: summary?.seller_revised_property_price ?? null,
    buyersShownCount: summary?.buyers_shown_count ?? null,
    launchReadinessFirst: data.frozen_launch_readiness_first,
    launchReadinessLast: data.frozen_launch_readiness_last,
    launchReadinessMissing: data.frozen_launch_readiness_missing,
    outcome: (data.outcome as MeetingConclusion['outcome']) ?? null,
    followUpReason: data.follow_up_reason,
    followUpMotive: isFollowUpMotive(data.follow_up_motive) ? data.follow_up_motive : null,
    followUpMotiveDetail: data.follow_up_motive_detail,
    nextFollowUpOn: data.next_follow_up_on,
    objections: parseObjections(data.objections),
    objectionNote: data.objection_note,
    mandateType: isMandateType(data.mandate_type) ? data.mandate_type : null,
    signedAt: data.signed_at,
    concludedAt: data.concluded_at,
    outcomeChangedAt: data.outcome_changed_at,
  };
}
