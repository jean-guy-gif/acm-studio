import type { Metadata } from 'next';

import { ErrorScreen } from '@/components/error-screen';

export const metadata: Metadata = { title: 'Page introuvable — ACM Studio' };

// Mission 88 — une adresse qui ne mène nulle part (ou un dossier qui n'est pas à votre agence).
export default function NotFound() {
  return (
    <ErrorScreen
      title="Page introuvable"
      message="Cette adresse ne correspond à aucune page, ou ce dossier n’est pas accessible depuis votre agence."
    />
  );
}
