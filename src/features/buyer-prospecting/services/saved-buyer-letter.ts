import type { BuyerLetterTexts } from '@/features/buyer-prospecting/services/buyer-letter';
import {
  initialTheirPhotoChoice,
  theirPhotoDisplayUrl,
  type SavedTheirPhoto,
} from '@/features/prospecting-file/services/their-photo';

// Mission 120 B — le courrier d'une recherche acquéreur tel qu'enregistré, pour le lot : chaque
// texte gardé, sinon le texte proposé (M84) ; la photo choisie, sinon aucune (M115 ; « Ma photo »
// n'existe pas sur ce courrier, M120 A). Pur.
export function savedBuyerLetter(input: {
  defaults: BuyerLetterTexts;
  overrides: { [K in keyof BuyerLetterTexts]: string | null };
  theirPhoto: {
    listing: string[];
    saved: SavedTheirPhoto;
    signed: Record<string, string | null>;
    prefix: string;
  };
}): { texts: BuyerLetterTexts; theirPhotoUrl: string | null } {
  const { defaults, overrides, theirPhoto } = input;
  const choice = initialTheirPhotoChoice(theirPhoto.saved, theirPhoto.listing, theirPhoto.prefix);
  return {
    texts: {
      title: overrides.title ?? defaults.title,
      letter: overrides.letter ?? defaults.letter,
      question: overrides.question ?? defaults.question,
      contactHook: overrides.contactHook ?? defaults.contactHook,
    },
    theirPhotoUrl:
      choice.mode === 'upload'
        ? null
        : theirPhotoDisplayUrl(choice, theirPhoto.saved, theirPhoto.signed),
  };
}
