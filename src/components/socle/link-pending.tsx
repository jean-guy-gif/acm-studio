'use client';

import { useLinkStatus } from 'next/link';

// Dans une ligne du socle (un lien) : le toucher est pris tout de suite — le contour de la ligne
// choisie —, le temps que la page réponde. Choisir une personne relit ses tâches au serveur, sans
// écran d'attente (aucun `loading.tsx`, correctif de la M128) : sans ce contour, rien ne bougeait
// entre le toucher et la réponse. Le lien qui le porte est en `relative`.
export function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span
      aria-hidden="true"
      data-testid="link-pending"
      className="pointer-events-none absolute -inset-0.5 rounded-2xl border-2 border-brand-deep opacity-60 stage:border-brand"
    />
  ) : null;
}
