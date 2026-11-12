import type { NoteReadingCause } from '@/features/buyer-notes/types';

// Mission 151 — sans dépendance serveur : l'écran les lit dans le navigateur.
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
