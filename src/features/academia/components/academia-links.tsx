'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { btnSecondary, hintText, link as linkStyle } from '@/components/ui/styles';
import type { AcademiaLink } from '@/lib/academia';

// Mission 147 (partie A) — ouvrir Academia sur le bien, pour le conseiller seul. Un vrai lien qui
// ouvre un nouvel onglet ; la copie de l'adresse part dans le même clic, sans rien attendre, pour
// que Safari et l'iPad n'y voient pas une fenêtre surgie. Copie refusée : l'adresse s'affiche,
// sélectionnable. Sans adresse : « Ajoutez l'adresse du bien », jamais un lien vide.

type CopyState = 'idle' | 'copied' | 'failed';

const COPIED_FOR_MS = 6000;

type Clipboard = { writeText: (text: string) => Promise<void> } | undefined;

// La copie de l'adresse : « copiée », ou « échouée » (pas de presse-papiers, ou refusé), pour que
// l'écran montre l'adresse à copier soi-même. Pure, testée sans navigateur.
export function copyAddress(text: string, clipboard: Clipboard): Promise<'copied' | 'failed'> {
  if (!clipboard?.writeText) return Promise.resolve('failed');
  return clipboard.writeText(text).then(
    () => 'copied' as const,
    () => 'failed' as const,
  );
}

export function useCopyOnOpen() {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const copy = (text: string | null) => {
    if (!text) return;
    const done = (next: CopyState) => {
      setState(next);
      if (timer.current) clearTimeout(timer.current);
      if (next === 'copied') timer.current = setTimeout(() => setState('idle'), COPIED_FOR_MS);
    };
    void copyAddress(text, navigator.clipboard).then(done);
  };
  return { state, copy };
}

export function CopyMessage({ state, address }: { state: CopyState; address: string | null }) {
  if (state === 'copied') {
    return (
      <p
        role="status"
        className="text-sm font-medium text-emerald-700 stage:text-emerald-300"
        data-testid="academia-copied"
      >
        ✓ Adresse copiée : collez-la dans Academia
      </p>
    );
  }
  if (state === 'failed' && address) {
    return (
      <p role="status" className={hintText} data-testid="academia-copy-failed">
        Copiez l’adresse :{' '}
        <span className="font-medium text-zinc-900 select-all stage:text-white">{address}</span>
      </p>
    );
  }
  return null;
}

export function MissingAddress({ href }: { href: string }) {
  return (
    <Link href={href} className={`${linkStyle} text-sm`} data-testid="academia-missing-address">
      Ajoutez l’adresse du bien
    </Link>
  );
}

// Les deux liens, « Dossier d'adresse ↗ » et « Vivre ici ↗ », en contour (planche M147-1) ou en
// liens, à la suite d'autres liens sur la même ligne (`leading` : « La vente », planche M147-3).
export function AcademiaLinks({
  addressLink,
  livingLink,
  missingHref,
  variant = 'buttons',
  leading = null,
  unread = false,
  saveFirst = false,
}: {
  addressLink: AcademiaLink | null;
  livingLink: AcademiaLink | null;
  missingHref: string;
  variant?: 'buttons' | 'links';
  leading?: ReactNode;
  // L'adresse n'a pas pu être lue : ni lien, ni « Ajoutez l'adresse du bien », qui serait faux (M98).
  unread?: boolean;
  // Correctifs 161 — l'adresse tapée sur la fiche n'est pas encore enregistrée : les liens
  // copieraient l'ancienne (ou aucune) ; la carte le dit.
  saveFirst?: boolean;
}) {
  const { state, copy } = useCopyOnOpen();
  const row = 'flex flex-wrap items-center gap-x-5 gap-y-2';
  if (saveFirst && !unread) {
    return (
      <div className={row} data-testid="academia-links">
        {leading}
        <p className="text-sm font-medium text-zinc-800" data-testid="academia-save-first">
          Enregistrez d’abord la fiche
        </p>
      </div>
    );
  }
  if (unread || !addressLink || !livingLink) {
    return (
      <div className={row} data-testid="academia-links">
        {leading}
        {unread ? null : <MissingAddress href={missingHref} />}
      </div>
    );
  }
  const copied = addressLink.copy ?? livingLink.copy;
  const className = variant === 'buttons' ? `${btnSecondary} text-sm` : `${linkStyle} text-sm`;
  return (
    <div className="flex flex-col gap-2" data-testid="academia-links">
      <div className={row}>
        {leading}
        <a
          href={addressLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          onClick={() => copy(addressLink.copy)}
          data-testid="academia-address"
        >
          Dossier d’adresse ↗
        </a>
        <a
          href={livingLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          onClick={() => copy(livingLink.copy)}
          data-testid="academia-living"
        >
          Vivre ici ↗
        </a>
      </div>
      <CopyMessage state={state} address={copied} />
      {state === 'idle' ? (
        copied ? (
          <p className="text-xs text-zinc-500 stage:text-white/60">
            {variant === 'buttons' ? 'Adresse copiée en un toucher :' : 'Adresse du bien :'}{' '}
            <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-medium text-zinc-800 stage:bg-white/10 stage:text-white">
              {copied}
            </span>
          </p>
        ) : addressLink.href === livingLink.href ? (
          <p className="text-xs text-zinc-500 stage:text-white/60">
            S’ouvre sur la présentation d’Academia.
          </p>
        ) : null
      ) : null}
    </div>
  );
}

// « Ventes réelles dans Academia ↗ », sous « Votre analyse de valeur » (planche M147-2).
export function AcademiaSalesLink({
  salesLink,
  missingHref,
  hidden = false,
}: {
  salesLink: AcademiaLink | null;
  missingHref: string;
  // Correctifs 161 — l'API ouverte : les ventes sont dans le dossier d'adresse, juste au-dessus
  // (règle de Jean-Guy, 19/11 : un bouton vers Academia part quand ACM montre déjà la même chose).
  hidden?: boolean;
}) {
  const { state, copy } = useCopyOnOpen();
  if (hidden) return null;
  if (!salesLink) return <MissingAddress href={missingHref} />;
  return (
    <div className="flex flex-col gap-1" data-testid="academia-sales-block">
      <a
        href={salesLink.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${linkStyle} self-start text-sm`}
        onClick={() => copy(salesLink.copy)}
        data-testid="academia-sales"
      >
        Ventes réelles dans Academia ↗
      </a>
      <CopyMessage state={state} address={salesLink.copy} />
    </div>
  );
}
