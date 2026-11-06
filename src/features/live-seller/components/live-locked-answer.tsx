'use client';

import { revealValue, statLabel } from '@/features/live-seller/components/live-stage';
import { useLiveTexts } from '@/features/live-seller/components/live-texts';

// Mission 92 — une réponse déjà donnée ne se corrige plus : en revenant sur l'écran, le vendeur
// la relit. Aucun champ de saisie : « Valider et continuer » avance sans rien réécrire.
export function LiveLockedAnswer({ value }: { value: string }) {
  const { texts } = useLiveTexts();
  return (
    <div className="flex flex-col gap-2" data-locked-answer>
      <span className={statLabel}>{texts.common.yourAnswer}</span>
      <span className={revealValue}>{value}</span>
    </div>
  );
}
