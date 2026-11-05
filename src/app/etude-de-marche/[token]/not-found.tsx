import type { Metadata } from 'next';

import { LinkExpiredScreen } from '@/components/link-expired-screen';

export const metadata: Metadata = {
  title: 'Étude de marché',
  robots: { index: false, follow: false, nocache: true },
};

// Mission 131 — un lien retiré ou expiré parle à la personne qui l'a reçu (M127 B).
export default function NotFound() {
  return <LinkExpiredScreen what="L’Étude de marché" feminine />;
}
