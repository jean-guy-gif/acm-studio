'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  btnSecondary,
  errorText,
  fieldLabel,
  inputBase,
  link as linkStyle,
} from '@/components/ui/styles';
import {
  livingHereAgeLine,
  type LivingHereAgeLine,
} from '@/features/academia/services/living-here-age';
import { ACADEMIA_LIVING_HERE_ERROR, academiaLivingHereUrl } from '@/lib/academia';

// Mission 147 (partie A), généralisé en mission 156 — le champ du lien client « Vivre ici »
// d'Academia : coller, « Enregistrer le lien » (en contour), « Retirer ». Il sert à la carte du
// mandat (onglet Bien vendeur) et à chaque bien hors mandat du dossier acquéreur. Mission 156 —
// l'âge du lien sous le champ : « Collé il y a 2 jours », puis en orange du 25e au 29e jour et à
// 30 jours et au-delà ; le lien reste montré (décisions de Jean-Guy, 15 et 16/11).

export type LivingHereSaveResult =
  { ok: true; url: string | null; pastedAt: string | null } | { ok: false; error: string };

export const AGE_WARN_CLASS =
  'rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-800 stage:border-amber-400/30 stage:bg-amber-500/10 stage:text-amber-300';

export function LivingHereAge({
  line,
  testId,
}: {
  line: LivingHereAgeLine | null;
  testId: string;
}) {
  if (!line) return null;
  return (
    <p
      className={
        line.tone === 'warn' ? AGE_WARN_CLASS : 'text-xs text-zinc-500 stage:text-white/60'
      }
      data-testid={testId}
      data-tone={line.tone}
    >
      {line.text}
    </p>
  );
}

export function LivingHereField({
  inputId,
  label,
  emptyLabel,
  hint,
  savedUrl,
  savedLine,
  save,
  testId,
  containerTestId = testId,
  openable = false,
}: {
  inputId: string;
  label: string;
  emptyLabel: string;
  hint: string | null;
  savedUrl: string | null;
  // L'âge du lien enregistré, calculé par la page (jamais au rendu du navigateur : la date du jour
  // y serait celle de l'appareil).
  savedLine: LivingHereAgeLine | null;
  save: (next: string | null) => Promise<LivingHereSaveResult>;
  // Le préfixe des repères des tests (`…-input`, `…-save`…), et celui du bloc entier.
  testId: string;
  containerTestId?: string;
  // « Ouvrir ↗ » le lien enregistré (le dossier acquéreur ; la carte du mandat ne l'a pas).
  openable?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(savedUrl ?? '');
  const [saved, setSaved] = useState(savedUrl);
  const [line, setLine] = useState(savedLine);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const send = (next: string | null) => {
    setError(null);
    setJustSaved(false);
    if (next !== null && next.trim() !== '' && !academiaLivingHereUrl(next)) {
      setError(ACADEMIA_LIVING_HERE_ERROR);
      return;
    }
    startTransition(async () => {
      const result = await save(next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(result.url);
      setValue(result.url ?? '');
      setLine(result.url ? livingHereAgeLine(result.pastedAt, new Date()) : null);
      setJustSaved(result.url !== null);
      router.refresh();
    });
  };

  const changed = value.trim() !== (saved ?? '');
  const hintId = `${inputId}-hint`;
  return (
    <div className="flex flex-col gap-2" data-testid={containerTestId}>
      <label htmlFor={inputId} className={fieldLabel}>
        {saved ? label : emptyLabel}
      </label>
      <input
        id={inputId}
        type="url"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        className={`${inputBase} ${error ? 'border-red-400' : ''}`}
        placeholder="Collez le lien donné par Academia"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setError(null);
          setJustSaved(false);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint ? hintId : undefined}
        data-testid={`${testId}-input`}
      />
      {error ? (
        <p className={errorText} role="alert" data-testid={`${testId}-error`}>
          {error}
        </p>
      ) : null}
      {saved && !changed ? <LivingHereAge line={line} testId={`${testId}-age`} /> : null}
      {hint ? (
        <p id={hintId} className="text-xs text-zinc-500 stage:text-white/60">
          {hint}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        {changed || !saved ? (
          <button
            type="button"
            className={`${btnSecondary} text-sm`}
            disabled={pending || value.trim() === ''}
            onClick={() => send(value)}
            data-testid={`${testId}-save`}
          >
            {pending ? 'Enregistrement…' : 'Enregistrer le lien'}
          </button>
        ) : null}
        {justSaved && !changed ? (
          <span
            role="status"
            className="text-sm font-medium text-emerald-700 stage:text-emerald-300"
            data-testid={`${testId}-saved`}
          >
            ✓ Lien enregistré
          </span>
        ) : null}
        {saved && openable ? (
          <a
            href={saved}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkStyle} text-sm`}
            data-testid={`${testId}-open`}
          >
            Ouvrir ↗
          </a>
        ) : null}
        {saved ? (
          <button
            type="button"
            className={`${linkStyle} text-sm`}
            disabled={pending}
            onClick={() => send(null)}
            data-testid={`${testId}-remove`}
          >
            Retirer
          </button>
        ) : null}
      </div>
    </div>
  );
}
