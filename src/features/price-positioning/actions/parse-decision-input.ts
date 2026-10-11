import { MAX_JUSTIFICATION_LENGTH } from '@/features/price-positioning/types/saved-price-positioning';

// The ONLY three values the browser is allowed to supply. Any other field present
// in the FormData (range, confidence, snapshot, agency_id, …) is never read here,
// so it can never influence what is persisted.
// Mission 91 — le « prix souhaité vendeur » n'est plus saisi en préparation : il n'est plus lu
// ici (la valeur perçue recueillie au début du Live suffit, M82).
export type DecisionInput = {
  advisorPrice: number;
  // Mission 58 — l'analyse du conseiller (avis de valeur). Facultative : vide → null.
  advisorComparativeMarketPrice: number | null;
  justification: string | null;
};

export type DecisionInputResult = { ok: true; input: DecisionInput } | { ok: false; error: string };

// Pure parser/validator for the client-supplied decision fields. Deterministic,
// no I/O — unit-testable in isolation.
export function parseDecisionInput(formData: FormData): DecisionInputResult {
  const advisorRaw = String(formData.get('advisorPrice') ?? '').trim();
  const advisorPrice = advisorRaw === '' ? Number.NaN : Number(advisorRaw);
  if (!Number.isFinite(advisorPrice) || advisorPrice <= 0) {
    return { ok: false, error: 'Le prix des concurrents doit être un montant positif.' };
  }

  // Mission 58 — l'analyse du conseiller (avis de valeur), facultative : vide → null,
  // sinon un montant positif. Absente, le dossier reste prêt (aucun nouveau critère).
  const analysisRaw = String(formData.get('advisorComparativeMarketPrice') ?? '').trim();
  let advisorComparativeMarketPrice: number | null = null;
  if (analysisRaw !== '') {
    const parsed = Number(analysisRaw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { ok: false, error: 'L’analyse du conseiller doit être vide ou un montant positif.' };
    }
    advisorComparativeMarketPrice = parsed;
  }

  const justificationRaw = String(formData.get('justification') ?? '').trim();
  if (justificationRaw.length > MAX_JUSTIFICATION_LENGTH) {
    return { ok: false, error: 'La justification ne peut pas dépasser 1 000 caractères.' };
  }
  const justification = justificationRaw === '' ? null : justificationRaw;

  return {
    ok: true,
    input: { advisorPrice, advisorComparativeMarketPrice, justification },
  };
}
