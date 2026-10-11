// Mission 88 — aucune erreur de connexion n'apparaît en anglais, et aucun message brut de
// Supabase ne voyage dans une adresse. Pur. L'action réduit l'erreur à un CODE ; la page ne sait
// afficher que les phrases de cette liste : un code inconnu (adresse retouchée à la main) donne
// la phrase générique, jamais un texte venu de l'adresse.

export const LOGIN_ERROR_MESSAGES = {
  identifiants: 'Adresse e-mail ou mot de passe incorrect.',
  'email-non-confirme':
    'Votre adresse e-mail n’est pas encore confirmée : ouvrez le lien reçu par e-mail.',
  'trop-de-tentatives': 'Trop de tentatives. Patientez quelques minutes avant de réessayer.',
  'lien-invalide':
    'Ce lien n’est plus valable : il a expiré ou a déjà servi. Demandez-en un nouveau.',
  indisponible: 'La connexion est momentanément indisponible. Réessayez dans un instant.',
} as const;

export type LoginErrorCode = keyof typeof LOGIN_ERROR_MESSAGES;

// Ce que l'on sait d'une erreur d'authentification Supabase, sans dépendre de son texte anglais
// plus que nécessaire : le code d'abord, le statut HTTP ensuite, le texte en dernier recours.
export type AuthErrorLike = {
  code?: string | null;
  status?: number | null;
  message?: string | null;
};

export function loginErrorCode(error: AuthErrorLike): LoginErrorCode {
  const code = (error.code ?? '').toLowerCase();
  const message = (error.message ?? '').toLowerCase();
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'email-non-confirme';
  }
  if (
    code.startsWith('over_') ||
    code.includes('rate_limit') ||
    error.status === 429 ||
    message.includes('rate limit')
  ) {
    return 'trop-de-tentatives';
  }
  if (
    code === 'otp_expired' ||
    code === 'flow_state_expired' ||
    code === 'flow_state_not_found' ||
    message.includes('expired')
  ) {
    return 'lien-invalide';
  }
  if (
    code === 'invalid_credentials' ||
    code === 'user_not_found' ||
    code === 'validation_failed' ||
    error.status === 400 ||
    message.includes('invalid login credentials')
  ) {
    return 'identifiants';
  }
  return 'indisponible';
}

// La phrase à afficher pour le paramètre `error` de /login ; null quand il n'y en a pas.
export function loginErrorMessage(code: string | undefined): string | null {
  if (!code) {
    return null;
  }
  return Object.hasOwn(LOGIN_ERROR_MESSAGES, code)
    ? LOGIN_ERROR_MESSAGES[code as LoginErrorCode]
    : LOGIN_ERROR_MESSAGES.indisponible;
}

// Mot de passe oublié : la réponse est la même, que l'adresse existe ou non.
export const PASSWORD_RESET_SENT_MESSAGE =
  'Si un compte existe pour cette adresse, un e-mail vient de partir.';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_TOO_SHORT_MESSAGE = `Choisissez un mot de passe d’au moins ${PASSWORD_MIN_LENGTH} caractères.`;

// Invitation en attente : on ne crée pas d'agence, on finalise son inscription.
export const PENDING_INVITATION_MESSAGE =
  'Vous avez été invité par une agence : finalisez votre inscription.';
