import type { SupabaseClient } from '@supabase/supabase-js';

import type { MandateFormContext } from '@/features/mandate-life/components/mandate-forms';
import { getMandateAmendments } from '@/features/mandate-life/queries/get-mandate-amendments';
import {
  getBuyerName,
  getMandateVisitors,
} from '@/features/mandate-life/queries/get-mandate-people';
import {
  mandateOfferOf,
  type MandateOfferAnswer,
} from '@/features/mandate-life/services/mandate-offer';
import { mandateSheet, type MandateSheet } from '@/features/mandate-life/services/mandate-sheet';
import { mandateStage } from '@/features/mandate-life/services/mandate-stage';
import { mandateSteps, type MandateStep } from '@/features/mandate-life/services/mandate-steps';
import {
  NO_MANDATE_LIFE,
  type MandateLife,
  type MandateStage,
} from '@/features/mandate-life/types';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import type { Database } from '@/lib/supabase/database.types';
import { formatEuro, formatRelativeDay } from '@/lib/format';

// Lot C — « Son mandat » pour la fiche du dossier : l'étape, ses quatre cartes, « Le mandat » et
// ce que ses saisies ont besoin de savoir. Une lecture en échec (les offres, les avenants) ne dit
// jamais un prix ni une étape faux : la section le dit, et le dossier garde sa prochaine étape
// d'avant (M98).

export type MandateView =
  | { readable: false }
  | {
      readable: true;
      stage: MandateStage;
      steps: MandateStep[];
      sheet: MandateSheet;
      formContext: MandateFormContext;
    };

export async function loadMandateView(input: {
  supabase: SupabaseClient<Database>;
  agencyId: string;
  projectId: string;
  conclusion: {
    signedAt: string | null;
    concludedAt: string | null;
    mandateType: string | null;
    commercializationPrice: number | null;
    life?: MandateLife;
  };
  agencyOffers: readonly MandateOfferAnswer[] | null;
  now: Date;
}): Promise<MandateView> {
  const { supabase, agencyId, projectId, conclusion, now } = input;
  const life = conclusion.life ?? NO_MANDATE_LIFE;
  const offer = mandateOfferOf(input.agencyOffers, projectId);
  const stage = mandateStage({ outcome: 'signed', life, offer });
  if (stage === 'unknown' || stage == null || offer === 'unknown') return { readable: false };

  const otherBuyer =
    life.compromiseBuyerId && life.compromiseBuyerId !== offer?.buyerId
      ? life.compromiseBuyerId
      : null;
  const [amendments, visitors, compromiseBuyerName] = await Promise.all([
    getMandateAmendments(supabase, agencyId, [projectId]),
    getMandateVisitors(supabase, agencyId, projectId),
    otherBuyer ? getBuyerName(supabase, agencyId, otherBuyer) : null,
  ]);
  if (!amendments) return { readable: false };

  const signedAt = conclusion.signedAt ?? conclusion.concludedAt;
  const projectAmendments = amendments.get(projectId) ?? [];
  const sheet = mandateSheet({
    projectId,
    stage,
    mandateType: conclusion.mandateType,
    signedAt,
    signedPrice: conclusion.commercializationPrice,
    amendments: projectAmendments,
    offer,
    life,
    compromiseBuyerName,
    now,
  });
  const day = (value: string) => formatRelativeDay(value, now);
  return {
    readable: true,
    stage,
    steps: mandateSteps({
      stage,
      signedAt,
      mandateType: conclusion.mandateType,
      offer,
      life,
      now,
    }),
    sheet,
    formContext: {
      projectId,
      today: parisDay(now),
      signedOn: signedAt ? parisDay(new Date(signedAt)) : parisDay(now),
      endsOn: life.endsOn,
      tacit: life.tacitRenewal,
      priceChain: sheet.priceChain,
      currentPriceText: sheet.currentPrice != null ? formatEuro(sheet.currentPrice) : null,
      compromise: {
        signedOn: life.compromiseSignedOn,
        deedPlannedOn: life.deedPlannedOn,
        origin: life.buyerOrigin,
        buyerId: life.compromiseBuyerId,
      },
      offerBuyer:
        offer?.buyerId != null
          ? {
              id: offer.buyerId,
              label: `${offer.buyerName ?? 'L’acquéreur de l’offre'} · offre acceptée ${day(offer.acceptedAt)}`,
            }
          : null,
      visitors:
        visitors?.map((visitor) => ({
          id: visitor.buyerId,
          label: `${visitor.name} · a visité le bien ${day(visitor.visitedAt)}`,
        })) ?? null,
      sale: { deedSignedOn: life.deedSignedOn, salePrice: life.salePrice },
    },
  };
}
