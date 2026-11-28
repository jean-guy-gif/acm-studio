import type { CardStep } from '@/features/meeting-conclusion/services/suivi-step-labels';
import {
  buyerInSentence,
  dayLabel,
} from '@/features/meeting-conclusion/services/suivi-step-labels';
import { mandatePrice } from '@/features/mandate-life/services/mandate-price';
import { parisDay } from '@/features/meeting-conclusion/services/follow-up-contacts';
import type {
  MandateAmendment,
  MandateLife,
  MandateOffer,
  MandateStage,
} from '@/features/mandate-life/types';
import { formatPercent } from '@/lib/format';

// Lot C (maquette C0, validée le 28/11, choix 2) — la carte du Suivi d'un mandat signé garde sa
// frise d'aujourd'hui tant qu'aucune offre n'est acceptée, puis suit la vente : Mandat signé →
// Offre acceptée → Compromis → Vente. Sa pastille dit l'étape, son chemin du prix le prix signé,
// le dernier avenant, puis l'offre acceptée ou le prix de vente. « Noter le compromis » est la
// prochaine étape de la carte à l'offre acceptée (question 16 : pas une tâche d'« Aujourd'hui ») ;
// sous compromis, les tâches de l'acte la donnent. Pur.

export type SaleSegment = { label: string; tone: 'done' | 'today' | 'later' };
export type SalePrice = { label: string; value: number; tone: 'plain' | 'blue' | 'green' };

export type SuiviSale = {
  stage: MandateStage;
  badge: string;
  segments: SaleSegment[];
  prices: SalePrice[];
  note: string | null;
  // null : la prochaine étape vient des tâches (l'acte sous compromis).
  step: CardStep | null;
};

export function suiviSale(input: {
  projectId: string;
  stage: MandateStage | 'unknown' | null | undefined;
  life: MandateLife;
  offer: MandateOffer | null;
  signedPrice: number | null;
  sellerPrice: number | null;
  amendments: readonly MandateAmendment[];
  signedOn: string | null;
}): SuiviSale | null {
  const { stage, life, offer } = input;
  if (stage !== 'offer_accepted' && stage !== 'under_compromise' && stage !== 'sold') {
    if (stage === 'ended' && life.endedOn) {
      return {
        stage,
        badge: `Mandat terminé sans vente · le ${dayLabel(life.endedOn)}`,
        segments: [],
        prices: [],
        note: null,
        step: {
          when: 'aucune',
          whenLate: false,
          title: 'Aucune',
          phrase: `Le mandat s’est terminé le ${dayLabel(life.endedOn)} sans vente. Rien à faire.`,
          button: null,
        },
      };
    }
    return null;
  }
  const price = mandatePrice(input.signedPrice, [...input.amendments]);
  const prices: SalePrice[] = [];
  if (stage === 'sold' && input.sellerPrice != null) {
    prices.push({ label: 'Il voulait', value: input.sellerPrice, tone: 'plain' });
  }
  if (input.signedPrice != null) {
    prices.push({ label: 'Prix signé', value: input.signedPrice, tone: 'plain' });
  }
  if (price.lastAmendment && stage !== 'sold') {
    prices.push({
      label: `Avenant du ${dayLabel(price.lastAmendment.amendedOn)}`,
      value: price.lastAmendment.price,
      tone: 'plain',
    });
  }
  if (stage !== 'sold' && offer?.price != null) {
    prices.push({ label: 'Offre acceptée', value: offer.price, tone: 'blue' });
  }
  if (stage === 'sold' && life.salePrice != null) {
    prices.push({ label: 'Vendu', value: life.salePrice, tone: 'green' });
  }

  const offerSegment: SaleSegment =
    offer || life.buyerOrigin === 'agency'
      ? { label: 'Offre acceptée ✓', tone: 'done' }
      : { label: 'Acquéreur venu d’ailleurs ✓', tone: 'done' };
  let segments: SaleSegment[];
  let badge: string;
  let step: CardStep | null = null;
  let note: string | null = null;
  if (stage === 'offer_accepted') {
    const buyer = buyerInSentence(offer?.buyerName).replace(/^la /, '');
    badge = offer?.buyerName ? `Offre acceptée · ${buyer}` : 'Offre acceptée';
    segments = [
      { label: 'Mandat signé ✓', tone: 'done' },
      offerSegment,
      { label: 'Compromis · à noter', tone: 'today' },
      { label: 'Vente', tone: 'later' },
    ];
    step = {
      when: 'aujourd’hui',
      whenLate: false,
      title: 'Noter le compromis',
      phrase: `Offre ${offer?.buyerName ? `de ${buyerInSentence(offer.buyerName)} ` : ''}acceptée${offer ? ` le ${dayLabel(parisDay(new Date(offer.acceptedAt)))}` : ''} · Point marché arrêté à l’offre acceptée`,
      button: {
        label: 'Noter le compromis',
        action: { kind: 'link', href: `/builder/${input.projectId}?mandat=compromis#son-mandat` },
        primary: true,
      },
    };
  } else if (stage === 'under_compromise') {
    badge = life.deedPlannedOn
      ? `Sous compromis · acte prévu le ${dayLabel(life.deedPlannedOn)}`
      : 'Sous compromis';
    segments = [
      { label: 'Mandat signé ✓', tone: 'done' },
      offerSegment,
      {
        label: life.compromiseSignedOn
          ? `Compromis le ${dayLabel(life.compromiseSignedOn)} ✓`
          : 'Compromis ✓',
        tone: 'done',
      },
      {
        label: life.deedPlannedOn ? `Acte le ${dayLabel(life.deedPlannedOn)}` : 'Acte',
        tone: 'today',
      },
    ];
  } else {
    badge = life.deedSignedOn
      ? `Vendu par l’agence · le ${dayLabel(life.deedSignedOn)}`
      : 'Vendu par l’agence';
    segments = [
      { label: 'Mandat signé ✓', tone: 'done' },
      offerSegment,
      { label: 'Compromis ✓', tone: 'done' },
      {
        label: life.deedSignedOn ? `Vendu le ${dayLabel(life.deedSignedOn)} ✓` : 'Vendu ✓',
        tone: 'done',
      },
    ];
    const parts: string[] = [];
    if (life.salePrice != null && price.current != null && price.current > 0) {
      const gap = ((life.salePrice - price.current) / price.current) * 100;
      parts.push(`${formatPercent(gap, { maxDecimals: 1, signed: true })} sur le prix du mandat`);
    }
    if (input.signedOn && life.compromiseSignedOn) {
      const days = Math.round(
        (Date.parse(`${life.compromiseSignedOn}T00:00:00Z`) -
          Date.parse(`${input.signedOn}T00:00:00Z`)) /
          86_400_000,
      );
      parts.push(`${days} jour${days > 1 ? 's' : ''} du mandat au compromis`);
    }
    note = parts.length > 0 ? parts.join(' · ') : null;
    step = {
      when: 'vendu',
      whenLate: false,
      title: 'Plus rien à faire',
      phrase: life.deedSignedOn
        ? `Acte signé le ${dayLabel(life.deedSignedOn)} chez le notaire.`
        : 'Vendu par l’agence.',
      button: null,
    };
  }
  return { stage, badge, segments, prices, note, step };
}
