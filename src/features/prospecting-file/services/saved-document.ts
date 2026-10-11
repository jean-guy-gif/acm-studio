import {
  buildProspectingFile,
  resolveTexts,
} from '@/features/prospecting-file/services/build-prospecting-file';
import {
  defaultShowPrices,
  pricesKnown,
} from '@/features/prospecting-file/services/compare-properties';
import { chosenPhotoPath } from '@/features/prospecting-file/services/file-overrides';
import type { QrCode } from '@/features/prospecting-file/services/qr-code';
import {
  initialTheirPhotoChoice,
  theirPhotoDisplayUrl,
  type SavedTheirPhoto,
} from '@/features/prospecting-file/services/their-photo';
import type {
  ProspectingFile,
  ProspectingFileFacts,
  ProspectingFileOverrides,
  ProspectingFileTexts,
  ProspectingFileVersion,
  ProspectingSender,
} from '@/features/prospecting-file/types';

// Mission 98 — le dossier TEL QU'ENREGISTRÉ, sans passer par l'écran d'édition : les textes et
// les photos que le conseiller a gardés, ou ceux proposés par défaut s'il n'a rien touché. Les
// mêmes règles que l'éditeur à son ouverture (prix affichés, photo de notre bien, « Sans photo »
// par défaut pour le bien concurrent, M90). Pur : « Préparer tous les courriers » l'imprime.
export type SavedDocumentInput = {
  version: ProspectingFileVersion;
  facts: ProspectingFileFacts;
  sender: ProspectingSender;
  overrides: ProspectingFileOverrides;
  photos: { path: string; url: string | null }[];
  theirPhoto: {
    listing: string[];
    saved: SavedTheirPhoto;
    signed: Record<string, string | null>;
    prefix: string;
  };
  qr: QrCode;
};

export type SavedDocument = {
  file: ProspectingFile;
  texts: ProspectingFileTexts;
  sender: ProspectingSender;
  photoUrl: string | null;
  theirPhotoUrl: string | null;
  qr: QrCode;
};

export function savedDocument(input: SavedDocumentInput): SavedDocument {
  const { facts, overrides, photos, theirPhoto } = input;
  const showPrices = pricesKnown(facts) && (overrides.showPrices ?? defaultShowPrices(facts));
  const file = buildProspectingFile(facts, input.version, { showPrices });
  const photoPath = chosenPhotoPath(
    overrides,
    photos.map((photo) => photo.path),
  );
  return {
    file,
    texts: resolveTexts(file.defaults, overrides),
    sender: input.sender,
    photoUrl: photos.find((photo) => photo.path === photoPath)?.url ?? null,
    theirPhotoUrl: theirPhotoDisplayUrl(
      initialTheirPhotoChoice(theirPhoto.saved, theirPhoto.listing, theirPhoto.prefix),
      theirPhoto.saved,
      theirPhoto.signed,
    ),
    qr: input.qr,
  };
}
