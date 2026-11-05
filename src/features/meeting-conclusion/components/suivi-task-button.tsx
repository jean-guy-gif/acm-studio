'use client';

import Link from 'next/link';

import { btnPrimary } from '@/components/ui/styles';

// Mission 130 — le bouton d'une tâche d'« À faire aujourd'hui » qui se fait dans une carte
// (relancer, faire le point) : la carte est déjà sur la page, il la prévient et la montre, à chaque
// clic (un second clic rouvre ce qui a été refermé) ; sinon (filtre), le lien mène à `/suivi`, où
// l'adresse ouvre la carte.
export const SUIVI_OPEN_EVENT = 'acm:suivi-open';
export type SuiviOpenDetail = { projectId: string; panel: 'relance' | 'point' };

export function SuiviTaskButton({
  href,
  label,
  open,
}: {
  href: string;
  label: string;
  open: SuiviOpenDetail | null;
}) {
  return (
    <Link
      href={href}
      className={`${btnPrimary} whitespace-nowrap`}
      onClick={(event) => {
        // Cmd-, Ctrl- ou Maj-clic : un nouvel onglet, comme tout lien.
        if (!open || event.metaKey || event.ctrlKey || event.shiftKey) return;
        const card = document.getElementById(`suivi-${open.projectId}`);
        if (!card) return;
        event.preventDefault();
        window.dispatchEvent(new CustomEvent<SuiviOpenDetail>(SUIVI_OPEN_EVENT, { detail: open }));
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}
    >
      {label}
    </Link>
  );
}
