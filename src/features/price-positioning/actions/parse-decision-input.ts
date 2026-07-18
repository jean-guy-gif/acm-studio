import { MAX_JUSTIFICATION_LENGTH } from '@/features/price-positioning/types/saved-price-positioning';

// The ONLY three values the browser is allowed to supply. Any other field present
// in the FormData (range, confidence, snapshot, agency_id, …) is never read here,
// so it can never influence what is persisted.
export type DecisionInput = {
  advisorPrice: number;
  sellerPrice: number | null;
  justification: string | null;
};

export type DecisionInputResult = { ok: true; input: DecisionInput } | { ok: false; error: string };

// Pure parser/validator for the client-supplied decision fields. Deterministic,
// no I/O — unit-testable in isolation.
export function parseDecisionInput(formData: FormData): DecisionInputResult {
  const advisorRaw = String(formData.get('advisorPrice') ?? '').trim();
  const advisorPrice = advisorRaw === '' ? Number.NaN : Number(advisorRaw);
  if (!Number.isFinite(advisorPrice) || advisorPrice <= 0) {
    return { ok: false, error: 'Le prix conseillé doit être un montant positif.' };
  }

  const sellerRaw = String(formData.get('sellerPrice') ?? '').trim();
  let sellerPrice: number | null = null;
  if (sellerRaw !== '') {
    const parsed = Number(sellerRaw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { ok: false, error: 'Le prix vendeur doit être vide ou un montant positif.' };
    }
    sellerPrice = parsed;
  }

  const justificationRaw = String(formData.get('justification') ?? '').trim();
  if (justificationRaw.length > MAX_JUSTIFICATION_LENGTH) {
    return { ok: false, error: 'La justification ne peut pas dépasser 1 000 caractères.' };
  }
  const justification = justificationRaw === '' ? null : justificationRaw;

  return { ok: true, input: { advisorPrice, sellerPrice, justification } };
}
