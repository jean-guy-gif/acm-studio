import type { BuyerFinancing, BuyerFinancingMode } from '@/features/buyers/types';

// Jean-Guy (28/11) — l'accord de principe noté propose de passer le financement en « Validé », sans
// rien changer de lui-même ; rien dans l'autre sens. Pur et sans zod : il part vers le navigateur.
export function suggestsValidated(input: {
  mode: BuyerFinancingMode;
  agreement: boolean | null;
  financing: BuyerFinancing;
}): boolean {
  return input.mode === 'loan' && input.agreement === true && input.financing !== 'validated';
}
