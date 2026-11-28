import { z } from 'zod';

import {
  BUYER_FINANCING_MODES,
  LOAN_AMOUNT_MAX,
  type BuyerFinancingMode,
} from '@/features/buyers/types';

// Lot B (Jean-Guy, 27/11) — « Comment finance-t-il ? », relu au serveur (CLAUDE.md : tout ce qui
// vient du navigateur est revalidé) : le mode dans sa liste ; l'apport, le montant du prêt et
// l'accord de principe, tous facultatifs, en euros entiers dans les bornes de la base. Importé par
// l'action seule : zod ne part pas vers le navigateur (M128 B).

export type FinancingModeInput = {
  mode: BuyerFinancingMode;
  contribution: number | null;
  amount: number | null;
  agreement: boolean | null;
};

const euros = (min: number) => z.number().int().min(min).max(LOAN_AMOUNT_MAX).nullable();

const schema = z.object({
  mode: z.enum(BUYER_FINANCING_MODES),
  contribution: euros(0).default(null),
  amount: euros(1).default(null),
  agreement: z.boolean().nullable().default(null),
});

const MESSAGES: Record<string, string> = {
  contribution: 'L’apport n’est pas un montant valable.',
  amount: 'Le montant du prêt n’est pas un montant valable.',
  agreement: 'L’accord de principe n’est pas valable.',
};
const UNKNOWN = 'Ce mode de financement n’existe pas.';

export function parseFinancingMode(
  raw: unknown,
): { ok: true; value: FinancingModeInput } | { ok: false; error: string } {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? '');
    return { ok: false, error: MESSAGES[field] ?? UNKNOWN };
  }
  return { ok: true, value: parsed.data };
}

// Les colonnes écrites : hors prêt, l'apport, le prêt et l'accord sont effacés dans la même
// écriture (la base refuse un détail de prêt sans prêt, `buyers_loan_details_only_with_loan`).
export function financingModeColumns(input: FinancingModeInput) {
  const loan = input.mode === 'loan';
  return {
    financing_mode: input.mode,
    loan_contribution: loan ? input.contribution : null,
    loan_amount: loan ? input.amount : null,
    loan_agreement: loan ? input.agreement : null,
  };
}
