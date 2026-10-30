import { DEMO_PHOTOS_PATH } from '@/features/demo/constants';

// Mission 120 B (reprise R3 de la partie A) — une photo de la démonstration est servie par
// l'application elle-même (`/demo/photos/…`), mais elle est enregistrée en adresse absolue, comme
// une photo de portail (M114). Enregistrée depuis l'essai, protégé, elle ne s'ouvrait pas en
// production. À l'affichage, une telle adresse redevient un chemin de l'hôte qui sert la page ;
// toute autre adresse passe telle quelle (une photo de portail n'est jamais réécrite).
const DEMO_PHOTO_PATH = new RegExp(`^${DEMO_PHOTOS_PATH}/([a-z0-9-]+\\.jpg)$`);

const isAppHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.vercel.app');

// Le nom de fichier d'une photo de démonstration servie par l'application, sinon null : un chemin
// relatif, ou une adresse absolue d'un hôte de l'application (travail, essai, production, local).
export function servedDemoPhotoFile(rawUrl: string, ownHost?: string | null): string | null {
  if (rawUrl.startsWith('/')) {
    return rawUrl.match(DEMO_PHOTO_PATH)?.[1] ?? null;
  }
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!isAppHost(url.hostname) && url.host !== ownHost) return null;
    if (url.search || url.hash) return null;
    return url.pathname.match(DEMO_PHOTO_PATH)?.[1] ?? null;
  } catch {
    return null;
  }
}

export function displayPhotoUrl(rawUrl: string): string;
export function displayPhotoUrl(rawUrl: string | null): string | null;
export function displayPhotoUrl(rawUrl: string | null): string | null {
  if (!rawUrl) return rawUrl;
  const file = servedDemoPhotoFile(rawUrl);
  return file ? `${DEMO_PHOTOS_PATH}/${file}` : rawUrl;
}
