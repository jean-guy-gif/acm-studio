'use client';

import { useEffect, useState } from 'react';

export const OPPOSITION_RECORDED_MESSAGE = 'Inscrit : plus aucun courrier pour cette adresse';

const EVENT = 'acm:opposition-recorded';
const VISIBLE_MS = 8_000;

// La carte vient de quitter le tableau : c'est la page qui le dit, pas elle.
export function announceOppositionRecorded(): void {
  window.dispatchEvent(new Event(EVENT));
}

// Mission 103 — après « Ne plus solliciter » puis « Confirmer », la carte disparaissait du tableau
// sans rien dire (essai du 12/10). La page confirme l'enregistrement, brièvement. Jamais imprimé.
export function OppositionNotice() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const show = () => {
      setShown(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setShown(false), VISIBLE_MS);
    };
    window.addEventListener(EVENT, show);
    return () => {
      window.removeEventListener(EVENT, show);
      window.clearTimeout(timer);
    };
  }, []);

  if (!shown) {
    return null;
  }
  return (
    <p
      role="status"
      data-testid="opposition-notice"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto w-fit max-w-full rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 shadow-lg print:hidden"
    >
      {OPPOSITION_RECORDED_MESSAGE}
    </p>
  );
}
