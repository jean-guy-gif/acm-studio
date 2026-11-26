import type { StatTile } from '@/components/socle/stat-tiles';
import type { Tone } from '@/components/socle/tone';
import {
  MANDATE_TYPE_LABELS,
  OUTCOME_LABELS,
  type ConclusionOutcome,
  type MandateType,
} from '@/features/meeting-conclusion/types';

// La refonte, lot E (maquette REFONTE-8) — le dossier d'un vendeur, comme la fiche d'un acquéreur
// (REFONTE-4) : son état, une prochaine étape, trois chiffres, ses cinq étapes, puis « Tout le
// dossier ». Ce sont les faits que la Vue d'ensemble lit déjà (M143, M133, M104) : rien de nouveau.
// Pur.

// L'état du dossier, en une pastille : où il en est dans le parcours, ou son issue s'il est conclu
// (M54, M90). La teinte n'est jamais seule : le mot le dit.
export function dossierBadge(input: {
  status: string;
  outcome: ConclusionOutcome | null;
  mandateType: MandateType | null;
}): { label: string; tone: Tone } {
  if (input.status === 'meeting_completed' && input.outcome) {
    if (input.outcome === 'signed') {
      return {
        label: input.mandateType
          ? `${OUTCOME_LABELS.signed} · ${MANDATE_TYPE_LABELS[input.mandateType].toLowerCase()}`
          : OUTCOME_LABELS.signed,
        tone: 'good',
      };
    }
    return { label: OUTCOME_LABELS[input.outcome], tone: 'plain' };
  }
  if (input.status === 'meeting_completed') return { label: 'Rendez-vous conclu', tone: 'plain' };
  if (input.status === 'ready_for_meeting') {
    return { label: 'Prêt pour le rendez-vous', tone: 'plain' };
  }
  return { label: 'En préparation', tone: 'plain' };
}

// Les trois chiffres (REFONTE-8) : les concurrents retenus, ce qui reste à vérifier sur eux (un prix
// ou une surface importés « À vérifier », M104), les acquéreurs de l'agence prêts à visiter (M133).
// Un chiffre qui n'a pas pu être lu le dit (M98), jamais un zéro ; un dossier d'exemple n'a pas
// d'acquéreurs (M97), sa tuile n'est pas montrée.
export function dossierTiles(input: {
  retained: number;
  toVerify: number;
  // null : la lecture a échoué ; undefined : un dossier d'exemple.
  readyBuyers: number | null | undefined;
}): StatTile[] {
  const tiles: StatTile[] = [
    {
      value: input.retained,
      label: input.retained > 1 ? 'Concurrents retenus' : 'Concurrent retenu',
      testId: 'dossier-tile-retained',
    },
    {
      value: input.toVerify,
      label: 'Prix ou surface à vérifier',
      tone: input.toVerify > 0 ? 'watch' : 'plain',
      testId: 'dossier-tile-to-verify',
    },
  ];
  if (input.readyBuyers !== undefined) {
    tiles.push(
      input.readyBuyers == null
        ? {
            value: '?',
            label: 'Acquéreurs prêts : non lus',
            tone: 'watch',
            testId: 'dossier-tile-buyers',
          }
        : {
            value: input.readyBuyers,
            label:
              input.readyBuyers > 1 ? 'Acquéreurs prêts à visiter' : 'Acquéreur prêt à visiter',
            tone: input.readyBuyers > 0 ? 'good' : 'plain',
            testId: 'dossier-tile-buyers',
          },
    );
  }
  return tiles;
}
