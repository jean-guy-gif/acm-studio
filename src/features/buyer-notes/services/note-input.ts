import type { NoteReadingCause, NoteSourceKind } from '@/features/buyer-notes/types';

// Mission 151 — ce que le conseiller envoie à lire, relu par le serveur avant tout appel (M43). Pur.
//
//   - une photo, une capture ou un PDF scanné arrivent en IMAGES (3 au plus, décision de Jean-Guy,
//     12/11), réduites dans le navigateur (≈ 1 600 px, JPEG) : le type se lit sur leurs OCTETS,
//     jamais sur le nom ni sur ce que dit le navigateur (M37) ;
//   - un PDF qui a un texte, un export ou un texte collé arrivent en TEXTE (M43 : le PDF se lit
//     dans le navigateur, seul son texte part) ;
//   - HEIC (photo d'iPhone) : le navigateur la convertit en JPEG quand il sait la lire (Safari, sur
//     iPhone, iPad et Mac) ; s'il ne sait pas (Chrome sur ordinateur), elle arrive telle quelle et
//     est refusée ici avec une consigne, jamais envoyée au modèle, qui ne lit pas ce format.

export const NOTE_MAX_IMAGES = 3;
// Vercel refuse un corps de plus de 4,5 Mo : 3 images réduites tiennent largement dessous.
export const NOTE_MAX_IMAGE_BYTES = 1_400_000;
export const NOTE_MAX_TEXT_CHARS = 20_000;

export type NoteImage = { mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; data: Buffer };

export function imageMediaType(bytes: Uint8Array): NoteImage['mediaType'] | 'heic' | null {
  const at = (offset: number, ascii: string) =>
    [...ascii].every((char, index) => bytes[offset + index] === char.charCodeAt(0));
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && at(1, 'PNG')) return 'image/png';
  if (bytes.length >= 12 && at(0, 'RIFF') && at(8, 'WEBP')) return 'image/webp';
  // ISO-BMFF : « ftyp » puis la marque (heic, heix, mif1, msf1…).
  if (
    bytes.length >= 12 &&
    at(4, 'ftyp') &&
    /^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(String.fromCharCode(...bytes.slice(8, 12)))
  ) {
    return 'heic';
  }
  return null;
}

export type ParsedNoteInput =
  | { ok: true; kind: NoteSourceKind; text: string | null; images: NoteImage[] }
  | {
      ok: false;
      cause: Extract<NoteReadingCause, 'unsupported_file' | 'too_large' | 'empty'>;
      heic?: boolean;
    };

export function parseNoteInput(input: {
  kind: unknown;
  text: unknown;
  images: Uint8Array[];
}): ParsedNoteInput {
  const kind: NoteSourceKind | null =
    input.kind === 'photo' || input.kind === 'file' || input.kind === 'text' ? input.kind : null;
  if (!kind) return { ok: false, cause: 'empty' };

  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (text.length > NOTE_MAX_TEXT_CHARS) return { ok: false, cause: 'too_large' };
  if (input.images.length > NOTE_MAX_IMAGES) return { ok: false, cause: 'too_large' };

  const images: NoteImage[] = [];
  for (const bytes of input.images) {
    if (bytes.length === 0) continue;
    if (bytes.length > NOTE_MAX_IMAGE_BYTES) return { ok: false, cause: 'too_large' };
    const mediaType = imageMediaType(bytes);
    if (mediaType === 'heic') return { ok: false, cause: 'unsupported_file', heic: true };
    if (!mediaType) return { ok: false, cause: 'unsupported_file' };
    images.push({ mediaType, data: Buffer.from(bytes) });
  }
  if (!text && images.length === 0) return { ok: false, cause: 'empty' };
  return { ok: true, kind, text: text || null, images };
}

// Ce que l'écran dit, cause par cause : jamais un terme technique (M105), jamais le contenu.
export const NOTE_READING_MESSAGES: Record<NoteReadingCause, string> = {
  closed: 'La lecture des notes n’est pas encore ouverte : saisissez la fiche à la main.',
  unconfigured: 'La lecture des notes n’est pas disponible : saisissez la fiche à la main.',
  budget_reached: 'Budget de lecture du mois atteint : saisissez la fiche à la main.',
  budget_unavailable:
    'Le budget de lecture n’a pas pu être vérifié : réessayez, ou saisissez la fiche à la main.',
  unsupported_file:
    'Ce fichier ne se lit pas : envoyez une photo (JPEG, PNG), un PDF ou collez le texte.',
  too_large: 'C’est trop long à lire d’un coup : trois photos au plus, ou un texte plus court.',
  empty: 'Rien à lire : ajoutez une photo, un fichier ou un texte.',
  unavailable:
    'La lecture n’a pas abouti : réessayez dans un instant, ou saisissez la fiche à la main.',
  refused: 'Ces notes n’ont pas pu être lues : saisissez la fiche à la main.',
  unreadable:
    'La lecture n’a rien donné d’utilisable : réessayez, ou saisissez la fiche à la main.',
};

export const NOTE_HEIC_MESSAGE =
  'Cette photo d’iPhone (HEIC) ne se lit pas dans ce navigateur : prenez la photo depuis l’iPhone ou l’iPad, ou enregistrez-la en JPEG.';
