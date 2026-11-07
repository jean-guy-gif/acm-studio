'use client';

import { btnPrimary } from '@/components/ui/styles';

// Mission 110 — imprimer la synthèse (ou l'enregistrer en PDF depuis le navigateur).
// Mission 140 — devant le vendeur (l'Étude ouverte depuis le Live), dans sa langue.
export function SynthesisPrintButton({ label = 'Imprimer' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${btnPrimary} print:hidden`}>
      {label}
    </button>
  );
}
