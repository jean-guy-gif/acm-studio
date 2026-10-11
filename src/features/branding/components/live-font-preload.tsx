import { preload } from 'react-dom';

import { liveFontPreloads } from '@/features/branding/fonts/font-preloads';
import { getAgencyBranding } from '@/features/branding/queries/get-agency-branding';

// Mission 95 — précharge les polices des écrans du Live (voir font-preloads.ts). Composant
// serveur, sans rendu : il ne fait qu'annoncer les fichiers au navigateur, dès l'en-tête.
export async function LiveFontPreload() {
  const branding = await getAgencyBranding();
  const fontFamily = branding?.validatedAt ? branding.fontFamily : null;
  for (const href of liveFontPreloads(fontFamily)) {
    preload(href, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  }
  return null;
}
