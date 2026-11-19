'use client';

import { useEffect, useRef } from 'react';

import { renewLivingHereLinkOnOpen } from '@/features/academia/actions/living-here-link';

// Mission 161 — une fois par ouverture d'« Avant le rendez-vous » : le lien « Vivre ici » de 7 jours
// ou plus est renouvelé par une action (jamais pendant l'affichage) ; rien ne s'affiche.
export function RenewLinkOnOpen({ projectId }: { projectId: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void renewLivingHereLinkOnOpen(projectId).catch(() => undefined);
  }, [projectId]);
  return null;
}
