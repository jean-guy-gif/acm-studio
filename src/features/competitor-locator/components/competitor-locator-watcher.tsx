'use client';

import { LocatorNotice } from '@/features/competitor-locator/components/locator-notice';
import { useCompetitorLocator } from '@/features/competitor-locator/use-competitor-locator';

// Mission 75 — à l'ouverture du dossier, ACM redemande au Localisateur les adresses qui manquent.
// N'affiche que la ligne discrète (Localisateur absent, partage éteint), si on la lui demande.
// Mission 128 B — `enabled` faux quand le serveur sait qu'aucune adresse ne reste à demander.
export function CompetitorLocatorWatcher({
  projectId,
  showNotice = false,
  enabled = true,
}: {
  projectId: string;
  showNotice?: boolean;
  enabled?: boolean;
}) {
  const { availability } = useCompetitorLocator(projectId, true, enabled);
  return showNotice ? <LocatorNotice availability={availability} /> : null;
}
