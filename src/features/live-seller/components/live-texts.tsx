'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { clientTexts, textLanguage, type TextLanguage } from '@/lib/client-texts';
import type { ClientTexts } from '@/lib/client-texts/types';

// Mission 140 — la langue du dossier, portée par la scène du Live jusqu'à chaque écran : le code de
// la langue seul voyage du serveur (aucune donnée), les textes sont du code statique. Changer de
// langue en direct (« Réglages ») ne recharge rien : les écrans se relisent dans la nouvelle.
const LiveTextsContext = createContext<{ language: TextLanguage; texts: ClientTexts }>({
  language: 'fr',
  texts: clientTexts('fr'),
});

export function LiveTextsProvider({
  language,
  children,
}: {
  language: TextLanguage;
  children: ReactNode;
}) {
  return (
    <LiveTextsContext.Provider value={{ language: textLanguage(language), texts: clientTexts(language) }}>
      {children}
    </LiveTextsContext.Provider>
  );
}

export function useLiveTexts(): { language: TextLanguage; texts: ClientTexts } {
  return useContext(LiveTextsContext);
}
