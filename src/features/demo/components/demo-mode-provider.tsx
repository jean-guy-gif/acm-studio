'use client';

import { createContext, useContext, type ReactNode } from 'react';

// Mission 114 — ce que l'écran a le droit de savoir : « cette agence est de démonstration »,
// posé par le serveur dans le shell (lu en base, M114 A1.3). Les écrans s'en servent pour NE PAS
// sonder l'extension ACM ni le Localisateur, et pour appeler les actions de démonstration à la
// place des lectures du navigateur. La bascule des DONNÉES, elle, reste côté serveur, sur le
// repère de l'agence : ce drapeau ne décide d'aucune donnée.
const DemoModeContext = createContext(false);

export function DemoModeProvider({ isDemo, children }: { isDemo: boolean; children: ReactNode }) {
  return <DemoModeContext.Provider value={isDemo}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): boolean {
  return useContext(DemoModeContext);
}
