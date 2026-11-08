'use client';

import { Logo } from '@/components/brand/logo';
import { useLiveTexts } from '@/features/live-seller/components/live-texts';

// Introduction premium : composition sombre, une seule idée principale, logo (sinon le nom),
// dossier vendeur, et un unique bouton de démarrage. Ne lit que le NOMBRE de
// concurrents — aucun montant.
export function LivePageIntro({
  comparablesCount,
  sellerName,
  address,
  onStart,
  logoLightUrl = null,
  logoDarkUrl = null,
  agencyName = null,
}: {
  comparablesCount: number;
  sellerName: string;
  address: string | null;
  onStart: () => void;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  agencyName?: string | null;
}) {
  const count = comparablesCount;
  const t = useLiveTexts().texts.live.intro;

  const hasLogo = Boolean(logoLightUrl || logoDarkUrl);

  // Mission 146 (C8) — la carte prend toute la hauteur sous le bandeau : l'identité en haut — le
  // logo, sinon le nom de l'agence en grand —, la phrase et le vendeur au milieu, « Démarrer la
  // présentation » en bas. « Rendez-vous vendeur » n'est dit qu'une fois, dans le bandeau.
  return (
    <section
      data-testid="live-intro-card"
      className="relative flex flex-1 flex-col justify-between gap-8 overflow-hidden rounded-card bg-gradient-to-br from-brand-deep to-brand-darkest p-8 text-white sm:p-12"
    >
      {hasLogo ? (
        <Logo
          onDark
          priority
          className="h-10"
          lightSrc={logoLightUrl}
          darkSrc={logoDarkUrl}
          fallbackName={agencyName}
        />
      ) : agencyName ? (
        <p
          data-testid="live-intro-agency"
          className="font-title text-2xl leading-tight font-bold tracking-wide uppercase sm:text-3xl"
        >
          {agencyName}
        </p>
      ) : (
        <Logo onDark priority className="h-10" />
      )}
      <div className="flex flex-col gap-3">
        <h2 className="max-w-2xl text-3xl leading-tight font-semibold sm:text-4xl">{t.title}</h2>
        <div className="text-white/80">
          <p className="text-lg font-medium">{sellerName}</p>
          {address ? <p className="text-sm">{address}</p> : null}
        </div>
      </div>

      {/* Mission 89 — l'écran est tourné vers le vendeur : sans concurrent retenu, il reste
          neutre, sans consigne au conseiller (la liste du Live, elle, le lui dit). */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onStart}
          // Mission 146 — le bouton plein de l'écran : il porte le repère du contrôle e2e.
          className="btn-filled rounded-md bg-white px-6 py-3 text-base font-semibold text-brand-deep shadow-sm transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {t.start}
        </button>
        {count > 0 ? <span className="text-sm text-white/70">{t.count(count)}</span> : null}
      </div>
    </section>
  );
}
