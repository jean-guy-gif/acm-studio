import type { AvailabilitySlot } from '@/features/buyer-deck/types';

// Mission 122 (partie B, décisions de Jean-Guy, 25/10) — les créneaux que le déroulé figé garde
// comme « donnés en rendez-vous » : ceux choisis à « Terminer », s'il veut visiter au moins un
// bien ; sinon aucun. Pur.
export function meetingSlots(
  chosen: readonly AvailabilitySlot[],
  wantsToVisit: boolean,
): AvailabilitySlot[] {
  return wantsToVisit ? [...chosen] : [];
}
