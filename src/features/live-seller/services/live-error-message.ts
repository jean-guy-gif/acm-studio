import { CONNECTION_LOST_MESSAGE } from '@/features/live-seller/services/guarded-save';
import { BACKGROUND_TIMEOUT_ERROR } from '@/features/live-seller/services/save-chain';
import type { TextLanguage } from '@/lib/client-texts';

// Mission 144 — devant le vendeur, le Live n'affiche que trois messages d'échec, qui disent tous
// quoi faire (décision de Jean-Guy, 07/11) ; jamais « projet », « champs » ni un détail technique :
//   • réseau absent ou silencieux → « Connexion perdue — touchez Valider pour réessayer » ;
//   • session expirée → « Session expirée — reconnectez-vous pour reprendre le Live » ;
//   • tout le reste → « Enregistrement impossible — touchez Valider pour réessayer ».
// Le Live en anglais ne change pas : la connexion perdue, sinon le message de l'écran. Pur.

// Ce que répond une action serveur quand la session du conseiller a expiré.
export const SESSION_REQUIRED_ERROR = 'Vous devez être connecté.';

export type LiveErrorKind = 'connection' | 'session' | 'other';

export function liveErrorKind(error: string | undefined): LiveErrorKind {
  if (error === CONNECTION_LOST_MESSAGE || error === BACKGROUND_TIMEOUT_ERROR) return 'connection';
  if (error === SESSION_REQUIRED_ERROR) return 'session';
  return 'other';
}

export type LiveErrorTexts = { connectionLost: string; sessionExpired: string; saveFailed: string };

export function liveErrorMessage(
  error: string | undefined,
  language: TextLanguage,
  texts: LiveErrorTexts,
  // Le message de l'écran, pour le Live en anglais (inchangé).
  fallback: string,
): string {
  if (language !== 'fr') return error === CONNECTION_LOST_MESSAGE ? texts.connectionLost : fallback;
  const kind = liveErrorKind(error);
  if (kind === 'connection') return texts.connectionLost;
  if (kind === 'session') return texts.sessionExpired;
  return texts.saveFailed;
}
