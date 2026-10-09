'use client';

import { LocatorNotice } from '@/features/competitor-locator/components/locator-notice';
import { useCompetitorLocator } from '@/features/competitor-locator/use-competitor-locator';

// Mission 75 — à l'ouverture du dossier, ACM redemande au Localisateur les adresses qui manquent.
// N'affiche que la ligne discrète (Localisateur absent, partage éteint), si on la lui demande.
export function CompetitorLocatorWatcher({
  projectId,
  showNotice = false,
}: {
  projectId: string;
  showNotice?: boolean;
}) {
  const { availability } = useCompetitorLocator(projectId);
  return showNotice ? <LocatorNotice availability={availability} /> : null;
}
