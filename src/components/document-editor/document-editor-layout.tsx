'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

// Mission 120 B (reprises R1 et R2 de la partie A) — l'écran d'édition d'un courrier : le panneau
// de saisie à gauche, la feuille A4 à droite.
// R1 : les actions (« Télécharger le PDF », « Enregistrer ») sont toujours dans la fenêtre — au
// bureau (1024 px et plus), le panneau défile lui-même et sa barre d'actions reste en bas ; sous
// 1024 px, la barre suit le panneau, sans jamais passer sur la saisie (designer, rendus 120 B).
// R2 : la feuille est réduite à la largeur de sa colonne (`transform: scale`), jamais coupée,
// jamais de défilement de côté ; à l'impression, elle reprend sa taille réelle.
export function DocumentEditorLayout({
  panel,
  actions,
  children,
}: {
  panel: ReactNode;
  actions: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-zinc-100 p-4 lg:flex-row lg:items-start lg:p-6 print:block print:bg-white print:p-0">
      <aside
        className="flex w-full shrink-0 flex-col rounded-2xl border border-zinc-200 bg-white lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-[24rem] lg:overflow-hidden print:hidden"
        data-testid="document-editor-panel"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-5 lg:overflow-y-auto">{panel}</div>
        <div
          className="flex shrink-0 flex-col gap-2 rounded-b-2xl border-t border-zinc-200 bg-white p-5 pt-4"
          data-testid="document-editor-actions"
        >
          {actions}
        </div>
      </aside>
      <ScaledSheet>{children}</ScaledSheet>
    </div>
  );
}

// La feuille garde sa mise en page en millimètres ; seule l'échelle change à l'écran.
export function ScaledSheet({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ scale: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const outer = frame.current;
    const inner = sheet.current;
    if (!outer || !inner) return;
    const measure = () => {
      const width = inner.offsetWidth;
      if (width <= 0) return;
      const scale = Math.min(1, outer.clientWidth / width);
      setFit({ scale, height: inner.offsetHeight * scale });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  const style = fit
    ? ({ '--sheet-scale': fit.scale, '--sheet-height': `${fit.height}px` } as CSSProperties)
    : undefined;
  return (
    <div
      ref={frame}
      className={`w-full min-w-0 flex-1 overflow-hidden print:h-auto print:overflow-visible ${fit ? 'h-[var(--sheet-height)]' : ''}`}
      style={style}
      data-testid="document-editor-sheet"
    >
      <div
        ref={sheet}
        className={`w-max origin-top-left print:[transform:none] ${fit ? '[transform:scale(var(--sheet-scale))]' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}
