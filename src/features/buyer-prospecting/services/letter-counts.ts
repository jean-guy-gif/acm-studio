import type { VisitLetterState } from '@/features/buyer-prospecting/types';

// Mission 120 B — sur l'étape « Visites » de la fiche : les courriers et dossiers déjà préparés
// pour ses visites, prêts à imprimer, ou en attente (adresse à confirmer). Pur.
export function letterCounts(letters: { letterHref: string | null; state: VisitLetterState }[]): {
  total: number;
  ready: number;
  waiting: number;
} {
  const prepared = letters.filter((letter) => letter.letterHref != null);
  return {
    total: prepared.length,
    ready: prepared.filter((letter) => letter.state.kind === 'ready').length,
    waiting: prepared.filter((letter) => letter.state.kind === 'address').length,
  };
}
