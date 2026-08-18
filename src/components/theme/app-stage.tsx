'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Thème du shell applicatif (hors présentation Live, qui garde sa propre
// bascule). Choisi par l'utilisateur via le bouton Clair/Sombre, persisté dans
// le cookie `acm-theme` et relu côté serveur au rendu suivant : aucun flash,
// aucune dépendance au dark mode système.

import { APP_THEME_COOKIE, type AppTheme } from '@/components/theme/theme';

export type { AppTheme } from '@/components/theme/theme';

const AppStageContext = createContext<{ theme: AppTheme; toggle: () => void } | null>(null);

export function AppStage({
  initialTheme,
  children,
}: {
  initialTheme: AppTheme;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<AppTheme>(initialTheme);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      document.cookie = `${APP_THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  // Fond du <body> accordé au thème (évite un bord blanc au rebond du scroll).
  useEffect(() => {
    document.body.style.backgroundColor = theme === 'dark' ? '#051826' : '';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [theme]);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  // `display: contents` : le conteneur porte l'attribut de thème sans exister
  // dans la mise en page — les variantes `stage:` s'appliquent aux descendants.
  return (
    <AppStageContext.Provider value={value}>
      <div data-stage={theme} className="contents">
        {children}
      </div>
    </AppStageContext.Provider>
  );
}

export function useAppStage() {
  const context = useContext(AppStageContext);
  if (!context) {
    throw new Error('useAppStage doit être utilisé sous <AppStage>.');
  }
  return context;
}

// Petit bouton de bascule (même convention que le Live : le libellé indique le
// thème CIBLE, pas le thème courant).
export function AppThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useAppStage();
  return (
    <button
      type="button"
      onClick={toggle}
      className={
        className ??
        'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 stage:text-white/60 stage:hover:bg-white/10 stage:hover:text-white'
      }
      aria-label={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
    >
      {theme === 'dark' ? 'Clair' : 'Sombre'}
    </button>
  );
}
