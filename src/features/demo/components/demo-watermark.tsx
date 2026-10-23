import { DEMO_WATERMARK } from '@/features/demo/constants';

// Mission 114 — le filigrane « DÉMONSTRATION » de chaque page imprimée depuis l'agence de
// démonstration : courriers, tournée, synthèse au vendeur (page conseiller et lien public). Un
// calque FIXE, hors du flux : le navigateur le répète sur chaque feuille à l'impression, et il ne
// gêne ni la lecture ni les clics (`pointer-events: none`). Rien de ce qu'une démo produit ne
// peut sortir comme un vrai document.
export function DemoWatermark({ isDemo }: { isDemo: boolean }) {
  if (!isDemo) {
    return null;
  }
  return (
    <div
      aria-hidden
      data-testid="demo-watermark"
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center overflow-hidden [print-color-adjust:exact]"
    >
      <span
        className="font-title -rotate-[30deg] text-[16vw] font-black tracking-[0.2em] text-violet-700/15 select-none print:text-[48mm] print:text-violet-700/20"
        style={{ whiteSpace: 'nowrap' }}
      >
        {DEMO_WATERMARK}
      </span>
    </div>
  );
}
