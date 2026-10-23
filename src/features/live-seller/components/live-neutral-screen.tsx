import type { ReactNode } from 'react';

import { Logo } from '@/components/brand/logo';
import { DEMO_BANNER_MESSAGE } from '@/features/demo/constants';
import {
  question,
  questionHint,
  stageGlow,
  stageGlowLayer,
  stageRoot,
} from '@/features/live-seller/components/live-stage';

// Mission 92 — l'écran NEUTRE qui ferme ou suspend le Live. La tablette est encore tournée vers
// le vendeur : fond du Live, logo de l'agence, une phrase. Aucun chiffre, aucun menu, aucun nom
// de client — ni le sien, ni celui d'un autre. Ce composant ne reçoit RIEN du dossier.
export function LiveNeutralScreen({
  title,
  subtitle = null,
  logoLightUrl,
  logoDarkUrl,
  agencyName,
  actions = null,
  advisorAccess,
  isDemo = false,
}: {
  title: string;
  subtitle?: string | null;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  agencyName: string | null;
  // Action tournée vers le vendeur (« Reprendre »), au centre.
  actions?: ReactNode;
  // « Accès conseiller », discret, en bas.
  advisorAccess: ReactNode;
  // Mission 114 — l'agence de démonstration : la note discrète, en pied d'écran.
  isDemo?: boolean;
}) {
  return (
    <div data-stage="dark" className={`${stageRoot} overflow-hidden`}>
      <div className={stageGlowLayer} aria-hidden>
        <div className={stageGlow} />
      </div>
      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <Logo
          onDark
          priority
          className="h-12 self-center sm:h-14"
          lightSrc={logoLightUrl}
          darkSrc={logoDarkUrl}
          fallbackName={agencyName}
        />
        <div className="flex flex-col items-center gap-3">
          <h1 className={question}>{title}</h1>
          {subtitle ? <p className={questionHint}>{subtitle}</p> : null}
        </div>
        {actions}
      </main>
      <footer className="relative flex justify-center px-6 pb-6">{advisorAccess}</footer>
      {/* Mission 114 — en démonstration, l'écran neutre le dit aussi, discrètement. */}
      {isDemo ? (
        <p
          data-testid="demo-live-note"
          className="pointer-events-none fixed right-3 bottom-1 z-30 text-[10px] font-medium tracking-wide text-white/30 uppercase"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {DEMO_BANNER_MESSAGE}
        </p>
      ) : null}
    </div>
  );
}

// Le lien discret du bas d'écran.
export const advisorAccessLink =
  'inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white/45 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
