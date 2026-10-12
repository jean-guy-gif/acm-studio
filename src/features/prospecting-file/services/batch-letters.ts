import {
  FILE_BLOCKER_MESSAGES,
  type FileBlocker,
} from '@/features/prospecting-file/services/file-access';

// Mission 98 — « Préparer tous les courriers » : ce qui s'imprime, et ce qui est retenu avec sa
// raison. Mission 102 — les blocages sont ceux du courrier unitaire (opposition, adresse,
// téléphone, adresse d'agence, carte professionnelle) : un courrier retenu n'est jamais imprimé,
// il est listé en tête. Pur.

export const CHOOSE_MESSAGE =
  'À qui s’adresser ? Précisez sur la carte si ce bien est en exclusivité (confrère) ou non (propriétaire).';
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
