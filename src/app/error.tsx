'use client';

import { useEffect } from 'react';

import { ErrorScreen } from '@/components/error-screen';

// Mission 88 — une erreur inattendue, n'importe où dans l'application (Live compris). L'écran
// ne montre aucun détail technique et rien du dossier ; le détail part au journal du navigateur,
// pour le support.
export default function AppError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error('[acm] erreur inattendue', error);
  }, [error]);

  return (
    <ErrorScreen
      title="Un incident est survenu"
      message="Cette page n’a pas pu s’afficher. Vos données sont enregistrées : revenez à vos dossiers et reprenez où vous en étiez."
    />
  );
}
