import { NO_MANDATE_LIFE, type MandateLife } from '@/features/mandate-life/types';

// Lot C — les faits du mandat lus en base, relus par liste d'autorisation avant toute règle : un
// jour AAAA-MM-JJ, une origine de la liste, un prix positif (l'API rend un numeric en texte) ; tout
// le reste vaut « rien ». Pur.

export const MANDATE_LIFE_COLUMNS =
  'mandate_ends_on, mandate_tacit_renewal, compromise_signed_on, deed_planned_on, sale_buyer_origin, compromise_buyer_id, deed_signed_on, sale_price, mandate_ended_on';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = (value: unknown): string | null =>
  typeof value === 'string' && DAY.test(value) ? value : null;
const amount = (value: unknown): number | null => {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(number) && number > 0 ? number : null;
};

export function toMandateLife(row: Record<string, unknown>): MandateLife {
  const origin = row.sale_buyer_origin;
  return {
    ...NO_MANDATE_LIFE,
    endsOn: day(row.mandate_ends_on),
    tacitRenewal: row.mandate_tacit_renewal === true,
    compromiseSignedOn: day(row.compromise_signed_on),
    deedPlannedOn: day(row.deed_planned_on),
    buyerOrigin: origin === 'agency' || origin === 'outside' ? origin : null,
    compromiseBuyerId: typeof row.compromise_buyer_id === 'string' ? row.compromise_buyer_id : null,
    deedSignedOn: day(row.deed_signed_on),
    salePrice: amount(row.sale_price),
    endedOn: day(row.mandate_ended_on),
  };
}

export const toAmount = amount;
