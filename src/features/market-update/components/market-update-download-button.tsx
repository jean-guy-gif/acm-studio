'use client';

import { btnSecondary } from '@/components/ui/styles';

// Mission 127 — sur le lien public du Point marché, le seul bouton : « Télécharger en PDF », fixé
// en bas, la place gardée sous la page (M122 B) ; l'impression du navigateur, rien n'est fabriqué
// côté serveur (M84).
export function MarketUpdateDownloadButton() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 flex justify-center border-t border-zinc-200 bg-white/95 px-4 py-3 print:hidden">
      <button type="button" onClick={() => window.print()} className={btnSecondary}>
        Télécharger en PDF
      </button>
    </div>
  );
}
