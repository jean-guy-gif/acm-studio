'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useState, useTransition } from 'react';

import {
  alertError,
  btnPrimary,
  btnSecondary,
  card,
  formSectionTitle,
  hintText,
  inputBase,
  link as linkCls,
} from '@/components/ui/styles';

import type {
  CompetitorCandidate,
  CompetitorSearchResult,
  PortalSearchResult,
  SearchResultsHtmlImport,
} from '@/features/competitor-search/types';

const euro = (value: number | null): string =>
  value != null ? `${Math.round(value).toLocaleString('fr-FR')} €` : '—';

type Props = {
  projectId: string;
  criteriaLabel: string;
  searchAction: () => Promise<CompetitorSearchResult>;
  importResultsHtmlAction: (formData: FormData) => Promise<SearchResultsHtmlImport>;
};

function CandidateCard({
  candidate,
  projectId,
  onDiscard,
}: {
  candidate: CompetitorCandidate;
  projectId: string;
  onDiscard: () => void;
}) {
  return (
    <div
      className={`${card} group flex flex-col gap-2.5 overflow-hidden transition-colors hover:border-brand/60 stage:hover:border-brand/60`}
    >
      {candidate.photoUrl ? (
        <img
          src={candidate.photoUrl}
          alt={candidate.title ?? 'Bien concurrent'}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-zinc-50 text-xs text-zinc-400 stage:bg-white/5 stage:text-white/40">
          Photo indisponible
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 px-3.5 pb-3.5">
        <div className="font-title text-base leading-snug font-semibold capitalize text-zinc-900 stage:text-white">
          {candidate.title ?? 'Annonce détectée'}
        </div>
        <div className="text-sm text-zinc-500 stage:text-white/60">
          <span className="font-semibold text-brand-deep stage:text-white">
            {euro(candidate.price)}
          </span>
          {candidate.surfaceArea != null ? ` · ${candidate.surfaceArea} m²` : ''}
          {candidate.roomsCount != null ? ` · ${candidate.roomsCount} pièces` : ''}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-2 text-sm">
          <Link
            href={`/builder/${projectId}/comparables/new?importUrl=${encodeURIComponent(candidate.url)}`}
            className={`${btnPrimary} px-3 py-1.5 text-xs`}
          >
            Retenir et importer
          </Link>
          <a
            href={candidate.url}
            target="_blank"
            rel="noreferrer noopener"
            className={`${btnSecondary} px-3 py-1.5 text-xs`}
          >
            Voir l’annonce
          </a>
          <button
            type="button"
            onClick={onDiscard}
            className={`${btnSecondary} px-3 py-1.5 text-xs`}
          >
            Écarter
          </button>
        </div>
      </div>
    </div>
  );
}

function PortalBlock({
  portal,
  projectId,
  onPaste,
  pending,
}: {
  portal: PortalSearchResult;
  projectId: string;
  onPaste: (searchUrl: string, html: string) => void;
  pending: boolean;
}) {
  const [pasted, setPasted] = useState('');
  const [discarded, setDiscarded] = useState<Set<string>>(new Set());

  const visible = portal.candidates.filter((candidate) => !discarded.has(candidate.url));

  return (
    <section className={`${card} flex flex-col gap-3 p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={formSectionTitle}>{portal.label}</h2>
        <a
          href={portal.searchUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={`${linkCls} text-sm hover:underline`}
        >
          Ouvrir la recherche {portal.label}
        </a>
      </div>

      {portal.status === 'ok' ? (
        <>
          <p className={hintText}>
            {visible.length} annonce{visible.length > 1 ? 's' : ''} détectée
            {visible.length > 1 ? 's' : ''} — retenez ou écartez chaque suggestion.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((candidate) => (
              <CandidateCard
                key={candidate.url}
                candidate={candidate}
                projectId={projectId}
                onDiscard={() =>
                  setDiscarded((current) => {
                    const next = new Set(current);
                    next.add(candidate.url);
                    return next;
                  })
                }
              />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-amber-700 stage:text-amber-300">
            {portal.message}
          </p>
          <textarea
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            rows={4}
            placeholder="Collez ici le code de la page de résultats (Cmd/Ctrl+U → tout copier)…"
            className={`${inputBase} font-mono text-xs`}
          />
          <button
            type="button"
            disabled={pending || pasted.trim() === ''}
            onClick={() => onPaste(portal.searchUrl, pasted)}
            className={`${btnSecondary} self-start`}
          >
            {pending ? 'Analyse…' : 'Analyser le code collé'}
          </button>
        </div>
      )}
    </section>
  );
}

export function CompetitorSearchPanel({
  projectId,
  criteriaLabel,
  searchAction,
  importResultsHtmlAction,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [portals, setPortals] = useState<PortalSearchResult[] | null>(null);

  function runSearch() {
    setError(null);
    startTransition(async () => {
      const result = await searchAction();
      if (result.ok) {
        setPortals(result.portals);
      } else {
        setError(result.error);
        setPortals(null);
      }
    });
  }

  function handlePaste(searchUrl: string, html: string) {
    setError(null);
    const formData = new FormData();
    formData.set('url', searchUrl);
    formData.set('html', html);
    startTransition(async () => {
      const result = await importResultsHtmlAction(formData);
      if (result.ok) {
        setPortals((current) =>
          (current ?? []).map((portal) =>
            portal.portal === result.portal.portal ? result.portal : portal,
          ),
        );
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={runSearch} disabled={pending} className={btnPrimary}>
          {pending && portals == null ? 'Recherche en cours…' : 'Lancer la recherche'}
        </button>
        <p className={hintText}>Critères : {criteriaLabel}</p>
      </div>
      <p className="text-xs text-zinc-400 stage:text-white/40">
        La recherche interroge Green Acres, SeLoger, Bien’ici et Figaro Immobilier. Un portail qui
        refuse la lecture automatique reste accessible : ouvrez sa recherche, copiez le code de la
        page de résultats et collez-le. Chaque suggestion reste à retenir ou à écarter — rien n’est
        enregistré sans votre validation.
      </p>
      {error ? (
        <p role="alert" className={alertError}>
          {error}
        </p>
      ) : null}
      {portals
        ? portals.map((portal) => (
            <PortalBlock
              key={portal.portal}
              portal={portal}
              projectId={projectId}
              onPaste={handlePaste}
              pending={pending}
            />
          ))
        : null}
    </div>
  );
}
