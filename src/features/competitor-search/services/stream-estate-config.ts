import 'server-only';

// ESSAI STREAM ESTATE — la clé ne quitte jamais le serveur. Absente → l'essai n'existe pas
// (ni bouton, ni appel).
export function streamEstateApiKey(): string | null {
  const key = process.env.STREAM_ESTATE_API_KEY?.trim();
  return key ? key : null;
}
