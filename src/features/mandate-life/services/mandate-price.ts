import type { MandateAmendment } from '@/features/mandate-life/types';
import { formatEuro } from '@/lib/format';

// Lot C — le prix du mandat : celui du dernier avenant de baisse (par sa date, puis par l'heure de
// sa saisie), sinon le prix à la signature, qui n'est jamais réécrit (la synthèse le lit, M111).
// L'historique, ce sont les avenants. Pur.
export type MandatePrice = {
  current: number | null;
  signed: number | null;
  history: { on: string; price: number }[];
  lastAmendment: MandateAmendment | null;
};

export function mandatePrice(
  signed: number | null,
  amendments: readonly MandateAmendment[],
): MandatePrice {
  const sorted = [...amendments].sort(
    (a, b) => a.amendedOn.localeCompare(b.amendedOn) || a.createdAt.localeCompare(b.createdAt),
  );
  const last = sorted.at(-1) ?? null;
  return {
    current: last?.price ?? signed,
    signed,
    history: sorted.map((amendment) => ({ on: amendment.amendedOn, price: amendment.price })),
    lastAmendment: last,
  };
}

// Question 22 — un avenant de BAISSE : un montant en euros entiers, positif, sous le prix du
// mandat. Sans prix connu, il ne se compare à rien.
export function amendmentRefusal(price: number, current: number | null): string | null {
  if (!Number.isInteger(price) || price <= 0)
    return 'Le nouveau prix n’est pas un montant valable.';
  if (current != null && price >= current) {
    return `Le nouveau prix doit être sous le prix du mandat (${formatEuro(current)})\u00a0: un avenant ne fait que le baisser.`;
  }
  return null;
}
