'use client';

import { useEffect } from 'react';

import { ErrorScreen } from '@/components/error-screen';
import './globals.css';

// Mission 88 — le dernier filet : une erreur dans la structure même de l'application. Cette page
// remplace tout, y compris le gabarit : elle porte donc ses propres <html> et <body>, et les
// couleurs par défaut de l'app (la charte de l'agence n'est pas chargée ici).
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error('[acm] erreur globale', error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col antialiased">
        <ErrorScreen
          title="Un incident est survenu"
          message="L’application n’a pas pu s’afficher. Vos données sont enregistrées : revenez à vos dossiers."
        />
      </body>
    </html>
  );
}
