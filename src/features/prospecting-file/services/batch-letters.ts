import {
  FILE_BLOCKER_MESSAGES,
  type FileBlocker,
} from '@/features/prospecting-file/services/file-access';
import { OPPOSED_MESSAGE } from '@/features/prospecting/services/opposition';

// Mission 98 — « Préparer tous les courriers » : ce qui s'imprime, et ce qui est retenu avec sa
// raison. Mission 102 — les blocages sont ceux du courrier unitaire (opposition, adresse,
// téléphone, adresse d'agence, carte professionnelle) : un courrier retenu n'est jamais imprimé,
// il est listé en tête. Pur.

export const CHOOSE_MESSAGE =
  'À qui s’adresser\u202f? Précisez sur la carte si ce bien est en exclusivité (confrère) ou non (propriétaire).';
export const NOT_PREPARABLE_MESSAGE = 'Ce dossier ne peut pas être préparé.';

export type BatchContext =
  | { status: 'ready' }
  | { status: 'blocked'; blocker: FileBlocker }
  | { status: 'choose' }
  | { status: 'not_found' };

export function splitBatchLetters<Row, Context extends BatchContext>(
  prepared: { row: Row; context: Context }[],
): {
  letters: { row: Row; context: Extract<Context, { status: 'ready' }> }[];
  held: { row: Row; reason: string }[];
} {
  const letters: { row: Row; context: Extract<Context, { status: 'ready' }> }[] = [];
  const held: { row: Row; reason: string }[] = [];
  for (const { row, context } of prepared) {
    const state: BatchContext = context;
    if (state.status === 'ready') {
      letters.push({ row, context: context as Extract<Context, { status: 'ready' }> });
    } else if (state.status === 'blocked') {
      held.push({ row, reason: FILE_BLOCKER_MESSAGES[state.blocker] });
    } else {
      held.push({
        row,
        reason: state.status === 'choose' ? CHOOSE_MESSAGE : NOT_PREPARABLE_MESSAGE,
      });
    }
  }
  return { letters, held };
}

// Mission 105 — les adresses écartées AVANT la préparation, dites elles aussi : « Ne plus
// solliciter », et l'adresse encore à confirmer. Elles ne s'impriment pas ; le conseiller sait
// pourquoi. Les cartes déjà remises, en rendez-vous ou « pas intéressé » ne sont pas concernées.
// Mission 108 — un confrère (exclusivité) dont l'adresse n'est pas confirmée n'est plus écarté :
// le courrier au confrère n'en a pas besoin (M90, M98).
export function excludedFromBatch<Row>(
  cards: { row: Row; status: string; step?: string | null; opposed: boolean }[],
): { row: Row; reason: string }[] {
  return cards.flatMap(({ row, status, step, opposed }) => {
    if (opposed) return [{ row, reason: OPPOSED_MESSAGE }];
    if (status === 'to_confirm' && step !== 'colleague')
      return [{ row, reason: FILE_BLOCKER_MESSAGES.address_unconfirmed }];
    return [];
  });
}

// Ce que « Préparer tous les courriers » prépare : les cartes prêtes, et les confrères encore sans
// adresse confirmée. Jamais une adresse « Ne plus solliciter ».
export function isBatchPreparable(card: {
  status: string;
  step?: string | null;
  opposed: boolean;
}): boolean {
  if (card.opposed) return false;
  return card.status === 'ready' || (card.status === 'to_confirm' && card.step === 'colleague');
}
