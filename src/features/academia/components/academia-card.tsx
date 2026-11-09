'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  btnSecondary,
  card,
  errorText,
  fieldLabel,
  hintText,
  inputBase,
  link as linkStyle,
  sectionTitle,
} from '@/components/ui/styles';
import { AcademiaLinks } from '@/features/academia/components/academia-links';
import { setAcademiaLivingHereLink } from '@/features/projects/actions/set-academia-link';
import {
  ACADEMIA_LIVING_HERE_ERROR,
  academiaLivingHereUrl,
  type AcademiaLink,
} from '@/lib/academia';

// Mission 147 (partie A) — « Le bien dans Academia », sur l'onglet Bien vendeur, pour le conseiller
// seul (planches M147-1 et 6 bis) : le dossier d'adresse et « Vivre ici » s'ouvrent dans Academia,
// et le lien client « Vivre ici » qu'Academia donne pour ce bien se colle une fois, pour les
// acquéreurs qui le visiteront.
export function AcademiaCard({
  projectId,
  addressLink,
  livingLink,
  savedUrl,
  signed,
}: {
  projectId: string;
  addressLink: AcademiaLink | null;
  livingLink: AcademiaLink | null;
  savedUrl: string | null;
  signed: boolean;
}) {
  return (
    <section className={`${card} flex flex-col gap-3 p-5 sm:p-6`} data-testid="academia-card">
      <h2 className={sectionTitle}>Le bien dans Academia</h2>
      <p className={hintText}>
        Pour vous seul. Le dossier d’adresse (ventes réelles, DPE, risques, urbanisme, cadastre,
        copropriété) et « Vivre ici » s’ouvrent dans Academia, dans un nouvel onglet.
      </p>
      <AcademiaLinks
        addressLink={addressLink}
        livingLink={livingLink}
        missingHref="#champ-address"
      />
      <LivingHereLinkField projectId={projectId} savedUrl={savedUrl} signed={signed} />
    </section>
  );
}

function LivingHereLinkField({
  projectId,
  savedUrl,
  signed,
}: {
  projectId: string;
  savedUrl: string | null;
  signed: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(savedUrl ?? '');
  const [saved, setSaved] = useState(savedUrl);
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
      const result = await setAcademiaLivingHereLink(projectId, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(result.url);
      setValue(result.url ?? '');
      setJustSaved(result.url !== null);
      router.refresh();
    });
  };

  const changed = value.trim() !== (saved ?? '');
  return (
    <div
      className="flex flex-col gap-2 border-t border-zinc-100 pt-3 stage:border-white/10"
      data-testid="academia-living-link"
    >
      <label htmlFor="academia-living-url" className={fieldLabel}>
        {saved
          ? 'Lien « Vivre ici » montré aux acquéreurs'
          : 'Lien « Vivre ici » à montrer aux acquéreurs (facultatif)'}
      </label>
      <input
        id="academia-living-url"
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
        aria-describedby="academia-living-hint"
        data-testid="academia-living-input"
      />
      {error ? (
        <p className={errorText} role="alert" data-testid="academia-living-error">
          {error}
        </p>
      ) : null}
      <p id="academia-living-hint" className="text-xs text-zinc-500 stage:text-white/60">
        {signed
          ? 'Montré sur le lien de chaque acquéreur qui a ce bien dans sa sélection, et dans « Confirmer la visite ».'
          : 'Montré aux acquéreurs une fois le mandat signé.'}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {changed || !saved ? (
          <button
            type="button"
            className={`${btnSecondary} text-sm`}
            disabled={pending || value.trim() === ''}
            onClick={() => send(value)}
            data-testid="academia-living-save"
          >
            {pending ? 'Enregistrement…' : 'Enregistrer le lien'}
          </button>
        ) : null}
        {justSaved && !changed ? (
          <span
            role="status"
            className="text-sm font-medium text-emerald-700 stage:text-emerald-300"
            data-testid="academia-living-saved"
          >
            ✓ Lien enregistré
          </span>
        ) : null}
        {saved ? (
          <button
            type="button"
            className={`${linkStyle} text-sm`}
            disabled={pending}
            onClick={() => send(null)}
            data-testid="academia-living-remove"
          >
            Retirer
          </button>
        ) : null}
      </div>
    </div>
  );
}
