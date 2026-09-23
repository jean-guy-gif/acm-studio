'use client';

// Les aperçus affichent une image LOCALE (URL d'objet d'un File choisi) : next/image ne
// convient pas, on utilise <img> à dessein pour tout ce fichier.
/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, useTransition, type CSSProperties } from 'react';

import { btnPrimary, card, errorText, fieldLabel, metaLabel, okText } from '@/components/ui/styles';
import { saveBranding } from '@/features/branding/actions/save-branding';
import { derivePalette, isValidHex } from '@/features/branding/services/palette';

type LogoState = { file: File | null; url: string | null; isJpeg: boolean };

function useLogo(initialUrl: string | null) {
  const [state, setState] = useState<LogoState>({ file: null, url: initialUrl, isJpeg: false });
  const onChange = (file: File | null) => {
    setState({
      file,
      url: file ? URL.createObjectURL(file) : initialUrl,
      isJpeg: file?.type === 'image/jpeg',
    });
  };
  return [state, onChange] as const;
}

// Mission 55 §1 — trois gestes, une fois : déposer le logo (clair + sombre), choisir la
// couleur, regarder l'aperçu (le Live tel que le vendeur le verra) et valider.
export function BrandingForm({
  initialPrimary,
  initialLogoLightUrl,
  initialLogoDarkUrl,
}: {
  initialPrimary: string;
  initialLogoLightUrl: string | null;
  initialLogoDarkUrl: string | null;
}) {
  const [primary, setPrimary] = useState(initialPrimary);
  const [light, setLight] = useLogo(initialLogoLightUrl);
  const [dark, setDark] = useLogo(initialLogoDarkUrl);
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);

  const palette = useMemo(() => (isValidHex(primary) ? derivePalette(primary) : null), [primary]);

  const previewVars = palette
    ? ({
        '--color-brand': palette.brand,
        '--color-brand-deep': palette.brandDeep,
        '--color-brand-soft': palette.brandSoft,
        '--color-brand-darker': palette.brandDarker,
        '--color-brand-darkest': palette.brandDarkest,
        '--color-on-brand': palette.onBrandText,
      } as CSSProperties)
    : undefined;

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setState(null);
        startTransition(async () => {
          const result = await saveBranding(formData);
          setState(
            result.ok
              ? { ok: true, message: 'Charte validée : elle s’applique à tout l’outil.' }
              : { ok: false, message: result.error },
          );
        });
      }}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Colonne saisie */}
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className={fieldLabel}>Couleur de marque</span>
            <span className="flex items-center gap-3">
              <input
                type="color"
                name="primary_color"
                value={isValidHex(primary) ? primary : '#3ea9ff'}
                onChange={(e) => setPrimary(e.target.value.toLowerCase())}
                className="h-11 w-16 cursor-pointer rounded-lg border border-zinc-300"
              />
              <span className="font-title text-lg font-semibold text-zinc-800 stage:text-white">
                {primary}
              </span>
            </span>
          </label>

          {palette?.textContrastAdjusted ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Votre couleur serait illisible en texte : elle a été assombrie pour le texte, et reste
              exacte pour les aplats et les accents.
            </p>
          ) : null}

          <label className="flex flex-col gap-2">
            <span className={fieldLabel}>Logo — fond clair (écrans de travail)</span>
            <input
              type="file"
              name="logo_light"
              accept="image/svg+xml,image/png,image/webp,image/jpeg"
              onChange={(e) => setLight(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            {light.isJpeg ? (
              <span className="text-xs text-amber-700">
                JPEG : fond opaque possible (rectangle blanc). Préférez un SVG ou un PNG
                transparent.
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-2">
            <span className={fieldLabel}>Logo — fond sombre (le Live)</span>
            <input
              type="file"
              name="logo_dark"
              accept="image/svg+xml,image/png,image/webp,image/jpeg"
              onChange={(e) => setDark(e.target.files?.[0] ?? null)}
              className="text-sm"
            />
            {dark.isJpeg ? (
              <span className="text-xs text-amber-700">
                JPEG : fond opaque possible (rectangle blanc). Préférez un SVG ou un PNG
                transparent.
              </span>
            ) : null}
          </label>
        </div>

        {/* Colonne aperçu — le Live tel que le vendeur le verra */}
        <div className="flex flex-col gap-3">
          <span className={metaLabel}>Aperçu — le Live tel que votre vendeur le verra</span>
          <div
            style={previewVars}
            className="flex flex-col gap-5 rounded-2xl bg-gradient-to-br from-brand-deep via-brand-darker to-brand-darkest p-6 text-white"
          >
            {dark.url ? (
              <img
                src={dark.url}
                alt="Logo agence"
                className="h-9 w-auto self-start object-contain"
              />
            ) : (
              <span className="font-title text-lg font-semibold">Votre logo ici</span>
            )}
            <p className="font-title text-2xl font-bold">Rendez-vous vendeur</p>
            <button
              type="button"
              className="w-fit rounded-md px-5 py-2.5 font-medium"
              style={{ backgroundColor: 'var(--color-brand)', color: 'var(--color-on-brand)' }}
            >
              Commencer
            </button>
            {/* Preuve : les couleurs sémantiques de la grille ne bougent pas. */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-emerald-400/15 px-2 py-1 text-emerald-300">
                Avantage concurrent
              </span>
              <span className="rounded-md bg-amber-400/15 px-2 py-1 text-amber-300">Faiblesse</span>
              <span className="rounded-md bg-white/10 px-2 py-1 text-white/80">Équivalent</span>
            </div>
          </div>

          {/* Le logo sur fond clair aussi (écrans de travail). */}
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
            {light.url ? (
              <img src={light.url} alt="Logo agence" className="h-8 w-auto object-contain" />
            ) : (
              <span className="text-sm text-zinc-400">Logo (fond clair)</span>
            )}
          </div>
        </div>
      </div>

      <div className={`${card} flex flex-wrap items-center gap-3 p-4`}>
        <button type="submit" className={btnPrimary} disabled={pending || !isValidHex(primary)}>
          {pending ? 'Validation…' : 'Valider la charte'}
        </button>
        {state ? <span className={state.ok ? okText : errorText}>{state.message}</span> : null}
      </div>
    </form>
  );
}
