import { mandateEndFrom, MANDATE_MONTHS_MAX } from '@/features/mandate-life/services/mandate-dates';
import type { MandateStage } from '@/features/mandate-life/types';

// Lot C — ce que le conseiller saisit dans « Son mandat », relu au serveur avant toute écriture
// (CLAUDE.md : tout ce qui vient du navigateur est revalidé). Des jours AAAA-MM-JJ, à Paris ; la
// signature est le premier jour possible, aujourd'hui le dernier pour ce qui a déjà eu lieu (un
// avenant, un compromis, un acte, une fin sans vente). Pur, sans zod : il sert aussi d'aide à
// l'écran.

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (value: unknown): value is string =>
  typeof value === 'string' && DAY.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const isAmount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 999_999_999;

type Refused = { ok: false; error: string };
const refuse = (error: string): Refused => ({ ok: false, error });

export const MANDATE_INPUT_ERRORS = {
  day: 'Cette date n’est pas valable.',
  beforeSignature: 'Cette date est avant la signature du mandat.',
  future: 'Cette date n’est pas encore passée.',
  months: `La durée se compte en mois entiers, de 1 à ${MANDATE_MONTHS_MAX}.`,
  deedBeforeCompromise: 'L’acte ne peut pas être avant le compromis.',
  price: 'Le prix de vente n’est pas un montant valable.',
  stage: 'Ce mandat n’en est plus là\u00a0: rechargez la page.',
} as const;

// La fin du mandat : une durée en mois depuis la signature, ou une date ; et la reconduction tacite.
export function parseMandateEnd(
  raw: { months?: unknown; endsOn?: unknown; tacit?: unknown },
  signedOn: string,
): { ok: true; endsOn: string; tacit: boolean } | Refused {
  let endsOn: string | null;
  if (raw.months != null && raw.months !== '') {
    endsOn = mandateEndFrom(signedOn, Number(raw.months));
    if (!endsOn) return refuse(MANDATE_INPUT_ERRORS.months);
  } else {
    if (!isDay(raw.endsOn)) return refuse(MANDATE_INPUT_ERRORS.day);
    endsOn = raw.endsOn;
  }
  if (endsOn < signedOn) return refuse(MANDATE_INPUT_ERRORS.beforeSignature);
  return { ok: true, endsOn, tacit: raw.tacit === true };
}

// Un avenant de baisse : sa date (de la signature à aujourd'hui) ; le prix est relu à part
// (`amendmentRefusal`, sous le prix du mandat).
export function parseAmendmentDay(
  amendedOn: unknown,
  signedOn: string,
  today: string,
): { ok: true; amendedOn: string } | Refused {
  if (!isDay(amendedOn)) return refuse(MANDATE_INPUT_ERRORS.day);
  if (amendedOn < signedOn) return refuse(MANDATE_INPUT_ERRORS.beforeSignature);
  if (amendedOn > today) return refuse(MANDATE_INPUT_ERRORS.future);
  return { ok: true, amendedOn };
}

// Le compromis : signé (de la signature à aujourd'hui), l'acte prévu au plus tôt le même jour.
export function parseCompromise(
  raw: { compromiseSignedOn?: unknown; deedPlannedOn?: unknown },
  signedOn: string,
  today: string,
): { ok: true; compromiseSignedOn: string; deedPlannedOn: string } | Refused {
  if (!isDay(raw.compromiseSignedOn) || !isDay(raw.deedPlannedOn)) {
    return refuse(MANDATE_INPUT_ERRORS.day);
  }
  if (raw.compromiseSignedOn < signedOn) return refuse(MANDATE_INPUT_ERRORS.beforeSignature);
  if (raw.compromiseSignedOn > today) return refuse(MANDATE_INPUT_ERRORS.future);
  if (raw.deedPlannedOn < raw.compromiseSignedOn) {
    return refuse(MANDATE_INPUT_ERRORS.deedBeforeCompromise);
  }
  return {
    ok: true,
    compromiseSignedOn: raw.compromiseSignedOn,
    deedPlannedOn: raw.deedPlannedOn,
  };
}

// La vente : l'acte (du compromis à aujourd'hui) et le prix de vente, en euros entiers.
export function parseSale(
  raw: { deedSignedOn?: unknown; salePrice?: unknown },
  compromiseSignedOn: string,
  today: string,
): { ok: true; deedSignedOn: string; salePrice: number } | Refused {
  if (!isDay(raw.deedSignedOn)) return refuse(MANDATE_INPUT_ERRORS.day);
  if (raw.deedSignedOn < compromiseSignedOn) {
    return refuse(MANDATE_INPUT_ERRORS.deedBeforeCompromise);
  }
  if (raw.deedSignedOn > today) return refuse(MANDATE_INPUT_ERRORS.future);
  if (!isAmount(raw.salePrice)) return refuse(MANDATE_INPUT_ERRORS.price);
  return { ok: true, deedSignedOn: raw.deedSignedOn, salePrice: raw.salePrice };
}

// La fin sans vente : de la signature à aujourd'hui.
export function parseEndedOn(
  endedOn: unknown,
  signedOn: string,
  today: string,
): { ok: true; endedOn: string } | Refused {
  if (!isDay(endedOn)) return refuse(MANDATE_INPUT_ERRORS.day);
  if (endedOn < signedOn) return refuse(MANDATE_INPUT_ERRORS.beforeSignature);
  if (endedOn > today) return refuse(MANDATE_INPUT_ERRORS.future);
  return { ok: true, endedOn };
}

// Quel geste à quelle étape : la fin, les avenants et la fin sans vente tant que le mandat vit (la
// fin sans vente, seulement sans offre acceptée : l'offre tombe d'abord, sur la fiche de
// l'acquéreur) ; le compromis depuis « Mandat signé » ou « Offre acceptée », ou pour le corriger ;
// la vente sous compromis, ou pour la corriger.
export type MandateGesture =
  'end' | 'amendment' | 'compromise' | 'compromise_fell' | 'sale' | 'ended' | 'end_cancelled';

const ALLOWED: Record<MandateGesture, readonly MandateStage[]> = {
  end: ['signed', 'offer_accepted', 'under_compromise'],
  amendment: ['signed', 'offer_accepted'],
  compromise: ['signed', 'offer_accepted', 'under_compromise'],
  compromise_fell: ['under_compromise'],
  sale: ['under_compromise', 'sold'],
  ended: ['signed'],
  end_cancelled: ['ended'],
};

export function gestureAllowed(gesture: MandateGesture, stage: MandateStage | 'unknown' | null) {
  return stage != null && stage !== 'unknown' && ALLOWED[gesture].includes(stage);
}
