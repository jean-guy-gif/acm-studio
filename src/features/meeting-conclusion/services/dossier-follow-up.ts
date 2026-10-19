import { liveDurationLabel } from '@/features/live-seller/services/live-timing';
import {
  daysSinceLastContact,
  isFollowUpDueNow,
  lastContactAt,
  type FollowUpContact,
} from '@/features/meeting-conclusion/services/follow-up-contacts';
import { buildFollowUpMessage } from '@/features/meeting-conclusion/services/follow-up-message';
import {
  buildSellerSaid,
  priceDropsSinceMeeting,
  type GuessedCompetitor,
  type SellerSaid,
} from '@/features/meeting-conclusion/services/seller-said';
import type { MeetingConclusion } from '@/features/meeting-conclusion/types';

// Mission 96 — tout ce qu'un dossier conclu montre de plus au conseiller, calculé une fois côté
// serveur et remis tel quel à l'écran : le bloc « Ce que le vendeur a dit », l'historique des
// relances, le délai depuis le dernier contact et le message proposé. Pur.
export type DossierFollowUp = {
  sellerSaid: SellerSaid | null;
  contacts: FollowUpContact[];
  // Pour un dossier « à relancer » seulement ; null sinon.
  lastContactAt: string | null;
  lastContactDays: number | null;
  due: boolean;
  message: string | null;
};

export type DossierFollowUpInput = {
  conclusion: MeetingConclusion | null;
  liveStartedAt: string | null | undefined;
  liveEndedAt: string | null | undefined;
  competitors: GuessedCompetitor[];
  dangerous: { label: string; revealedPrice: number | null; currentPrice: number | null } | null;
  contacts: FollowUpContact[];
  now: Date;
  signature: { advisorFirstName: string | null; agencyName: string | null };
};

const meetingDay = (iso: string | null | undefined): string | null => {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' });
};

export function buildDossierFollowUp(input: DossierFollowUpInput): DossierFollowUp {
  const { conclusion } = input;
  const sellerSaid = buildSellerSaid({
    sellerPerceivedPrice: conclusion?.sellerPerceivedPrice ?? null,
    sellerRevisedPrice: conclusion?.sellerRevisedPrice ?? null,
    commercializationPrice: conclusion?.commercializationPrice ?? null,
    competitors: input.competitors,
    dangerous: input.dangerous,
    launchReadinessFirst: conclusion?.launchReadinessFirst ?? null,
    launchReadinessLast: conclusion?.launchReadinessLast ?? null,
    launchReadinessMissing: conclusion?.launchReadinessMissing ?? null,
    liveDuration: liveDurationLabel(input.liveStartedAt, input.liveEndedAt),
  });

  if (conclusion?.outcome !== 'follow_up') {
    return {
      sellerSaid,
      contacts: input.contacts,
      lastContactAt: null,
      lastContactDays: null,
      due: false,
      message: null,
    };
  }

  const days = daysSinceLastContact(conclusion.concludedAt, input.contacts, input.now);
  return {
    sellerSaid,
    contacts: input.contacts,
    lastContactAt: lastContactAt(conclusion.concludedAt, input.contacts),
    lastContactDays: days,
    // Mission 105 — la date de prochaine relance décide, sinon la règle des 7 jours.
    // Mission 108 — avant toute relance, la date posée à la conclusion.
    due: isFollowUpDueNow(
      conclusion.concludedAt,
      input.contacts,
      input.now,
      conclusion.nextFollowUpOn ?? null,
    ),
    message: buildFollowUpMessage({
      motive: conclusion.followUpMotive,
      meetingDate: meetingDay(conclusion.concludedAt),
      sellerPerceivedPrice: conclusion.sellerPerceivedPrice,
      sellerRevisedPrice: conclusion.sellerRevisedPrice,
      commercializationPrice: conclusion.commercializationPrice,
      launchReadinessMissing: conclusion.launchReadinessMissing,
      objections: conclusion.objections ?? [],
      priceDropsSinceMeeting: priceDropsSinceMeeting(input.competitors),
      advisorFirstName: input.signature.advisorFirstName,
      agencyName: input.signature.agencyName,
    }),
  };
}
