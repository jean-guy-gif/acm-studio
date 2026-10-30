import type { Metadata } from 'next';

import { LinkExpiredScreen } from '@/components/link-expired-screen';

export const metadata: Metadata = {
  title: 'Votre sélection',
  robots: { index: false, follow: false, nocache: true },
};

// Mission 127 B — un lien retiré ou expiré parle à la personne qui l'a reçu (M88, précisé).
export default function NotFound() {
  return <LinkExpiredScreen what="Le dossier" />;
}
