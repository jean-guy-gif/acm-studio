import type { MandateLife } from '@/features/mandate-life/types';

// Lot C (gardien-sql, 28/11) — sous compromis ou vendu, l'issue d'un mandat reste « mandat
// signé » (la base le refuse, migration `vie_du_mandat`). « Changer l'issue » et une seconde
// conclusion le disent avant d'écrire, avec ce qu'il faut faire d'abord, plutôt que « Réessayez » ;
// le refus de la base, s'il arrive quand même (une écriture entre-temps), se dit de même. Pur.

export const OUTCOME_LOCKED = {
  compromise:
    'Un compromis est noté sur ce mandat : l’issue reste « Mandat signé ». S’il est tombé, notez-le d’abord dans « Son mandat », sur la fiche du dossier (« Le compromis est tombé »).',
  sale: 'Ce mandat est vendu par l’agence : l’issue reste « Mandat signé ».',
} as const;

export function outcomeChangeRefusal(
  life: MandateLife | undefined,
  outcome: string | null,
): string | null {
  if (!life || outcome === 'signed') return null;
  if (life.deedSignedOn) return OUTCOME_LOCKED.sale;
  if (life.compromiseSignedOn) return OUTCOME_LOCKED.compromise;
  return null;
}

// Le refus de la garde de l'issue (`check_mandate_life`) : une violation de contrainte qui le dit.
export function isOutcomeLockError(
  error: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  return error?.code === '23514' && /l['’]issue reste/.test(error.message ?? '');
}
