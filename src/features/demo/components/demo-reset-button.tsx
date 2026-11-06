'use client';

import { useState } from 'react';

import { SubmitButton } from '@/components/submit-button';
import { btnSecondary, link } from '@/components/ui/styles';

// Mission 114 (partie B) — « Remettre ma démo à zéro », avec confirmation dans l'écran (jamais
// une boîte du navigateur) : les dossiers de démo du closer connecté disparaissent, quatre neufs
// les remplacent ; ceux de ses collègues ne bougent pas.
export function DemoResetButton({
  action,
  counts,
}: {
  action: () => Promise<void>;
  // Le vrai nombre de dossiers et d'acquéreurs, en lettres, lu sur ce que la démo crée.
  counts: { dossiers: string; buyers: string };
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" className={btnSecondary} onClick={() => setConfirming(true)}>
        Remettre ma démo à zéro
      </button>
    );
  }
  return (
    <form
      action={action}
      data-testid="demo-reset-confirm"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 stage:border-amber-400/30 stage:bg-amber-500/10 stage:text-amber-200"
    >
      <span>
        Supprimer vos {counts.dossiers} dossiers et vos {counts.buyers} acquéreurs de démo, et les
        recréer neufs ? Les dossiers de vos collègues ne bougent pas.
      </span>
      <SubmitButton pendingLabel="Remise à zéro…" className={btnSecondary}>
        Remettre à zéro
      </SubmitButton>
      <button type="button" className={`${link} text-xs`} onClick={() => setConfirming(false)}>
        Annuler
      </button>
    </form>
  );
}
