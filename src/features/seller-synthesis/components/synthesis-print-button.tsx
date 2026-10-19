'use client';

import { btnPrimary } from '@/components/ui/styles';

// Mission 110 — imprimer la synthèse (ou l'enregistrer en PDF depuis le navigateur).
export function SynthesisPrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={`${btnPrimary} print:hidden`}>
      Imprimer
    </button>
  );
}
