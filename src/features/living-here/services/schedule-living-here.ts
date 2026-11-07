import 'server-only';

import { after } from 'next/server';

import { buildLivingHereForItem } from '@/features/living-here/services/build-for-item';
import { reportServerError } from '@/lib/app-errors/report-server-error';

// Mission 142 — « Vivre ici » se construit en tâche de fond, APRÈS la réponse (décision du 07/11) :
// une demande de visite, depuis la présentation, le lien ou le conseiller, n'attend jamais les
// sources publiques ; sur Visites, « Construire » ou « Actualiser » en secours. L'appelant a déjà
// fait son garde (l'agence du conseiller ou celle du lien).
export function scheduleLivingHere(input: {
  agencyId: string;
  itemIds: string[];
  builtBy: string | null;
}): void {
  if (input.itemIds.length === 0) return;
  try {
    after(async () => {
      for (const itemId of new Set(input.itemIds)) {
        try {
          await buildLivingHereForItem({ ...input, itemId, onlyIfMissing: true });
        } catch (error) {
          await reportServerError('living-here:background', error);
        }
      }
    });
  } catch (error) {
    // Hors d'une requête (un test) : rien à faire après, rien ne casse.
    void error;
  }
}
