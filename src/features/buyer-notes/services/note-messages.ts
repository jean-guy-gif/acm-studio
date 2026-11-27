import type { NoteReadingCause } from '@/features/buyer-notes/types';

// Mission 151 — sans dépendance serveur : l'écran les lit dans le navigateur.
// Ce que l'écran dit, cause par cause : jamais un terme technique (M105), jamais le contenu.
export const NOTE_READING_MESSAGES: Record<NoteReadingCause, string> = {
  closed: 'La lecture des notes n’est pas encore ouverte\u00a0: saisissez la fiche à la main.',
  unconfigured:
    'La lecture des notes ne répond pas pour l’instant\u00a0: saisissez la fiche à la main.',
  // Lancement, mission 5 — sans montant ni « budget » : le forfait de l'agence.
  budget_reached:
    'Votre forfait du mois est atteint\u00a0: contactez votre agence. Vous pouvez saisir la fiche à la main.',
  budget_unavailable:
    'Le forfait du mois n’a pas pu être vérifié\u00a0: réessayez, ou saisissez la fiche à la main.',
  unsupported_file:
    'Ce fichier ne se lit pas\u00a0: envoyez une photo (JPEG, PNG), un PDF ou collez le texte.',
  too_large:
    'C’est trop long à lire d’un coup\u00a0: trois photos au plus, ou un texte plus court.',
  empty: 'Rien à lire\u00a0: ajoutez une photo, un fichier ou un texte.',
  unavailable:
    'La lecture n’a pas abouti\u00a0: réessayez dans un instant, ou saisissez la fiche à la main.',
  refused: 'Ces notes n’ont pas pu être lues\u00a0: saisissez la fiche à la main.',
  unreadable:
    'La lecture n’a rien donné d’utilisable\u00a0: réessayez, ou saisissez la fiche à la main.',
};

export const NOTE_HEIC_MESSAGE =
  'Cette photo d’iPhone (HEIC) ne se lit pas dans ce navigateur\u00a0: prenez la photo depuis l’iPhone ou l’iPad, ou enregistrez-la en JPEG.';
