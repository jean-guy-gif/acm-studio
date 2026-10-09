import type { ProspectingFileInput } from '@/features/prospecting-file/schemas/prospecting-file-input';
import type {
  ProspectingFileOverrides,
  ProspectingFileTexts,
  ProspectingFileVersion,
} from '@/features/prospecting-file/types';

// Mission 84 — ce qu'on garde d'un enregistrement : seulement ce que le conseiller a changé.
// Un texte laissé tel que proposé, ou vidé, reste « proposé » (null) : si le bien change, le
// texte proposé suit.

// Version propriétaire : le mot « mandat » n'apparaît nulle part, y compris dans un texte
// réécrit. La version confrère en parle librement.
export const OWNER_FORBIDDEN_WORD = /mandat/i;
export const OWNER_FORBIDDEN_MESSAGE =
  'Version propriétaire : le mot « mandat » ne doit pas apparaître. Reformulez le texte.';

export function ownerForbiddenWord(
  version: ProspectingFileVersion,
  input: Pick<
    ProspectingFileInput,
    'title' | 'letter' | 'keyMessage' | 'proposals' | 'contactHook'
  >,
): boolean {
  if (version !== 'owner') {
    return false;
  }
  return [input.title, input.letter, input.keyMessage, ...input.proposals, input.contactHook].some(
    (value) => OWNER_FORBIDDEN_WORD.test(value),
  );
}

const changed = (value: string, proposed: string): string | null =>
  value === '' || value === proposed.trim() ? null : value;

export function fileOverrides(
  input: ProspectingFileInput,
  proposed: {
    texts: ProspectingFileTexts;
    showPrices: boolean;
    // La photo proposée (la première du bien vendeur) et celles qu'on peut choisir.
    photoPath: string | null;
    photoPaths: string[];
  },
): ProspectingFileOverrides {
  const photo =
    input.photoPath != null && proposed.photoPaths.includes(input.photoPath)
      ? input.photoPath
      : null;
  return {
    title: changed(input.title, proposed.texts.title),
    letter: changed(input.letter, proposed.texts.letter),
    keyMessage: changed(input.keyMessage, proposed.texts.keyMessage),
    proposals: [
      changed(input.proposals[0], proposed.texts.proposals[0]),
      changed(input.proposals[1], proposed.texts.proposals[1]),
      changed(input.proposals[2], proposed.texts.proposals[2]),
    ],
    contactHook: changed(input.contactHook, proposed.texts.contactHook),
    showPrices: input.showPrices === proposed.showPrices ? null : input.showPrices,
    photoPath: photo === proposed.photoPath ? null : photo,
  };
}

// La photo retenue : celle choisie si elle existe encore, la première sinon.
export function chosenPhotoPath(
  overrides: ProspectingFileOverrides,
  photoPaths: string[],
): string | null {
  if (overrides.photoPath != null && photoPaths.includes(overrides.photoPath)) {
    return overrides.photoPath;
  }
  return photoPaths[0] ?? null;
}
