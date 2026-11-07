import type { Metadata } from 'next';

import { LinkExpiredScreen } from '@/components/link-expired-screen';

export const metadata: Metadata = {
  title: 'Bon de visite',
  robots: { index: false, follow: false, nocache: true },
};

// Mission 137 — un lien expiré parle à la personne qui l'a reçu (M127 B).
export default function NotFound() {
  return <LinkExpiredScreen kind="voucher" />;
}
