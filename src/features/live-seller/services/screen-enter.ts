import type { LivePage } from '@/features/live-seller/services/build-live-pages';

// Mission 144 — l'entrée d'un écran du Live (décision de Jean-Guy, 07/11) : aucun fondu entre deux
// écrans du même concurrent ; au changement de concurrent (ou d'un écran hors concurrent à un
// autre), un fondu de 150 ms au plus, depuis 60 % d'opacité — jamais depuis un écran transparent.
export type ScreenEnter = 'none' | 'switch';

export function screenEnter(previous: LivePage | null, next: LivePage): ScreenEnter {
  if (previous && previous.comparableId != null && previous.comparableId === next.comparableId) {
    return 'none';
  }
  return 'switch';
}
