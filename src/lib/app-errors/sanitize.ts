// Mission 100 — ce qui entre dans le journal des erreurs (`app_errors`) est NETTOYÉ avant d'être
// écrit : jamais de contenu saisi, de prix ni d'adresse. Liste d'autorisation plutôt que liste
// d'exclusion (M51) : entre guillemets, on ne garde que ce qui a la forme d'un identifiant
// technique (nom de table, de colonne, de contrainte) ; tout le reste est masqué.

export const MAX_ERROR_MESSAGE = 300;
export const MAX_ERROR_PAGE = 200;
export const EMPTY_ERROR_MESSAGE = 'Erreur sans message';
export const UNKNOWN_PAGE = '(page inconnue)';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu;
const URL_PATTERN = /\bhttps?:\/\/([^\s/?#"'<>)]+)[^\s"'<>)]*/gi;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_.]{0,62}$/;
// "…", “…”, «…», `…` ; et '…' seulement quand l'apostrophe n'est pas celle d'un mot (« l'erreur »).
const QUOTED = [
  /"([^"]*)"/g,
  /“([^”]*)”/g,
  /«([^»]*)»/g,
  /`([^`]*)`/g,
  /(?<![\p{L}\p{N}])'([^']*)'(?![\p{L}\p{N}])/gu,
];
// Postgres : « Key (address)=(12 rue des Lilas) already exists ».
const KEY_VALUE = /=\s*\([^)]*\)/g;
// Un nombre suivi de son unité, un nombre à séparateurs de milliers, toute suite de 4 chiffres ou
// plus (prix, code postal, téléphone). Un nombre de 3 chiffres seul reste : c'est un code HTTP.
const AMOUNT = /\d[\d\s  .,]*\s?(?:€|euros?\b|m²|m2\b|%)/gi;
const GROUPED_NUMBER = /\d{1,3}(?:[\s  .]\d{3})+/g;
const LONG_NUMBER = /\d{4,}/g;

function rawMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error as { message: unknown };
    return typeof message === 'string' ? message : '';
  }
  return '';
}

export function sanitizeErrorMessage(error: unknown): string {
  let text = rawMessage(error).replace(/\s+/g, ' ').trim();
  text = text.replace(URL_PATTERN, (_match, host: string) => `[url ${host.toLowerCase()}]`);
  text = text.replace(EMAIL, '[e-mail]').replace(UUID, '[id]').replace(KEY_VALUE, '=([valeur])');
  for (const pattern of QUOTED) {
    text = text.replace(pattern, (match, inner: string) =>
      IDENTIFIER.test(inner) ? match : '[texte]',
    );
  }
  text = text.replace(AMOUNT, '[n]').replace(GROUPED_NUMBER, '[n]').replace(LONG_NUMBER, '[n]');
  text = text.trim();
  if (text === '') return EMPTY_ERROR_MESSAGE;
  return text.length > MAX_ERROR_MESSAGE ? `${text.slice(0, MAX_ERROR_MESSAGE - 1)}…` : text;
}

// La page : le chemin seul — ni domaine, ni paramètres, ni identifiant de dossier.
export function sanitizeErrorPage(page: unknown): string {
  if (typeof page !== 'string') return UNKNOWN_PAGE;
  let path = page.trim();
  const origin = /^https?:\/\/[^/]+/i.exec(path);
  if (origin) path = path.slice(origin[0].length);
  path = path.split(/[?#]/)[0].replace(/\s+/g, '');
  if (!path.startsWith('/')) return UNKNOWN_PAGE;
  path = path.replace(UUID, '[id]').replace(LONG_NUMBER, '[n]');
  return path.length > MAX_ERROR_PAGE ? path.slice(0, MAX_ERROR_PAGE) : path;
}

// Les « erreurs » par lesquelles Next.js signale une redirection ou une page introuvable ne sont
// pas des pannes : elles n'entrent pas au journal.
export function isFrameworkSignal(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('digest' in error)) return false;
  const { digest } = error as { digest: unknown };
  return (
    typeof digest === 'string' &&
    /^(NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK|DYNAMIC_SERVER_USAGE|BAILOUT_TO_CLIENT_SIDE_RENDERING)/.test(
      digest,
    )
  );
}
