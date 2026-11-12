'use client';

import { useEffect, useState } from 'react';

import { leavesPage } from '@/lib/navigation/unsaved-changes';

// Mission 151 — la proposition n'est gardée nulle part : la quitter la perd (planche 2, validée
// par Jean-Guy le 12/11). Tant que `active` est vrai :
//   • actualisation, fermeture de l'onglet : la confirmation du navigateur, la seule possible (M93) ;
//   • lien de l'application (menu compris) : la navigation est retenue et l'écran ouvre SA
//     confirmation (`confirm-dialog`, M146 A), jamais la boîte du navigateur.
// Le bouton « Précédent » du navigateur n'est pas couvert (M93).
export function useLeaveConfirm(active: boolean): {
  pendingHref: string | null;
  ask: (href: string) => void;
  stay: () => void;
} {
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    // En phase de capture, avant le routeur : retenir ici empêche la navigation.
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      const leaving = leavesPage(
        event,
        { href, target: anchor.getAttribute('target'), download: anchor.hasAttribute('download') },
        window.location.href,
      );
      if (leaving && href) {
        event.preventDefault();
        event.stopPropagation();
        setPendingHref(href);
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active]);

  return { pendingHref, ask: setPendingHref, stay: () => setPendingHref(null) };
}
