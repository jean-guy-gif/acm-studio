'use client';

import { useEffect } from 'react';

import { leavesPage, UNSAVED_CHANGES_MESSAGE } from '@/lib/navigation/unsaved-changes';

// Mission 93 — tant que `dirty` est vrai, quitter la page demande confirmation :
//   • actualisation, fermeture de l'onglet : la confirmation du navigateur (lui seul le peut) ;
//   • lien de l'application (menu compris) : une confirmation avant de suivre le lien.
// Un départ que l'écran organise lui-même (« Enregistrer puis partir ») ne passe pas par un
// lien : il n'est pas retenu ici.
export function useUnsavedChangesGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    // En phase de capture, avant le routeur : annuler ici empêche la navigation.
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor) {
        return;
      }
      const leaving = leavesPage(
        event,
        {
          href: anchor.getAttribute('href'),
          target: anchor.getAttribute('target'),
          download: anchor.hasAttribute('download'),
        },
        window.location.href,
      );
      if (leaving && !window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);
}
